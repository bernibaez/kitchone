import { useState } from 'react';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import AnimatedPage from './components/AnimatedPage';
import { ToastProvider } from './components/ui/Toast';
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
      <div className="flex min-h-screen items-center justify-center bg-bg" role="status" aria-label="Cargando">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-line border-t-accent" />
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
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ConfigProvider>
          <NotificationProvider>
            <ToastProvider>
              <AppContent />
            </ToastProvider>
          </NotificationProvider>
        </ConfigProvider>
      </AuthProvider>
    </MotionConfig>
  );
}

export default App;
