import React, { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';

const GEOJSON_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';

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
  const [geoData, setGeoData] = useState(null);
  const [geoLoading, setGeoLoading] = useState(true);
  const [geoError, setGeoError] = useState(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [litProvinces, setLitProvinces] = useState(new Set());
  const [hoveredProvince, setHoveredProvince] = useState(null);
  const [isCompact, setIsCompact] = useState(window.innerWidth < 1024);

  // Detect compact layout (tablet + mobile)
  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth < 1024);
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Responsive dimensions
  useEffect(() => {
    const handleResize = () => {
      if (svgRef.current?.parentElement) {
        const { clientWidth, clientHeight } = svgRef.current.parentElement;
        setDimensions({ width: clientWidth || 800, height: clientHeight || 600 });
      }
    };
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (svgRef.current?.parentElement) {
      observer.observe(svgRef.current.parentElement);
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

  // Helper: get centroid coords from a feature (works for both Polygon and MultiPolygon)
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

  return (
    <div style={{
      width: '100%', height: '100%', display: 'flex',
      flexDirection: 'column', background: '#0a0f1a',
    }}>
      <div style={{
        flex: 1, width: '100%', position: 'relative',
        minHeight: isCompact ? 220 : 0,
      }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`0 0 ${width} ${height}`}
          style={{ display: 'block' }}
        >
        <rect width={width} height={height} fill="#0a0f1a" />

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
      </svg>
      </div>

      {/* Province list for tablet + mobile */}
      {isCompact && geoData && geoData.features && (
        <div style={{
          flexShrink: 0, width: '100%',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(10,15,26,0.95)',
        }}>
          <div style={{
            padding: '8px 12px',
            fontSize: 12, color: 'rgba(255,255,255,0.35)',
          }}>
            点击省份查看详情
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 6,
            padding: '0 12px 12px',
            maxHeight: isCompact ? 140 : 0,
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
        </div>
      )}
    </div>
  );
}
