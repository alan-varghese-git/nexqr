import { useState, useEffect, useRef } from 'react';
import { Link as LinkIcon, Type, Wifi, Contact, Phone, Mail, FileDown, Loader2, Image as ImageIcon, Video as VideoIcon, UploadCloud, MapPin, CreditCard, MessageCircle, MessageSquare } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { nanoid } from 'nanoid';
import { AdvancedQRCode } from './AdvancedQRCode';
import QRCodeStyling, { type Options } from 'qr-code-styling';

const QRGenerator = () => {
  const [activeTab, setActiveTab] = useState('url');
  
  // Generic state
  const [qrValue, setQrValue] = useState('https://example.com');
  
  // Specific states for forms
  const [wifiData, setWifiData] = useState({ ssid: '', password: '', encryption: 'WPA', hidden: false });
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });
  const [phoneData, setPhoneData] = useState('');
  const [smsData, setSmsData] = useState({ phone: '', message: '' });
  const [whatsappData, setWhatsappData] = useState({ phone: '', message: '' });
  const [vcardData, setVcardData] = useState({ fName: '', lName: '', phone: '', email: '', org: '' });
  const [locationData, setLocationData] = useState({ lat: '', lng: '' });
  const [paymentData, setPaymentData] = useState({ type: 'upi', id: '', amount: '', name: '' });
  
  // Customization state for qr-code-styling
  const [qrOptions, setQrOptions] = useState<Options>({
    width: 300,
    height: 300,
    data: 'https://example.com',
    margin: 10,
    qrOptions: { typeNumber: 0, mode: 'Byte', errorCorrectionLevel: 'H' },
    imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 10, crossOrigin: 'anonymous' },
    dotsOptions: { type: 'square', color: '#000000' },
    backgroundOptions: { color: '#ffffff' },
    cornersSquareOptions: { type: 'square', color: '#000000' },
    cornersDotOptions: { type: 'square', color: '#000000' }
  });
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Dynamic QR state
  const [isCreatingDynamic, setIsCreatingDynamic] = useState(false);
  const [dynamicError, setDynamicError] = useState('');
  const [dynamicSuccess, setDynamicSuccess] = useState(false);
  const [uploadingFile, setUploadingFile] = useState(false);
  
  const qrRef = useRef<QRCodeStyling | null>(null);

  const tabs = [
    { id: 'url', label: 'URL', icon: <LinkIcon size={16} /> },
    { id: 'text', label: 'Text', icon: <Type size={16} /> },
    { id: 'wifi', label: 'Wi-Fi', icon: <Wifi size={16} /> },
    { id: 'image', label: 'Image', icon: <ImageIcon size={16} /> },
    { id: 'video', label: 'Video', icon: <VideoIcon size={16} /> },
    { id: 'email', label: 'Email', icon: <Mail size={16} /> },
    { id: 'phone', label: 'Phone', icon: <Phone size={16} /> },
    { id: 'sms', label: 'SMS', icon: <MessageSquare size={16} /> },
    { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={16} /> },
    { id: 'contact', label: 'Contact', icon: <Contact size={16} /> },
    { id: 'location', label: 'Location', icon: <MapPin size={16} /> },
    { id: 'payment', label: 'Payment', icon: <CreditCard size={16} /> },
  ];

  // Update qrValue based on forms
  useEffect(() => {
    setDynamicSuccess(false);
    if (activeTab === 'wifi') {
      const escape = (str: string) => str.replace(/([\\;:"])/g, '\\$1');
      setQrValue(`WIFI:T:${wifiData.encryption};S:${escape(wifiData.ssid)};P:${escape(wifiData.password)};H:${wifiData.hidden};;`);
    } else if (activeTab === 'email') {
      setQrValue(`mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`);
    } else if (activeTab === 'phone') {
      setQrValue(`tel:${phoneData}`);
    } else if (activeTab === 'sms') {
      setQrValue(`smsto:${smsData.phone}:${smsData.message}`);
    } else if (activeTab === 'whatsapp') {
      setQrValue(`https://wa.me/${whatsappData.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(whatsappData.message)}`);
    } else if (activeTab === 'contact') {
      setQrValue(`BEGIN:VCARD\nVERSION:3.0\nN:${vcardData.lName};${vcardData.fName}\nFN:${vcardData.fName} ${vcardData.lName}\nORG:${vcardData.org}\nTEL:${vcardData.phone}\nEMAIL:${vcardData.email}\nEND:VCARD`);
    } else if (activeTab === 'location') {
      setQrValue(`geo:${locationData.lat},${locationData.lng}`);
    } else if (activeTab === 'payment') {
      if (paymentData.type === 'upi') {
        setQrValue(`upi://pay?pa=${paymentData.id}&pn=${encodeURIComponent(paymentData.name)}&am=${paymentData.amount}&cu=INR`);
      } else {
        setQrValue(`https://paypal.me/${paymentData.id}/${paymentData.amount}`);
      }
    }
  }, [activeTab, wifiData, emailData, phoneData, smsData, whatsappData, vcardData, locationData, paymentData]);

  // Sync qrValue to styling options
  useEffect(() => {
    setQrOptions(prev => ({ ...prev, data: qrValue || ' ' }));
  }, [qrValue]);

  const handleMakeDynamic = async () => {
    setIsCreatingDynamic(true);
    setDynamicError('');
    setDynamicSuccess(false);
    try {
      const shortId = nanoid(7);
      await setDoc(doc(db, 'qrcodes', shortId), {
        shortId,
        originalUrl: activeTab === 'url' ? qrValue : null,
        type: activeTab.toUpperCase(),
        data: activeTab !== 'url' ? { raw: qrValue } : null,
        scans: 0,
        analytics: [],
        createdAt: serverTimestamp()
      });
      setQrValue(`${window.location.origin}/${shortId}`);
      setDynamicSuccess(true);
    } catch (error) {
      console.error(error);
      setDynamicError('Failed to create dynamic QR code.');
    } finally {
      setIsCreatingDynamic(false);
    }
  };

  const handleDownload = (ext: 'png' | 'svg' | 'jpeg' | 'webp') => {
    if (qrRef.current) {
      qrRef.current.download({ extension: ext, name: 'nexqr' });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setQrOptions(prev => ({ ...prev, image: url }));
      setLogoFile(file);
    }
  };

  const updateDotStyle = (type: string) => {
    setQrOptions(prev => ({ ...prev, dotsOptions: { ...prev.dotsOptions, type: type as any } }));
  };

  const updateCornerStyle = (type: string) => {
    setQrOptions(prev => ({ ...prev, cornersSquareOptions: { ...prev.cornersSquareOptions, type: type as any } }));
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
      {/* Left Column: Input Form & Customization */}
      <div className="xl:col-span-8 space-y-6">
        
        {/* Data Input Section */}
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="flex overflow-x-auto border-b bg-muted/30 hide-scrollbar p-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setDynamicSuccess(false);
                  if (tab.id === 'url') setQrValue('https://example.com');
                  if (tab.id === 'text') setQrValue('Hello World');
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${activeTab === tab.id ? 'bg-background text-primary shadow-sm border' : 'text-muted-foreground hover:bg-background/50 border border-transparent'}`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {/* Input fields based on activeTab */}
            {activeTab === 'url' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Website URL</label>
                <input type="url" value={qrValue} onChange={(e) => setQrValue(e.target.value)} className="w-full px-4 py-3 rounded-md border bg-background" placeholder="https://..." />
              </div>
            )}
            
            {activeTab === 'text' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Text Content</label>
                <textarea rows={4} value={qrValue} onChange={(e) => setQrValue(e.target.value)} className="w-full px-4 py-3 rounded-md border bg-background" />
              </div>
            )}

            {(activeTab === 'image' || activeTab === 'video') && (
              <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-muted/20">
                <input type="file" accept={activeTab === 'image' ? 'image/*' : 'video/*'} className="hidden" id="file-upload" onChange={/* same as before */ async(e)=>{
                  const file = e.target.files?.[0];
                  if(!file) return;
                  setUploadingFile(true);
                  try {
                    const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`);
                    await uploadBytes(storageRef, file);
                    const url = await getDownloadURL(storageRef);
                    setQrValue(url);
                  } finally {
                    setUploadingFile(false);
                  }
                }} />
                <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                  <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />
                  <span className="text-sm font-medium">{uploadingFile ? 'Uploading...' : 'Click to select file'}</span>
                </label>
              </div>
            )}
            
            {activeTab === 'wifi' && (
              <div className="space-y-4">
                <input type="text" value={wifiData.ssid} onChange={e => setWifiData({...wifiData, ssid: e.target.value})} className="w-full p-3 border rounded-md" placeholder="SSID" />
                <input type="password" value={wifiData.password} onChange={e => setWifiData({...wifiData, password: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Password" />
                <select value={wifiData.encryption} onChange={e => setWifiData({...wifiData, encryption: e.target.value})} className="w-full p-3 border rounded-md">
                  <option value="WPA">WPA/WPA2</option>
                  <option value="WEP">WEP</option>
                  <option value="nopass">None</option>
                </select>
              </div>
            )}
            
            {activeTab === 'payment' && (
              <div className="space-y-4">
                <select value={paymentData.type} onChange={e => setPaymentData({...paymentData, type: e.target.value})} className="w-full p-3 border rounded-md">
                  <option value="upi">UPI</option>
                  <option value="paypal">PayPal</option>
                </select>
                <input type="text" value={paymentData.id} onChange={e => setPaymentData({...paymentData, id: e.target.value})} className="w-full p-3 border rounded-md" placeholder={paymentData.type === 'upi' ? "UPI ID (e.g. name@bank)" : "PayPal Username"} />
                <input type="text" value={paymentData.name} onChange={e => setPaymentData({...paymentData, name: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Payee Name" />
                <input type="number" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Amount (Optional)" />
              </div>
            )}

            {/* Other forms follow similar standard inputs to save space in this demo */}
            {(activeTab === 'whatsapp' || activeTab === 'sms') && (
              <div className="space-y-4">
                <input type="tel" value={activeTab === 'sms' ? smsData.phone : whatsappData.phone} onChange={e => activeTab === 'sms' ? setSmsData({...smsData, phone: e.target.value}) : setWhatsappData({...whatsappData, phone: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Phone Number with Country Code" />
                <textarea value={activeTab === 'sms' ? smsData.message : whatsappData.message} onChange={e => activeTab === 'sms' ? setSmsData({...smsData, message: e.target.value}) : setWhatsappData({...whatsappData, message: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Message..." />
              </div>
            )}
            
            {activeTab === 'location' && (
              <div className="space-y-4">
                <input type="number" step="any" value={locationData.lat} onChange={e => setLocationData({...locationData, lat: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Latitude (e.g., 40.7128)" />
                <input type="number" step="any" value={locationData.lng} onChange={e => setLocationData({...locationData, lng: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Longitude (e.g., -74.0060)" />
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-4">
                <input type="email" value={emailData.to} onChange={e => setEmailData({...emailData, to: e.target.value})} className="w-full p-3 border rounded-md" placeholder="hello@example.com" />
                <input type="text" value={emailData.subject} onChange={e => setEmailData({...emailData, subject: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Subject" />
                <textarea value={emailData.body} onChange={e => setEmailData({...emailData, body: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Message..." />
              </div>
            )}

            {activeTab === 'phone' && (
              <div className="space-y-4">
                <input type="tel" value={phoneData} onChange={e => setPhoneData(e.target.value)} className="w-full p-3 border rounded-md" placeholder="Phone Number" />
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={vcardData.fName} onChange={e => setVcardData({...vcardData, fName: e.target.value})} className="w-full p-3 border rounded-md" placeholder="First Name" />
                <input type="text" value={vcardData.lName} onChange={e => setVcardData({...vcardData, lName: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Last Name" />
                <input type="text" value={vcardData.org} onChange={e => setVcardData({...vcardData, org: e.target.value})} className="col-span-2 w-full p-3 border rounded-md" placeholder="Company / Organization" />
                <input type="tel" value={vcardData.phone} onChange={e => setVcardData({...vcardData, phone: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Phone Number" />
                <input type="email" value={vcardData.email} onChange={e => setVcardData({...vcardData, email: e.target.value})} className="w-full p-3 border rounded-md" placeholder="Email Address" />
              </div>
            )}
          </div>
        </div>

        {/* Customization Section */}
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h3 className="font-semibold text-lg mb-6">Design & Customization</h3>
          <div className="space-y-8">
            
            {/* Colors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Pattern Color</label>
                <input type="color" value={qrOptions.dotsOptions?.color} onChange={e => setQrOptions(p => ({ ...p, dotsOptions: { ...p.dotsOptions, color: e.target.value } }))} className="w-full h-10 rounded cursor-pointer" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Background Color</label>
                <input type="color" value={qrOptions.backgroundOptions?.color} onChange={e => setQrOptions(p => ({ ...p, backgroundOptions: { ...p.backgroundOptions, color: e.target.value } }))} className="w-full h-10 rounded cursor-pointer" />
              </div>
            </div>

            {/* Shapes */}
            <div>
              <label className="block text-sm font-medium mb-2">Pattern Style</label>
              <div className="flex gap-2 flex-wrap">
                {['square', 'dots', 'rounded', 'classy', 'extra-rounded'].map(style => (
                  <button key={style} onClick={() => updateDotStyle(style)} className={`px-4 py-2 border rounded-md text-sm capitalize ${qrOptions.dotsOptions?.type === style ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>
                    {style.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Eye Frame Style</label>
              <div className="flex gap-2 flex-wrap">
                {['square', 'dot', 'extra-rounded'].map(style => (
                  <button key={style} onClick={() => updateCornerStyle(style)} className={`px-4 py-2 border rounded-md text-sm capitalize ${qrOptions.cornersSquareOptions?.type === style ? 'bg-primary text-primary-foreground' : 'bg-background hover:bg-muted'}`}>
                    {style.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Logo */}
            <div>
              <label className="block text-sm font-medium mb-2">Upload Logo (Center)</label>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
              {logoFile && (
                <button onClick={() => {setLogoFile(null); setQrOptions(p => ({...p, image: undefined}))}} className="text-sm text-destructive mt-2">Remove Logo</button>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* Right Column: Preview & Actions */}
      <div className="xl:col-span-4">
        <div className="bg-card border rounded-xl p-6 shadow-sm sticky top-20 flex flex-col items-center space-y-6">
          <h3 className="font-semibold text-lg self-start">Live Preview</h3>
          
          <div className="bg-white p-2 rounded-xl border shadow-sm w-full flex justify-center items-center overflow-hidden aspect-square">
            <AdvancedQRCode options={qrOptions} qrCodeRef={qrRef} />
          </div>
          
          <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t">
            <button onClick={() => handleDownload('png')} className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <FileDown size={18} /> PNG
            </button>
            <button onClick={() => handleDownload('svg')} className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-colors">
              <FileDown size={18} /> SVG
            </button>
            <button onClick={() => handleDownload('jpeg')} className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-colors">
              <FileDown size={18} /> JPG
            </button>
            <button onClick={() => handleDownload('webp')} className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-colors">
              <FileDown size={18} /> WEBP
            </button>
          </div>
          
          <div className="w-full pt-4 text-center">
            {dynamicSuccess ? (
              <div className="p-3 bg-green-500/10 text-green-600 rounded-lg text-sm font-medium border border-green-500/20">
                Success! QR is now Dynamic.
              </div>
            ) : (
              <>
                <button 
                  onClick={handleMakeDynamic}
                  disabled={isCreatingDynamic || !qrValue.trim() || activeTab === 'image'}
                  className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-2.5 rounded-lg font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {isCreatingDynamic && <Loader2 className="animate-spin" size={16} />}
                  Make Dynamic
                </button>
                {dynamicError && (
                  <p className="text-xs text-destructive mt-2">{dynamicError}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
