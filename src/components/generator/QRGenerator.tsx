import { useState, useEffect, useRef } from 'react';
import { Link as LinkIcon, Type, Wifi, Contact, Phone, Mail, FileDown, Loader2, Image as ImageIcon, Video as VideoIcon, UploadCloud, MapPin, CreditCard, MessageCircle, MessageSquare } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { nanoid } from 'nanoid';
import { AdvancedQRCode } from './AdvancedQRCode';
import QRCodeStyling, { type Options } from 'qr-code-styling';
import { useAuth } from '../../contexts/AuthProvider';

const QRGenerator = () => {
  const { user } = useAuth();
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

  // Smaller version of options for the live preview panel
  const previewOptions: Options = { ...qrOptions, width: 200, height: 200 };
  
  const [logoFile, setLogoFile] = useState<File | null>(null);
  
  // Dynamic QR state
  const [isCreatingDynamic, setIsCreatingDynamic] = useState(false);
  const [dynamicError, setDynamicError] = useState('');
  const [dynamicSuccess, setDynamicSuccess] = useState(false);
  const [dynamicPassword, setDynamicPassword] = useState('');
  const [dynamicExpiresAt, setDynamicExpiresAt] = useState('');
  const [dynamicMaxScans, setDynamicMaxScans] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
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
        uid: user ? user.uid : null,
        originalUrl: activeTab === 'url' ? qrValue : null,
        type: activeTab.toUpperCase(),
        data: activeTab !== 'url' ? { raw: qrValue } : null,
        scans: 0,
        analytics: [],
        password: dynamicPassword.trim() || null,
        expiresAt: dynamicExpiresAt ? new Date(dynamicExpiresAt).toISOString() : null,
        maxScans: dynamicMaxScans ? parseInt(dynamicMaxScans, 10) : null,
        isLocked: false,
        createdAt: serverTimestamp()
      });
      setQrValue(`${window.location.origin}${window.location.pathname}#/${shortId}`);
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
                <input type="url" value={qrValue} onChange={(e) => setQrValue(e.target.value)} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="https://..." />
              </div>
            )}
            
            {activeTab === 'text' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Text Content</label>
                <textarea rows={4} value={qrValue} onChange={(e) => setQrValue(e.target.value)} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" />
              </div>
            )}

            {(activeTab === 'image' || activeTab === 'video') && (
              <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center bg-muted/20 relative">
                <input type="file" accept={activeTab === 'image' ? 'image/*' : 'video/*'} className="hidden" id="file-upload" onChange={(e)=>{
                  const file = e.target.files?.[0];
                  if(!file) return;
                  
                  // Create a preview
                  const objectUrl = URL.createObjectURL(file);
                  setPreviewUrl(objectUrl);
                  
                  setUploadingFile(true);
                  setUploadProgress(0);
                  
                  try {
                    const formData = new FormData();
                    formData.append('file', file);

                    const xhr = new XMLHttpRequest();
                    xhr.open('POST', 'https://tmpfiles.org/api/v1/upload', true);

                    xhr.upload.onprogress = (event) => {
                      if (event.lengthComputable) {
                        const progress = (event.loaded / event.total) * 100;
                        setUploadProgress(progress);
                      }
                    };

                    xhr.onload = () => {
                      setUploadingFile(false);
                      e.target.value = '';
                      if (xhr.status === 200) {
                        try {
                          const response = JSON.parse(xhr.responseText);
                          // The URL looks like "https://tmpfiles.org/12345/example.jpg"
                          // To make it a direct download link, we replace it with "tmpfiles.org/dl/"
                          const rawUrl = response.data.url;
                          const directUrl = rawUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                          setQrValue(directUrl);
                        } catch (err: any) {
                          alert("Failed to parse upload response.");
                        }
                      } else {
                        alert("Upload failed with status: " + xhr.status);
                        setPreviewUrl(null);
                      }
                    };

                    xhr.onerror = () => {
                      setUploadingFile(false);
                      setPreviewUrl(null);
                      e.target.value = '';
                      alert("Upload failed. Please check your connection.");
                    };

                    xhr.send(formData);

                  } catch (err: any) {
                    console.error("Upload setup error:", err);
                    alert("Upload setup failed: " + err.message);
                    setUploadingFile(false);
                    setPreviewUrl(null);
                    e.target.value = '';
                  }
                }} />
                
                {previewUrl && (
                  <div className="mb-4 relative w-24 h-24 rounded-lg overflow-hidden border shadow-sm flex-shrink-0">
                    {activeTab === 'image' ? (
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <video src={previewUrl} className="w-full h-full object-cover" muted loop autoPlay />
                    )}
                  </div>
                )}
                
                <label htmlFor="file-upload" className={`cursor-pointer flex flex-col items-center ${uploadingFile ? 'pointer-events-none opacity-50' : ''}`}>
                  {!previewUrl && <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />}
                  <span className="text-sm font-medium">{uploadingFile ? `Uploading... ${Math.round(uploadProgress)}%` : (previewUrl ? 'Change file' : 'Click to select file')}</span>
                </label>
                
                {uploadingFile && (
                  <div className="w-full max-w-xs mt-4 bg-muted rounded-full h-2 overflow-hidden border">
                    <div className="bg-primary h-full transition-all duration-300 ease-out" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'wifi' && (
              <div className="space-y-4">
                <input type="text" value={wifiData.ssid} onChange={e => setWifiData({...wifiData, ssid: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="nope" spellCheck="false" placeholder="SSID" />
                <input type="password" value={wifiData.password} onChange={e => setWifiData({...wifiData, password: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="new-password" spellCheck="false" placeholder="Password" />
                <select value={wifiData.encryption} onChange={e => setWifiData({...wifiData, encryption: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false">
                  <option value="WPA" className="bg-background text-foreground">WPA/WPA2</option>
                  <option value="WEP" className="bg-background text-foreground">WEP</option>
                  <option value="nopass" className="bg-background text-foreground">None</option>
                </select>
              </div>
            )}
            
            {activeTab === 'payment' && (
              <div className="space-y-4">
                <select value={paymentData.type} onChange={e => setPaymentData({...paymentData, type: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false">
                  <option value="upi" className="bg-background text-foreground">UPI</option>
                  <option value="paypal" className="bg-background text-foreground">PayPal</option>
                </select>
                <input type="text" value={paymentData.id} onChange={e => setPaymentData({...paymentData, id: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder={paymentData.type === 'upi' ? "UPI ID (e.g. name@bank)" : "PayPal Username"} />
                <input type="text" value={paymentData.name} onChange={e => setPaymentData({...paymentData, name: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Payee Name" />
                <input type="number" value={paymentData.amount} onChange={e => setPaymentData({...paymentData, amount: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Amount (Optional)" />
              </div>
            )}

            {/* Other forms follow similar standard inputs to save space in this demo */}
            {(activeTab === 'whatsapp' || activeTab === 'sms') && (
              <div className="space-y-4">
                <input type="tel" value={activeTab === 'sms' ? smsData.phone : whatsappData.phone} onChange={e => activeTab === 'sms' ? setSmsData({...smsData, phone: e.target.value}) : setWhatsappData({...whatsappData, phone: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Phone Number with Country Code" />
                <textarea value={activeTab === 'sms' ? smsData.message : whatsappData.message} onChange={e => activeTab === 'sms' ? setSmsData({...smsData, message: e.target.value}) : setWhatsappData({...whatsappData, message: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Message..." />
              </div>
            )}
            
            {activeTab === 'location' && (
              <div className="space-y-4">
                <input type="number" step="any" value={locationData.lat} onChange={e => setLocationData({...locationData, lat: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Latitude (e.g., 40.7128)" />
                <input type="number" step="any" value={locationData.lng} onChange={e => setLocationData({...locationData, lng: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Longitude (e.g., -74.0060)" />
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-4">
                <input type="email" value={emailData.to} onChange={e => setEmailData({...emailData, to: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="hello@example.com" />
                <input type="text" value={emailData.subject} onChange={e => setEmailData({...emailData, subject: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Subject" />
                <textarea value={emailData.body} onChange={e => setEmailData({...emailData, body: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Message..." />
              </div>
            )}

            {activeTab === 'phone' && (
              <div className="space-y-4">
                <input type="tel" value={phoneData} onChange={e => setPhoneData(e.target.value)} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Phone Number" />
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="grid grid-cols-2 gap-4">
                <input type="text" value={vcardData.fName} onChange={e => setVcardData({...vcardData, fName: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="First Name" />
                <input type="text" value={vcardData.lName} onChange={e => setVcardData({...vcardData, lName: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Last Name" />
                <input type="text" value={vcardData.org} onChange={e => setVcardData({...vcardData, org: e.target.value})} className="col-span-2 w-full p-3 border rounded-md" placeholder="Company / Organization" />
                <input type="tel" value={vcardData.phone} onChange={e => setVcardData({...vcardData, phone: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Phone Number" />
                <input type="email" value={vcardData.email} onChange={e => setVcardData({...vcardData, email: e.target.value})} className="w-full p-3 border rounded-xl bg-background/50 text-foreground hover:bg-background focus:bg-background focus:ring-2 focus:ring-primary/20 outline-none transition-colors shadow-sm" autoComplete="off" spellCheck="false" placeholder="Email Address" />
              </div>
            )}
          </div>
        </div>

        {/* Customization Section */}
        <div className="bg-card border rounded-xl p-5 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b">
            <div className="w-1 h-4 bg-primary rounded-full"></div>
            <h3 className="font-semibold">Design &amp; Customization</h3>
          </div>

          {/* Colors — Premium swatch tiles */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Colors</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="relative group cursor-pointer">
                <input
                  type="color"
                  value={qrOptions.dotsOptions?.color}
                  onChange={e => setQrOptions(p => ({ ...p, dotsOptions: { ...p.dotsOptions, color: e.target.value } }))}
                  className="sr-only"
                />
                <div className="flex items-center gap-2.5 border-2 rounded-xl p-2.5 bg-muted/30 hover:border-primary/60 transition-all group-hover:shadow-sm">
                  <span
                    className="w-8 h-8 rounded-lg border shadow-inner flex-shrink-0 ring-2 ring-black/10"
                    style={{ background: qrOptions.dotsOptions?.color }}
                  />
                  <div>
                    <p className="text-xs font-semibold">Pattern</p>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase">{qrOptions.dotsOptions?.color}</p>
                  </div>
                  <span className="ml-auto text-[10px] text-muted-foreground">Click</span>
                </div>
              </label>

              <label className="relative group cursor-pointer">
                <input
                  type="color"
                  value={qrOptions.backgroundOptions?.color}
                  onChange={e => setQrOptions(p => ({ ...p, backgroundOptions: { ...p.backgroundOptions, color: e.target.value } }))}
                  className="sr-only"
                />
                <div className="flex items-center gap-2.5 border-2 rounded-xl p-2.5 bg-muted/30 hover:border-primary/60 transition-all group-hover:shadow-sm">
                  <span
                    className="w-8 h-8 rounded-lg border shadow-inner flex-shrink-0 ring-2 ring-black/10"
                    style={{ background: qrOptions.backgroundOptions?.color }}
                  />
                  <div>
                    <p className="text-xs font-semibold">Background</p>
                    <p className="text-[10px] text-muted-foreground font-mono uppercase">{qrOptions.backgroundOptions?.color}</p>
                  </div>
                  <span className="ml-auto text-[10px] text-muted-foreground">Click</span>
                </div>
              </label>
            </div>

            {/* Quick Palette */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-[10px] text-muted-foreground mr-1">Quick palette:</span>
              {['#000000','#1e40af','#15803d','#7c3aed','#be123c','#b45309','#0f766e'].map(c => (
                <button
                  key={c}
                  onClick={() => setQrOptions(p => ({ ...p, dotsOptions: { ...p.dotsOptions, color: c } }))}
                  className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110 ${
                    qrOptions.dotsOptions?.color === c ? 'border-primary scale-110 ring-2 ring-primary/30' : 'border-transparent'
                  }`}
                  style={{ background: c }}
                  title={c}
                />
              ))}
            </div>
          </div>

          {/* Pattern Style — visual cards */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pattern Style</p>
            <div className="grid grid-cols-5 gap-2">
              {[
                { id: 'square',        icon: '▪', label: 'Square' },
                { id: 'dots',          icon: '●', label: 'Dots' },
                { id: 'rounded',       icon: '▸', label: 'Round' },
                { id: 'classy',        icon: '◆', label: 'Classy' },
                { id: 'extra-rounded', icon: '◉', label: 'Soft' },
              ].map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => updateDotStyle(id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-center transition-all ${
                    qrOptions.dotsOptions?.type === id
                      ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20'
                      : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span className="text-base leading-none">{icon}</span>
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Eye Frame Style */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eye Frame Style</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'square',        icon: '◻', label: 'Square' },
                { id: 'dot',           icon: '○', label: 'Dot' },
                { id: 'extra-rounded', icon: '▢', label: 'Rounded' },
              ].map(({ id, icon, label }) => (
                <button
                  key={id}
                  onClick={() => updateCornerStyle(id)}
                  className={`flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 transition-all ${
                    qrOptions.cornersSquareOptions?.type === id
                      ? 'border-primary bg-primary/10 text-primary shadow-sm shadow-primary/20'
                      : 'border-border bg-muted/20 hover:border-primary/40 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <span className="text-base leading-none">{icon}</span>
                  <span className="text-[10px] font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Logo Upload */}
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Center Logo</p>
            <label className="flex items-center gap-3 border-2 border-dashed rounded-xl p-3 cursor-pointer hover:border-primary/50 hover:bg-muted/20 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:text-primary transition-colors text-xl">
                {logoFile ? '🖼' : '+'}
              </div>
              <div>
                <p className="text-sm font-medium">{logoFile ? logoFile.name : 'Upload Logo'}</p>
                <p className="text-xs text-muted-foreground">{logoFile ? 'Click to change' : 'PNG or SVG recommended'}</p>
              </div>
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only" />
            </label>
            {logoFile && (
              <button onClick={() => {setLogoFile(null); setQrOptions(p => ({...p, image: undefined}))}} className="text-xs text-destructive hover:underline">✕ Remove Logo</button>
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Preview & Actions */}
      <div className="xl:col-span-4">
        <div className="bg-card border rounded-xl shadow-sm sticky top-16 flex flex-col overflow-hidden">
          {/* Preview Header */}
          <div className="px-4 pt-4 pb-3 flex items-center justify-between border-b">
            <h3 className="font-semibold text-sm">Live Preview</h3>
            <span className="text-[10px] px-2 py-0.5 bg-green-500/10 text-green-600 rounded-full font-medium">● Live</span>
          </div>

          {/* QR Display */}
          <div className="px-4 pb-2 flex justify-center">
            <div
              className="rounded-xl border shadow-sm flex justify-center items-center p-2 transition-colors"
              style={{ backgroundColor: qrOptions.backgroundOptions?.color ?? '#ffffff' }}
            >
              <AdvancedQRCode options={previewOptions} qrCodeRef={qrRef} />
            </div>
          </div>

          {/* Download Grid */}
          <div className="px-4 pb-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Export</p>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => handleDownload('png')} className="group flex items-center justify-between gap-2 bg-primary text-primary-foreground px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-primary/90 transition-all hover:shadow-md hover:shadow-primary/25 active:scale-95">
                <span>PNG</span> <FileDown size={15} className="opacity-75 group-hover:opacity-100" />
              </button>
              <button onClick={() => handleDownload('svg')} className="group flex items-center justify-between gap-2 bg-secondary text-secondary-foreground px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-all hover:shadow-sm active:scale-95">
                <span>SVG</span> <FileDown size={15} className="opacity-75" />
              </button>
              <button onClick={() => handleDownload('jpeg')} className="group flex items-center justify-between gap-2 bg-secondary text-secondary-foreground px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-all hover:shadow-sm active:scale-95">
                <span>JPG</span> <FileDown size={15} className="opacity-75" />
              </button>
              <button onClick={() => handleDownload('webp')} className="group flex items-center justify-between gap-2 bg-secondary text-secondary-foreground px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-muted transition-all hover:shadow-sm active:scale-95">
                <span>WEBP</span> <FileDown size={15} className="opacity-75" />
              </button>
            </div>
          </div>
          
          <div className="w-full pt-4 text-center border-t">
            {dynamicSuccess ? (
              <div className="p-3 bg-green-500/10 text-green-600 rounded-lg text-sm font-medium border border-green-500/20">
                Success! QR is now Dynamic.
              </div>
            ) : (
              <div className="space-y-3">
                <details className="text-left bg-muted/40 rounded-lg p-2.5 text-xs">
                  <summary className="font-medium cursor-pointer text-muted-foreground hover:text-foreground">
                    ⚡ Dynamic Options (Password, Expiry...)
                  </summary>
                  <div className="mt-3 space-y-2 pt-2 border-t">
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground">Password Lock</label>
                      <input
                        type="password"
                        placeholder="Optional Password"
                        value={dynamicPassword}
                        onChange={(e) => setDynamicPassword(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-background/50 text-foreground mt-1 focus:ring-2 focus:ring-primary/20 outline-none transition-colors" autoComplete="off" spellCheck="false"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground">Expiration Date</label>
                      <input
                        type="datetime-local"
                        value={dynamicExpiresAt}
                        onChange={(e) => setDynamicExpiresAt(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-background/50 text-foreground mt-1 focus:ring-2 focus:ring-primary/20 outline-none transition-colors" autoComplete="off" spellCheck="false"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-muted-foreground">Max Scan Limit</label>
                      <input
                        type="number"
                        placeholder="e.g. 100"
                        value={dynamicMaxScans}
                        onChange={(e) => setDynamicMaxScans(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border text-xs bg-background/50 text-foreground mt-1 focus:ring-2 focus:ring-primary/20 outline-none transition-colors" autoComplete="off" spellCheck="false"
                      />
                    </div>
                  </div>
                </details>

                <button 
                  onClick={handleMakeDynamic}
                  disabled={isCreatingDynamic || !qrValue.trim() || uploadingFile}
                  className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-2.5 rounded-lg font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {isCreatingDynamic && <Loader2 className="animate-spin" size={16} />}
                  Make Dynamic
                </button>
                {dynamicError && (
                  <p className="text-xs text-destructive mt-2">{dynamicError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
