import React, { useState, useEffect, useCallback } from 'react';
import Story from './pages/Story';
import End from './pages/End';
import CityDetail from './pages/CityDetail';
import ProvinceDetail from './pages/ProvinceDetail';
import EnergyStation from './pages/EnergyStation';
import { EnergyProvider } from './context/EnergyContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import StarshipWidget from './components/game/StarshipWidget';
import Navbar from './components/Navbar';
import KeywordsParticle from './components/KeywordsParticle';
import PinkAnimationHome from './components/PinkAnimationHome';
import FirstsTimeline from './components/firsts/FirstsTimeline';
import HeroSection from './components/HeroSection';
import LettersModule from './components/letters/LettersModule';
import ProfileMenu from './components/ProfileMenu';
import MusicPlayer from './components/MusicPlayer';
import LoginPage from './components/LoginPage';

function MainApp() {
  const { user } = useAuth();
  const [page, setPage] = useState('home');
  const [selectedCity, setSelectedCity] = useState(null);
  const [selectedProvince, setSelectedProvince] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [activeTab, setActiveTab] = useState(window.innerWidth < 768 ? 'towhere' : 'towhere');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (mobile && activeTab === 'keywords') setActiveTab('towhere');
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [activeTab]);

  const setTabWithHash = useCallback((tab) => {
    window.location.hash = tab;
    setActiveTab(tab);
  }, []);

  const handleSetTab = useCallback((tab) => setTabWithHash(tab), [setTabWithHash]);
  const goTo = useCallback((p) => setPage(p), []);
  const goToCity = useCallback((cityName) => { setSelectedCity(cityName); setPage('city'); }, []);
  const goToProvince = useCallback((provinceName) => { setSelectedProvince(provinceName); setPage('province'); }, []);
  const goBackToGlobe = useCallback(() => { setSelectedCity(null); setPage('home'); handleSetTab('towhere'); }, [handleSetTab]);
  const goBackToMap = useCallback(() => { setSelectedProvince(null); setPage('home'); handleSetTab('towhere'); }, [handleSetTab]);

  // 未登录 → 显示登录页
  if (!user) {
    return React.createElement(LoginPage, null);
  }

  return React.createElement(EnergyProvider, null,
    React.createElement('div', { style: { width: '100%', height: '100%', margin: 0, padding: 0 } },
      page === 'home' || page === 'city' || page === 'province' ? React.createElement('div', { style: { display: (page === 'city' || page === 'province') ? 'none' : 'block', width: '100%', height: '100%' } },
        !isMobile ? React.createElement(React.Fragment, null,
          React.createElement(Navbar, { activeTab, setTab: handleSetTab, isMobile, isDarkMode: ['letters'].includes(activeTab) }),
          React.createElement(ProfileMenu, { onGoWhisper: () => handleSetTab('letters'), isLettersActive: activeTab === 'letters' })
        ) : null,
        React.createElement('div', { className: 'page-content' },
          activeTab === 'keywords' && !isMobile ? React.createElement(KeywordsParticle, null) : null,
          activeTab === 'towhere' ? React.createElement(PinkAnimationHome, { goTo, goToCity, goToProvince, isCityMode: page === 'city', isMobile }) : null,
          activeTab === 'breaking' ? React.createElement(FirstsTimeline, null) : null,
          activeTab === 'letters' && !isMobile ? React.createElement(LettersModule, null) : null
        ),
        activeTab === 'keywords' && !isMobile ? React.createElement(StarshipWidget, null) : null
      ) : null,
      page === 'story' ? React.createElement(Story, { goTo }) : null,
      page === 'end' ? React.createElement(End, { goTo }) : null,
      page === 'city' && selectedCity ? React.createElement('div', { style: { position: 'absolute', top: 0, left: 0, width: '100vw', height: '100%', zIndex: 9999, background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)' } },
        React.createElement(CityDetail, { cityName: selectedCity, goBack: goBackToGlobe })
      ) : null,
      page === 'province' && selectedProvince ? React.createElement('div', { style: { position: 'absolute', top: 0, left: 0, width: '100vw', height: '100%', zIndex: 9999, background: 'linear-gradient(135deg, #0a0f1a 0%, #0d1525 40%, #111d35 100%)' } },
        React.createElement(ProvinceDetail, { provinceName: selectedProvince, goBack: goBackToMap })
      ) : null,
      page === 'annual' ? React.createElement(EnergyStation, { goTo }) : null,
      React.createElement(MusicPlayer, null)
    )
  );
}

export default function App() {
  return React.createElement(AuthProvider, null,
    React.createElement(MainApp, null)
  );
}
