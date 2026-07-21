import React, { useState, useEffect, useRef } from 'react';
import { Camera, Image as ImageIcon, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { Html5QrcodeScanner, Html5Qrcode } from 'html5-qrcode';

const QRScanner = () => {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'camera' | 'image'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    let mounted = true;

    if (activeTab === 'camera') {
      const startScanner = () => {
        if (!mounted || !document.getElementById('qr-reader')) return;
        try {
          if (!scannerRef.current) {
            scannerRef.current = new Html5QrcodeScanner(
              "qr-reader",
              { fps: 10, qrbox: { width: 250, height: 250 } },
              false
            );
          }
          
          scannerRef.current.render(
            (decodedText) => {
              setScanResult(decodedText);
              setIsScanning(false);
              if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
              }
            },
            (_error) => {
              // Ignore scan errors
            }
          );
          setIsScanning(true);
        } catch (e) {
          console.error("Scanner init error", e);
        }
      };

      const timer = setTimeout(startScanner, 100);
      return () => {
        mounted = false;
        clearTimeout(timer);
        if (scannerRef.current) {
          scannerRef.current.clear().catch(console.error);
          scannerRef.current = null;
        }
      };
    }
  }, [activeTab]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const html5QrCode = new Html5Qrcode("image-qr-reader");
      try {
        const result = await html5QrCode.scanFile(file, true);
        setScanResult(result);
      } catch (err) {
        alert('No QR code found in the image.');
        setScanResult(null);
      }
    }
  };

  const handleCopy = () => {
    if (scanResult) {
      navigator.clipboard.writeText(scanResult);
      alert('Copied to clipboard!');
    }
  };

  const handleOpen = () => {
    if (scanResult && (scanResult.startsWith('http://') || scanResult.startsWith('https://'))) {
      window.open(scanResult, '_blank');
    } else {
      alert('Result is not a valid URL.');
    }
  };

  const resetCamera = () => {
    setScanResult(null);
    setActiveTab('image');
    setTimeout(() => setActiveTab('camera'), 50);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Scanner</h2>
        <p className="text-muted-foreground">Scan QR codes using your camera or by uploading an image.</p>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
        <div className="flex border-b">
          <button 
            onClick={() => { setActiveTab('camera'); setScanResult(null); }}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium ${
              activeTab === 'camera' 
                ? 'bg-background text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:bg-muted/30 transition-colors'
            }`}
          >
            <Camera size={18} />
            Camera
          </button>
          <button 
            onClick={() => { setActiveTab('image'); setScanResult(null); }}
            className={`flex-1 py-4 flex items-center justify-center gap-2 font-medium ${
              activeTab === 'image' 
                ? 'bg-background text-primary border-b-2 border-primary' 
                : 'text-muted-foreground hover:bg-muted/30 transition-colors'
            }`}
          >
            <ImageIcon size={18} />
            Upload Image
          </button>
        </div>

        <div className="p-8 flex flex-col items-center justify-center min-h-[400px]">
          {activeTab === 'camera' && (
            <div className="w-full max-w-md">
              <div id="qr-reader" className="w-full overflow-hidden rounded-xl border-2 border-dashed border-muted-foreground/30"></div>
              {scanResult && !isScanning && (
                <div className="text-center mt-4">
                  <button 
                    onClick={resetCamera} 
                    className="flex items-center justify-center gap-2 mx-auto text-primary hover:underline font-medium"
                  >
                    <RefreshCw size={16} /> Scan Again
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'image' && (
            <div className="w-full max-w-md aspect-square border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-muted-foreground bg-muted/10 relative">
              <div id="image-qr-reader" className="hidden"></div>
              <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p className="mb-4 text-center px-4">Upload an image containing a QR code</p>
              <label className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors cursor-pointer">
                Select Image
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </label>
            </div>
          )}
        </div>
      </div>

      {scanResult && (
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-bottom-4">
          <h3 className="font-semibold text-lg">Scan Result</h3>
          <div className="p-4 bg-muted rounded-lg break-all font-mono text-sm">
            {scanResult}
          </div>
          <div className="flex gap-3">
            <button onClick={handleCopy} className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-colors">
              <Copy size={18} />
              Copy
            </button>
            <button onClick={handleOpen} className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <ExternalLink size={18} />
              Open
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default QRScanner;
