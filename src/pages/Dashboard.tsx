import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { collection, query, where, getDocs, orderBy, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, QrCode, MousePointerClick, Database, LogOut, Edit2, BarChart2, Trash2, X, Lock, Eye, Smartphone } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface ScanAnalytics {
  browser: string;
  os: string;
  device: string;
  timestamp: string;
}

interface QRCodeData {
  id: string;
  shortId: string;
  type: string;
  originalUrl: string | null;
  scans: number;
  analytics?: ScanAnalytics[];
  password?: string | null;
  expiresAt?: string | null;
  maxScans?: number | null;
  isLocked?: boolean;
  createdAt: any;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qrcodes, setQrcodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [editingQr, setEditingQr] = useState<QRCodeData | null>(null);
  const [analyticsQr, setAnalyticsQr] = useState<QRCodeData | null>(null);
  
  // Edit Form state
  const [editUrl, setEditUrl] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editExpiresAt, setEditExpiresAt] = useState('');
  const [editMaxScans, setEditMaxScans] = useState('');
  const [editIsLocked, setEditIsLocked] = useState(false);
  const [saving, setSaving] = useState(false);

  const fetchQRCodes = async () => {
    if (!user) return;
    try {
      const q = query(
        collection(db, 'qrcodes'),
        where('uid', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const codes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as QRCodeData));
      setQrcodes(codes);
    } catch (error) {
      console.error("Error fetching QR codes", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQRCodes();
  }, [user]);

  const handleSignOut = () => {
    signOut(auth);
    navigate('/');
  };

  const openEditModal = (qr: QRCodeData) => {
    setEditingQr(qr);
    setEditUrl(qr.originalUrl || '');
    setEditPassword(qr.password || '');
    setEditExpiresAt(qr.expiresAt ? qr.expiresAt.substring(0, 16) : '');
    setEditMaxScans(qr.maxScans ? qr.maxScans.toString() : '');
    setEditIsLocked(!!qr.isLocked);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQr) return;
    setSaving(true);
    try {
      const docRef = doc(db, 'qrcodes', editingQr.id);
      await updateDoc(docRef, {
        originalUrl: editUrl.trim() || null,
        password: editPassword.trim() || null,
        expiresAt: editExpiresAt ? new Date(editExpiresAt).toISOString() : null,
        maxScans: editMaxScans ? parseInt(editMaxScans, 10) : null,
        isLocked: editIsLocked
      });
      setEditingQr(null);
      await fetchQRCodes();
    } catch (err) {
      console.error('Failed to update QR Code', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this QR Code?')) return;
    try {
      await deleteDoc(doc(db, 'qrcodes', id));
      setQrcodes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Failed to delete QR Code', err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const totalScans = qrcodes.reduce((sum, qr) => sum + (qr.scans || 0), 0);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.email}</p>
        </div>
        <button 
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
        >
          <LogOut size={16} /> Sign Out
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-xl text-primary">
            <QrCode size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total QR Codes</p>
            <h2 className="text-3xl font-bold mt-1">{qrcodes.length}</h2>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-green-500/10 rounded-xl text-green-600">
            <MousePointerClick size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Scans</p>
            <h2 className="text-3xl font-bold mt-1">{totalScans}</h2>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-blue-500/10 rounded-xl text-blue-600">
            <Database size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Active Dynamic QRs</p>
            <h2 className="text-3xl font-bold mt-1">{qrcodes.filter(q => !q.isLocked).length}</h2>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg">My Dynamic QR Codes</h3>
        </div>
        {qrcodes.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            You haven't created any dynamic QR codes yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 text-sm text-muted-foreground text-left">
                <tr>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Destination</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Scans</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {qrcodes.map(qr => (
                  <tr key={qr.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                        {qr.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 max-w-[200px] truncate">
                      {qr.originalUrl || 'Data Payload'}
                    </td>
                    <td className="px-6 py-4">
                      {qr.isLocked ? (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-full font-medium">
                          <Lock size={12} /> Paused
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600 bg-green-500/10 px-2 py-0.5 rounded-full font-medium">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-medium">{qr.scans || 0}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button 
                        onClick={() => openEditModal(qr)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                        title="Edit QR Settings"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setAnalyticsQr(qr)}
                        className="p-2 hover:bg-muted rounded-lg text-muted-foreground hover:text-primary transition-colors"
                        title="View Analytics"
                      >
                        <BarChart2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(qr.id)}
                        className="p-2 hover:bg-destructive/10 rounded-lg text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete QR Code"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingQr && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-semibold text-lg">Edit Dynamic QR Code</h3>
              <button onClick={() => setEditingQr(null)} className="p-1 hover:bg-muted rounded-full">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Destination URL</label>
                <input
                  type="text"
                  value={editUrl}
                  onChange={(e) => setEditUrl(e.target.value)}
                  className="w-full p-3 rounded-lg border bg-background text-sm"
                  placeholder="https://..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Password Lock</label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full p-3 rounded-lg border bg-background text-sm"
                    placeholder="None"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Max Scans Limit</label>
                  <input
                    type="number"
                    value={editMaxScans}
                    onChange={(e) => setEditMaxScans(e.target.value)}
                    className="w-full p-3 rounded-lg border bg-background text-sm"
                    placeholder="Unlimited"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Expiration Date & Time</label>
                <input
                  type="datetime-local"
                  value={editExpiresAt}
                  onChange={(e) => setEditExpiresAt(e.target.value)}
                  className="w-full p-3 rounded-lg border bg-background text-sm"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="lockCheck"
                  checked={editIsLocked}
                  onChange={(e) => setEditIsLocked(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <label htmlFor="lockCheck" className="text-sm font-medium cursor-pointer">
                  Pause / Disable this QR code
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setEditingQr(null)}
                  className="px-4 py-2 text-sm font-medium border rounded-lg hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 flex items-center gap-2"
                >
                  {saving && <Loader2 className="animate-spin" size={14} />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      {analyticsQr && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-4">
              <div>
                <h3 className="font-semibold text-lg">QR Analytics Report</h3>
                <p className="text-xs text-muted-foreground">ID: {analyticsQr.shortId}</p>
              </div>
              <button onClick={() => setAnalyticsQr(null)} className="p-1 hover:bg-muted rounded-full">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-muted/40 rounded-xl border flex items-center gap-3">
                <Eye className="text-primary" size={24} />
                <div>
                  <p className="text-xs text-muted-foreground">Total Scans</p>
                  <p className="text-2xl font-bold">{analyticsQr.scans || 0}</p>
                </div>
              </div>
              <div className="p-4 bg-muted/40 rounded-xl border flex items-center gap-3">
                <Smartphone className="text-green-600" size={24} />
                <div>
                  <p className="text-xs text-muted-foreground">Mobile Scans</p>
                  <p className="text-2xl font-bold">
                    {(analyticsQr.analytics || []).filter(a => a.device === 'mobile').length}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium text-sm mb-3">Scan Logs Timeline</h4>
              {!analyticsQr.analytics || analyticsQr.analytics.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 border rounded-xl">
                  No scan logs recorded yet.
                </p>
              ) : (
                <div className="border rounded-xl divide-y max-h-60 overflow-y-auto text-xs">
                  {analyticsQr.analytics.slice().reverse().map((log, index) => (
                    <div key={index} className="p-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium">{log.browser} on {log.os}</p>
                        <p className="text-[10px] text-muted-foreground capitalize">{log.device} device</p>
                      </div>
                      <span className="text-muted-foreground font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
