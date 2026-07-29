import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ChinaMap from './ChinaMap';
import { supabase } from '../lib/supabaseClient';
import { uploadToSupabase } from '../lib/supabaseStorage';

const PROVINCE_CITIES = {
  '北京市': ['东城区', '西城区', '朝阳区', '海淀区', '丰台区', '通州区', '延庆区', '怀柔区', '密云区'],
  '上海市': ['黄浦区', '徐汇区', '长宁区', '静安区', '浦东新区', '松江区', '崇明区', '青浦区'],
  '天津市': ['和平区', '河西区', '南开区', '滨海新区', '蓟州区'],
  '重庆市': ['渝中区', '江北区', '沙坪坝区', '南岸区', '武隆区', '奉节县'],
  '河北省': ['石家庄', '秦皇岛', '承德', '张家口', '保定', '唐山'],
  '山西省': ['太原', '大同', '平遥', '五台山', '临汾', '运城'],
  '内蒙古自治区': ['呼和浩特', '呼伦贝尔', '鄂尔多斯', '包头', '赤峰'],
  '辽宁省': ['沈阳', '大连', '丹东', '本溪', '盘锦'],
  '吉林省': ['长春', '吉林市', '长白山', '延边'],
  '黑龙江省': ['哈尔滨', '漠河', '牡丹江', '齐齐哈尔', '大庆'],
  '江苏省': ['南京', '苏州', '无锡', '扬州', '常州', '徐州', '镇江'],
  '浙江省': ['杭州', '宁波', '温州', '嘉兴', '绍兴', '湖州', '舟山'],
  '安徽省': ['合肥', '黄山', '芜湖', '安庆', '蚌埠'],
  '福建省': ['福州', '厦门', '泉州', '武夷山', '漳州'],
  '江西省': ['南昌', '景德镇', '庐山', '婺源', '赣州'],
  '山东省': ['济南', '青岛', '烟台', '威海', '泰安', '曲阜', '日照'],
  '河南省': ['郑州', '洛阳', '开封', '安阳', '南阳'],
  '湖北省': ['武汉', '宜昌', '恩施', '襄阳', '十堰'],
  '湖南省': ['长沙', '张家界', '凤凰', '岳阳', '衡阳', '郴州'],
  '广东省': ['广州', '深圳', '珠海', '汕头', '佛山', '惠州', '湛江'],
  '广西壮族自治区': ['南宁', '桂林', '北海', '柳州', '阳朔'],
  '海南省': ['海口', '三亚', '万宁', '琼海', '陵水'],
  '四川省': ['成都', '绵阳', '乐山', '九寨沟', '稻城', '都江堰', '峨眉山'],
  '贵州省': ['贵阳', '遵义', '黔东南', '安顺', '荔波', '黄果树'],
  '云南省': ['昆明', '大理', '丽江', '香格里拉', '西双版纳', '腾冲'],
  '西藏自治区': ['拉萨', '林芝', '日喀则', '纳木错'],
  '陕西省': ['西安', '咸阳', '延安', '汉中', '华山'],
  '甘肃省': ['兰州', '敦煌', '张掖', '嘉峪关', '甘南'],
  '青海省': ['西宁', '青海湖', '格尔木', '茶卡'],
  '宁夏回族自治区': ['银川', '中卫', '吴忠'],
  '新疆维吾尔自治区': ['乌鲁木齐', '喀什', '伊犁', '吐鲁番', '阿勒泰'],
  '台湾省': ['台北', '高雄', '台中', '花莲', '垦丁'],
  '香港特别行政区': ['香港岛', '九龙', '新界', '离岛'],
  '澳门特别行政区': ['澳门半岛', '氹仔', '路环'],
};

const PROVINCES = Object.keys(PROVINCE_CITIES);

