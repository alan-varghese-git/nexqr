import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Link as LinkIcon, Type, Wifi, Contact, Phone, Mail, FileDown, Loader2, Image as ImageIcon, Video as VideoIcon, UploadCloud } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase';
import { nanoid } from 'nanoid';

const QRGenerator = () => {
  const [activeTab, setActiveTab] = useState('url');
  
  // Generic state (for simple types or final combined string)
  const [qrValue, setQrValue] = useState('https://example.com');
  
  // Specific states for forms
  const [wifiData, setWifiData] = useState({ ssid: '', password: '', encryption: 'WPA', hidden: false });
  const [emailData, setEmailData] = useState({ to: '', subject: '', body: '' });
  const [phoneData, setPhoneData] = useState('');
  const [vcardData, setVcardData] = useState({ fName: '', lName: '', phone: '', email: '', org: '' });
  
  // Customization state
  const [fgColor, setFgColor] = useState('#000000');
  const [bgColor, setBgColor] = useState('#ffffff');
  
  // Dynamic QR state
  const [isCreatingDynamic, setIsCreatingDynamic] = useState(false);
  const [dynamicError, setDynamicError] = useState('');
  const [dynamicSuccess, setDynamicSuccess] = useState(false);
  
  // File upload state
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const tabs = [
    { id: 'url', label: 'URL', icon: <LinkIcon size={18} /> },
    { id: 'text', label: 'Text', icon: <Type size={18} /> },
    { id: 'wifi', label: 'Wi-Fi', icon: <Wifi size={18} /> },
    { id: 'image', label: 'Image', icon: <ImageIcon size={18} /> },
    { id: 'video', label: 'Video', icon: <VideoIcon size={18} /> },
    { id: 'email', label: 'Email', icon: <Mail size={18} /> },
    { id: 'phone', label: 'Phone', icon: <Phone size={18} /> },
    { id: 'contact', label: 'Contact', icon: <Contact size={18} /> },
  ];

  // Update qrValue automatically when form states change
  useEffect(() => {
    setDynamicSuccess(false);
    if (activeTab === 'wifi') {
      const escape = (str: string) => str.replace(/([\\;:"])/g, '\\$1');
      setQrValue(`WIFI:T:${wifiData.encryption};S:${escape(wifiData.ssid)};P:${escape(wifiData.password)};H:${wifiData.hidden};;`);
    } else if (activeTab === 'email') {
      setQrValue(`mailto:${emailData.to}?subject=${encodeURIComponent(emailData.subject)}&body=${encodeURIComponent(emailData.body)}`);
    } else if (activeTab === 'phone') {
      setQrValue(`tel:${phoneData}`);
    } else if (activeTab === 'contact') {
      setQrValue(`BEGIN:VCARD\nVERSION:3.0\nN:${vcardData.lName};${vcardData.fName}\nFN:${vcardData.fName} ${vcardData.lName}\nORG:${vcardData.org}\nTEL:${vcardData.phone}\nEMAIL:${vcardData.email}\nEND:VCARD`);
    }
  }, [activeTab, wifiData, emailData, phoneData, vcardData]);

  const handleMakeDynamic = async () => {
    setIsCreatingDynamic(true);
    setDynamicError('');
    setDynamicSuccess(false);

    try {
      const shortId = nanoid(7);
      const payload = {
        shortId,
        originalUrl: activeTab === 'url' ? qrValue : null,
        type: activeTab.toUpperCase(),
        data: activeTab !== 'url' ? { raw: qrValue } : null,
        scans: 0,
        analytics: [],
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'qrcodes', shortId), payload);

      const dynamicUrl = `${window.location.origin}/${shortId}`;
      setQrValue(dynamicUrl);
      setDynamicSuccess(true);
    } catch (error) {
      console.error(error);
      setDynamicError('Failed to create dynamic QR code in Firebase.');
    } finally {
      setIsCreatingDynamic(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Column: Input Form */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          {/* Tabs */}
          <div className="flex overflow-x-auto border-b bg-muted/30 hide-scrollbar p-2 gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setDynamicSuccess(false);
                  setDynamicError('');
                  if (tab.id === 'url') setQrValue('https://example.com');
                  if (tab.id === 'text') setQrValue('Hello World');
                }}
                className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap
                  ${activeTab === tab.id 
                    ? 'bg-background text-primary shadow-sm' 
                    : 'text-muted-foreground hover:bg-background/50 hover:text-foreground'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Form Content */}
          <div className="p-6 space-y-4">
            {activeTab === 'url' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Website URL</label>
                <input 
                  type="url" 
                  value={qrValue}
                  onChange={(e) => { setQrValue(e.target.value); setDynamicSuccess(false); }}
                  className="w-full px-4 py-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="https://your-website.com"
                />
              </div>
            )}
            
            {activeTab === 'text' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Text Content</label>
                <textarea 
                  rows={4}
                  value={qrValue}
                  onChange={(e) => { setQrValue(e.target.value); setDynamicSuccess(false); }}
                  className="w-full px-4 py-3 rounded-md border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                  placeholder="Enter your text here..."
                />
              </div>
            )}
            
            {(activeTab === 'image' || activeTab === 'video') && (
              <div className="space-y-4">
                <label className="block text-sm font-medium">Upload {activeTab === 'image' ? 'Image' : 'Video'}</label>
                <div className="border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center bg-muted/20 hover:bg-muted/40 transition-colors">
                  <input 
                    type="file" 
                    accept={activeTab === 'image' ? 'image/*' : 'video/*'}
                    className="hidden" 
                    id="file-upload"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setUploadingFile(true);
                      setUploadError('');
                      setDynamicSuccess(false);
                      try {
                        const fileExt = file.name.split('.').pop();
                        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}.${fileExt}`;
                        const storageRef = ref(storage, `uploads/${fileName}`);
                        
                        await uploadBytes(storageRef, file);
                        const url = await getDownloadURL(storageRef);
                        
                        // Auto create dynamic QR for better mobile preview
                        const shortId = nanoid(7);
                        const payload = {
                          shortId,
                          originalUrl: null,
                          type: activeTab.toUpperCase(),
                          data: { raw: url },
                          scans: 0,
                          analytics: [],
                          createdAt: serverTimestamp()
                        };
                        
                        await setDoc(doc(db, 'qrcodes', shortId), payload);
                        
                        setQrValue(`${window.location.origin}/${shortId}`);
                        setDynamicSuccess(true);
                      } catch (err) {
                        console.error(err);
                        setUploadError('Network error during upload to Firebase');
                      } finally {
                        setUploadingFile(false);
                      }
                    }}
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center w-full">
                    <UploadCloud className="w-10 h-10 text-muted-foreground mb-3" />
                    <span className="text-sm font-medium">Click to select a file</span>
                    <span className="text-xs text-muted-foreground mt-1">Max size: 50MB</span>
                  </label>
                </div>
                {uploadingFile && <div className="text-sm text-blue-500 flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin"/> Uploading...</div>}
                {uploadError && <div className="text-sm text-destructive">{uploadError}</div>}
                {qrValue && qrValue.startsWith('http') && qrValue !== 'https://example.com' && !uploadingFile && !uploadError && (
                  <div className="text-sm text-green-600 truncate bg-green-500/10 p-2 rounded border border-green-500/20">
                    File uploaded successfully
                  </div>
                )}
              </div>
            )}
            
            {activeTab === 'wifi' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Network Name (SSID)</label>
                  <input type="text" value={wifiData.ssid} onChange={(e) => setWifiData({...wifiData, ssid: e.target.value})} className="w-full px-4 py-3 rounded-md border bg-background" placeholder="Network Name" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Password</label>
                  <input type="password" value={wifiData.password} onChange={(e) => setWifiData({...wifiData, password: e.target.value})} className="w-full px-4 py-3 rounded-md border bg-background" placeholder="Password" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-medium">Encryption</label>
                    <select value={wifiData.encryption} onChange={(e) => setWifiData({...wifiData, encryption: e.target.value})} className="w-full px-4 py-3 rounded-md border bg-background">
                      <option value="WPA">WPA/WPA2</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None</option>
                    </select>
                  </div>
                  <div className="space-y-2 flex flex-col justify-end">
                    <label className="flex items-center gap-2 pb-3 cursor-pointer">
                      <input type="checkbox" checked={wifiData.hidden} onChange={(e) => setWifiData({...wifiData, hidden: e.target.checked})} className="w-4 h-4 rounded text-primary border-muted" />
                      <span className="text-sm">Hidden Network</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">To</label>
                  <input type="email" value={emailData.to} onChange={(e) => setEmailData({...emailData, to: e.target.value})} className="w-full px-4 py-3 rounded-md border bg-background" placeholder="hello@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Subject</label>
                  <input type="text" value={emailData.subject} onChange={(e) => setEmailData({...emailData, subject: e.target.value})} className="w-full px-4 py-3 rounded-md border bg-background" placeholder="Subject" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Message</label>
                  <textarea rows={3} value={emailData.body} onChange={(e) => setEmailData({...emailData, body: e.target.value})} className="w-full px-4 py-3 rounded-md border bg-background" placeholder="Write your message..." />
                </div>
              </div>
            )}

            {activeTab === 'phone' && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Phone Number</label>
                <input type="tel" value={phoneData} onChange={(e) => setPhoneData(e.target.value)} className="w-full px-4 py-3 rounded-md border bg-background" placeholder="+1234567890" />
              </div>
            )}

            {activeTab === 'contact' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium">First Name</label>
                  <input type="text" value={vcardData.fName} onChange={(e) => setVcardData({...vcardData, fName: e.target.value})} className="w-full px-4 py-2.5 rounded-md border bg-background" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Last Name</label>
                  <input type="text" value={vcardData.lName} onChange={(e) => setVcardData({...vcardData, lName: e.target.value})} className="w-full px-4 py-2.5 rounded-md border bg-background" placeholder="Doe" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="block text-sm font-medium">Company</label>
                  <input type="text" value={vcardData.org} onChange={(e) => setVcardData({...vcardData, org: e.target.value})} className="w-full px-4 py-2.5 rounded-md border bg-background" placeholder="Acme Inc" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Phone</label>
                  <input type="tel" value={vcardData.phone} onChange={(e) => setVcardData({...vcardData, phone: e.target.value})} className="w-full px-4 py-2.5 rounded-md border bg-background" placeholder="+1234567890" />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium">Email</label>
                  <input type="email" value={vcardData.email} onChange={(e) => setVcardData({...vcardData, email: e.target.value})} className="w-full px-4 py-2.5 rounded-md border bg-background" placeholder="john@example.com" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Customization Options */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            Design & Customization
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="block text-sm font-medium">Foreground Color</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={fgColor}
                  onChange={(e) => setFgColor(e.target.value)}
                  className="h-10 w-16 p-1 rounded border cursor-pointer"
                />
                <span className="text-sm font-mono uppercase bg-muted px-2 py-1 rounded">{fgColor}</span>
              </div>
            </div>
            
            <div className="space-y-3">
              <label className="block text-sm font-medium">Background Color</label>
              <div className="flex gap-3 items-center">
                <input 
                  type="color" 
                  value={bgColor}
                  onChange={(e) => setBgColor(e.target.value)}
                  className="h-10 w-16 p-1 rounded border cursor-pointer"
                />
                <span className="text-sm font-mono uppercase bg-muted px-2 py-1 rounded">{bgColor}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Preview */}
      <div className="lg:col-span-4">
        <div className="bg-card border rounded-xl p-6 shadow-sm sticky top-6 flex flex-col items-center space-y-6">
          <h3 className="font-semibold text-lg self-start">Preview</h3>
          
          <div className="bg-white p-4 rounded-xl shadow-inner border" style={{ backgroundColor: bgColor }}>
            <QRCodeSVG 
              value={qrValue || ' '} 
              size={220}
              fgColor={fgColor}
              bgColor={bgColor}
              level="H"
              includeMargin={false}
            />
          </div>
          
          <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t">
            <button className="flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg font-medium hover:bg-primary/90 transition-colors">
              <FileDown size={18} />
              PNG
            </button>
            <button className="flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2.5 rounded-lg font-medium hover:bg-secondary/80 transition-colors">
              <FileDown size={18} />
              SVG
            </button>
          </div>
          
          <div className="w-full pt-4 text-center">
            {dynamicSuccess ? (
              <div className="p-3 bg-green-500/10 text-green-600 rounded-lg text-sm font-medium border border-green-500/20">
                Success! QR is now Dynamic.<br/>
                Scan it to test redirection.
              </div>
            ) : (
              <>
                <button 
                  onClick={handleMakeDynamic}
                  disabled={isCreatingDynamic || !qrValue.trim()}
                  className="w-full flex items-center justify-center gap-2 bg-foreground text-background py-2.5 rounded-lg font-medium hover:bg-foreground/90 transition-colors disabled:opacity-50"
                >
                  {isCreatingDynamic && <Loader2 className="animate-spin" size={16} />}
                  Make Dynamic
                </button>
                {dynamicError && (
                  <p className="text-xs text-destructive mt-2">{dynamicError}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Dynamic QR codes allow you to edit the destination later and track scans.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRGenerator;
