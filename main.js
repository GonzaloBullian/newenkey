// main.js — NewenKey · by gbull (Win + Mac) + Text Expansion + Auto-start
const { app, BrowserWindow, globalShortcut, Tray, Menu, ipcMain, clipboard, shell, nativeImage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');

const IS_MAC = process.platform === 'darwin';
let mainWindow, tray, shortcutsCache = [], keyBuffer = '', uioHook = null, expansionEnabled = true;

// ═══ CONFIG ═══
const CONFIG_PATH = path.join(app.getPath('userData'), 'shortcuts.json');
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json');

function loadShortcuts() { try { if (fs.existsSync(CONFIG_PATH)) { shortcutsCache = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); return shortcutsCache; } } catch(e) { console.error('[NK]', e.message); } return []; }
function saveShortcuts(s) { try { fs.writeFileSync(CONFIG_PATH, JSON.stringify(s, null, 2)); shortcutsCache = s; rebuildExpansionTriggers(); } catch(e) { console.error('[NK]', e.message); } }

function loadSettings() { try { if (fs.existsSync(SETTINGS_PATH)) return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8')); } catch(e) {} return { autoStart: false }; }
function saveSettings(s) { try { fs.writeFileSync(SETTINGS_PATH, JSON.stringify(s, null, 2)); } catch(e) {} }

// ═══ AUTO-START ═══
function setAutoStart(enabled) {
  app.setLoginItemSettings({ openAtLogin: enabled, path: app.getPath('exe') });
  const settings = loadSettings();
  settings.autoStart = enabled;
  saveSettings(settings);
  console.log(`[NK] Auto-start: ${enabled}`);
}

// ═══ PLATFORM HELPERS ═══
function simulatePaste() {
  if (IS_MAC) exec(`osascript -e 'tell application "System Events" to keystroke "v" using command down'`);
  else exec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^v')"`);
}
function simulateCopy() {
  return new Promise(resolve => {
    const cmd = IS_MAC ? `osascript -e 'tell application "System Events" to keystroke "c" using command down'` : `powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('^c')"`;
    exec(cmd, () => setTimeout(resolve, 150));
  });
}
function simulateBackspaces(count) {
  return new Promise(resolve => {
    if (IS_MAC) exec(`osascript -e 'tell application "System Events"\n${Array(count).fill('  key code 51').join('\n')}\nend tell'`, () => setTimeout(resolve, 50));
    else exec(`powershell -command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('${Array(count).fill('{BS}').join('')}')"`, () => setTimeout(resolve, 50));
  });
}

// ═══ TEXT EXPANSION ═══
let expansionTriggers = {};
function rebuildExpansionTriggers() {
  expansionTriggers = {};
  shortcutsCache.filter(s => s.type === 'expansion' && s.enabled && s.trigger).forEach(s => {
    expansionTriggers[s.trigger.toLowerCase()] = { text: s.snippetText || '', id: s.id, trigger: s.trigger };
  });
  console.log(`[NK] ${Object.keys(expansionTriggers).length} expansions`);
}

const KEYCODE_MAP = {
  30:'a',48:'b',46:'c',32:'d',18:'e',33:'f',34:'g',35:'h',23:'i',36:'j',37:'k',38:'l',50:'m',
  49:'n',24:'o',25:'p',16:'q',19:'r',31:'s',20:'t',22:'u',47:'v',17:'w',45:'x',21:'y',44:'z',
  2:'1',3:'2',4:'3',5:'4',6:'5',7:'6',8:'7',9:'8',10:'9',11:'0',
  57:' ',51:',',52:'.',12:'-',53:'/',39:';',40:"'",26:'[',27:']',43:'\\'
};
const SHIFT_MAP_ES = { 2:'!',3:'"',5:'%',6:'&',8:'/',9:'(',10:')',11:'=',12:'?',51:';',52:':' };
const ALTGR_MAP_ES = { 3:'@',4:'#',26:'[',27:']',43:'\\',12:'\\' };

function initTextExpansion() {
  if (IS_MAC) {
    console.log('[NK] Text expansion: skipped on macOS (using hotkeys only)');
    return;
  }
  try {
    const { uIOhook } = require('uiohook-napi');
    uioHook = uIOhook;
    uioHook.on('keydown', (e) => {
      if (!expansionEnabled) return;
      if (e.keycode === 28 || e.keycode === 15 || e.keycode === 1) { keyBuffer = ''; return; }
      if (e.keycode === 14) { keyBuffer = keyBuffer.slice(0, -1); return; }
      if (e.keycode === 57) { checkAndExpand(keyBuffer); keyBuffer = ''; return; }
      let ch = null;
      const hasAltGr = e.ctrlKey && e.altKey;
      if (hasAltGr && ALTGR_MAP_ES[e.keycode]) ch = ALTGR_MAP_ES[e.keycode];
      else if (e.shiftKey && SHIFT_MAP_ES[e.keycode]) ch = SHIFT_MAP_ES[e.keycode];
      else { ch = KEYCODE_MAP[e.keycode]; if (!ch) return; if (e.shiftKey && ch.length === 1 && ch >= 'a' && ch <= 'z') ch = ch.toUpperCase(); }
      keyBuffer += ch;
      if (keyBuffer.length > 50) keyBuffer = keyBuffer.slice(-50);
      const lower = keyBuffer.toLowerCase();
      for (const trigger of Object.keys(expansionTriggers)) { if (lower.endsWith(trigger)) { expandTrigger(trigger, expansionTriggers[trigger]); keyBuffer = ''; return; } }
    });
    uioHook.start();
    console.log('[NK] Text expansion started');
  } catch(e) { console.error('[NK] uiohook failed:', e.message); }
}

function checkAndExpand(buf) { const m = expansionTriggers[buf.toLowerCase().trim()]; if (m) expandTrigger(buf.toLowerCase().trim(), m); }
async function expandTrigger(trigger, data) {
  console.log(`[NK] Expand: ${trigger}`);
  await simulateBackspaces(trigger.length + 1);
  await new Promise(r => setTimeout(r, 80));
  const prev = clipboard.readText();
  clipboard.writeText(data.text);
  simulatePaste();
  setTimeout(() => clipboard.writeText(prev), 600);
  if (mainWindow && !mainWindow.isDestroyed()) mainWindow.webContents.send('expansion:fired', { trigger });
}

// ═══ HOTKEYS ═══
const MOD = { Ctrl:'CommandOrControl',Cmd:'CommandOrControl',Shift:'Shift',Alt:IS_MAC?'Option':'Alt',Option:'Option',Win:'Super',Meta:'Super' };
const SURL = { google:'https://www.google.com/search?q=',maps:'https://www.google.com.ar/maps/search/',youtube:'https://www.youtube.com/results?search_query=',amazon:'https://www.amazon.com/s?k=',twitter:'https://twitter.com/search?q=',linkedin:'https://www.linkedin.com/search/results/all/?keywords=' };

function registerAllShortcuts(shortcuts) {
  globalShortcut.unregisterAll();
  let count = 0;
  shortcuts.filter(s => s.enabled && s.type !== 'expansion').forEach(s => {
    try {
      const accel = s.keys.map(k => MOD[k] || k).join('+');
      globalShortcut.register(accel, async () => {
        if (s.type === 'snippet') { const p = clipboard.readText(); clipboard.writeText(s.snippetText || ''); simulatePaste(); setTimeout(() => clipboard.writeText(p), 600); }
        else if (s.type === 'open') { s.openTarget.startsWith('http') ? shell.openExternal(s.openTarget) : shell.openPath(s.openTarget); }
        else if (s.type === 'search') { await simulateCopy(); const q = clipboard.readText(); if (!q) return; const u = s.searchEngine === 'custom' ? (s.customUrl || '').replace('{query}', encodeURIComponent(q)) : (SURL[s.searchEngine] || SURL.google) + encodeURIComponent(q); shell.openExternal(u); }
        else if (s.type === 'command') { exec(s.commandText, IS_MAC ? { shell: '/bin/zsh' } : {}, () => {}); }
      });
      count++;
    } catch(e) { console.error(`[NK] Failed: ${s.name}`, e.message); }
  });
  console.log(`[NK] ${count} hotkeys`);
}

// ═══ WINDOW ═══
function createWindow() {
  const cfg = {
    width: 1100, height: 750, minWidth: 800, minHeight: 600,
    backgroundColor: '#070b14', show: false,
    webPreferences: { nodeIntegration: false, contextIsolation: true, preload: path.join(__dirname, 'preload.js') },
    icon: path.join(__dirname, 'assets', IS_MAC ? 'icon.png' : 'icon.ico'),
  };
  if (IS_MAC) {
    cfg.titleBarStyle = 'hiddenInset';
    cfg.trafficLightPosition = { x: 16, y: 12 };
  } else {
    cfg.frame = false;
  }
  mainWindow = new BrowserWindow(cfg);
  if (process.env.NODE_ENV === 'development') mainWindow.loadURL('http://localhost:5173');
  else mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('close', (e) => { if (!app.isQuiting) { e.preventDefault(); mainWindow.hide(); } });
}

// ═══ TRAY ═══
function createTray() {
  const trayIconPath = path.join(__dirname, 'assets', 'icon.png');
  let trayIcon = nativeImage.createFromPath(trayIconPath);
  trayIcon = trayIcon.resize({ width: 16, height: 16 });
  tray = new Tray(trayIcon);
  tray.setToolTip('NewenKey · by gbull');
  let paused = false;
  const build = () => Menu.buildFromTemplate([
    { label: '⚡ Abrir NewenKey', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: paused ? '▶️ Reanudar' : '⏸ Pausar', click: () => { paused = !paused; paused ? (globalShortcut.unregisterAll(), expansionEnabled = false) : (registerAllShortcuts(shortcutsCache), expansionEnabled = true); tray.setContextMenu(build()); } },
    { label: `${shortcutsCache.filter(s=>s.enabled).length} atajos`, enabled: false },
    { type: 'separator' },
    { label: '❌ Salir', click: () => { app.isQuiting = true; globalShortcut.unregisterAll(); if(uioHook) uioHook.stop(); app.quit(); } },
  ]);
  tray.setContextMenu(build());
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

// ═══ IPC ═══
ipcMain.handle('shortcuts:load', () => loadShortcuts());
ipcMain.handle('shortcuts:save', (_, d) => { saveShortcuts(d); registerAllShortcuts(d); return true; });
ipcMain.handle('platform:get', () => ({ isMac: IS_MAC, isWin: !IS_MAC }));
ipcMain.handle('settings:load', () => loadSettings());
ipcMain.handle('settings:setAutoStart', (_, enabled) => { setAutoStart(enabled); return true; });
ipcMain.handle('window:minimize', () => mainWindow.minimize());
ipcMain.handle('window:maximize', () => { mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize(); });
ipcMain.handle('window:close', () => mainWindow.hide());
ipcMain.handle('export:ahk', async (_, script) => {
  const r = await dialog.showSaveDialog(mainWindow, { defaultPath: 'newenkey.ahk', filters: [{ name: 'AHK', extensions: ['ahk'] }] });
  if (!r.canceled && r.filePath) { fs.writeFileSync(r.filePath, script); return true; } return false;
});
ipcMain.handle('export:json', async (_, data) => {
  const r = await dialog.showSaveDialog(mainWindow, { defaultPath: 'newenkey-shortcuts.json', filters: [{ name: 'NewenKey Pack', extensions: ['json'] }] });
  if (!r.canceled && r.filePath) { fs.writeFileSync(r.filePath, data); return true; } return false;
});
ipcMain.handle('import:json', async () => {
  const r = await dialog.showOpenDialog(mainWindow, { filters: [{ name: 'NewenKey Pack', extensions: ['json'] }], properties: ['openFile'] });
  if (!r.canceled && r.filePaths.length > 0) {
    try { const raw = fs.readFileSync(r.filePaths[0], 'utf8'); const parsed = JSON.parse(raw); if (Array.isArray(parsed)) return parsed; return null; }
    catch(e) { console.error('[NK] Import error:', e.message); return null; }
  }
  return null;
});

// ═══ LIFECYCLE ═══
const lock = app.requestSingleInstanceLock();
if (!lock) app.quit();
else {
  app.on('second-instance', () => { if(mainWindow) { if(mainWindow.isMinimized()) mainWindow.restore(); mainWindow.show(); mainWindow.focus(); } });
  app.whenReady().then(() => {
    createWindow(); createTray();
    const sc = loadShortcuts();
    if (sc.length > 0) { registerAllShortcuts(sc); rebuildExpansionTriggers(); }
    initTextExpansion();
    console.log(`[NK] NewenKey ready. ${process.platform}`);
  });
}
app.on('window-all-closed', () => { if(!IS_MAC) app.quit(); });
app.on('before-quit', () => { app.isQuiting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); if(uioHook) uioHook.stop(); });
