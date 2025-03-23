import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppSettings } from '../components/Settings/SettingsModal';

interface SettingsContextType {
  settings: AppSettings;
  saveSettings: (settings: AppSettings) => Promise<void>;
  isFirstLaunch: boolean;
  setFirstLaunchComplete: () => Promise<void>;
  isLoading: boolean;
}

const defaultSettings: AppSettings = {
  solverPath: null,
  cfrFolder: null,
  strategiesFolder: null,
  nodeBookFolder: null,
  accuracy: 0.02,
};

const SettingsContext = createContext<SettingsContextType>({
  settings: defaultSettings,
  saveSettings: async () => {},
  isFirstLaunch: true,
  setFirstLaunchComplete: async () => {},
  isLoading: true,
});

export const useSettings = () => useContext(SettingsContext);

interface SettingsProviderProps {
  children: React.ReactNode;
}

export const SettingsProvider: React.FC<SettingsProviderProps> = ({ children }) => {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load settings on initial render
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Check if this is the first launch
        const hasCompletedSetup = await window.electron.getFolderPath({ key: 'hasCompletedSetup' });
        
        if (hasCompletedSetup === 'true') {
          setIsFirstLaunch(false);
          
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
        } else {
          setIsFirstLaunch(true);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setIsFirstLaunch(true);
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

  // Mark first launch as complete
  const setFirstLaunchComplete = async () => {
    try {
      await window.electron.saveFolderPath({ key: 'hasCompletedSetup', path: 'true' });
      setIsFirstLaunch(false);
    } catch (error) {
      console.error('Error saving setup status:', error);
      throw error;
    }
  };

  return (
    <SettingsContext.Provider
      value={{
        settings,
        saveSettings,
        isFirstLaunch,
        setFirstLaunchComplete,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}; 