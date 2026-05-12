import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
// import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import { Plus, Minus, X, Send, Trash2, ChevronRight, Users, Utensils } from 'lucide-react';

interface Table {
  id: string;
  table_number: string;
  capacity?: number;
}

interface Category {
  id: string;
  name: string;
}

interface Dish {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  categories?: Category | null;
}

interface OrderItem {
  dish_id: string;
  dish_name: string;
  quantity: number;
  notes: string;
  price?: number;
}

interface Order {
  id: string;
  order_number: string;
  table_id: string;
  status: string;
  created_at: string;
  tables?: { table_number: string };
}

export default function Orders() {
  // const { user } = useAuth(); // User unused now
  const [tables, setTables] = useState<Table[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string>('');
  const [selectedTableNumber, setSelectedTableNumber] = useState<string>('');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showTableOptions, setShowTableOptions] = useState(false);
  const [tableToManage, setTableToManage] = useState<Table | null>(null);
  const [orderNote, setOrderNote] = useState<string>('');
  const tableCarouselRef = useRef<HTMLDivElement>(null);
  const { showNotification } = useNotification();
  const { formatMoney } = useConfig();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [tablesRes, dishesRes, categoriesRes, ordersRes] = await Promise.all([
        supabase.from('tables').select('id, table_number, capacity').eq('is_active', true).order('table_number'),
        supabase.from('dishes').select('id, name, price, category_id, categories(id, name)').eq('is_active', true).order('name'),
        supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
        supabase.from('orders').select('*, tables(table_number)').order('created_at', { ascending: false }).limit(20),
      ]);

      if (tablesRes.data) setTables(tablesRes.data);
      if (dishesRes.data) {
        // Transform the data to match our interface
        const transformedDishes = dishesRes.data.map((dish: any) => ({
          ...dish,
          categories: dish.categories && Array.isArray(dish.categories) ? dish.categories[0] : dish.categories
        }));
        setDishes(transformedDishes);
      }
      if (categoriesRes.data) setCategories(categoriesRes.data);
      if (ordersRes.data) setOrders(ordersRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addDishToOrder = (dish: Dish) => {
    if (!selectedTable) {
      showNotification({
        type: 'warning',
        title: 'Selecciona una mesa',
        message: 'Primero debes seleccionar una mesa para agregar platillos.',
      });
      return;
    }

    const existingItem = orderItems.find(item => item.dish_id === dish.id);
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.dish_id === dish.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        dish_id: dish.id,
        dish_name: dish.name,
        quantity: 1,
        notes: '',
      }]);
    }
  };

  const updateQuantity = (dishId: string, quantity: number) => {
    if (quantity <= 0) {
      setOrderItems(orderItems.filter(item => item.dish_id !== dishId));
      return;
    }
    setOrderItems(orderItems.map(item =>
      item.dish_id === dishId ? { ...item, quantity } : item
    ));
  };


  const handleSendToKitchen = async () => {
    if (!selectedTable) {
      showNotification({
        type: 'warning',
        title: 'Falta seleccionar mesa',
        message: 'Selecciona una mesa para continuar con la orden.',
      });
      return;
    }

    if (orderItems.length === 0) {
      showNotification({
        type: 'warning',
        title: 'Sin platillos',
        message: 'Agrega al menos un platillo a la orden.',
      });
      return;
    }

    setLoading(true);

    try {
      // Get next order number from database
      const { data: orderNumData, error: orderNumError } = await supabase
        .rpc('get_next_order_number');

      if (orderNumError) throw orderNumError;
      const orderNumber = orderNumData;
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      // Check if user has proper role in users_profile
      const { data: userProfile, error: profileError } = await supabase
        .from('users_profile')
        .select('role')
        .eq('id', user.id)
        .single();
      
      if (profileError || !userProfile) {
        throw new Error('Usuario no tiene perfil configurado');
      }

      if (!['mesero', 'admin'].includes(userProfile.role)) {
        throw new Error('Usuario no tiene permisos para crear órdenes');
      }

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          table_id: selectedTable,
          waiter_id: user.id, // Add current user as waiter
          status: 'pendiente',
          total: calculateTotal(),
        } as any)
        .select()
        .single();

      const newOrder = order as any;

      if (orderError) throw orderError;

      const items = orderItems.map(item => ({
        order_id: newOrder.id,
        dish_id: item.dish_id,
        quantity: item.quantity,
        notes: item.notes || null,
        status: 'pendiente',
      }));

      // Add the order note to the first item or create a separate note record
      if (orderNote.trim()) {
        // Add the note to the first order item
        if (items.length > 0) {
          items[0].notes = items[0].notes 
            ? `${items[0].notes} | NOTA GENERAL: ${orderNote.trim()}`
            : `NOTA GENERAL: ${orderNote.trim()}`;
        }
      }

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(items as any);

      if (itemsError) throw itemsError;

      showNotification({
        type: 'success',
        title: 'Orden enviada',
        message: `Orden ${orderNumber} enviada a cocina exitosamente.`,
      });

      // Optional: Clear table selection or just items? 
      // Keeping table selected is usually better for rapid entry, but clearing avoids mistakes.
      // Let's clear items but keep table selected for now, or clear all.
      // User improved UX: Clear everything to force table check.
      setSelectedTable('');
      setSelectedTableNumber('');
      setOrderItems([]);
      setOrderNote('');
      loadData();
    } catch (error) {
      console.error('Error creating order:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al enviar la orden',
      });
    } finally {
      setLoading(false);
    }
  };



  const filteredDishes = dishes.filter(dish => {
    const matchesCategory = selectedCategory === 'all' || dish.category_id === selectedCategory;
    const matchesSearch = dish.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const calculateTotal = () => {
    return orderItems.reduce((total, item) => {
      const dish = dishes.find(d => d.id === item.dish_id);
      return total + (dish ? dish.price * item.quantity : 0);
    }, 0);
  };

  const scrollTableLeft = () => {
    if (tableCarouselRef.current) {
      tableCarouselRef.current.scrollBy({
        left: -300,
        behavior: 'smooth'
      });
    }
  };

  const scrollTableRight = () => {
    if (tableCarouselRef.current) {
      tableCarouselRef.current.scrollBy({
        left: 300,
        behavior: 'smooth'
      });
    }
  };

  const getTableStatus = (tableId: string) => {
    const hasActiveOrder = orders.some(order =>
      order.table_id === tableId &&
      ['pendiente', 'en_preparacion', 'terminado'].includes(order.status)
    );
    return hasActiveOrder ? 'occupied' : 'available';
  };

  const handleTableClick = (table: Table) => {
    const status = getTableStatus(table.id);
    if (status === 'occupied') {
      setTableToManage(table);
      setShowTableOptions(true);
    } else {
      setSelectedTable(table.id);
      setSelectedTableNumber(table.table_number);
      // setOrderItems([]); // Optional: Keep items if switching tables? No, usually clear.
    }
  };

  const handleReleaseTable = async () => {
    if (!tableToManage) return;

    if (!confirm(`¿Estás seguro de que deseas cancelar/eliminar las órdenes activas de la Mesa ${tableToManage.table_number}? Esto no se puede deshacer.`)) {
      return;
    }

    setLoading(true);
    try {
      const activeOrders = orders.filter(
        o => o.table_id === tableToManage.id &&
          ['pendiente', 'en_preparacion', 'terminado'].includes(o.status)
      );

      for (const order of activeOrders) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .delete()
          .eq('order_id', order.id);

        if (itemsError) throw itemsError;

        const { error: orderError } = await supabase
          .from('orders')
          .delete()
          .eq('id', order.id);

        if (orderError) throw orderError;
      }

      showNotification({
        type: 'success',
        title: 'Mesa liberada',
        message: 'Las órdenes han sido eliminadas y la mesa está libre.',
      });

      setShowTableOptions(false);
      setTableToManage(null);
      if (selectedTable === tableToManage.id) {
        setSelectedTable('');
        setSelectedTableNumber('');
        setOrderItems([]);
      }
      loadData();
    } catch (error) {
      console.error('Error releasing table:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al liberar la mesa',
      });
    } finally {
      setLoading(false);
    }
  };


  if (loading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-2rem)] flex flex-col gap-4">
      {/* Top Header & Table Selector (Collapsible or Horizontal) */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-xl lg:text-2xl font-bold text-gray-800">Punto de Venta</h1>
          {selectedTable && (
            <div className="bg-orange-100 text-orange-700 px-3 lg:px-4 py-1.5 rounded-full font-bold text-xs lg:text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
              <span className="hidden sm:inline">Mesa {selectedTableNumber} Seleccionada</span>
              <span className="sm:hidden">Mesa {selectedTableNumber}</span>
            </div>
          )}
        </div>

        {/* Tables Carousel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-lg lg:text-2xl font-bold text-gray-800">Mesas Disponibles</h1>
            <div className="flex gap-2">
              <button
                onClick={scrollTableLeft}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                title="Mesas anteriores"
              >
                <ChevronRight className="w-5 h-5 rotate-180" />
              </button>
              <button
                onClick={scrollTableRight}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                title="Siguientes mesas"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            ref={tableCarouselRef}
            className="flex gap-2 lg:gap-4 overflow-x-auto scroll-smooth hide-scrollbar pb-2"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {tables.map(table => {
              const status = getTableStatus(table.id);
              const isSelected = selectedTable === table.id;

              return (
                <button
                  key={table.id}
                  type="button"
                  onClick={() => handleTableClick(table)}
                  className={`relative p-3 lg:p-4 rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all duration-200 group min-w-[100px] lg:min-w-[120px] ${isSelected
                    ? 'bg-gray-900 border-gray-900 text-white shadow-xl scale-105'
                    : status === 'occupied'
                      ? 'bg-orange-50 border-orange-200 text-orange-700 hover:border-orange-300'
                      : 'bg-white border-gray-100 text-gray-600 hover:border-gray-300 hover:shadow-md'
                    }`}
                >
                  {/* Status Indicator */}
                  <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${status === 'occupied' ? 'bg-orange-500 animate-pulse' : 'bg-emerald-400'
                    }`} />

                  {/* Icon */}
                  <div className={`p-2.5 rounded-full mb-1 ${isSelected
                    ? 'bg-gray-800'
                    : status === 'occupied'
                      ? 'bg-orange-100 text-orange-600'
                      : 'bg-gray-50 text-gray-400 group-hover:bg-gray-100'
                    }`}>
                    {status === 'occupied' ? <Utensils className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>

                  <div className="text-center">
                    <span className={`text-xs block mb-0.5 font-medium ${isSelected ? 'text-gray-400' : 'text-gray-400'}`}>Mesa</span>
                    <span className="text-xl font-bold leading-none">{table.table_number}</span>
                  </div>

                  {table.capacity && (
                    <div className={`text-[10px] font-medium px-2 py-0.5 rounded-full mt-1 ${isSelected
                      ? 'bg-gray-800 text-gray-300'
                      : status === 'occupied'
                        ? 'bg-orange-100 text-orange-600'
                        : 'bg-gray-100 text-gray-400'
                      }`}>
                      {table.capacity} pers.
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-6 min-h-0">
        {/* Left Panel: Menu */}
        <div className="lg:col-span-3 flex flex-col gap-4 min-h-0 h-[40vh] lg:h-auto order-2 lg:order-1">

          {/* Categories & Search */}
          <div className="bg-white rounded-xl border border-gray-200 p-2 flex gap-2 items-center shrink-0">
            <div className="p-2 text-gray-400">
              <Send className="w-5 h-5 rotate-90" /> {/* Search Icon replacement since I don't want to add import */}
            </div>
            <input
              type="text"
              placeholder="Buscar platillo..."
              className="flex-1 outline-none text-gray-700"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div className="h-6 w-px bg-gray-200 mx-2"></div>
            <div className="flex gap-2 overflow-x-auto max-w-[50%] hide-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                Todos
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${selectedCategory === cat.id ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Grid */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar min-h-[200px] lg:min-h-0">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-2 lg:gap-4">
              {filteredDishes.map((dish) => (
                <button
                  key={dish.id}
                  onClick={() => addDishToOrder(dish)}
                  className="group bg-white rounded-xl border border-gray-200 p-2 lg:p-4 shadow-sm hover:shadow-md transition-all hover:border-orange-300 text-left flex flex-col h-full relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="bg-orange-500 text-white rounded-full p-1 shadow-sm">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>

                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-2 lg:mb-3">
                    <span className="text-sm lg:text-lg font-bold">{dish.name.charAt(0)}</span>
                  </div>

                  <h3 className="font-bold text-gray-800 leading-tight mb-1 text-xs lg:text-sm">{dish.name}</h3>
                  <div className="mt-auto pt-1 lg:pt-2 flex items-baseline justify-between w-full">
                    <span className="text-sm lg:text-lg font-bold text-orange-600">{formatMoney(dish.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel: Cart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col overflow-hidden h-[50vh] lg:h-[calc(100vh-12rem)] order-1 lg:order-2">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-gray-800 flex items-center gap-2">
              <span className="bg-orange-100 p-1.5 rounded text-orange-600">
                <ChevronRight className="w-4 h-4" /> {/* Replacing shopping bag with existing icon for now */}
              </span>
              Orden Actual
            </h2>
            {selectedTable ? (
              <span className="text-sm font-medium text-gray-500">Mesa {selectedTableNumber}</span>
            ) : (
              <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded font-bold">Sin Mesa</span>
            )}
          </div>

          {/* Cart Items */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
            {orderItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-gray-300" />
                </div>
                <p className="font-medium">Orden vacía</p>
                <p className="text-sm">Selecciona productos del menú</p>
              </div>
            ) : (
              orderItems.map((item) => {
                const dish = dishes.find(d => d.id === item.dish_id);
                return (
                  <div key={item.dish_id} className="bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex-1">
                        <p className="font-medium text-gray-800 text-sm leading-tight">{item.dish_name}</p>
                        <p className="text-xs text-gray-500">{formatMoney(dish?.price || 0)} c/u</p>
                      </div>
                      <div className="text-right ml-2">
                        <div className="font-bold text-gray-900 text-sm">{formatMoney((dish?.price || 0) * item.quantity)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200">
                        <button
                          onClick={() => updateQuantity(item.dish_id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-gray-800">{item.quantity}</span>
                        <button
                          onClick={() => addDishToOrder(dish!)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-gray-50 text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs text-gray-400 ml-2">{formatMoney(dish?.price || 0)} c/u</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Order Note */}
          <div className="p-3 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Nota para la cocina
            </label>
            <textarea
              value={orderNote}
              onChange={(e) => setOrderNote(e.target.value)}
              placeholder="Especial: sin cebolla, bien cocido, etc..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={2}
            />
          </div>

          {/* Footer */}
          <div className="p-3 bg-gray-50 border-t border-gray-100 shrink-0">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-600">Subtotal</span>
              <span className="font-medium text-gray-900">{formatMoney(calculateTotal())}</span>
            </div>
            <div className="flex justify-between text-xs mb-2">
              <span className="text-gray-600">Impuestos</span>
              <span className="font-medium text-gray-900">{formatMoney(0)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold border-t border-dashed border-gray-200 pt-1.5 mb-2">
              <span className="text-gray-900">Total</span>
              <span className="text-orange-600">{formatMoney(calculateTotal())}</span>
            </div>

            <button
              onClick={handleSendToKitchen}
              disabled={loading || !selectedTable || orderItems.length === 0}
              className="w-full py-2.5 bg-gray-900 text-white rounded-lg font-bold text-sm shadow-lg hover:bg-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <span>Enviar a Cocina</span>
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showTableOptions && tableToManage && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Mesa {tableToManage.table_number}
              </h3>
              <button
                onClick={() => {
                  setShowTableOptions(false);
                  setTableToManage(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-gray-600 mb-6">
              Esta mesa tiene órdenes activas. ¿Qué deseas hacer?
            </p>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setSelectedTable(tableToManage.id);
                  setSelectedTableNumber(tableToManage.table_number);
                  setOrderItems([]);
                  setShowTableOptions(false);
                  setTableToManage(null);
                }}
                className="w-full bg-orange-500 text-white py-3 rounded-lg font-medium hover:bg-orange-600 flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Nueva Ronda / Agregar Items
              </button>

              <button
                onClick={handleReleaseTable}
                className="w-full bg-red-50 text-red-600 border border-red-200 py-3 rounded-lg font-medium hover:bg-red-100 flex items-center justify-center gap-2"
              >
                <Trash2 className="w-5 h-5" />
                Liberar Mesa (Cancelar Orden)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
