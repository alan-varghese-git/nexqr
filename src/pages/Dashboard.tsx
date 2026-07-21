import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthProvider';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { Loader2, QrCode, MousePointerClick, Database, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

interface QRCodeData {
  id: string;
  shortId: string;
  type: string;
  originalUrl: string | null;
  scans: number;
  createdAt: any;
}

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [qrcodes, setQrcodes] = useState<QRCodeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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
    fetchQRCodes();
  }, [user]);

  const handleSignOut = () => {
    signOut(auth);
    navigate('/');
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
            <p className="text-sm font-medium text-muted-foreground">Storage Used</p>
            <h2 className="text-3xl font-bold mt-1">0 MB</h2>
          </div>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b">
          <h3 className="font-semibold text-lg">Recent Dynamic QR Codes</h3>
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
                  <th className="px-6 py-4 font-medium">Scans</th>
                  <th className="px-6 py-4 font-medium">Short ID</th>
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
                    <td className="px-6 py-4 font-medium">{qr.scans || 0}</td>
                    <td className="px-6 py-4 font-mono text-muted-foreground">{qr.shortId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
