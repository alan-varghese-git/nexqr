import { useState, useEffect } from 'react';
import { QrCode, History, Settings, ScanLine, Moon, Sun } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const Header = () => {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check local storage or system preference on mount
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  };

  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-2 text-primary">
          <QrCode size={28} />
          <span className="text-xl font-bold tracking-tight">NexQR</span>
        </div>
        
        <nav className="hidden md:flex space-x-6">
          <Link 
            to="/" 
            className={`text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname === '/' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <QrCode size={18} />
            Generator
          </Link>
          <Link 
            to="/scan" 
            className={`text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname === '/scan' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <ScanLine size={18} />
            Scanner
          </Link>
          <Link 
            to="/history" 
            className={`text-sm font-medium transition-colors flex items-center gap-2 ${location.pathname === '/history' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            <History size={18} />
            History
          </Link>
        </nav>
        
        <div className="flex items-center space-x-2 md:space-x-4">
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground"
            aria-label="Toggle Theme"
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button className="p-2 hover:bg-secondary rounded-full transition-colors text-muted-foreground">
            <Settings size={20} />
          </button>
          <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md text-sm font-medium hover:bg-primary/90 transition-colors ml-2 hidden sm:block">
            Login
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
