import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, Download, AlertCircle, Lock, ShieldCheck } from 'lucide-react';
import { UAParser } from 'ua-parser-js';

const RedirectHandler = () => {
  const { shortId } = useParams<{ shortId: string }>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mediaData, setMediaData] = useState<{ type: string, url: string } | null>(null);
  
  // Password protection states
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [enteredPassword, setEnteredPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [qrDocData, setQrDocData] = useState<any>(null);

  useEffect(() => {
    const handleScan = async () => {
      try {
        if (!shortId) return;
        const docRef = doc(db, 'qrcodes', shortId);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
          setError('QR Code not found.');
          setLoading(false);
          return;
        }

        const qrData = docSnap.data();
        setQrDocData(qrData);

        // Check if manual locked
        if (qrData.isLocked) {
          setError('This QR Code has been disabled by its creator.');
          setLoading(false);
          return;
        }

        // Check Expiry Date
        if (qrData.expiresAt) {
          const expiryDate = new Date(qrData.expiresAt);
          if (new Date() > expiryDate) {
            setError('This QR Code has expired.');
            setLoading(false);
            return;
          }
        }

        // Check Max Scans limit
        if (qrData.maxScans && (qrData.scans || 0) >= qrData.maxScans) {
          setError('Maximum scan limit reached for this QR Code.');
          setLoading(false);
          return;
        }

        // Log analytics
        const parser = new UAParser(window.navigator.userAgent);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();

        updateDoc(docRef, {
          scans: (qrData.scans || 0) + 1,
          analytics: arrayUnion({
            userAgent: window.navigator.userAgent,
            browser: `${browser.name || 'Unknown'} ${browser.version || ''}`,
            os: `${os.name || 'Unknown'} ${os.version || ''}`,
            device: device.type || 'desktop',
            timestamp: new Date().toISOString()
          })
        }).catch(e => console.error('Failed to log scan:', e));

        // Password requirement check
        if (qrData.password) {
          setIsPasswordProtected(true);
          setLoading(false);
          return;
        }

        // Process redirection / payload
        executeRedirect(qrData);

      } catch (err) {
        console.error(err);
        setError('Error loading QR code data.');
        setLoading(false);
      }
    };

    handleScan();
  }, [shortId]);

  const executeRedirect = (qrData: any) => {
    if (qrData.type === 'URL' && qrData.originalUrl) {
      window.location.replace(qrData.originalUrl);
    } else if (qrData.type === 'IMAGE' || qrData.type === 'VIDEO') {
      setMediaData({ type: qrData.type, url: qrData.data.raw });
      setLoading(false);
    } else if (qrData.data?.raw) {
      // For general text / custom payloads
      setMediaData({ type: 'TEXT', url: qrData.data.raw });
      setLoading(false);
    } else {
      setError('Unsupported QR type for redirection.');
      setLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredPassword === qrDocData.password) {
      setIsPasswordProtected(false);
      executeRedirect(qrDocData);
    } else {
      setPasswordError('Incorrect password. Please try again.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-muted-foreground animate-pulse">Loading content...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center space-y-4 text-center px-4">
        <AlertCircle className="w-16 h-16 text-destructive" />
        <h2 className="text-2xl font-bold">Access Restricted</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
      </div>
    );
  }

  if (isPasswordProtected) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
        <div className="bg-card border rounded-2xl p-8 shadow-xl w-full max-w-md text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary">
            <Lock className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Password Protected</h2>
            <p className="text-sm text-muted-foreground mt-1">This QR Code requires a password to view.</p>
          </div>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <input
              type="password"
              value={enteredPassword}
              onChange={(e) => { setEnteredPassword(e.target.value); setPasswordError(''); }}
              className="w-full px-4 py-3 rounded-xl border bg-background text-center text-lg"
              placeholder="Enter password"
              autoFocus
              required
            />
            {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
            >
              <ShieldCheck size={18} /> Unlock Content
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="bg-card border rounded-2xl p-6 shadow-xl w-full max-w-2xl text-center space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Shared Content</h2>
        
        <div className="rounded-xl overflow-hidden bg-muted/30 border border-border/50 flex items-center justify-center min-h-[300px] p-4">
          {mediaData?.type === 'IMAGE' && (
            <img src={mediaData.url} alt="Shared" className="max-w-full max-h-[60vh] object-contain" />
          )}
          {mediaData?.type === 'VIDEO' && (
            <video src={mediaData.url} controls className="max-w-full max-h-[60vh]" />
          )}
          {mediaData?.type === 'TEXT' && (
            <p className="text-lg font-mono whitespace-pre-wrap">{mediaData.url}</p>
          )}
        </div>

        {mediaData?.type !== 'TEXT' && (
          <a 
            href={mediaData?.url} 
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center px-8 py-4 bg-primary text-primary-foreground font-semibold rounded-xl hover:bg-primary/90 transition-all active:scale-95 gap-2 w-full sm:w-auto shadow-lg shadow-primary/25"
          >
            <Download size={20} />
            Download {mediaData?.type === 'IMAGE' ? 'Image' : 'Video'}
          </a>
        )}
      </div>
    </div>
  );
};

export default RedirectHandler;
