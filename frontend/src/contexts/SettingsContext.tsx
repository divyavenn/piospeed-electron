import React, { createContext, useContext, useState, useEffect } from 'react';

export interface AppSettings {
  solverPath: string | null;
  cfrFolder: string | null;
  weights: string | null;
  nodeBook: string | null;
  accuracy: number;
  resultsPath: string | null;
}

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (newSettings: AppSettings) => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: AppSettings = {
  solverPath: null,
  cfrFolder: null,
  weights: null,
  nodeBook: null,
  accuracy: 0.02,
  resultsPath: null,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedSettings = await window.electron.getSettings();
        setSettings({
          solverPath: savedSettings.solverPath || null,
          cfrFolder: savedSettings.cfrFolder || null,
          weights: savedSettings.weights || null,
          nodeBook: savedSettings.nodeBook || null,
          accuracy: savedSettings.accuracy || 0.02,
          resultsPath: savedSettings.resultsPath || null,
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateSettings = async (newSettings: AppSettings) => {
    try {
      await window.electron.saveSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
};