import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, Download, AlertCircle } from 'lucide-react';
import { UAParser } from 'ua-parser-js';

const RedirectHandler = () => {
  const { shortId } = useParams<{ shortId: string }>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [mediaData, setMediaData] = useState<{ type: string, url: string } | null>(null);

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
        
        // Log analytics (client-side approximation)
        const parser = new UAParser(window.navigator.userAgent);
        const browser = parser.getBrowser();
        const os = parser.getOS();
        const device = parser.getDevice();
        
        // Fire and forget analytics update
        updateDoc(docRef, {
          scans: (qrData.scans || 0) + 1,
          analytics: arrayUnion({
            ip: 'Client (IP hidden)', // Can't easily get IP client-side without external API
            userAgent: window.navigator.userAgent,
            browser: `${browser.name} ${browser.version}`,
            os: `${os.name} ${os.version}`,
            device: device.type || 'desktop',
            timestamp: new Date().toISOString()
          })
        }).catch(e => console.error('Failed to log scan:', e));

        // Handle redirection or media display
        if (qrData.type === 'URL' && qrData.originalUrl) {
          window.location.replace(qrData.originalUrl);
        } else if (qrData.type === 'IMAGE' || qrData.type === 'VIDEO') {
          setMediaData({ type: qrData.type, url: qrData.data.raw });
          setLoading(false);
        } else {
          setError('Unsupported QR type for redirection.');
          setLoading(false);
        }

      } catch (err) {
        console.error(err);
        setError('Error loading QR code data.');
        setLoading(false);
      }
    };

    handleScan();
  }, [shortId]);

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
        <h2 className="text-2xl font-bold">Oops!</h2>
        <p className="text-muted-foreground max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <div className="bg-card border rounded-2xl p-6 shadow-xl w-full max-w-2xl text-center space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Shared Media</h2>
        
        <div className="rounded-xl overflow-hidden bg-muted/30 border border-border/50 flex items-center justify-center min-h-[300px]">
          {mediaData?.type === 'IMAGE' ? (
            <img src={mediaData.url} alt="Shared" className="max-w-full max-h-[60vh] object-contain" />
          ) : (
            <video src={mediaData?.url} controls className="max-w-full max-h-[60vh]" />
          )}
        </div>

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
      </div>
    </div>
  );
};

export default RedirectHandler;
