import React, { useEffect, useState } from 'react';
import { Search, Trash2, ExternalLink, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { collection, getDocs, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

interface ScanAnalytics {
  ip: string;
  userAgent: string;
  browser: string;
  os: string;
  device: string;
  timestamp: string;
}

interface HistoryItem {
  _id: string;
  shortId: string;
  type: string;
  originalUrl?: string;
  data?: any;
  scans: number;
  analytics?: ScanAnalytics[];
  createdAt: string;
}

const History = () => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      const q = query(collection(db, 'qrcodes'), orderBy('createdAt', 'desc'));
      const querySnapshot = await getDocs(q);
      const historyData = querySnapshot.docs.map(doc => ({
        _id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      })) as HistoryItem[];
      setHistory(historyData);
    } catch (err) {
      console.error(err);
      setError('Could not fetch history from Firebase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, shortId: string) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this QR code?')) return;
    try {
      await deleteDoc(doc(db, 'qrcodes', shortId));
      fetchHistory();
    } catch (err) {
      console.error('Error deleting document:', err);
      alert('Failed to delete QR code.');
    }
  };

  const filteredHistory = history.filter(item => 
    item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (item.originalUrl && item.originalUrl.toLowerCase().includes(searchQuery.toLowerCase())) ||
    item.shortId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">QR History & Analytics</h2>
          <p className="text-muted-foreground">Manage your dynamic QR codes and view detailed scan data.</p>
        </div>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input 
            type="text" 
            placeholder="Search history..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-12 text-muted-foreground">
            <Loader2 className="animate-spin mr-2" size={24} /> Loading...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-destructive">
            <p>{error}</p>
            <p className="text-sm mt-2 text-muted-foreground">Ensure your Firebase configuration is correct in firebase.ts.</p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            No QR codes found. Create some in the Generator!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted/50 text-muted-foreground">
                <tr>
                  <th className="px-6 py-4 font-medium">Type</th>
                  <th className="px-6 py-4 font-medium">Short ID</th>
                  <th className="px-6 py-4 font-medium">Data / URL</th>
                  <th className="px-6 py-4 font-medium">Scans</th>
                  <th className="px-6 py-4 font-medium">Date</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredHistory.map((item) => (
                  <React.Fragment key={item._id}>
                    <tr 
                      className={`hover:bg-muted/30 transition-colors cursor-pointer ${expandedId === item._id ? 'bg-muted/10' : ''}`}
                      onClick={() => setExpandedId(expandedId === item._id ? null : item._id)}
                    >
                      <td className="px-6 py-4 font-medium">
                        <span className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-xs">
                          {item.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs">{item.shortId}</td>
                      <td className="px-6 py-4 truncate max-w-[200px]" title={item.originalUrl || JSON.stringify(item.data)}>
                        {item.originalUrl || 'Data Payload'}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {item.scans} scans
                        </span>
                      </td>
                      <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2 items-center">
                          <a 
                            href={`${window.location.origin}/${item.shortId}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="p-2 text-muted-foreground hover:text-primary transition-colors inline-block"
                          >
                            <ExternalLink size={18} />
                          </a>
                          <button 
                            onClick={(e) => handleDelete(e, item.shortId)}
                            className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                          <div className="p-2 text-muted-foreground">
                            {expandedId === item._id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                          </div>
                        </div>
                      </td>
                    </tr>
                    
                    {/* Expandable Analytics Drawer */}
                    {expandedId === item._id && (
                      <tr className="bg-muted/5 border-b">
                        <td colSpan={6} className="px-6 py-6">
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm flex items-center gap-2">
                              Analytics Breakdown
                            </h4>
                            {item.analytics && item.analytics.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div className="space-y-3">
                                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Recent Scans</h5>
                                  <ul className="space-y-2 border-l-2 border-primary/20 pl-4">
                                    {[...item.analytics].reverse().slice(0, 5).map((a, i) => (
                                      <li key={i} className="flex justify-between items-start text-xs">
                                        <div>
                                          <span className="font-medium">{a.os}</span> / {a.browser}
                                          <div className="text-muted-foreground text-[10px] mt-0.5 font-mono">{a.ip}</div>
                                        </div>
                                        <span className="text-muted-foreground whitespace-nowrap ml-2">
                                          {new Date(a.timestamp).toLocaleString()}
                                        </span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                                <div className="space-y-3">
                                  <h5 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Stats</h5>
                                  <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="bg-background border p-3 rounded-lg">
                                      <div className="text-muted-foreground mb-1">Total Scans</div>
                                      <div className="text-xl font-bold">{item.scans}</div>
                                    </div>
                                    <div className="bg-background border p-3 rounded-lg">
                                      <div className="text-muted-foreground mb-1">Last Scanned</div>
                                      <div className="font-medium truncate">
                                        {new Date(item.analytics[item.analytics.length - 1].timestamp).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground italic bg-background p-4 rounded-lg border">
                                This QR code has not been scanned yet. Test it by scanning the dynamic link!
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default History;
