import React from 'react';
import '../style.css';

const Navbar = ({ activeTab, setTab, isMobile, isDarkMode }) => {
    const tabs = [
        { id: 'keywords', label: '知你' },
        { id: 'towhere', label: '寻光' },
        { id: 'breaking', label: '初时' },
    ];
    return (
        React.createElement('nav', { className: 'fixed-navbar' + (isDarkMode ? ' dark-mode' : '') },
            React.createElement('div', { className: 'navbar-container' },
                tabs.map((tab) =>
                    React.createElement('button', {
                        key: tab.id,
                        className: 'nav-tab' + (activeTab === tab.id ? ' active' : ''),
                        onClick: () => setTab(tab.id)
                    }, tab.label)
                )
            )
        )
    );
};

export default Navbar;
