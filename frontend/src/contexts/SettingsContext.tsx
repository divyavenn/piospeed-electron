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
  strategiesFolder: null,
  nodeBookFolder: null,
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
        // Load saved paths
        const solverPath = await window.electron.getSolverPath();
        const cfrFolder = await window.electron.getFolderPath({ key: 'cfrFolder' });
        const strategiesFolder = await window.electron.getFolderPath({ key: 'strategiesFolder' });
        const nodeBookFolder = await window.electron.getFolderPath({ key: 'nodeBookFolder' });
        
        // Load accuracy
        const accuracyStr = await window.electron.getFolderPath({ key: 'accuracy' });
        const accuracy = accuracyStr ? parseFloat(accuracyStr) : 0.02;
        
        setSettings({
          solverPath,
          cfrFolder,
          strategiesFolder,
          nodeBookFolder,
          accuracy,
        });
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to electron-store
  const saveSettings = async (newSettings: AppSettings) => {
    try {
      // Save all paths
      if (newSettings.solverPath) {
        await window.electron.saveFolderPath({ key: 'solverPath', path: newSettings.solverPath });
      }
      
      if (newSettings.cfrFolder) {
        await window.electron.saveFolderPath({ key: 'cfrFolder', path: newSettings.cfrFolder });
      }
      
      if (newSettings.strategiesFolder) {
        await window.electron.saveFolderPath({ key: 'strategiesFolder', path: newSettings.strategiesFolder });
      }
      
      if (newSettings.nodeBookFolder) {
        await window.electron.saveFolderPath({ key: 'nodeBookFolder', path: newSettings.nodeBookFolder });
      }
      
      // Save accuracy
      await window.electron.saveFolderPath({ 
        key: 'accuracy', 
        path: newSettings.accuracy.toString() 
      });
      
      // Update state
      setSettings(newSettings);
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