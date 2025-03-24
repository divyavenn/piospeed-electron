import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';

/**
 * Get the appropriate Python executable based on platform
 */
export function getPythonExecutable(): string {
  switch (process.platform) {
    case 'win32':
      return 'python';
    case 'darwin':
      // On macOS we prefer python3 explicitly
      return 'python3';
    case 'linux':
      // On Linux we prefer python3 explicitly
      return 'python3';
    default:
      // Default to python3 for unknown platforms
      return 'python3';
  }
}

/**
 * Get paths for embedded Python if available
 */
export function getEmbeddedPythonPath(): string | null {
  if (app.isPackaged) {
    const resourcesPath = process.resourcesPath;
    
    // Check different possibilities based on platform
    if (process.platform === 'win32') {
      const embeddedPath = path.join(resourcesPath, 'python', 'python.exe');
      if (fs.existsSync(embeddedPath)) {
        return embeddedPath;
      }
    } else if (process.platform === 'darwin') {
      const embeddedPath = path.join(resourcesPath, 'python', 'bin', 'python3');
      if (fs.existsSync(embeddedPath)) {
        return embeddedPath;
      }
    } else if (process.platform === 'linux') {
      const embeddedPath = path.join(resourcesPath, 'python', 'bin', 'python3');
      if (fs.existsSync(embeddedPath)) {
        return embeddedPath;
      }
    }
  }
  
  return null;
}

/**
 * Checks if Python is installed on the system
 */
export async function checkPythonInstalled(): Promise<boolean> {
  try {
    // Check for embedded Python first
    const embeddedPython = getEmbeddedPythonPath();
    if (embeddedPython) {
      console.log(`Using embedded Python at: ${embeddedPython}`);
      return true;
    }
    
    // Fall back to system Python
    const pythonExecutable = getPythonExecutable();
    
    return new Promise((resolve) => {
      const pythonProcess = spawn(pythonExecutable, ['-c', 'import sys; print(sys.version)']);
      
      let output = '';
      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          console.log(`Python is installed: ${output.trim()}`);
          resolve(true);
        } else {
          console.log('Python is not installed or not in PATH');
          resolve(false);
        }
      });
      
      pythonProcess.on('error', () => {
        console.log('Error checking Python installation');
        resolve(false);
      });
    });
  } catch (error) {
    console.error('Error checking Python:', error);
    return false;
  }
}

/**
 * Installs Python dependencies if needed
 */
export async function installPythonDependencies(appPath: string): Promise<boolean> {
  try {
    // Try embedded Python first, fall back to system Python
    const pythonExecutable = getEmbeddedPythonPath() || getPythonExecutable();
    
    // Find the requirements.txt file
    let requirementsPath = path.join(appPath, 'python', 'requirements.txt');
    
    if (!fs.existsSync(requirementsPath)) {
      // Try alternate locations
      const alternateLocations = [
        path.join(process.resourcesPath, 'python', 'requirements.txt'),
        path.join(appPath, 'resources', 'python', 'requirements.txt')
      ];
      
      for (const location of alternateLocations) {
        if (fs.existsSync(location)) {
          requirementsPath = location;
          break;
        }
      }
    }
    
    if (!fs.existsSync(requirementsPath)) {
      console.error('requirements.txt not found');
      return false;
    }
    
    return new Promise((resolve) => {
      console.log(`Installing Python dependencies from ${requirementsPath}`);
      
      const pipArgs = ['-m', 'pip', 'install', '-r', requirementsPath];
      
      // If we're using embedded Python, we need to use the absolute path
      const pipProcess = typeof pythonExecutable === 'string' 
        ? spawn(pythonExecutable, pipArgs)
        : spawn(pythonExecutable, pipArgs);
      
      pipProcess.stdout.on('data', (data) => {
        console.log(`pip stdout: ${data.toString()}`);
      });
      
      pipProcess.stderr.on('data', (data) => {
        console.error(`pip stderr: ${data.toString()}`);
      });
      
      pipProcess.on('close', (code) => {
        if (code === 0) {
          console.log('Python dependencies installed successfully');
          resolve(true);
        } else {
          console.error(`pip install failed with code ${code}`);
          resolve(false);
        }
      });
      
      pipProcess.on('error', (err) => {
        console.error('Error installing Python dependencies:', err);
        resolve(false);
      });
    });
  } catch (error) {
    console.error('Error installing Python dependencies:', error);
    return false;
  }
} 