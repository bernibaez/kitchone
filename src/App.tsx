import { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import AnimatedPage from './components/AnimatedPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ConfigProvider } from './contexts/ConfigContext';
import Login from './components/Login';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Customers from './pages/Customers';
import Categories from './pages/Categories';
import Dishes from './pages/Dishes';
import Tables from './pages/Tables';
import Expenses from './pages/Expenses';
import Sales from './pages/Sales';
import Orders from './pages/Orders';
import Kitchen from './pages/Kitchen';
import History from './pages/History';
import Reports from './pages/Reports';
import Config from './pages/Config';

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-orange-50/30 flex items-center justify-center">
        <div className="relative">
          <div className="w-14 h-14 rounded-full border-[3px] border-orange-200 border-t-orange-500 animate-spin" />
          <div className="absolute inset-0 w-14 h-14 rounded-full border-[3px] border-transparent border-b-amber-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} />;
      case 'users':
        return <Users />;
      case 'customers':
        return <Customers />;
      case 'categories':
        return <Categories />;
      case 'dishes':
        return <Dishes />;
      case 'tables':
        return <Tables />;
      case 'expenses':
        return <Expenses />;
      case 'sales':
        return <Sales onNavigate={setCurrentPage} />;
      case 'orders':
        return <Orders />;
      case 'kitchen':
        return <Kitchen />;
      case 'history':
        return <History onNavigate={setCurrentPage} />;
      case 'reports':
        return <Reports />;
      case 'config':
        return <Config />;
      default:
        return <Dashboard onNavigate={setCurrentPage} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      <AnimatePresence mode="wait">
        <AnimatedPage key={currentPage}>
          {renderPage()}
        </AnimatedPage>
      </AnimatePresence>
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <ConfigProvider>
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </ConfigProvider>
    </AuthProvider>
  );
}

export default App;
