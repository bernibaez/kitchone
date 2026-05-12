import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

import { ChefHat, Clock, CheckCircle2, AlertCircle, Utensils } from 'lucide-react';

interface OrderItem {
  id: string;
  dish_id: string;
  quantity: number;
  notes: string | null;
  status: string;
  dishes: {
    name: string;
  };
}

interface KitchenOrder {
  id: string;
  order_number: string;
  table_id: string;
  status: string;
  created_at: string;
  tables: {
    table_number: string;
  };
  order_items: OrderItem[];
}

export default function Kitchen() {
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [activeTab, setActiveTab] = useState<'pendiente' | 'en_preparacion' | 'terminado'>('pendiente');
  const [showModal, setShowModal] = useState(false);

  // Update time every minute to refresh timers
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const loadOrders = async () => {
    try {
      const { data } = await supabase
        .from('orders')
        .select(`
          *,
          tables(table_number),
          order_items(
            *,
            dishes(name)
          )
        `)
        .in('status', ['pendiente', 'en_preparacion', 'terminado'])
        .order('created_at', { ascending: true });

      if (data) setOrders(data);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('kitchen-orders')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => loadOrders()
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'order_items' },
        () => loadOrders()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      // Status cascade logic
      if (newStatus === 'en_preparacion') {
        await supabase
          .from('order_items')
          .update({ status: 'en_preparacion' })
          .eq('order_id', orderId)
          .eq('status', 'pendiente');
      } else if (newStatus === 'terminado') {
        await supabase
          .from('order_items')
          .update({ status: 'terminado' })
          .eq('order_id', orderId);
      } else if (newStatus === 'entregado') {
        // Mark as delivered/archived
        await supabase
          .from('orders')
          .update({ status: 'entregado' })
          .eq('id', orderId);
      }

      loadOrders();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getTimeElapsed = (createdAt: string) => {
    const created = new Date(createdAt);
    const diffMs = currentTime.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    return diffMins;
  };

  const getTimeColor = (minutes: number) => {
    if (minutes < 10) return 'text-green-600 bg-green-50 border-green-200';
    if (minutes < 20) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200 animate-pulse';
  };

  const columns = {
    pendiente: { title: 'Pendientes', color: 'border-l-4 border-yellow-400', bg: 'bg-gray-50/50' },
    en_preparacion: { title: 'En Preparación', color: 'border-l-4 border-blue-500', bg: 'bg-blue-50/30' },
    terminado: { title: 'Listos para Servir', color: 'border-l-4 border-green-500', bg: 'bg-green-50/30' }
  };

  const OrderCard = ({ order }: { order: KitchenOrder }) => {
    const minutes = getTimeElapsed(order.created_at);
    const timeColorClass = getTimeColor(minutes);

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col mb-3 transform transition-all hover:-translate-y-1 hover:shadow-md">
        {/* Header - Ticket Style */}
        <div className="bg-gray-50 p-3 border-b border-gray-100 flex justify-between items-start border-t-4 border-t-transparent group-hover:border-t-orange-500">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-gray-900">Mesa {order.tables.table_number}</span>
              <span className="text-xs font-mono text-gray-400">#{order.order_number.split('-')[1]}</span>
            </div>
          </div>
          <div className={`px-2 py-1 rounded text-xs font-bold flex items-center gap-1 ${timeColorClass}`}>
            <Clock className="w-3 h-3" />
            {minutes} min
          </div>
        </div>

        {/* Start Time Info */}
        <div className="px-3 py-1 bg-gray-50/50 text-xs text-gray-400 border-b border-gray-100 flex justify-between">
          <span>Iniciado: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          <span>{order.order_items.length} items</span>
        </div>

        {/* Items */}
        <div className="p-3 space-y-2 flex-1">
          {order.order_items.map((item) => (
            <div key={item.id} className="flex flex-col border-b border-dashed border-gray-100 last:border-0 pb-2 last:pb-0">
              <div className="flex items-start gap-2">
                <span className="font-bold text-gray-900 min-w-[20px]">{item.quantity}x</span>
                <span className="text-gray-800 leading-tight">{item.dishes.name}</span>
              </div>
              {item.notes && (
                <div className="ml-7 mt-1 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded inline-block self-start border border-yellow-200">
                  <span className="font-bold mr-1">NOTA:</span>{item.notes}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="p-2 bg-gray-50 border-t border-gray-100 grid gap-2">
          {order.status === 'pendiente' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'en_preparacion')}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <ChefHat className="w-5 h-5" />
              Marchar Orden
            </button>
          )}

          {order.status === 'en_preparacion' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'terminado')}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <Utensils className="w-5 h-5" />
              Orden Lista
            </button>
          )}

          {order.status === 'terminado' && (
            <button
              onClick={() => updateOrderStatus(order.id, 'entregado')}
              className="w-full py-3 bg-gray-800 hover:bg-gray-900 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Entregar / Archivar
            </button>
          )}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-6rem)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cocina KDS</h1>
          <p className="text-gray-500">Gestión de flujo de órdenes</p>
        </div>
        <div className="flex gap-4">
          {/* Summary badges could go here */}
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="md:hidden flex overflow-x-auto border-b border-gray-200 mb-4 bg-white sticky top-0 z-10 mx-[-1rem] px-4">
        {(['pendiente', 'en_preparacion', 'terminado'] as const).map((status) => {
          const count = orders.filter(o => o.status === status).length;
          const config = columns[status];
          const isActive = activeTab === status;

          return (
            <button
              key={status}
              onClick={() => setActiveTab(status)}
              className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 whitespace-nowrap flex items-center justify-center gap-2 ${isActive
                ? `text-gray-900 ${config.color.replace('border-l-4', 'border-b-2')}`
                : 'text-gray-500 border-transparent'
                }`}
            >
              {status === 'pendiente' && <AlertCircle className="w-4 h-4" />}
              {status === 'en_preparacion' && <ChefHat className="w-4 h-4" />}
              {status === 'terminado' && <CheckCircle2 className="w-4 h-4" />}
              {config.title}
              <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-y-auto md:overflow-y-hidden md:overflow-x-auto pb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full w-full">
          {/* Columns */}
          {(['pendiente', 'en_preparacion', 'terminado'] as const).map((status) => {
            const statusOrders = orders.filter(o => o.status === status);
            const config = columns[status];

            return (
              <div
                key={status}
                className={`flex flex-col h-full rounded-xl bg-gray-100/50 border border-gray-200 overflow-hidden ${config.bg} ${activeTab === status ? 'block' : 'hidden md:flex'
                  }`}
              >
                {/* Column Header - Hidden on Mobile since we have tabs */}
                <div className={`p-4 bg-white border-b border-gray-200 flex justify-between items-center ${config.color} hidden md:flex`}>
                  <h2 className="font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                    {status === 'pendiente' && <AlertCircle className="w-5 h-5 text-yellow-500" />}
                    {status === 'en_preparacion' && <ChefHat className="w-5 h-5 text-blue-500" />}
                    {status === 'terminado' && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                    {config.title}
                  </h2>
                  <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm font-bold border border-gray-200">
                    {statusOrders.length}
                  </span>
                </div>

                {/* Orders List & Scroll Area */}
                <div className="flex-1 overflow-y-auto p-3 space-y-3 custom-scrollbar">
                  {statusOrders.length === 0 ? (
                    <div className="h-32 flex flex-col items-center justify-center text-gray-400 border-2 border-dashed border-gray-200 rounded-lg bg-gray-50/50 mt-4 mx-4">
                      <p className="text-sm">Sin órdenes</p>
                    </div>
                  ) : (
                    statusOrders.map(order => (
                      <OrderCard key={order.id} order={order} />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de Vista Previa de ��rdenes Pendientes */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header del Modal */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <Utensils className="w-7 h-7" />
                    ��rdenes Pendientes
                  </h2>
                  <p className="text-orange-100 mt-1">Vista previa de todas las órdenes en espera</p>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Contenido del Modal */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {orders.filter(order => order.status === 'pendiente').length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">¡Todas las órdenes están en marcha!</h3>
                  <p className="text-gray-500">No hay órdenes pendientes en este momento.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders
                    .filter(order => order.status === 'pendiente')
                    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                    .map((order) => {
                      const minutes = getTimeElapsed(order.created_at);
                      const timeColorClass = getTimeColor(minutes);

                      return (
                        <div key={order.id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                          {/* Header de la Orden */}
                          <div className="bg-gray-50 p-4 border-b border-gray-100">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-3">
                                <div className="bg-orange-100 text-orange-600 px-3 py-1 rounded-full font-bold text-sm">
                                  Mesa {order.tables.table_number}
                                </div>
                                <span className="text-xs font-mono text-gray-400">#{order.order_number.split('-')[1]}</span>
                              </div>
                              <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${timeColorClass}`}>
                                <Clock className="w-4 h-4" />
                                {minutes} min
                              </div>
                            </div>
                            <div className="mt-2 text-xs text-gray-500">
                              Iniciado: {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>

                          {/* Items de la Orden */}
                          <div className="p-4">
                            <div className="space-y-3">
                              {order.order_items.map((item) => (
                                <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                                  <span className="font-bold text-gray-900 bg-white px-2 py-1 rounded text-sm min-w-[40px] text-center border">
                                    {item.quantity}x
                                  </span>
                                  <div className="flex-1">
                                    <span className="text-gray-800 font-medium">{item.dishes.name}</span>
                                    {item.notes && (
                                      <div className="mt-2 text-xs bg-yellow-100 text-yellow-800 px-3 py-2 rounded-lg border border-yellow-200">
                                        <span className="font-bold mr-1">NOTA:</span>{item.notes}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Footer con acción rápida */}
                          <div className="px-4 pb-4">
                            <button
                              onClick={() => {
                                updateOrderStatus(order.id, 'en_preparacion');
                                setShowModal(false);
                              }}
                              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                            >
                              <ChefHat className="w-5 h-5" />
                              Marchar Esta Orden
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
