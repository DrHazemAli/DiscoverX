/**
 * ============================================================================
 * DISCOVER: App Context
 * Description: Global application state (compact mode, animations, effects)
 * ============================================================================
 */

'use client';

import * as React from 'react';

// ============================================================================
// Types
// ============================================================================

interface AppSettings {
  compactMode: boolean;
  reducedMotion: boolean;
  soundEffects: boolean;
  visualEffects: boolean;
  sidebarCollapsed: boolean;
}

interface AppContextValue {
  settings: AppSettings;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  toggleCompactMode: () => void;
  toggleReducedMotion: () => void;
  toggleVisualEffects: () => void;
  toggleSidebar: () => void;
  isCommandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
}

// ============================================================================
// Default Values
// ============================================================================

const defaultSettings: AppSettings = {
  compactMode: false,
  reducedMotion: false,
  soundEffects: false,
  visualEffects: true,
  sidebarCollapsed: false,
};

// ============================================================================
// Context
// ============================================================================

const AppContext = React.createContext<AppContextValue | undefined>(undefined);

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEY = 'discover-app-settings';

// ============================================================================
// Provider Component
// ============================================================================

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = React.useState<AppSettings>(defaultSettings);
  const [isCommandPaletteOpen, setCommandPaletteOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  // Load settings from localStorage on mount
  React.useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setSettings((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // Ignore parse errors
    }

    // Check for system reduced motion preference
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mediaQuery.matches) {
      setSettings((prev) => ({ ...prev, reducedMotion: true }));
    }
  }, []);

  // Persist settings to localStorage
  React.useEffect(() => {
    if (mounted) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      } catch {
        // Ignore storage errors
      }
    }
  }, [settings, mounted]);

  // Apply compact mode class to document
  React.useEffect(() => {
    if (mounted) {
      document.documentElement.classList.toggle('compact', settings.compactMode);
      document.documentElement.classList.toggle('reduced-motion', settings.reducedMotion);
      document.documentElement.classList.toggle('visual-effects', settings.visualEffects);
    }
  }, [settings.compactMode, settings.reducedMotion, settings.visualEffects, mounted]);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K for command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
      // Escape to close command palette
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  const updateSetting = React.useCallback(
    <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
      setSettings((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleCompactMode = React.useCallback(() => {
    setSettings((prev) => ({ ...prev, compactMode: !prev.compactMode }));
  }, []);

  const toggleReducedMotion = React.useCallback(() => {
    setSettings((prev) => ({ ...prev, reducedMotion: !prev.reducedMotion }));
  }, []);

  const toggleVisualEffects = React.useCallback(() => {
    setSettings((prev) => ({ ...prev, visualEffects: !prev.visualEffects }));
  }, []);

  const toggleSidebar = React.useCallback(() => {
    setSettings((prev) => ({ ...prev, sidebarCollapsed: !prev.sidebarCollapsed }));
  }, []);

  const value: AppContextValue = {
    settings,
    updateSetting,
    toggleCompactMode,
    toggleReducedMotion,
    toggleVisualEffects,
    toggleSidebar,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

export function useApp() {
  const context = React.useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// ============================================================================
// Optional Hook (doesn't throw)
// ============================================================================

export function useAppOptional() {
  return React.useContext(AppContext);
}
