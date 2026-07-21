import { useEffect, useState } from 'react';
import { collection, getDocs, query, orderBy, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, ShieldAlert, Search, Trash2, Lock, Unlock, Eye, Globe } from 'lucide-react';

interface GlobalQRCode {
  id: string;
  shortId: string;
  type: string;
  originalUrl: string | null;
  scans: number;
  uid?: string | null;
  isLocked?: boolean;
  createdAt: any;
}

const Admin = () => {
  const [qrcodes, setQrcodes] = useState<GlobalQRCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchGlobalQRs = async () => {
    try {
      const q = query(collection(db, 'qrcodes'), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as GlobalQRCode));
      setQrcodes(docs);
    } catch (err) {
      console.error('Failed to fetch global QRs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGlobalQRs();
  }, []);

  const handleToggleLock = async (qr: GlobalQRCode) => {
    try {
      const docRef = doc(db, 'qrcodes', qr.id);
      await updateDoc(docRef, { isLocked: !qr.isLocked });
      setQrcodes(prev => prev.map(q => q.id === qr.id ? { ...q, isLocked: !q.isLocked } : q));
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Admin Delete: Permanent removal of this QR code from system?')) return;
    try {
      await deleteDoc(doc(db, 'qrcodes', id));
      setQrcodes(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredQRs = qrcodes.filter(q => 
    q.shortId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.originalUrl && q.originalUrl.toLowerCase().includes(searchTerm.toLowerCase())) ||
    q.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalGlobalScans = qrcodes.reduce((sum, q) => sum + (q.scans || 0), 0);

  return (
    <div className="space-y-8 pb-12">
      <div className="flex justify-between items-center border-b pb-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-500/10 text-red-600 rounded-xl">
            <ShieldAlert size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">System Administration</h1>
            <p className="text-muted-foreground mt-0.5">Global platform metrics and moderation controls</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-primary/10 rounded-xl text-primary">
            <Globe size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Global Dynamic QRs</p>
            <h2 className="text-3xl font-bold mt-1">{qrcodes.length}</h2>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-green-500/10 rounded-xl text-green-600">
            <Eye size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Total Platform Scans</p>
            <h2 className="text-3xl font-bold mt-1">{totalGlobalScans}</h2>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-6 shadow-sm flex items-center gap-4">
          <div className="p-4 bg-amber-500/10 rounded-xl text-amber-600">
            <Lock size={24} />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Moderated / Disabled</p>
            <h2 className="text-3xl font-bold mt-1">{qrcodes.filter(q => q.isLocked).length}</h2>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-semibold text-lg">Global Dynamic QR Registry</h3>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <input
              type="text"
              placeholder="Search by ID or URL..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border rounded-xl bg-background"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Short ID</th>
                <th className="px-6 py-4 font-medium">Type</th>
                <th className="px-6 py-4 font-medium">Destination</th>
                <th className="px-6 py-4 font-medium">User UID</th>
                <th className="px-6 py-4 font-medium">Scans</th>
                <th className="px-6 py-4 font-medium text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredQRs.map(qr => (
                <tr key={qr.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 font-mono font-medium">{qr.shortId}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary/10 text-primary">
                      {qr.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-[200px] truncate">{qr.originalUrl || 'Raw Payload'}</td>
                  <td className="px-6 py-4 font-mono text-xs text-muted-foreground">
                    {qr.uid ? qr.uid.substring(0, 10) + '...' : 'Anonymous'}
                  </td>
                  <td className="px-6 py-4 font-semibold">{qr.scans || 0}</td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => handleToggleLock(qr)}
                      className={`p-2 rounded-lg border transition-colors ${qr.isLocked ? 'bg-amber-500/10 text-amber-600 border-amber-500/30' : 'hover:bg-muted text-muted-foreground'}`}
                      title={qr.isLocked ? "Unlock QR" : "Lock/Disable QR"}
                    >
                      {qr.isLocked ? <Lock size={16} /> : <Unlock size={16} />}
                    </button>
                    <button
                      onClick={() => handleDelete(qr.id)}
                      className="p-2 hover:bg-destructive/10 rounded-lg text-destructive border border-destructive/20 transition-colors"
                      title="Delete QR"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Admin;
