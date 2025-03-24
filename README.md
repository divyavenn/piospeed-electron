# PioSpeed Electron

A desktop application for PioSOLVER integration with an Electron-based interface.

## Requirements

- [Node.js](https://nodejs.org/) (v14 or higher)
- [Python 3](https://www.python.org/downloads/) (3.7 or higher)
- [npm](https://www.npmjs.com/) (usually comes with Node.js)

## Installation

### Clone the repository

```bash
git clone https://your-repository-url/piospeed-electron.git
cd piospeed-electron
```

### Install dependencies

```bash
cd frontend
npm install
```

## Development

### Running in development mode

```bash
cd frontend
npm run dev
```

This will start the development server and launch the Electron app.

## Building for Production

### Build for all platforms

```bash
cd frontend
```

#### On macOS/Linux:
```bash
./build-electron.sh
```

#### On Windows:
```bash
build-electron.bat
```

### Build for specific platforms

#### For Windows
```bash
cd frontend
npm run build:win
```

#### For macOS
```bash
cd frontend
npm run build:mac
```

#### For Linux
```bash
cd frontend
npm run build:linux
```

## Structure

- `/frontend` - Electron and React frontend application
  - `/electron` - Electron main process code
  - `/src` - React application source
  - `/python` - Python scripts integrated with Electron
  - `/public` - Static assets and mapping files

## Python Integration

The app bundles Python scripts and manages Python dependencies automatically. When the app starts, it:

1. Checks if Python is installed
2. Installs required Python dependencies if needed
3. Sets up communication between the Electron frontend and Python backend

## Troubleshooting

### Python Issues

- Ensure Python 3 is installed and in your PATH
- If dependencies fail to install, try manually running:
  ```
  pip install -r frontend/python/requirements.txt
  ```

### Build Issues

- Clear the `dist` and `dist-electron` directories and try building again
- Update Node.js and npm to the latest versions
- On macOS, you might need to install additional certificates for code signing

## License

MIT
