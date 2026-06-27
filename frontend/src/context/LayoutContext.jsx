import { createContext, useContext, useState, useEffect } from 'react';

const LayoutContext = createContext();

const DEFAULT_SETTINGS = {
  theme: 'dark',
  sidebarColor: 'dark',
  headerColor: 'transparent',
  layoutMode: 'sidebar'
};

export function LayoutProvider({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [themeSettings, setThemeSettings] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('shopmate_settings') || '{}');
      return {
        theme: saved.theme || DEFAULT_SETTINGS.theme,
        sidebarColor: saved.sidebarColor || DEFAULT_SETTINGS.sidebarColor,
        headerColor: saved.headerColor || DEFAULT_SETTINGS.headerColor,
        layoutMode: saved.layoutMode || DEFAULT_SETTINGS.layoutMode
      };
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const toggleSidebar = () => setSidebarOpen(prev => !prev);

  // Apply visual theme settings to the document body
  const applyStyles = (settings) => {
    document.body.className = ''; // Reset class list
    if (settings.theme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.add('dark-theme');
    }
    document.body.setAttribute('data-sidebar', settings.sidebarColor || 'dark');
    document.body.setAttribute('data-header', settings.headerColor || 'transparent');
    document.body.setAttribute('data-layout', settings.layoutMode || 'sidebar');
  };

  useEffect(() => {
    applyStyles(themeSettings);
  }, [themeSettings]);

  const saveThemeSettings = (newSettings) => {
    setThemeSettings(newSettings);
    try {
      const existing = JSON.parse(localStorage.getItem('shopmate_settings') || '{}');
      localStorage.setItem('shopmate_settings', JSON.stringify({ ...existing, ...newSettings }));
    } catch (e) {
      console.error('Failed to save settings:', e);
    }
  };

  return (
    <LayoutContext.Provider value={{
      sidebarOpen,
      setSidebarOpen,
      toggleSidebar,
      themeSettings,
      saveThemeSettings
    }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayout() {
  return useContext(LayoutContext);
}
