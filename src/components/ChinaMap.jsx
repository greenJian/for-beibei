import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const GEOJSON_URL = `${import.meta.env.BASE_URL}china-geo.json`;

const CHINA_BOUNDS = { minLng: 73.5, maxLng: 135.1, minLat: 17.5, maxLat: 53.6 };

function lngLatToXY(lng, lat, width, height) {
  const { minLng, maxLng, minLat, maxLat } = CHINA_BOUNDS;
  const padding = 20;
  const x = padding + ((lng - minLng) / (maxLng - minLng)) * (width - padding * 2);
  const y = padding + ((maxLat - lat) / (maxLat - minLat)) * (height - padding * 2);
  return { x, y };
}

function featureToPaths(feature, width, height) {
  const paths = [];
  const processPolygon = (coords) => {
    const rings = [];
    coords.forEach(ring => {
      const points = ring.map(([lng, lat]) => {
        const { x, y } = lngLatToXY(lng, lat, width, height);
        return `${x},${y}`;
      });
      rings.push('M' + points.join('L') + 'Z');
    });
    paths.push(rings.join(' '));
  };
  if (feature.geometry.type === 'Polygon') {
    processPolygon(feature.geometry.coordinates);
  } else if (feature.geometry.type === 'MultiPolygon') {
    feature.geometry.coordinates.forEach(polygon => processPolygon(polygon));
  }
  return paths;
}

const PROVINCE_SHORT = {
  '北京市': '北京', '天津市': '天津', '上海市': '上海', '重庆市': '重庆',
  '河北省': '河北', '山西省': '山西', '辽宁省': '辽宁', '吉林省': '吉林',
  '黑龙江省': '黑龙江', '江苏省': '江苏', '浙江省': '浙江', '安徽省': '安徽',
  '福建省': '福建', '江西省': '江西', '山东省': '山东', '河南省': '河南',
  '湖北省': '湖北', '湖南省': '湖南', '广东省': '广东', '海南省': '海南',
  '四川省': '四川', '贵州省': '贵州', '云南省': '云南', '陕西省': '陕西',
  '甘肃省': '甘肃', '青海省': '青海', '台湾省': '台湾',
  '内蒙古自治区': '内蒙古', '广西壮族自治区': '广西', '西藏自治区': '西藏',
  '宁夏回族自治区': '宁夏', '新疆维吾尔自治区': '新疆',
  '香港特别行政区': '香港', '澳门特别行政区': '澳门',
};

