import { AppProvider, useApp } from './contexts/AppContext';
import LoginForm from './components/Auth/LoginForm';
import Sidebar from './components/Layout/Sidebar';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Categories from './pages/Categories';
import Customers from './pages/Customers';
import Providers from './pages/Providers';
import PointOfSale from './pages/PointOfSale';
import Sales from './pages/Sales';
import Reports from './pages/Reports';
import Config from './pages/Config';
import Users from './pages/Users';
import StockManagement from './pages/StockManagement';
import { Routes, Route, useLocation } from 'react-router-dom';
import SaleDetail from './pages/SaleDetail';

function AppContent() {
  const { state } = useApp();
  const location = useLocation();

  // Determinar la página actual para el Sidebar
  const getCurrentPage = () => {
    if (location.pathname.startsWith('/products')) return 'productos';
    if (location.pathname.startsWith('/categories')) return 'categorias';
    if (location.pathname.startsWith('/customers')) return 'clientes';
    if (location.pathname.startsWith('/providers')) return 'proveedores';
    if (location.pathname.startsWith('/users')) return 'usuarios';
    if (location.pathname.startsWith('/pos')) return 'pos';
    if (location.pathname.startsWith('/sales')) return 'ventas';
    if (location.pathname.startsWith('/reports')) return 'reportes';
    if (location.pathname.startsWith('/config')) return 'configuracion';
    if (location.pathname.startsWith('/stock')) return 'stock';
    return 'dashboard';
  };

  const handlePageChange = (page: string) => {
    // Manejar cambios de página si es necesario
    console.log('Página cambiada a:', page);
  };

  if (!state.user) {
    return <LoginForm />;
  }

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar currentPage={getCurrentPage()} onPageChange={handlePageChange} />
      <div className="flex-1 flex flex-col overflow-y-auto">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/providers" element={<Providers />} />
          <Route path="/users" element={<Users />} />
          <Route path="/pos" element={<PointOfSale />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/sales/:id" element={<SaleDetail />} />
          <Route path="/config" element={<Config />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/stock" element={<StockManagement />} />
        </Routes>
      </div>
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;