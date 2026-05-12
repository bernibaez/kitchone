import { ReactNode, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  UtensilsCrossed,
  FolderOpen,
  DollarSign,
  ShoppingCart,
  ChefHat,
  ClipboardList,
  History,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  UserCircle2,
  ChevronLeft,
  ChevronRight,
  Check,
  X
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

interface RecentOrder {
  id: string;
  order_number: string;
  table_number: string;
  status: string;
  created_at: string;
}

interface MenuItem {
  id: string;
  label: string;
  icon: ReactNode;
  roles: string[];
}

export default function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);

  // Órdenes recientes solo para el panel del dashboard
  useEffect(() => {
    if (currentPage !== 'dashboard') return;

    const loadRecentOrders = async () => {
      try {
        const { data } = await supabase
          .from('orders')
          .select('id, order_number, tables(table_number), status, created_at')
          .order('created_at', { ascending: false })
          .limit(3);
        
        const mappedOrders = (data || []).map((o: any) => ({
          id: o.id,
          order_number: o.order_number,
          table_number: o.tables?.table_number || '',
          status: o.status,
          created_at: o.created_at,
        }));
        
        setRecentOrders(mappedOrders);
      } catch (error) {
        console.error('Error loading recent orders:', error);
      }
    };
    
    loadRecentOrders();
  }, [currentPage]);

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, roles: ['admin', 'mesero', 'cocinero'] },
    { id: 'users', label: 'Usuarios', icon: <Users className="w-5 h-5" />, roles: ['admin'] },
    { id: 'customers', label: 'Clientes', icon: <UserCheck className="w-5 h-5" />, roles: ['admin', 'mesero'] },
    { id: 'categories', label: 'Categorías', icon: <FolderOpen className="w-5 h-5" />, roles: ['admin'] },
    { id: 'dishes', label: 'Platillos', icon: <UtensilsCrossed className="w-5 h-5" />, roles: ['admin'] },
    { id: 'tables', label: 'Mesas', icon: <Menu className="w-5 h-5" />, roles: ['admin'] },
    { id: 'expenses', label: 'Gastos', icon: <DollarSign className="w-5 h-5" />, roles: ['admin'] },
    { id: 'sales', label: 'Facturación', icon: <ShoppingCart className="w-5 h-5" />, roles: ['admin', 'mesero'] },
    { id: 'orders', label: 'Órdenes', icon: <ClipboardList className="w-5 h-5" />, roles: ['admin', 'mesero'] },
    { id: 'kitchen', label: 'Cocina', icon: <ChefHat className="w-5 h-5" />, roles: ['admin', 'cocinero'] },
    { id: 'history', label: 'Historial', icon: <History className="w-5 h-5" />, roles: ['admin'] },
    { id: 'reports', label: 'Reportes', icon: <BarChart3 className="w-5 h-5" />, roles: ['admin'] },
    { id: 'config', label: 'Configuración', icon: <Settings className="w-5 h-5" />, roles: ['admin'] },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    profile && item.roles.includes(profile.role)
  );

  const sidebarVariants = {
    open: { x: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
    closed: { x: '-100%', transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
  };

  const navItemVariants = {
    initial: { opacity: 0, x: -12 },
    animate: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: { delay: i * 0.04, duration: 0.3, ease: 'easeOut' as const },
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50/30">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-50 w-64">
        <div className="flex flex-col h-full bg-white/80 backdrop-blur-xl border-r border-slate-200/60 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.04)]">
          {/* Logo */}
          <div className="flex items-center space-x-3 p-6 border-b border-slate-100">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 3 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25"
            >
              <ChefHat className="w-5 h-5 text-white" />
            </motion.div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                Kitch One
              </h1>
              <p className="text-[10px] font-medium text-slate-400 tracking-wider uppercase">Restaurant System</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto p-3 hide-scrollbar">
            <div className="space-y-0.5">
              {filteredMenuItems.map((item, i) => {
                const isActive = currentPage === item.id;
                return (
                  <motion.button
                    key={item.id}
                    custom={i}
                    variants={navItemVariants}
                    initial="initial"
                    animate="animate"
                    whileHover={{ x: 4 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => onNavigate(item.id)}
                    className={`relative w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 group ${
                      isActive
                        ? 'text-orange-600'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {/* Active background pill */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavBg"
                        className="absolute inset-0 bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl border border-orange-100/60"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    {/* Active left indicator */}
                    {isActive && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-orange-500 to-amber-500 rounded-full"
                        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                      />
                    )}
                    <span className={`relative z-10 transition-colors duration-200 ${isActive ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
                      {item.icon}
                    </span>
                    <span className="relative z-10 font-medium text-sm">{item.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </nav>

          {/* User & Logout */}
          <div className="p-4 border-t border-slate-100">
            <div className="flex items-center space-x-3 px-3 py-2 mb-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold shadow-md shadow-orange-400/20">
                {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-700 truncate">{profile?.full_name || 'Usuario'}</p>
                <p className="text-xs text-slate-400 capitalize">{profile?.role || 'admin'}</p>
              </div>
            </div>
            <motion.button
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.97 }}
              onClick={signOut}
              className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50/60 transition-all duration-200"
            >
              <LogOut className="w-4 h-4" />
              <span className="font-medium text-sm">Cerrar Sesión</span>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.div
              variants={sidebarVariants}
              initial="closed"
              animate="open"
              exit="closed"
              className="fixed inset-y-0 left-0 z-50 w-72 bg-white/95 backdrop-blur-xl shadow-2xl shadow-slate-900/10 lg:hidden"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-5 border-b border-slate-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/25">
                      <ChefHat className="w-5 h-5 text-white" />
                    </div>
                    <h1 className="text-lg font-bold text-slate-800">Kitch One</h1>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.9, rotate: 90 }}
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
                <nav className="flex-1 overflow-y-auto p-3 hide-scrollbar">
                  <div className="space-y-0.5">
                    {filteredMenuItems.map((item, i) => {
                      const isActive = currentPage === item.id;
                      return (
                        <motion.button
                          key={item.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => {
                            onNavigate(item.id);
                            setSidebarOpen(false);
                          }}
                          className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                            isActive
                              ? 'bg-gradient-to-r from-orange-50 to-amber-50 text-orange-600 border border-orange-100/60'
                              : 'text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          <span className={isActive ? 'text-orange-500' : 'text-slate-400'}>{item.icon}</span>
                          <span className="font-medium text-sm">{item.label}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </nav>
                <div className="p-4 border-t border-slate-100">
                  <button
                    onClick={signOut}
                    className="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50/60 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="font-medium">Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile Top Bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/60 px-4 py-3">
        <div className="flex items-center justify-between">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </motion.button>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
              <ChefHat className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800">Kitch One</span>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold">
            {profile?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="lg:pl-64">
        <div className="flex flex-col lg:flex-row lg:items-start min-h-0">
          <main className="flex-1 min-w-0 p-4 pt-20 pb-8 lg:p-6 lg:pt-6">
            {children}
          </main>
          {currentPage === 'dashboard' && (
          <aside className="w-full lg:max-w-sm xl:max-w-md shrink-0 p-4 lg:p-6 lg:pb-8 space-y-6 border-t lg:border-t-0 lg:border-l border-slate-200/50 bg-slate-50/40 lg:bg-transparent">
            {/* Perfil de Usuario */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mb-6"
            >
              <div className="flex items-center space-x-3 mb-4">
                {profile?.full_name ? (
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-400 via-rose-400 to-violet-400 text-white flex items-center justify-center text-sm font-bold shadow-lg shadow-orange-400/20">
                    {profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                ) : (
                  <UserCircle2 className="w-12 h-12 text-slate-300" />
                )}
                <div>
                  <h3 className="font-semibold text-slate-800">{profile?.full_name || 'Sara Abraham'}</h3>
                  <button className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">Ver perfil</button>
                </div>
              </div>
            </motion.div>

            {/* Calendario de Programación */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Calendario</h3>
                <div className="flex items-center space-x-1">
                  <motion.button whileTap={{ scale: 0.9 }} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    <ChevronLeft className="w-4 h-4 text-slate-500" />
                  </motion.button>
                  <span className="px-3 py-1 text-sm bg-orange-50 text-orange-600 rounded-lg font-medium">Mayo</span>
                  <motion.button whileTap={{ scale: 0.9 }} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors">
                    <ChevronRight className="w-4 h-4 text-slate-500" />
                  </motion.button>
                </div>
              </div>
              <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-100">
                <div className="grid grid-cols-5 gap-2 text-center text-xs font-semibold text-slate-400 mb-2">
                  <div>Lun</div>
                  <div>Mar</div>
                  <div>Mié</div>
                  <div>Jue</div>
                  <div>Vie</div>
                </div>
                <div className="grid grid-cols-5 gap-2 text-center">
                  {[22, 23, 24, 25, 26].map(day => (
                    <motion.div
                      key={day}
                      whileHover={{ scale: 1.15 }}
                      whileTap={{ scale: 0.9 }}
                      className={`p-2 text-sm rounded-xl cursor-pointer transition-all duration-200 font-medium ${
                        day === 24
                          ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                          : 'text-slate-600 hover:bg-white hover:shadow-sm'
                      }`}
                    >
                      {day}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Nuevas Órdenes */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Nuevas Órdenes</h3>
                <button className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">Ver Todo</button>
              </div>
              <div className="space-y-2">
                {recentOrders.slice(0, 3).map((order, i) => (
                  <motion.div
                    key={order.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + i * 0.08 }}
                    whileHover={{ x: 3, transition: { duration: 0.15 } }}
                    className="flex items-center space-x-3 p-3 bg-slate-50/80 rounded-xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all duration-200 cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700">Orden {order.order_number}</p>
                      <p className="text-xs text-slate-400">Mesa {order.table_number}</p>
                    </div>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Listos para Servir */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-800">Listos para Servir</h3>
                <button className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">Ver Todo</button>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50/60 rounded-xl border border-emerald-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center">
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-700">Órdenes Listas</p>
                      <p className="text-xs text-slate-400">0 completadas</p>
                    </div>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.01, y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white py-2.5 rounded-xl font-semibold text-sm shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-shadow duration-300"
                >
                  Ver Cocina
                </motion.button>
              </div>
            </motion.div>
          </aside>
          )}
        </div>
      </div>
    </div>
  );
}
