import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { Moon, Sun, Monitor, Download, Trash2, Shield, Info, Check, Save } from 'lucide-react';

const Settings = () => {
  const { user } = useAuth();
  
  // Theme state
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'system');
  
  // QR Defaults
  const [defaultFgColor, setDefaultFgColor] = useState('#000000');
  const [defaultBgColor, setDefaultBgColor] = useState('#ffffff');
  const [defaultFormat, setDefaultFormat] = useState('png');
  
  // Scanner preferences
  const [autoOpenLinks, setAutoOpenLinks] = useState(true);
  const [playScanSound, setPlayScanSound] = useState(true);

  // Notice state
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    // Apply theme
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (prefersDark) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.removeItem('theme');
    }
  }, [theme]);

  const handleSave = () => {
    localStorage.setItem('defaultFgColor', defaultFgColor);
    localStorage.setItem('defaultBgColor', defaultBgColor);
    localStorage.setItem('defaultFormat', defaultFormat);
    localStorage.setItem('autoOpenLinks', JSON.stringify(autoOpenLinks));
    localStorage.setItem('playScanSound', JSON.stringify(playScanSound));
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  const handleExportData = () => {
    const data = {
      user: user ? { uid: user.uid, email: user.email } : 'Anonymous',
      settings: { theme, defaultFgColor, defaultBgColor, defaultFormat, autoOpenLinks, playScanSound },
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'nexqr-settings-export.json';
    a.click();
  };

  const handleClearHistory = () => {
    if (confirm('Clear local scan and generation history from this browser?')) {
      localStorage.removeItem('qr_history');
      alert('Local history cleared!');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-center border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage app preferences, themes, and defaults.</p>
        </div>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors shadow-sm"
        >
          {savedNotice ? <Check size={18} /> : <Save size={18} />}
          {savedNotice ? 'Saved!' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Appearance Settings */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Sun className="text-primary" size={20} /> Appearance & Theme
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => setTheme('light')}
              className={`p-4 border rounded-xl flex flex-col items-center gap-2 font-medium text-sm transition-all ${theme === 'light' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'}`}
            >
              <Sun size={24} /> Light Mode
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`p-4 border rounded-xl flex flex-col items-center gap-2 font-medium text-sm transition-all ${theme === 'dark' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'}`}
            >
              <Moon size={24} /> Dark Mode
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`p-4 border rounded-xl flex flex-col items-center gap-2 font-medium text-sm transition-all ${theme === 'system' ? 'border-primary bg-primary/5 text-primary' : 'hover:bg-muted'}`}
            >
              <Monitor size={24} /> System Default
            </button>
          </div>
        </div>

        {/* QR Defaults */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Shield className="text-primary" size={20} /> QR Generation Defaults
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium mb-2">Default Foreground Color</label>
              <input
                type="color"
                value={defaultFgColor}
                onChange={(e) => setDefaultFgColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer border p-1 bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Default Background Color</label>
              <input
                type="color"
                value={defaultBgColor}
                onChange={(e) => setDefaultBgColor(e.target.value)}
                className="w-full h-10 rounded cursor-pointer border p-1 bg-background"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Default Export Format</label>
              <select
                value={defaultFormat}
                onChange={(e) => setDefaultFormat(e.target.value)}
                className="w-full p-2.5 border rounded-xl bg-background text-sm"
              >
                <option value="png">PNG (Raster Image)</option>
                <option value="svg">SVG (Vector Graphic)</option>
                <option value="jpeg">JPG (Standard Image)</option>
                <option value="webp">WEBP (Web Compact)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Scanner Preferences */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Scanner Preferences</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-muted/30">
              <div>
                <p className="font-medium text-sm">Auto-open Scanned Links</p>
                <p className="text-xs text-muted-foreground">Automatically open URLs when scanned by the camera</p>
              </div>
              <input
                type="checkbox"
                checked={autoOpenLinks}
                onChange={(e) => setAutoOpenLinks(e.target.checked)}
                className="w-5 h-5 rounded text-primary"
              />
            </label>
            <label className="flex items-center justify-between p-3 border rounded-xl cursor-pointer hover:bg-muted/30">
              <div>
                <p className="font-medium text-sm">Play Audio Chime</p>
                <p className="text-xs text-muted-foreground">Play a subtle beep sound when a QR code is detected</p>
              </div>
              <input
                type="checkbox"
                checked={playScanSound}
                onChange={(e) => setPlayScanSound(e.target.checked)}
                className="w-5 h-5 rounded text-primary"
              />
            </label>
          </div>
        </div>

        {/* Privacy & Data */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Privacy & Local Storage</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleExportData}
              className="flex items-center gap-2 border px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-muted transition-colors"
            >
              <Download size={16} /> Export My Settings Data
            </button>
            <button
              onClick={handleClearHistory}
              className="flex items-center gap-2 border border-destructive/30 text-destructive px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-destructive/10 transition-colors"
            >
              <Trash2 size={16} /> Clear Local Browser History
            </button>
          </div>
        </div>

        {/* About & Licenses */}
        <div className="bg-card border rounded-2xl p-6 shadow-sm space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Info className="text-primary" size={20} /> About NexQR
          </h2>
          <div className="text-sm text-muted-foreground space-y-1">
            <p><span className="font-medium text-foreground">Version:</span> 2.0.0 (Serverless Release)</p>
            <p><span className="font-medium text-foreground">Stack:</span> React, TypeScript, Vite, TailwindCSS, Firebase Firestore & Auth</p>
            <p><span className="font-medium text-foreground">License:</span> MIT License</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