export default function ChinaMap({ onProvinceSelect }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [geoData, setGeoData] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [litProvinces, setLitProvinces] = useState(new Set());
  const [hoveredProvince, setHoveredProvince] = useState(null);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 1024);
  const [showProvinceList, setShowProvinceList] = useState(false);

  // Zoom / Pan state
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const gestureRef = useRef({
    isDragging: false,
    startX: 0, startY: 0,
    startTransform: { x: 0, y: 0, scale: 1 },
    pinchStartDist: 0,
    touches: [],
  });

  // Detect compact layout (tablet + mobile)
  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth < 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Responsive dimensions
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({ width: clientWidth || 800, height: clientHeight || 600 });
      }
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  // Load lit provinces
  const loadLitProvinces = useCallback(async () => {
    try {
      const { data } = await supabase.from('province_memories').select('province_name').neq('city', '_背景_');
      if (data) setLitProvinces(new Set(data.map(d => d.province_name)));
    } catch (err) {
      console.warn('Failed to load lit provinces:', err);
    }
  }, []);

  // Load GeoJSON
  useEffect(() => {
    loadLitProvinces();
    fetch(GEOJSON_URL)
      .then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(data => { setGeoData(data); setGeoLoading(false); })
      .catch(err => { console.error('GeoJSON load failed:', err); setGeoError(true); setGeoLoading(false); });
  }, [loadLitProvinces]);

  const { width, height } = dimensions;

  // Helper: get centroid coords from a feature
  const getCentroid = (feature) => {
    let coords;
    if (feature.geometry.type === 'Polygon') {
      coords = feature.geometry.coordinates[0];
    } else if (feature.geometry.type === 'MultiPolygon') {
      coords = feature.geometry.coordinates[0][0];
    } else {
      return null;
    }
    if (!coords || coords.length === 0) return null;
    let cx = 0, cy = 0;
    coords.forEach(([lng, lat]) => { cx += lng; cy += lat; });
    cx /= coords.length;
    cy /= coords.length;
    return { x: cx, y: cy };
  };

  // ===== Zoom / Pan Handlers =====

  const limitTransform = (t) => {
    const maxOffsetX = width * (t.scale - 1) * 0.5 + 100;
    const maxOffsetY = height * (t.scale - 1) * 0.5 + 100;
    return {
      scale: Math.min(Math.max(t.scale, 0.5), 5),
      x: Math.max(-maxOffsetX, Math.min(maxOffsetX, t.x)),
      y: Math.max(-maxOffsetY, Math.min(maxOffsetY, t.y)),
    };
  };

  const getTouchDistance = (t1, t2) => {
    return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
  };

  const getTouchCenter = (t1, t2) => ({
    x: (t1.clientX + t2.clientX) / 2,
    y: (t1.clientY + t2.clientY) / 2,
  });

  const onTouchStart = useCallback((e) => {
    const g = gestureRef.current;
    g.touches = Array.from(e.touches);
    if (g.touches.length === 1) {
      g.isDragging = true;
      g.startX = g.touches[0].clientX;
      g.startY = g.touches[0].clientY;
      g.startTransform = { ...transform };
    } else if (g.touches.length === 2) {
      g.isDragging = false;
      g.pinchStartDist = getTouchDistance(g.touches[0], g.touches[1]);
      g.pinchCenter = getTouchCenter(g.touches[0], g.touches[1]);
      g.startTransform = { ...transform };
    }
  }, [transform]);

  const onTouchMove = useCallback((e) => {
    e.preventDefault();
    const g = gestureRef.current;
    const touches = Array.from(e.touches);

    if (touches.length === 1 && g.isDragging && g.touches.length === 1) {
      const dx = touches[0].clientX - g.startX;
      const dy = touches[0].clientY - g.startY;
      setTransform(limitTransform({
        x: g.startTransform.x + dx,
        y: g.startTransform.y + dy,
        scale: g.startTransform.scale,
      }));
    } else if (touches.length === 2 && g.touches.length >= 2) {
      const newDist = getTouchDistance(touches[0], touches[1]);
      const newCenter = getTouchCenter(touches[0], touches[1]);
      const scaleRatio = newDist / (g.pinchStartDist || 1);
      const newScale = g.startTransform.scale * scaleRatio;

      // Zoom around the pinch center
      const centerX = newCenter.x - containerRef.current.getBoundingClientRect().left;
      const centerY = newCenter.y - containerRef.current.getBoundingClientRect().top;
      const scaleChange = newScale / g.startTransform.scale;
      const dx = centerX - centerX * scaleChange;
      const dy = centerY - centerY * scaleChange;

      setTransform(limitTransform({
        x: g.startTransform.x * scaleChange + dx,
        y: g.startTransform.y * scaleChange + dy,
        scale: newScale,
      }));
    }
  }, []);

  const onTouchEnd = useCallback(() => {
    gestureRef.current.isDragging = false;
    gestureRef.current.touches = [];
  }, []);

  // Mouse wheel zoom
  const onWheel = useCallback((e) => {
    e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(Math.max(transform.scale * delta, 0.5), 5);
    const scaleChange = newScale / transform.scale;
    const dx = mouseX - mouseX * scaleChange;
    const dy = mouseY - mouseY * scaleChange;

    setTransform(limitTransform({
      x: transform.x * scaleChange + dx,
      y: transform.y * scaleChange + dy,
      scale: newScale,
    }));
  }, [transform]);

  // Double click zoom in
  const onDoubleClick = useCallback((e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const newScale = Math.min(transform.scale * 1.5, 5);
    const scaleChange = newScale / transform.scale;
    const dx = mouseX - mouseX * scaleChange;
    const dy = mouseY - mouseY * scaleChange;
    setTransform(limitTransform({
      x: transform.x * scaleChange + dx,
      y: transform.y * scaleChange + dy,
      scale: newScale,
    }));
  }, [transform]);

  const resetZoom = useCallback(() => {
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const transformStyle = {
    transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
    transformOrigin: '0 0',
    transition: gestureRef.current.isDragging ? 'none' : 'transform 0.2s ease-out',
  };

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      flexDirection: 'column', background: '#0a0f1a',
    }}>
      <div
        ref={containerRef}
        style={{
          flex: 1, width: '100%', position: 'relative',
          minHeight: isCompact ? 220 : 0,
          touchAction: 'none',
          overflow: 'hidden',
        }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onWheel={onWheel}
        onDoubleClick={onDoubleClick}
      >
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block' }}
        >
          <rect width={width} height={height} fill="#0a0f1a" />

          {/* Zoom / Pan group */}
          <g style={transformStyle}>
            {geoLoading && (
              <>
                <rect width={width} height={height} fill="rgba(10,15,26,0.9)" />
                <text x={width / 2} y={height / 2} textAnchor="middle" fill="#FFB84D" fontSize="18" fontWeight="500" fontFamily="PingFang SC, sans-serif">
                  地图加载中...
                </text>
              </>
            )}

            {geoError && (
              <>
                <rect width={width} height={height} fill="rgba(10,15,26,0.9)" />
                <text x={width / 2} y={height / 2} textAnchor="middle" fill="#FF8FAB" fontSize="16" fontFamily="PingFang SC, sans-serif">
                  地图数据加载失败，请检查网络
                </text>
              </>
            )}

            {/* Province polygons */}
            {geoData && geoData.features && geoData.features.map((feature, fi) => {
              const name = feature.properties.name;
              const isLit = litProvinces.has(name);
              const isHovered = hoveredProvince === name;
              const centroid = getCentroid(feature);

              return (
                <g key={fi}>
                  {featureToPaths(feature, width, height).map((pathData, pi) => (
                    <path
                      key={pi}
                      d={pathData}
                      fill={isLit
                        ? (isHovered ? 'rgba(255,184,77,0.7)' : 'rgba(255,184,77,0.4)')
                        : (isHovered ? 'rgba(255,255,255,0.12)' : 'rgba(30,30,60,0.3)')
                      }
                      stroke={isLit
                        ? (isHovered ? 'rgba(255,184,77,0.9)' : 'rgba(255,184,77,0.5)')
                        : 'rgba(80,80,130,0.25)'
                      }
                      strokeWidth={isLit ? 1.5 : 1}
                      style={{ cursor: 'pointer', transition: 'all 0.2s ease' }}
                      onMouseEnter={() => setHoveredProvince(name)}
                      onMouseLeave={() => setHoveredProvince(null)}
                      onClick={() => onProvinceSelect && onProvinceSelect(name)}
                    />
                  ))}

                  {/* Province label */}
                  {name && centroid && (() => {
                    const pos = lngLatToXY(centroid.x, centroid.y, width, height);
                    const short = PROVINCE_SHORT[name] || name;
                    const fontSize = short.length > 3 ? 11 : (short.length > 2 ? 12 : 13);
                    return (
                      <text
                        x={pos.x} y={pos.y}
                        textAnchor="middle"
                        fontSize={fontSize}
                        fill={isLit ? '#fff' : 'rgba(255,255,255,0.5)'}
                        fontWeight={isLit ? 600 : 400}
                        fontFamily="PingFang SC, sans-serif"
                        style={{ pointerEvents: 'none', userSelect: 'none' }}
                      >
                        {short}
                      </text>
                    );
                  })()}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Zoom controls */}
        <div style={{
          position: 'absolute',
          bottom: 12,
          right: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          zIndex: 10,
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); setTransform(limitTransform({ ...transform, scale: Math.min(transform.scale * 1.3, 5) })); }}
            style={zoomBtnStyle}
            title="放大"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setTransform(limitTransform({ ...transform, scale: Math.max(transform.scale / 1.3, 0.5) })); }}
            style={zoomBtnStyle}
            title="缩小"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); resetZoom(); }}
            style={{ ...zoomBtnStyle, display: transform.scale !== 1 || transform.x !== 0 || transform.y !== 0 ? 'flex' : 'none' }}
            title="复位"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
              <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
            </svg>
          </button>
        </div>
      </div>

      {/* Province list for tablet + mobile — collapsible */}
      {isCompact && geoData && geoData.features && (
        <div style={{
          flexShrink: 0, width: '100%',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10,15,26,0.95)',
        }}>
          {/* Toggle header */}
          <button
            onClick={() => setShowProvinceList(!showProvinceList)}
            style={{
              width: '100%', padding: '10px 14px',
              background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: 'rgba(255,255,255,0.6)', cursor: 'pointer',
              fontSize: 13, fontFamily: "'PingFang SC', sans-serif",
            }}
          >
            <span>点击省份查看详情 ({geoData.features.length} 个省份)</span>
            <svg
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              width="16" height="16"
              style={{
                transform: showProvinceList ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.25s ease',
              }}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {showProvinceList && (
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 6,
              padding: '0 12px 12px',
              maxHeight: 160,
              overflowY: 'auto',
            }}>
              {geoData.features.map((feature, fi) => {
                const name = feature.properties.name;
                if (!name) return null;
                const isLit = litProvinces.has(name);
                const short = PROVINCE_SHORT[name] || name;
                return (
                  <button
                    key={fi}
                    onClick={() => onProvinceSelect && onProvinceSelect(name)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 16,
                      border: isLit
                        ? '1px solid rgba(255,184,77,0.5)'
                        : '1px solid rgba(255,255,255,0.1)',
                      background: isLit
                        ? 'rgba(255,184,77,0.15)'
                        : 'rgba(255,255,255,0.03)',
                      color: isLit ? '#FFB84D' : 'rgba(255,255,255,0.45)',
                      fontSize: 13,
                      fontWeight: isLit ? 600 : 400,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {short}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const zoomBtnStyle = {
  width: 34, height: 34,
  borderRadius: '50%',
  border: '1px solid rgba(255,255,255,0.15)',
  background: 'rgba(10,15,26,0.8)',
  backdropFilter: 'blur(8px)',
  color: 'rgba(255,255,255,0.7)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
};
