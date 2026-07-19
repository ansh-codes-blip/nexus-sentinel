const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const isWin = process.platform === 'win32';

// Fix for Linux Black Screen / Wayland
app.disableHardwareAcceleration();
app.commandLine.appendSwitch('disable-gpu');

let pyProc = null;
let ollamaProc = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: "Nexus Sentinel", // Explicitly set the window title
    icon: path.join(__dirname, '../build/icon.png'), // Set the taskbar icon
    backgroundColor: '#09090b',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  } else {
    win.loadURL('http://localhost:5173');
  }
}


function startOllama() {
  if (ollamaProc) return;
  console.log("Starting Ollama engine (System)...");
  // Use system ollama
  ollamaProc = spawn('ollama', ['serve'], {
    stdio: 'ignore',
    windowsHide: true
  });

  ollamaProc.on('close', (code) => {
    console.log(`Ollama exited with code ${code}`);
    ollamaProc = null;
  });
}

function startPythonBackend() {
  if (pyProc) return;

let exePath;
  const isWin = process.platform === 'win32';

  if (app.isPackaged) {
    // Use the compiled binary
    const exeName = isWin ? 'nexus-backend.exe' : 'nexus-backend';
    exePath = path.join(process.resourcesPath, 'backend', exeName);
  } else {
    // In dev, use venv python
    const scriptPath = path.join(__dirname, '../../backend', 'run.py');
    const venvPython = isWin ? 'Scripts/python.exe' : 'bin/python';
    exePath = path.join(__dirname, '../../backend', 'venv', venvPython);
    pyProc = spawn(exePath, [scriptPath], { stdio: 'ignore', windowsHide: true });
    return;
  }

  console.log(`Starting compiled backend: ${exePath}`);
  pyProc = spawn(exePath, [], {
    stdio: 'ignore',
    windowsHide: true
  });

  pyProc.on('close', (code) => {
    console.log(`Python backend exited with code ${code}`);
    pyProc = null;
  });
}

app.whenReady().then(() => {
  startOllama();
  
  setTimeout(() => {
    startPythonBackend();
  }, 2000);

  setTimeout(() => {
    createWindow();
  }, 4000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (pyProc) pyProc.kill();
  if (ollamaProc) ollamaProc.kill();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});