export default function PinkAnimationHome({ goTo, goToCity, goToProvince, isCityMode = false, isMobile = false }) {
  const [showUploadPanel, setShowUploadPanel] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [visitDate, setVisitDate] = useState('');
  const [uploadStory, setUploadStory] = useState('');
  const [uploadPhotos, setUploadPhotos] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const cityOptions = selectedProvince ? (PROVINCE_CITIES[selectedProvince] || []) : [];

  const handleProvinceSelect = (provinceName) => {
    if (goToProvince) goToProvince(provinceName);
  };

  const handleOpenUpload = () => {
    setSelectedProvince('');
    setSelectedCity('');
    setVisitDate('');
    setUploadStory('');
    setUploadPhotos([]);
    setShowUploadPanel(true);
  };

  const handleProvinceChange = (val) => {
    setSelectedProvince(val);
    setSelectedCity('');
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        files.map(file => uploadToSupabase(file, 'travel-photos'))
      );
      setUploadPhotos(prev => [...prev, ...results.map(r => r.publicUrl)]);
    } catch (err) {
      console.error('Upload failed:', err);
    }
    setUploading(false);
  };

  const handleSaveMemory = async () => {
    if (!selectedProvince || !selectedCity) return;
    setSaving(true);
    try {
      await supabase.from('province_memories').insert({
        province_name: selectedProvince,
        city: selectedCity,
        visit_date: visitDate || null,
        story: uploadStory,
        photos: uploadPhotos,
      });
      setShowUploadPanel(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
    setSaving(false);
  };

  const canSave = selectedProvince && selectedCity;

  return (
    <div style={{
      width: '100vw', height: '100%', overflow: 'hidden', position: 'relative',
      background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)',
      color: 'white',
    }}>
      {/* China Map */}
      <ChinaMap onProvinceSelect={handleProvinceSelect} />

      {/* "点亮地图" button — bottom right */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={handleOpenUpload}
        style={{
          position: 'absolute', bottom: 80, right: 32,
          zIndex: 200, padding: '14px 28px', borderRadius: 28,
          background: 'linear-gradient(135deg, #FFB84D 0%, #FF8FAB 100%)',
          border: 'none', color: '#fff', fontSize: 16, fontWeight: 600,
          letterSpacing: '0.08em', cursor: 'pointer',
          boxShadow: '0 4px 28px rgba(255,184,77,0.45)',
          fontFamily: "'PingFang SC', sans-serif",
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        }}
        onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.05)'; e.currentTarget.style.boxShadow = '0 6px 36px rgba(255,184,77,0.6)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 28px rgba(255,184,77,0.45)'; }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10"/>
          <path d="M2 12h20"/>
        </svg>
        点亮地图
      </motion.button>

      {/* Upload panel */}
      <AnimatePresence>
        {showUploadPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', inset: 0, zIndex: 500,
              background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
            onClick={() => setShowUploadPanel(false)}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              style={{
                width: 'min(440px, 92vw)', maxHeight: '85vh', overflow: 'auto',
                background: 'linear-gradient(180deg, rgba(13,21,37,0.98) 0%, rgba(10,15,26,0.98) 100%)',
                borderRadius: 16, border: '1px solid rgba(255,255,255,0.1)',
                padding: '28px 24px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h3 style={{ margin: 0, color: '#FFB84D', fontSize: 20, fontWeight: 700 }}>点亮地图</h3>
                <button
                  onClick={() => setShowUploadPanel(false)}
                  style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: 'rgba(255,255,255,0.6)', fontSize: 18, cursor: 'pointer', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >✕</button>
              </div>

              {/* Province dropdown */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                <div>
                  <label style={labelStyle}>省份</label>
                  <select
                    value={selectedProvince}
                    onChange={e => handleProvinceChange(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">选择省份</option>
                    {PROVINCES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>

                {/* City dropdown */}
                <div>
                  <label style={labelStyle}>城市</label>
                  <select
                    value={selectedCity}
                    onChange={e => setSelectedCity(e.target.value)}
                    style={selectStyle}
                    disabled={!selectedProvince}
                  >
                    <option value="">{selectedProvince ? '选择城市' : '先选省份'}</option>
                    {cityOptions.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Date picker */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>日期</label>
                <input
                  type="date"
                  value={visitDate}
                  onChange={e => setVisitDate(e.target.value)}
                  style={{
                    ...inputBaseStyle,
                    colorScheme: 'dark',
                  }}
                />
              </div>

              {/* Photo upload */}
              <div style={{ marginBottom: 20 }}>
                <label style={labelStyle}>上传照片</label>
                {uploadPhotos.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                    {uploadPhotos.map((url, i) => (
                      <div key={i} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '2px solid rgba(255,255,255,0.1)' }}>
                        <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        <button
                          onClick={() => setUploadPhotos(prev => prev.filter((_, j) => j !== i))}
                          style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', fontSize: 14, cursor: 'pointer', width: 24, height: 24, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >✕</button>
                      </div>
                    ))}
                  </div>
                )}
                <label style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', borderRadius: 20,
                  background: 'rgba(255,184,77,0.15)', border: '1px solid rgba(255,184,77,0.3)',
                  color: '#FFB84D', cursor: 'pointer', fontSize: 13,
                }}>
                  {uploading ? '上传中...' : '+ 添加照片'}
                  <input type="file" accept="image/*" multiple onChange={handleFileUpload} style={{ display: 'none' }} disabled={uploading} />
                </label>
              </div>

              {/* Story */}
              <div style={{ marginBottom: 24 }}>
                <label style={labelStyle}>我们的故事</label>
                <textarea
                  value={uploadStory}
                  onChange={e => setUploadStory(e.target.value)}
                  placeholder="在这里写下关于这次旅行的回忆..."
                  style={{
                    ...inputBaseStyle,
                    minHeight: 100, resize: 'vertical',
                  }}
                />
              </div>

              <button
                onClick={handleSaveMemory}
                disabled={saving || !canSave}
                style={{
                  width: '100%', padding: '12px',
                  background: saving || !canSave
                    ? 'rgba(255,255,255,0.1)'
                    : 'linear-gradient(135deg, #FFB84D 0%, #FF8FAB 100%)',
                  border: 'none', borderRadius: 12,
                  cursor: saving || !canSave ? 'default' : 'pointer',
                  color: '#fff', fontSize: 15, fontWeight: 600,
                  fontFamily: "'PingFang SC', sans-serif",
                }}
              >
                {saving ? '保存中...' : '保存记忆'}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const labelStyle = {
  display: 'block', color: 'rgba(255,255,255,0.7)', fontSize: 13,
  marginBottom: 8, fontWeight: 500,
};

const inputBaseStyle = {
  width: '100%', padding: '10px 14px',
  background: 'rgba(255,255,255,0.06)',
  border: '1px solid rgba(255,255,255,0.15)',
  borderRadius: 10, color: '#fff', fontSize: 14,
  outline: 'none', boxSizing: 'border-box',
  fontFamily: "'PingFang SC', sans-serif",
};

const selectStyle = {
  ...inputBaseStyle,
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e")`,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 12px center',
  paddingRight: 36,
};
