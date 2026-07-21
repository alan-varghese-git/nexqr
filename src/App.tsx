
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/layout/Header';
import QRGenerator from './components/generator/QRGenerator';
import QRScanner from './components/scanner/QRScanner';
import History from './components/history/History';
import RedirectHandler from './components/RedirectHandler';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<QRGenerator />} />
            <Route path="/scan" element={<QRScanner />} />
            <Route path="/history" element={<History />} />
            <Route path="/:shortId" element={<RedirectHandler />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
