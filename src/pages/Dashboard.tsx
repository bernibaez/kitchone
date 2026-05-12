
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Plus,
  ChefHat,
  UtensilsCrossed,
  ShoppingCart,
  MoreVertical,
  DollarSign,
  UserCircle2,
  TrendingUp,
  Clock,
  Flame
} from 'lucide-react';

interface DashboardStats {
  todaySales: number;
  monthSales: number;
  activeOrders: number;
  completedOrders: number;
  recentExpenses: number;
  totalDishes: number;
  totalTables: number;
  totalUsers: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  table_number: string;
  status: string;
  created_at: string;
}


interface DashboardProps {
  onNavigate: (page: string) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
};

export default function Dashboard({ onNavigate }: DashboardProps) {
  void onNavigate;
  const { profile } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    todaySales: 0,
    monthSales: 0,
    activeOrders: 0,
    completedOrders: 0,
    recentExpenses: 0,
    totalDishes: 0,
    totalTables: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  
  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [
        salesResponse,
        ordersResponse,
        expensesResponse,
        dishesResponse,
        tablesResponse,
        usersResponse,
        recentOrdersResponse
      ] = await Promise.all([
        supabase
          .from('sales')
          .select('total, created_at')
          .gte('created_at', monthStart),
        supabase
          .from('orders')
          .select('status'),
        supabase
          .from('expenses')
          .select('amount')
          .gte('date', today),
        supabase
          .from('dishes')
          .select('id')
          .eq('is_active', true),
        supabase
          .from('tables')
          .select('id'),
        supabase
          .from('users_profile')
          .select('id'),
        supabase
          .from('orders')
          .select('id, order_number, tables(table_number), status, created_at')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const todaySales = salesResponse.data
        ?.filter(sale => sale.created_at.startsWith(today))
        .reduce((sum, sale) => sum + sale.total, 0) || 0;

      const monthSales = salesResponse.data?.reduce((sum, sale) => sum + sale.total, 0) || 0;

      const activeOrders = ordersResponse.data?.filter(
        order => order.status === 'pendiente' || order.status === 'en_preparacion'
      ).length || 0;

      const completedOrders = ordersResponse.data?.filter(
        order => order.status === 'terminado' || order.status === 'entregado'
      ).length || 0;

      const recentExpenses = expensesResponse.data?.reduce((sum, exp) => sum + exp.amount, 0) || 0;

      const totalDishes = dishesResponse.data?.length || 0;
      const totalTables = tablesResponse.data?.length || 0;
      const totalUsers = usersResponse.data?.length || 0;

      const mappedRecentOrders = (recentOrdersResponse.data || []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        table_number: o.tables?.table_number || '',
        status: o.status,
        created_at: o.created_at,
      }));

      setStats({
        todaySales,
        monthSales,
        activeOrders,
        completedOrders,
        recentExpenses,
        totalDishes,
        totalTables,
        totalUsers,
      });

      setRecentOrders(mappedRecentOrders);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-orange-200 border-t-orange-500 animate-spin" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-amber-400 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
      </div>
    );
  }

  const statCards = [
    { label: 'Ventas Hoy', value: `$${stats.todaySales.toLocaleString()}`, icon: <DollarSign className="w-5 h-5" />, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-500/20', change: '+12%' },
    { label: 'Órdenes Activas', value: stats.activeOrders.toString(), icon: <Clock className="w-5 h-5" />, gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-500/20', change: `${stats.activeOrders}` },
    { label: 'Platillos Activos', value: stats.totalDishes.toString(), icon: <UtensilsCrossed className="w-5 h-5" />, gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-500/20', change: 'Menú' },
    { label: 'Ventas del Mes', value: `$${stats.monthSales.toLocaleString()}`, icon: <TrendingUp className="w-5 h-5" />, gradient: 'from-violet-500 to-purple-500', shadow: 'shadow-violet-500/20', change: '+8%' },
  ];

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'terminado': return { label: 'Listo', color: 'bg-emerald-500', bgColor: 'bg-emerald-50 text-emerald-700' };
      case 'entregado': return { label: 'Entregado', color: 'bg-blue-500', bgColor: 'bg-blue-50 text-blue-700' };
      case 'en_preparacion': return { label: 'Preparando', color: 'bg-amber-500', bgColor: 'bg-amber-50 text-amber-700' };
      default: return { label: 'Pendiente', color: 'bg-rose-500', bgColor: 'bg-rose-50 text-rose-700' };
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Search Bar */}
      <motion.div variants={itemVariants} className="flex items-center justify-between gap-4">
        <div className="flex-1 max-w-xl">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-300 w-5 h-5 group-focus-within:text-orange-400 transition-colors duration-300" />
            <input
              type="text"
              placeholder="Buscar algo..."
              className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-400 transition-all duration-300 bg-white/70 backdrop-blur-sm text-slate-700 placeholder-slate-300 font-medium"
            />
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          className="bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-3 rounded-2xl shadow-lg shadow-orange-500/25 hover:shadow-xl hover:shadow-orange-500/30 transition-shadow duration-300 flex items-center gap-2 font-semibold text-sm"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Agregar Nuevo</span>
        </motion.button>
      </motion.div>

      {/* Welcome Banner */}
      <motion.div
        variants={itemVariants}
        className="relative overflow-hidden rounded-3xl p-8 text-white"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500 via-orange-500 to-amber-400" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -top-8 -left-8 w-32 h-32 bg-amber-400/30 rounded-full blur-2xl" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <motion.h1
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="text-3xl font-bold mb-2"
            >
              Buenos Días {profile?.full_name?.split(' ')[0] || 'Chef'} 👋
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="text-white/80 mb-6 font-light text-lg"
            >
              Tienes <span className="font-semibold text-white">{stats.activeOrders}</span> nuevas órdenes para revisar
            </motion.p>
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="bg-white text-orange-600 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-black/5 hover:shadow-xl transition-all duration-300"
            >
              Revisar Órdenes
            </motion.button>
          </div>
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
            className="hidden md:flex items-center justify-center"
          >
            <div className="w-28 h-28 bg-white/15 backdrop-blur-sm rounded-3xl flex items-center justify-center border border-white/20 rotate-6">
              <ChefHat className="w-14 h-14 text-white/90" />
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white/80 backdrop-blur-sm p-5 rounded-2xl border border-slate-100 hover:shadow-lg transition-all duration-300 cursor-default group"
          >
            <div className="flex items-start justify-between mb-3">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white shadow-lg ${card.shadow}`}>
                {card.icon}
              </div>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-600">{card.change}</span>
            </div>
            <p className="text-2xl font-bold text-slate-800 mb-1">{card.value}</p>
            <p className="text-sm text-slate-400 font-medium">{card.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Necesitas Servir Section */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Necesitas Servir</h2>
          <button className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors">Ver Todo</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { name: 'Aperitivos', count: stats.totalDishes, status: 'Listos para servir', icon: <UtensilsCrossed className="w-5 h-5" />, gradient: 'from-blue-500 to-indigo-500', bg: 'bg-blue-50', text: 'text-blue-600' },
            { name: 'Platos Principales', count: Math.floor(stats.totalDishes * 0.6), status: 'En preparación', icon: <ChefHat className="w-5 h-5" />, gradient: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', text: 'text-emerald-600' },
            { name: 'Postres', count: Math.floor(stats.totalDishes * 0.2), status: 'Disponibles', icon: <ShoppingCart className="w-5 h-5" />, gradient: 'from-orange-500 to-amber-500', bg: 'bg-orange-50', text: 'text-orange-600' },
            { name: 'Bebidas', count: Math.floor(stats.totalDishes * 0.2), status: 'Bebidas frías', icon: <Flame className="w-5 h-5" />, gradient: 'from-violet-500 to-purple-500', bg: 'bg-violet-50', text: 'text-violet-600' },
            { name: 'Especiales', count: 5, status: 'Especial del día', icon: <DollarSign className="w-5 h-5" />, gradient: 'from-rose-500 to-pink-500', bg: 'bg-rose-50', text: 'text-rose-600' },
          ].map((item, i) => (
            <motion.div
              key={item.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 + i * 0.08 }}
              whileHover={{ y: -3, transition: { duration: 0.15 } }}
              className="bg-white/80 backdrop-blur-sm p-4 rounded-2xl border border-slate-100 hover:shadow-md transition-all duration-300 cursor-default group"
            >
              <div className="flex items-center space-x-3 mb-3">
                <div className={`w-10 h-10 ${item.bg} rounded-xl flex items-center justify-center ${item.text} group-hover:scale-110 transition-transform duration-200`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-slate-700 text-sm">{item.name}</h3>
                  <p className="text-xs text-slate-400">{item.count} artículos</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 font-medium">{item.status}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Progress Table */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">Progreso del Restaurante</h2>
          <button className="text-sm font-semibold text-orange-500 hover:text-orange-600 transition-colors">Ver Todo</button>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Nombre Completo
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Designación
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentOrders.slice(0, 5).map((order, index) => {
                const statusConfig = getStatusConfig(order.status);
                return (
                  <motion.tr
                    key={order.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.08 }}
                    className="hover:bg-slate-50/60 transition-colors duration-200 group"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center mr-3 group-hover:scale-105 transition-transform duration-200">
                          <UserCircle2 className="w-5 h-5 text-slate-400" />
                        </div>
                        <div className="text-sm font-semibold text-slate-700">
                          Cliente {order.order_number}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-slate-500 font-medium">Mesa {order.table_number}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${statusConfig.bgColor}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.color}`} />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="p-1.5 rounded-lg text-slate-300 hover:text-slate-500 hover:bg-slate-100 transition-all duration-200"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </motion.button>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
