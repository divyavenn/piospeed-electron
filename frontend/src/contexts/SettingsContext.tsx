import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings } from '../components/Settings/SettingsModal';

interface SettingsContextType {
  settings: AppSettings;
  saveSettings: (settings: AppSettings) => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
  solverPath: null,
  cfrFolder: null,
  weights: null,
  nodeBook: null,
  accuracy: 0.02,
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load settings on initial render
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        
        // Load all settings at once using the new method
        const savedSettings = await window.electron.retrieveSettings();
        
        setSettings({
          solverPath: savedSettings.solverPath || null,
          cfrFolder: savedSettings.cfrFolder || null,
          weights: savedSettings.weights || null,
          nodeBook: savedSettings.nodeBook || null,
          accuracy: savedSettings.accuracy || 0.02,
        });
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Save settings to electron-store
  const saveSettings = async (newSettings: AppSettings) => {
    try {
      // Save all settings at once using the new method
      const result = await window.electron.setSettings(newSettings);
      
      if (result.success) {
        // Update state
        setSettings(newSettings);
      } else {
        console.error('Failed to save settings:', result.error);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        saveSettings,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};