import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../contexts/AppContext';
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Sun,
  Moon,
  Store,
  Tag,
  ShoppingBag,
  Truck,
  ChevronDown,
  ChevronRight,
  X,
  PackageOpen,
  MessageCircle,
  Bot,
} from 'lucide-react';
import ChatBotButton from '../ChatBot/ChatBotButton';

interface SidebarProps {
  currentPage: string;
  onPageChange: (page: string) => void;
}

export default function Sidebar({ currentPage, onPageChange }: SidebarProps) {
  const { state, dispatch, logout } = useApp();
  const navigate = useNavigate();
  const [expandedSections, setExpandedSections] = useState<string[]>(['ventas', 'catalogo', 'personas']);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuSections = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      items: []
    },
    {
      id: 'ventas',
      label: 'Ventas',
      icon: ShoppingCart,
      items: [
        { id: 'ventas', label: 'Historial de Ventas', icon: ShoppingCart },
        { id: 'pos', label: 'Punto de Venta', icon: Store }
      ]
    },
    {
      id: 'catalogo',
      label: 'Catálogo',
      icon: ShoppingBag,
      items: [
        { id: 'productos', label: 'Productos', icon: ShoppingBag },
        { id: 'categorias', label: 'Categorías', icon: Tag },
        { id: 'stock', label: 'Gestión de Stock', icon: PackageOpen }
      ]
    },
    {
      id: 'personas',
      label: 'Personas',
      icon: Users,
      items: [
        { id: 'clientes', label: 'Clientes', icon: Users },
        { id: 'proveedores', label: 'Proveedores', icon: Truck },
        ...(state.user?.role === 'admin' ? [{ id: 'usuarios', label: 'Usuarios', icon: Users }] : [])
      ]
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: BarChart3,
      items: []
    },
    ...(state.user?.role === 'admin' ? [{
      id: 'configuracion',
      label: 'Configuración',
      icon: Settings,
      items: []
    }] : [])
  ];

  // Colores para los íconos
  const iconColors: Record<string, string> = {
    dashboard: 'text-blue-600',
    productos: 'text-blue-600',
    categorias: 'text-indigo-600',
    clientes: 'text-green-600',
    proveedores: 'text-amber-600',
    usuarios: 'text-orange-500',
    ventas: 'text-pink-600',
    pos: 'text-yellow-500',
    reportes: 'text-teal-500',
    configuracion: 'text-red-500',
    chatbot: 'text-emerald-600',
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleLogout = () => {
    logout();
  };

  const handleMobileMenuToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleNavigation = (page: string) => {
    const routes: Record<string, string> = {
      dashboard: '/dashboard',
      ventas: '/sales',
      pos: '/pos',
      productos: '/products',
      categorias: '/categories',
      stock: '/stock',
      clientes: '/customers',
      proveedores: '/providers',
      usuarios: '/users',
      reportes: '/reports',
      configuracion: '/config'
    };
    
    const route = routes[page] || '/dashboard';
    navigate(route);
    setMobileMenuOpen(false);
  };

  const handleMobileNavigation = (page: string) => {
    handleNavigation(page);
  };

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          onClick={handleMobileMenuToggle}
          className="p-3 rounded-lg bg-white shadow-lg hover:bg-gray-50 transition-colors"
        >
          {mobileMenuOpen ? (
            <X className="h-6 w-6 text-gray-600" />
          ) : (
            <Menu className="h-6 w-6 text-gray-600" />
          )}
        </button>
      </div>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleMobileMenuToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`${
          state.sidebarCollapsed ? 'w-16' : 'w-64'
        } ${state.sidebarLight ? 'bg-white' : 'bg-gray-950 dark:bg-black'} border-r border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col h-full ${
          mobileMenuOpen ? 'lg:translate-x-0 translate-x-0 fixed lg:relative z-50' : 'lg:translate-x-0 -translate-x-full fixed lg:relative z-50'
        }`}
      >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        {!state.sidebarCollapsed && (
          <div className="flex items-center space-x-2">
            <Store className="h-8 w-8 text-blue-600" />
            <h1 className={`text-xl font-bold ${state.sidebarLight ? 'text-gray-900' : 'text-white'}`}>
              {state.config.name}
            </h1>
          </div>
        )}
        <button
          onClick={() => dispatch({ type: 'TOGGLE_SIDEBAR' })}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Menu className="h-5 w-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* User Info */}
      {!state.sidebarCollapsed && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 font-semibold text-sm">
                {state.user?.name.charAt(0)}
              </span>
            </div>
            <div>
              <p className={`text-sm font-medium ${state.sidebarLight ? 'text-gray-900 font-bold' : 'text-white'}`}>
                {state.user?.name}
              </p>
              <p className={`text-xs capitalize ${state.sidebarLight ? 'text-gray-700 font-bold' : 'text-gray-300'}`}>
                {state.user?.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {menuSections.map((section) => {
          const Icon = section.icon;
          const hasItems = section.items.length > 0;
          const isExpanded = expandedSections.includes(section.id);
          const isActive = currentPage === section.id || section.items.some(item => item.id === currentPage);
          const iconColor = iconColors[section.id] || 'text-blue-600';

          if (hasItems && !state.sidebarCollapsed) {
            return (
              <div key={section.id} className="space-y-1">
                <button
                  onClick={() => toggleSection(section.id)}
                  className={`w-full flex items-center justify-between space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive
                      ? (state.sidebarLight ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400')
                      : (state.sidebarLight ? 'text-gray-900 font-bold hover:bg-gray-100' : 'text-white hover:bg-gray-800 dark:hover:bg-gray-900')
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
                    <span className="text-sm font-medium">{section.label}</span>
                  </div>
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 flex-shrink-0" />
                  )}
                </button>
                
                {isExpanded && (
                  <div className="ml-4 space-y-1">
                    {section.items.map((item) => {
                      const ItemIcon = item.icon;
                      const itemIsActive = currentPage === item.id;
                      const itemIconColor = iconColors[item.id] || 'text-blue-600';
                      
                      return (
                        <button
                          key={item.id}
                          onClick={() => handleNavigation(item.id)}
                          className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                            itemIsActive
                              ? (state.sidebarLight ? 'bg-blue-50 text-blue-600 font-medium' : 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400')
                              : (state.sidebarLight ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900')
                          }`}
                        >
                          <ItemIcon className={`h-4 w-4 flex-shrink-0 ${itemIconColor}`} />
                          <span className="text-sm">{item.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          } else {
            return (
              <button
                key={section.id}
                onClick={() => handleNavigation(section.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors ${
                  isActive
                    ? (state.sidebarLight ? 'bg-blue-50 text-blue-600 font-bold' : 'bg-blue-50 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400')
                    : (state.sidebarLight ? 'text-gray-900 font-bold hover:bg-gray-100' : 'text-white hover:bg-gray-800 dark:hover:bg-gray-900')
                }`}
              >
                <Icon className={`h-5 w-5 flex-shrink-0 ${iconColor}`} />
                {!state.sidebarCollapsed && (
                  <span className={`text-sm font-medium ${state.sidebarLight ? 'font-bold' : ''}`}>{section.label}</span>
                )}
              </button>
            );
          }
        })}

        <button
          onClick={() => dispatch({ type: 'TOGGLE_DARK_MODE' })}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors
            ${state.darkMode ? 'text-gray-900 hover:bg-gray-100' : 'text-white hover:bg-gray-800 dark:hover:bg-gray-900'}
            font-bold border border-gray-200 dark:border-gray-700 mb-2`}
        >
          {state.darkMode ? (
            <Moon className="h-5 w-5 flex-shrink-0 text-gray-900" />
          ) : (
            <Sun className="h-5 w-5 flex-shrink-0 text-yellow-400" />
          )}
          {!state.sidebarCollapsed && (
            <span className="text-sm font-medium">
              {state.darkMode ? 'Modo Claro' : 'Modo Oscuro'}
            </span>
          )}
        </button>

        <button
          onClick={handleLogout}
          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors
            ${state.sidebarLight ? 'text-red-600 hover:bg-red-50' : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'}
            font-bold border border-gray-200 dark:border-gray-700`}
        >
          <LogOut className={`h-5 w-5 flex-shrink-0 ${state.sidebarLight ? 'text-red-600' : 'text-red-400'}`} />
          {!state.sidebarCollapsed && (
            <span className="text-sm font-medium">Cerrar Sesión</span>
          )}
        </button>

        {/* ChatBot Button */}
        <div className="mt-auto pt-2 border-t border-gray-200 dark:border-gray-700">
          <ChatBotButton isSidebar={true} />
        </div>
      </nav>
      </div>
    </>
  );
}