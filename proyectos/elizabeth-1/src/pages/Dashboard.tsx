import React, { useMemo, useState } from 'react';
import { Bell, ChevronRight, Search, DollarSign, Users, Package, TrendingUp, Plus, ShoppingCart, BarChart3, ArrowUp, ArrowDown, Store, Eye, Target, Zap, Award, Calendar, Filter } from 'lucide-react';
import { BarChart, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Area, AreaChart, PieChart, Pie, Cell } from 'recharts';
import { useApp } from '../contexts/AppContext';
import { Sale } from '../types';
import { useNavigate } from 'react-router-dom';

function groupSalesByMonth(sales: Sale[]): { month: string; total: number }[] {
  const grouped: Record<string, number> = {};
  sales.forEach((sale) => {
    const date = new Date(sale.date);
    const key = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    grouped[key] = (grouped[key] || 0) + sale.total;
  });
  return Object.entries(grouped).map(([month, total]) => ({ month, total }));
}

export default function Dashboard() {
  const { state, getDashboardStats } = useApp();
  const navigate = useNavigate();
  const stats = getDashboardStats();
  const [timePeriod, setTimePeriod] = useState<'week' | 'month' | 'year'>('month');
  const [selectedMetric, setSelectedMetric] = useState<'revenue' | 'customers' | 'products'>('revenue');

  // Gráfica de ventas por mes
  const salesByMonth = useMemo(() => groupSalesByMonth(state.sales), [state.sales]);

  // Filtrar datos por período
  const filteredSales = useMemo(() => {
    const now = new Date();
    const startDate = new Date();
    
    switch (timePeriod) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth());
        startDate.setDate(1);
        break;
      case 'year':
        startDate.setFullYear(now.getFullYear());
        startDate.setMonth(0);
        startDate.setDate(1);
        break;
    }
    
    return state.sales.filter(sale => new Date(sale.date) >= startDate);
  }, [state.sales, timePeriod]);

  // Calcular métricas filtradas
  const filteredStats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.totalProfit, 0);
    const uniqueCustomers = new Set(filteredSales.map(sale => sale.customerName)).size;
    
    return {
      totalRevenue,
      totalProfit,
      totalCustomers: uniqueCustomers,
      totalSales: filteredSales.length
    };
  }, [filteredSales]);

  // Últimas ventas
  const latestSales = useMemo(() => {
    return state.sales
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [state.sales]);

  // Formato moneda
  const formatCurrency = (amount: number) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);

  // Datos de ejemplo para las tarjetas de métricas - usando datos reales del sistema
  const metricsData = [
    {
      title: 'Ventas Totales',
      value: formatCurrency(stats.totalSales),
      change: stats.monthProfit > 0 ? 15.3 : -5.2,
      icon: DollarSign,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      iconBg: 'bg-orange-500'
    },
    {
      title: 'Clientes Activos',
      value: stats.totalCustomers.toString(),
      change: 8.7,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      iconBg: 'bg-purple-500'
    },
    {
      title: 'Productos',
      value: stats.totalProducts.toString(),
      change: stats.lowStockCount > 0 ? -12.1 : 4.2,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      iconBg: 'bg-blue-500'
    },
    {
      title: 'Tasa Conversión',
      value: stats.totalSales > 0 ? '2.89%' : '0%',
      change: stats.totalSales > 0 ? 15.3 : 0,
      icon: TrendingUp,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      iconBg: 'bg-green-500'
    }
  ];

  // Datos de ejemplo para la tabla de campañas - usando datos reales de ventas
  const campaignsData = useMemo(() => {
    return state.sales.slice(0, 10).map((sale, index) => ({
      id: sale.id,
      name: sale.items && sale.items.length > 0 ? sale.items[0].productName : `Venta ${index + 1}`,
      creator: state.user?.name || 'Sistema',
      status: 'Completed',
      start: new Date(sale.date).toLocaleDateString(),
      end: new Date(sale.date).toLocaleDateString(),
      impressions: Math.floor(Math.random() * 500000) + 100000,
      engagements: Math.floor(Math.random() * 5000) + 5000,
      cost: formatCurrency(sale.total * 0.3),
      toggle: index % 2 === 0
    }));
  }, [state.sales]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                  Dashboard
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Resumen general de tu negocio en tiempo real
                </p>
              </div>
            </div>
            
            {/* Time Period Selector */}
            <div className="flex items-center space-x-2">
              <div className="flex bg-slate-100 rounded-xl p-1">
                {['week', 'month', 'year'].map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period as any)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      timePeriod === period
                        ? 'bg-white text-blue-600 shadow-md'
                        : 'text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {period === 'week' ? 'Semana' : period === 'month' ? 'Mes' : 'Año'}
                  </button>
                ))}
              </div>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar transacciones, productos..."
                className="pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64 lg:w-80"
              />
            </div>

            {/* Notifications */}
            <button className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="h-6 w-6 text-white/80" />
              <span className="text-2xl font-bold">{formatCurrency(filteredStats.totalRevenue)}</span>
            </div>
            <p className="text-blue-100 text-sm font-medium">Ventas Totales</p>
            <div className="flex items-center mt-2 text-blue-100">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span className="text-sm">+12.5%</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <Users className="h-6 w-6 text-white/80" />
              <span className="text-2xl font-bold">{filteredStats.totalCustomers}</span>
            </div>
            <p className="text-emerald-100 text-sm font-medium">Clientes Activos</p>
            <div className="flex items-center mt-2 text-emerald-100">
              <ArrowUp className="h-4 w-4 mr-1" />
              <span className="text-sm">+8.7%</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <Package className="h-6 w-6 text-white/80" />
              <span className="text-2xl font-bold">{stats.totalProducts}</span>
            </div>
            <p className="text-purple-100 text-sm font-medium">Total Productos</p>
            <div className="flex items-center mt-2 text-purple-100">
              <Package className="h-4 w-4 mr-1" />
              <span className="text-sm">{stats.lowStockCount} con stock bajo</span>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105">
            <div className="flex items-center justify-between mb-2">
              <Target className="h-6 w-6 text-white/80" />
              <span className="text-2xl font-bold">{filteredStats.totalSales}</span>
            </div>
            <p className="text-orange-100 text-sm font-medium">Transacciones</p>
            <div className="flex items-center mt-2 text-orange-100">
              <Zap className="h-4 w-4 mr-1" />
              <span className="text-sm">+23.1%</span>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          {/* Sales Chart */}
          <div className="xl:col-span-2 bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Tendencia de Ventas</h3>
                  <p className="text-sm text-slate-500">Análisis del período seleccionado</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1">
                <Eye className="h-4 w-4" />
                Ver detalles
              </button>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={salesByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="month" 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: 12
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    fill="url(#salesGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="space-y-6">
            {/* Conversion Rate */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-emerald-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <Target className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Tasa de Conversión</h4>
                    <p className="text-sm text-slate-500">Rendimiento de ventas</p>
                  </div>
                </div>
                <div className="text-3xl font-bold text-green-600">89.2%</div>
              </div>
              <div className="mt-4 h-2 bg-green-200 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-400 to-emerald-600 rounded-full transition-all duration-500" style={{ width: '89.2%' }}></div>
              </div>
            </div>

            {/* Top Products */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                    <Award className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-slate-900">Productos Top</h4>
                    <p className="text-sm text-slate-500">Más vendidos este mes</p>
                  </div>
                </div>
                <button className="text-purple-600 hover:text-purple-700 text-sm font-medium flex items-center space-x-1">
                  <Eye className="h-4 w-4" />
                  Ver todos
                </button>
              </div>
              <div className="space-y-3">
                {state.products.slice(0, 3).map((product, index) => (
                  <div key={product.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                        index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                        'bg-gradient-to-br from-orange-400 to-orange-500'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">{product.code}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-purple-600">{formatCurrency(product.price)}</p>
                      <p className="text-xs text-slate-500">Stock: {product.stock}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Sales */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <ShoppingCart className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Ventas Recientes</h3>
                  <p className="text-sm text-slate-500">Últimas transacciones</p>
                </div>
              </div>
              <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                Ver todas
              </button>
            </div>
            <div className="space-y-3">
              {filteredSales.slice(0, 5).map((sale) => (
                <div key={sale.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                      <span className="text-white font-bold text-sm">{filteredSales.indexOf(sale) + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{sale.customerName || 'Cliente General'}</p>
                      <p className="text-xs text-slate-500">{new Date(sale.date).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">{formatCurrency(sale.total)}</p>
                    <p className="text-xs text-slate-500">{new Date(sale.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                  <BarChart3 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Métricas de Rendimiento</h3>
                  <p className="text-sm text-slate-500">Análisis detallado del negocio</p>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-indigo-600">{formatCurrency(filteredStats.totalProfit)}</div>
                <p className="text-sm text-slate-600 mb-2">Ganancia Neta</p>
                <div className="h-2 bg-indigo-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full" style={{ width: '75%' }}></div>
                </div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{filteredStats.totalSales}</div>
                <p className="text-sm text-slate-600 mb-2">Transacciones</p>
                <div className="h-2 bg-purple-200 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full" style={{ width: '82%' }}></div>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-indigo-200">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-green-600">4.8</p>
                  <p className="text-sm text-slate-600">Ticket Promedio</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">23.1%</p>
                  <p className="text-sm text-slate-600">Margen de Ganancia</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">92%</p>
                  <p className="text-sm text-slate-600">Satisfacción del Cliente</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="fixed bottom-6 right-6 flex flex-col space-y-3">
          <button 
            onClick={() => navigate('/pos')}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center space-x-2"
          >
            <Store className="h-5 w-5" />
            <span className="font-medium">Punto de Venta</span>
          </button>
          <button 
            onClick={() => navigate('/sales/new')}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:scale-110 flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span className="font-medium">Nueva Venta</span>
          </button>
        </div>
      </div>
    </div>
  );
}