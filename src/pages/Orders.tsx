import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import {
  Button,
  IconButton,
  Tabs,
  Drawer,
  BulkBar,
  BulkAction,
  EmptyState,
  SearchInput,
  Tag,
  DataTable,
  type Column,
  type TabItem,
} from '../components/ui';
import {
  formatClock,
  minutesSince,
  useNow,
  shortOrder,
  UI_EVENTS,
  PENDING_NEW_ORDER_KEY,
  BILL_ORDER_KEY,
} from '../lib/format';
import { getDishIcon } from '../lib/dishIcons';
import {
  Plus,
  Clock,
  Utensils,
  ArrowRight,
  AlertCircle,
  Armchair,
  ShoppingBag,
  Send,
  Minus,
  Check,
  Flame,
  CheckCircle2,
  MoreHorizontal,
  Trash2,
  DollarSign,
  Bike,
  Bell,
} from 'lucide-react';

interface OrderItemWithDish {
  id: string;
  dish_id: string;
  quantity: number;
  notes: string | null;
  status: string;
  dishes?: {
    id: string;
    name: string;
    price: number;
    category_id?: string | null;
    categories?: { name: string } | null;
  } | null;
}

interface OrderDetail {
  id: string;
  order_number: string;
  table_id: string | null;
  waiter_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  total?: number;
  is_rush?: boolean;
  customer_name?: string | null;
  guest_count?: number;
  tables?: {
    id?: string;
    table_number: string;
    capacity?: number;
  } | null;
  order_items: OrderItemWithDish[];
}

interface DishOption {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  categories?: { name: string } | null;
}

interface TableOption {
  id: string;
  table_number: string;
  capacity?: number;
}

interface CategoryOption {
  id: string;
  name: string;
}

interface WaiterProfile {
  id: string;
  full_name: string;
}

interface OrdersProps {
  onNavigate?: (page: string) => void;
}

export default function Orders({ onNavigate }: OrdersProps) {
  const { user } = useAuth();
  const { config, formatMoney } = useConfig();
  const { toast } = useToast();
  const now = useNow(10000);

  // Estados principales
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [waiters, setWaiters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('all');
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [stationFilter, setStationFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [selectedOrderIds, setSelectedOrderIds] = useState<Set<string>>(new Set());

  // Drawer de Detalle de Orden (Ticket Drawer)
  const [activeDetailOrder, setActiveDetailOrder] = useState<OrderDetail | null>(null);

  // Drawer de Creación de Orden
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [dishes, setDishes] = useState<DishOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [tables, setTables] = useState<TableOption[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [orderChannel, setOrderChannel] = useState<'dine_in' | 'takeout' | 'delivery'>('dine_in');
  const [customerNameInput, setCustomerNameInput] = useState('');
  const [cart, setCart] = useState<Array<{ dish_id: string; dish_name: string; price: number; quantity: number; notes: string }>>([]);
  const [generalNote, setGeneralNote] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);

  // Cargar órdenes y mozos
  const loadOrders = useCallback(async () => {
    try {
      const [ordersRes, waitersRes] = await Promise.all([
        supabase
          .from('orders')
          .select(`
            id,
            order_number,
            table_id,
            waiter_id,
            status,
            created_at,
            updated_at,
            tables (
              id,
              table_number,
              capacity
            ),
            order_items (
              id,
              dish_id,
              quantity,
              notes,
              status,
              dishes (
                id,
                name,
                price,
                category_id,
                categories ( name )
              )
            )
          `)
          .order('created_at', { ascending: false }),
        supabase.from('users_profile').select('id, full_name'),
      ]);

      if (ordersRes.error) throw ordersRes.error;

      if (waitersRes.data) {
        const wMap: Record<string, string> = {};
        for (const w of waitersRes.data as WaiterProfile[]) {
          wMap[w.id] = w.full_name;
        }
        setWaiters(wMap);
      }

      setOrders((ordersRes.data as unknown as OrderDetail[]) || []);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Error al cargar órdenes', message: err.message, tone: 'bad' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Cargar catálogo de platillos y mesas para creación
  const loadCatalog = useCallback(async () => {
    try {
      const [dishesRes, catsRes, tablesRes] = await Promise.all([
        supabase.from('dishes').select('id, name, price, category_id, categories(name)').eq('is_active', true).order('name'),
        supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
        supabase.from('tables').select('id, table_number, capacity').eq('is_active', true).order('table_number'),
      ]);

      if (dishesRes.data) setDishes(dishesRes.data as unknown as DishOption[]);
      if (catsRes.data) setCategories(catsRes.data as CategoryOption[]);
      if (tablesRes.data) setTables(tablesRes.data as TableOption[]);
    } catch (err) {
      console.error('Error al cargar catálogo:', err);
    }
  }, []);

  useEffect(() => {
    loadOrders();
    loadCatalog();

    const channel = supabase
      .channel('orders-realtime-feed')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        loadOrders();
      })
      .subscribe();

    const handleUIEvent = () => loadOrders();
    window.addEventListener(UI_EVENTS.ordersChanged, handleUIEvent);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener(UI_EVENTS.ordersChanged, handleUIEvent);
    };
  }, [loadOrders, loadCatalog]);

  // Chequear orden pendiente desde el layout
  useEffect(() => {
    if (sessionStorage.getItem(PENDING_NEW_ORDER_KEY) === 'true') {
      sessionStorage.removeItem(PENDING_NEW_ORDER_KEY);
      setCreateDrawerOpen(true);
    }
  }, []);

  // Mantener actualizado el activeDetailOrder si cambia el array de órdenes
  useEffect(() => {
    if (activeDetailOrder) {
      const refreshed = orders.find((o) => o.id === activeDetailOrder.id);
      if (refreshed) setActiveDetailOrder(refreshed);
    }
  }, [orders]);

  // Helpers de cálculos financieros
  const getOrderFinancials = useCallback(
    (order: OrderDetail) => {
      const taxRate = config?.tax_percentage ?? 18;
      const subtotal = order.order_items.reduce((sum, item) => {
        const p = item.dishes?.price || 0;
        return sum + p * item.quantity;
      }, 0);
      const tax = (subtotal * taxRate) / 100;
      const total = subtotal + tax;
      const itemCount = order.order_items.reduce((s, it) => s + it.quantity, 0);
      return { subtotal, tax, total, itemCount };
    },
    [config]
  );

  // Transición de estados de orden
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const prevOrder = orders.find((o) => o.id === orderId);
    const prevStatus = prevOrder?.status || 'pendiente';

    // Optimistic update
    setOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o)));

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus, updated_at: new Date().toISOString() } as any)
        .eq('id', orderId);

      if (error) throw error;

      toast({
        title: `Orden #${shortOrder(prevOrder?.order_number || '')}`,
        message: `Estado cambiado a ${statusLabel(newStatus)}`,
        tone: 'ok',
        action: {
          label: 'Deshacer',
          onClick: async () => {
            await supabase.from('orders').update({ status: prevStatus } as any).eq('id', orderId);
            loadOrders();
          },
        },
      });

      window.dispatchEvent(new CustomEvent(UI_EVENTS.ordersChanged));
    } catch (err: any) {
      toast({ title: 'Error al actualizar orden', message: err.message, tone: 'bad' });
      loadOrders();
    }
  };

  // Avanzar al siguiente estado natural
  const advanceOrder = (orderId: string, currentStatus: string) => {
    if (currentStatus === 'pendiente') updateOrderStatus(orderId, 'en_preparacion');
    else if (currentStatus === 'en_preparacion') updateOrderStatus(orderId, 'terminado');
    else if (currentStatus === 'terminado') updateOrderStatus(orderId, 'entregado');
    else if (currentStatus === 'entregado') updateOrderStatus(orderId, 'facturada');
  };

  // Toggle Rush / Urgente
  const toggleRush = (order: OrderDetail) => {
    toast({
      title: order.is_rush ? 'Prioridad normal' : '¡Comanda marcada como URGENTE!',
      message: `#${shortOrder(order.order_number)}`,
      tone: order.is_rush ? 'neutral' : 'bad',
    });
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, is_rush: !o.is_rush } : o))
    );
  };

  // Eliminar un ítem de la comanda
  const deleteOrderItem = async (itemId: string) => {
    if (!confirm('¿Eliminar este platillo de la comanda?')) return;
    try {
      const { error } = await supabase.from('order_items').delete().eq('id', itemId);
      if (error) throw error;
      toast({ title: 'Platillo eliminado', tone: 'ok' });
      loadOrders();
    } catch (err: any) {
      toast({ title: 'Error al eliminar platillo', message: err.message, tone: 'bad' });
    }
  };

  // Avanzar órdenes seleccionadas
  const handleBulkAdvance = async () => {
    const ids = Array.from(selectedOrderIds);
    for (const id of ids) {
      const ord = orders.find((o) => o.id === id);
      if (ord) advanceOrder(ord.id, ord.status);
    }
    setSelectedOrderIds(new Set());
  };

  // Enviar a cobrar / Facturación
  const handleBillOrder = (order: OrderDetail) => {
    sessionStorage.setItem(BILL_ORDER_KEY, order.id);
    if (onNavigate) {
      onNavigate('sales');
    }
  };

  // Filtros
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Filtro de Pestaña de Estado
      if (activeTab === 'active' && (order.status === 'facturada' || order.status === 'entregado')) return false;
      if (activeTab === 'pendiente' && order.status !== 'pendiente') return false;
      if (activeTab === 'en_preparacion' && order.status !== 'en_preparacion') return false;
      if (activeTab === 'terminado' && order.status !== 'terminado') return false;
      if (activeTab === 'facturada' && order.status !== 'facturada') return false;

      // Filtro de Canal
      if (channelFilter === 'dine_in' && !order.table_id) return false;
      if (channelFilter === 'takeout' && order.table_id) return false;

      // Filtro de Estación / Categoría
      if (stationFilter !== 'all') {
        const matchesStation = order.order_items.some(
          (it) => it.dishes?.categories?.name?.toLowerCase().includes(stationFilter.toLowerCase())
        );
        if (!matchesStation) return false;
      }

      // Filtro de Búsqueda
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const numMatch = order.order_number.toLowerCase().includes(q);
        const tableMatch = order.tables?.table_number?.toLowerCase().includes(q);
        const itemMatch = order.order_items.some((i) => i.dishes?.name?.toLowerCase().includes(q));
        const waiterMatch = order.waiter_id && waiters[order.waiter_id]?.toLowerCase().includes(q);
        if (!numMatch && !tableMatch && !itemMatch && !waiterMatch) return false;
      }

      return true;
    });
  }, [orders, activeTab, channelFilter, stationFilter, search, waiters]);

  // Contadores por canal
  const dineInCount = useMemo(() => orders.filter((o) => o.table_id && o.status !== 'facturada').length, [orders]);
  const takeoutCount = useMemo(() => orders.filter((o) => !o.table_id && o.status !== 'facturada').length, [orders]);

  // Tabs con contadores
  const tabs: TabItem[] = useMemo(() => {
    const counts = {
      all: orders.length,
      active: orders.filter((o) => o.status !== 'facturada' && o.status !== 'entregado').length,
      pendiente: orders.filter((o) => o.status === 'pendiente').length,
      en_preparacion: orders.filter((o) => o.status === 'en_preparacion').length,
      terminado: orders.filter((o) => o.status === 'terminado').length,
      facturada: orders.filter((o) => o.status === 'facturada' || o.status === 'entregado').length,
    };

    return [
      { id: 'all', label: 'Todas', count: counts.all },
      { id: 'active', label: 'En curso', count: counts.active },
      { id: 'pendiente', label: 'Pendientes', count: counts.pendiente },
      { id: 'en_preparacion', label: 'En cocina', count: counts.en_preparacion },
      { id: 'terminado', label: 'Listas', count: counts.terminado },
      { id: 'facturada', label: 'Entregadas', count: counts.facturada },
    ];
  }, [orders]);

  // Submit de Nueva Orden
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      toast({ title: 'Comanda vacía', message: 'Agrega al menos un platillo', tone: 'warn' });
      return;
    }
    if (orderChannel === 'dine_in' && !selectedTableId) {
      toast({ title: 'Mesa requerida', message: 'Selecciona una mesa para consumo en comedor', tone: 'warn' });
      return;
    }

    setSubmittingOrder(true);
    try {
      const orderNumber = `ORD-${Date.now().toString().slice(-4)}`;

      const { data: newOrder, error: orderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          table_id: orderChannel === 'dine_in' ? selectedTableId : null,
          waiter_id: user?.id || null,
          status: 'pendiente',
        })
        .select()
        .single();

      if (orderError) throw orderError;

      const items = cart.map((it, idx) => ({
        order_id: newOrder.id,
        dish_id: it.dish_id,
        quantity: it.quantity,
        notes:
          idx === 0 && generalNote.trim()
            ? `${it.notes ? `${it.notes} | ` : ''}NOTA: ${generalNote.trim()}`
            : it.notes || null,
        status: 'pendiente',
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(items as any);
      if (itemsError) throw itemsError;

      toast({
        title: `Orden #${shortOrder(orderNumber)} registrada`,
        message: orderChannel === 'dine_in' ? 'Asignada a mesa' : 'Marcada para llevar',
        tone: 'ok',
      });

      setCreateDrawerOpen(false);
      setCart([]);
      setSelectedTableId('');
      setGeneralNote('');
      setCustomerNameInput('');
      loadOrders();
    } catch (err: any) {
      toast({ title: 'Error al enviar orden', message: err.message, tone: 'bad' });
    } finally {
      setSubmittingOrder(false);
    }
  };

  const addItemToCart = (dish: DishOption) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.dish_id === dish.id);
      if (existing) {
        return prev.map((i) => (i.dish_id === dish.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [...prev, { dish_id: dish.id, dish_name: dish.name, price: dish.price, quantity: 1, notes: '' }];
    });
  };

  const updateCartQty = (dishId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.dish_id === dishId) {
            const nextQty = i.quantity + delta;
            return nextQty > 0 ? { ...i, quantity: nextQty } : null;
          }
          return i;
        })
        .filter(Boolean) as typeof cart
    );
  };

  // Columnas para vista de lista
  const columns: Column<OrderDetail>[] = [
    {
      key: 'order_number',
      header: 'Orden',
      sortValue: (r) => r.order_number,
      cell: (r) => (
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold text-ink dark:text-line">
            #{shortOrder(r.order_number)}
          </span>
          <Tag tone={r.table_id ? 'neutral' : 'warn'}>
            {r.tables?.table_number ? `Mesa ${r.tables.table_number}` : 'Para llevar'}
          </Tag>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      sortValue: (r) => r.status,
      cell: (r) => <Tag tone={statusTone(r.status)}>{statusLabel(r.status)}</Tag>,
    },
    {
      key: 'time',
      header: 'Tiempo',
      sortValue: (r) => new Date(r.created_at).getTime(),
      cell: (r) => {
        const mins = minutesSince(r.created_at, now);
        return (
          <span className={`text-xs font-bold tabular-nums ${mins >= 15 ? 'text-bad' : 'text-fg'}`}>
            ⏱ {mins} min
          </span>
        );
      },
    },
    {
      key: 'waiter',
      header: 'Mesero / Mozo',
      cell: (r) => (
        <span className="text-xs text-muted">
          {r.waiter_id && waiters[r.waiter_id] ? waiters[r.waiter_id] : 'General'}
        </span>
      ),
    },
    {
      key: 'items',
      header: 'Artículos',
      cell: (r) => {
        const count = r.order_items.reduce((s, it) => s + it.quantity, 0);
        const preview = r.order_items.slice(0, 2).map((i) => `${i.quantity}× ${i.dishes?.name || 'Platillo'}`).join(', ');
        return (
          <div className="max-w-[240px] truncate text-xs text-muted" title={preview}>
            <span className="font-bold text-fg">{count} ítems: </span>
            {preview}
            {r.order_items.length > 2 && '…'}
          </div>
        );
      },
      hideBelow: 'sm',
    },
    {
      key: 'total',
      header: 'Total',
      align: 'right',
      sortValue: (r) => getOrderFinancials(r).total,
      cell: (r) => (
        <span className="font-bold tabular-nums text-fg">
          {formatMoney(getOrderFinancials(r).total)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Acción',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label="Ver ticket"
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setActiveDetailOrder(r);
            }}
          >
            <MoreHorizontal className="h-4 w-4" />
          </IconButton>
          {r.status === 'pendiente' && (
            <Button
              size="sm"
              variant="pri"
              leftIcon={<Flame className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                advanceOrder(r.id, r.status);
              }}
            >
              Marchar
            </Button>
          )}
          {r.status === 'en_preparacion' && (
            <Button
              size="sm"
              variant="outline"
              leftIcon={<Check className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                advanceOrder(r.id, r.status);
              }}
            >
              Listo
            </Button>
          )}
          {r.status === 'terminado' && (
            <Button
              size="sm"
              variant="acc"
              leftIcon={<CheckCircle2 className="h-3.5 w-3.5" />}
              onClick={(e) => {
                e.stopPropagation();
                advanceOrder(r.id, r.status);
              }}
            >
              Entregar
            </Button>
          )}
        </div>
      ),
    },
  ];

  // Las 4 columnas exactas del tablero tipo Mavora en español
  const boardColumns = [
    {
      status: 'pendiente',
      label: 'Pendientes',
      titleEs: 'Pendientes',
      dotColor: 'bg-[#D97706]',
      bgCard: 'bg-[#F6E8B9] border-[#EAD397] text-[#292212] dark:bg-[#342D1C] dark:border-[#4D4229] dark:text-[#F6E8B9]',
      btnStyle: 'bg-[#1E1B18] text-white hover:bg-black',
      btnLabel: 'Marchar',
      btnIcon: Flame,
    },
    {
      status: 'en_preparacion',
      label: 'En cocina',
      titleEs: 'En preparación',
      dotColor: 'bg-[#E4570F]',
      bgCard: 'bg-[#F9C9BB] border-[#F0B2A1] text-[#331C16] dark:bg-[#3E231E] dark:border-[#5A332B] dark:text-[#F9C9BB]',
      btnStyle: 'bg-white text-[#1E1B18] hover:bg-white/90 shadow-sm',
      btnLabel: 'Marcar lista',
      btnIcon: Check,
    },
    {
      status: 'terminado',
      label: 'Listas',
      titleEs: 'Listas',
      dotColor: 'bg-[#10B981]',
      bgCard: 'bg-[#BCE3CB] border-[#A3D7B5] text-[#143021] dark:bg-[#1A3828] dark:border-[#28543C] dark:text-[#BCE3CB]',
      btnStyle: 'bg-white text-[#143021] hover:bg-white/90 shadow-sm',
      btnLabel: 'Entregar',
      btnIcon: CheckCircle2,
    },
    {
      status: 'facturada',
      label: 'Entregadas',
      titleEs: 'Entregadas / Cobro',
      dotColor: 'bg-[#202938]',
      bgCard: 'bg-[#202938] border-[#2D394C] text-white dark:bg-[#161D27]',
      btnStyle: 'bg-white/10 text-white hover:bg-white/20',
      btnLabel: 'Facturar',
      btnIcon: Check,
    },
  ];

  // Helper para resolver el waiter de una comanda
  const getWaiterName = (waiterId: string | null) => {
    if (waiterId && waiters[waiterId]) return waiters[waiterId];
    return 'Lucía Vidal';
  };

  return (
    <div className="space-y-5">
      {/* Barra superior de navegación y acciones */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Barra de búsqueda y Filtros por canal tipo pills */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-64 sm:w-72">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Ticket, mesa, comensal o plato…"
            />
          </div>

          {/* Channel Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            <button
              onClick={() => setChannelFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-colors ${
                channelFilter === 'all'
                  ? 'bg-[#F9C9BB] text-[#421D15] shadow-xs'
                  : 'bg-surface-2 text-muted hover:text-fg border border-line'
              }`}
            >
              Todos {orders.length}
            </button>
            <button
              onClick={() => setChannelFilter('dine_in')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                channelFilter === 'dine_in'
                  ? 'bg-[#F9C9BB] text-[#421D15] font-bold shadow-xs'
                  : 'bg-surface-2 text-muted hover:text-fg border border-line'
              }`}
            >
              <Armchair className="h-3.5 w-3.5" />
              Comedor {dineInCount}
            </button>
            <button
              onClick={() => setChannelFilter('takeout')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                channelFilter === 'takeout'
                  ? 'bg-[#F9C9BB] text-[#421D15] font-bold shadow-xs'
                  : 'bg-surface-2 text-muted hover:text-fg border border-line'
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              Para llevar {takeoutCount}
            </button>
            <button
              onClick={() => setChannelFilter('delivery')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                channelFilter === 'delivery'
                  ? 'bg-[#F9C9BB] text-[#421D15] font-bold shadow-xs'
                  : 'bg-surface-2 text-muted hover:text-fg border border-line'
              }`}
            >
              <Bike className="h-3.5 w-3.5" />
              A domicilio 0
            </button>

            {/* Estaciones dropdown */}
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="px-3 py-1.5 rounded-full text-xs font-semibold bg-surface-2 text-muted border border-line outline-none cursor-pointer"
            >
              <option value="all">Todas las estaciones</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Botones de Vista y Nueva Orden */}
        <div className="flex items-center gap-2 self-end lg:self-auto">
          <div className="flex items-center p-1 rounded-full bg-surface-2 border border-line">
            <button
              onClick={() => setViewMode('board')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                viewMode === 'board' ? 'bg-surface text-ink dark:text-line shadow-xs font-bold' : 'text-muted hover:text-fg'
              }`}
            >
              Tablero
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                viewMode === 'list' ? 'bg-surface text-ink dark:text-line shadow-xs font-bold' : 'text-muted hover:text-fg'
              }`}
            >
              Lista
            </button>
          </div>

          <button
            onClick={() => setCreateDrawerOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full font-bold text-xs bg-[#F08066] hover:bg-[#E27157] text-white shadow-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>+ Nueva orden</span>
          </button>
        </div>
      </div>

      {/* Tabs de estados secundarios (opcional para filtro rápido) */}
      <Tabs items={tabs} value={activeTab} onChange={setActiveTab} />

      {/* ---------------- VISTA TABLERO (KANBAN) ---------------- */}
      {viewMode === 'board' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {boardColumns.map((col) => {
            const colOrders = filteredOrders.filter((o) => {
              if (col.status === 'facturada') {
                return o.status === 'facturada' || o.status === 'entregado';
              }
              return o.status === col.status;
            });

            const colTotal = colOrders.reduce((sum, o) => sum + getOrderFinancials(o).total, 0);

            return (
              <div
                key={col.status}
                className="flex flex-col rounded-2xl bg-surface-2/40 border border-line/60 p-3 min-h-[500px]"
              >
                {/* Header de columna */}
                <div className="mb-3 flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span className={`h-2.5 w-2.5 rounded-full ${col.dotColor}`} />
                    <h3 className="font-display font-bold text-sm text-fg">
                      {col.label}{' '}
                      <span className="font-sans font-semibold text-xs text-muted">
                        {colOrders.length}
                      </span>
                    </h3>
                  </div>
                  <span className="text-xs font-bold font-mono text-muted tabular-nums">
                    {formatMoney(colTotal)}
                  </span>
                </div>

                {/* Lista de tarjetas */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[calc(100vh-20rem)] pr-0.5 custom-scrollbar">
                  {colOrders.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-line p-8 text-center text-xs text-muted">
                      Sin órdenes {col.titleEs.toLowerCase()}
                    </div>
                  ) : (
                    colOrders.map((order) => {
                      const mins = minutesSince(order.created_at, now);
                      const isDelayed = mins >= 15 && order.status !== 'facturada';
                      const { total } = getOrderFinancials(order);
                      const waiterName = getWaiterName(order.waiter_id);
                      const isSelected = selectedOrderIds.has(order.id);
                      const ActionIcon = col.btnIcon;

                      return (
                        <div
                          key={order.id}
                          onClick={() => setActiveDetailOrder(order)}
                          className={`rounded-2xl border p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md ${
                            col.bgCard
                          } ${isSelected ? 'ring-2 ring-accent' : ''}`}
                        >
                          <div>
                            {/* Top row: #number, time elapsed pill, action menu */}
                            <div className="flex items-center justify-between gap-2 mb-2.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="bg-white/80 dark:bg-black/30 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono tracking-tight shadow-2xs">
                                  #{shortOrder(order.order_number)}
                                </span>
                                <span
                                  className={`bg-white/80 dark:bg-black/30 px-2 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1 shadow-2xs tabular-nums ${
                                    isDelayed ? 'text-bad font-bold' : ''
                                  }`}
                                >
                                  <Clock className="h-3 w-3" />
                                  {mins} min
                                </span>
                                {order.is_rush && (
                                  <span className="bg-[#1E1B18] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                    <Bell className="h-3 w-3 text-warn" /> Urgente
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveDetailOrder(order);
                                }}
                                className="h-7 w-7 rounded-full bg-white/60 dark:bg-black/20 hover:bg-white flex items-center justify-center transition-colors shrink-0"
                                title="Ver detalle de comanda"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </button>
                            </div>

                            {/* Table Name / Channel */}
                            <div className="mb-2">
                              <h4 className="font-display font-bold text-base flex items-center gap-1.5">
                                {order.table_id ? (
                                  <>
                                    <Utensils className="h-4 w-4 shrink-0 opacity-80" />
                                    <span>Mesa {order.tables?.table_number || 'S/N'}</span>
                                  </>
                                ) : (
                                  <>
                                    <ShoppingBag className="h-4 w-4 shrink-0 opacity-80" />
                                    <span>Para llevar</span>
                                  </>
                                )}
                              </h4>
                            </div>

                            {/* Listado de items */}
                            <div className="space-y-1.5 text-xs pt-1 border-t border-black/10 dark:border-white/10 pb-2">
                              {order.order_items.map((item) => (
                                <div key={item.id} className="leading-tight">
                                  <div className="flex items-baseline justify-between gap-2">
                                    <span className="truncate">
                                      <strong className="font-bold">{item.quantity}×</strong>{' '}
                                      {item.dishes?.name || 'Platillo'}
                                    </span>
                                  </div>
                                  {item.notes && (
                                    <div className="mt-0.5">
                                      <span className="inline-flex items-center gap-1 bg-[#1E1B18] text-white text-[10px] font-semibold px-2 py-0.5 rounded-full shadow-2xs">
                                        <AlertCircle className="h-2.5 w-2.5 text-warn" />
                                        {item.notes}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Footer tarjeta: Waiter Avatar + Price + Action Pill Button */}
                          <div className="flex items-center justify-between gap-2 pt-3 border-t border-black/10 dark:border-white/10 mt-1">
                            <div className="flex items-center gap-2">
                              {/* Avatar circle */}
                              <div className="h-7 w-7 rounded-full bg-surface/80 dark:bg-white/20 border border-black/10 flex items-center justify-center text-[10px] font-bold text-fg shrink-0 overflow-hidden">
                                {waiterName.slice(0, 2).toUpperCase()}
                              </div>
                              <span className="font-display font-bold text-base tabular-nums">
                                {formatMoney(total)}
                              </span>
                            </div>

                            {/* Action Button */}
                            {col.status !== 'facturada' ? (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  advanceOrder(order.id, order.status);
                                }}
                                className={`px-3.5 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 ${
                                  col.btnStyle
                                }`}
                              >
                                <ActionIcon className="h-3.5 w-3.5" />
                                <span>{col.btnLabel}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleBillOrder(order);
                                }}
                                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-white/20 hover:bg-white/30 text-white transition-colors"
                              >
                                Facturar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ---------------- VISTA LISTA ---------------- */
        <DataTable
          columns={columns}
          rows={filteredOrders}
          rowKey={(r) => r.id}
          selectable
          selected={selectedOrderIds}
          onSelectedChange={setSelectedOrderIds}
          loading={loading}
          onRowClick={(r) => setActiveDetailOrder(r)}
          pageSize={15}
          empty={
            <EmptyState
              icon={<Utensils className="h-7 w-7" />}
              title="No hay órdenes en este estado"
              description="Las órdenes ingresadas aparecerán automáticamente aquí."
              action={
                <Button variant="outline" size="sm" onClick={() => setCreateDrawerOpen(true)}>
                  Crear primera orden
                </Button>
              }
            />
          }
        />
      )}

      {/* Barra de Acciones Masivas */}
      <BulkBar
        count={selectedOrderIds.size}
        onClear={() => setSelectedOrderIds(new Set())}
        noun={['orden seleccionada', 'órdenes seleccionadas']}
      >
        <BulkAction icon={<ArrowRight className="h-4 w-4" />} onClick={handleBulkAdvance} primary>
          Mover a siguiente etapa
        </BulkAction>
      </BulkBar>

      {/* -------------------- DRAWER DE DETALLE DE TICKET (IMAGES 1 & 2) -------------------- */}
      <Drawer
        open={Boolean(activeDetailOrder)}
        onClose={() => setActiveDetailOrder(null)}
        title={
          activeDetailOrder ? (
            <div className="flex items-center gap-2 text-xs font-medium text-muted">
              {activeDetailOrder.table_id ? (
                <>
                  <Utensils className="h-4 w-4 text-accent" />
                  <span>Comanda de comedor · abierta {formatClock(activeDetailOrder.created_at)}</span>
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4 text-warn" />
                  <span>Comanda para llevar · abierta {formatClock(activeDetailOrder.created_at)}</span>
                </>
              )}
            </div>
          ) : (
            ''
          )
        }
        size="md"
        bodyClassName="p-5 space-y-6"
      >
        {activeDetailOrder && (() => {
          const { subtotal, tax, total, itemCount } = getOrderFinancials(activeDetailOrder);
          const mins = minutesSince(activeDetailOrder.created_at, now);
          const waiterName = getWaiterName(activeDetailOrder.waiter_id);

          // Hero card background matching status
          const heroBg =
            activeDetailOrder.status === 'terminado'
              ? 'bg-[#BCE3CB] text-[#143021]'
              : activeDetailOrder.status === 'en_preparacion'
              ? 'bg-[#F9C9BB] text-[#331C16]'
              : activeDetailOrder.status === 'pendiente'
              ? 'bg-[#F6E8B9] text-[#292212]'
              : 'bg-[#202938] text-white';

          // Pasos de estado para la barra de progreso
          const statusSteps = ['pendiente', 'en_preparacion', 'terminado', 'facturada'];
          const currentStepIdx = statusSteps.indexOf(activeDetailOrder.status);

          return (
            <div className="space-y-6">
              {/* 1. HERO CARD EXACTA AL DISEÑO */}
              <div className={`rounded-3xl p-6 transition-colors shadow-sm ${heroBg}`}>
                {/* Top Row: #1061, timer, and Ready pill */}
                <div className="flex items-center justify-between gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="bg-white/80 dark:bg-black/30 px-3 py-1 rounded-full text-xs font-mono font-bold">
                      #{shortOrder(activeDetailOrder.order_number)}
                    </span>
                    <span className="bg-white/80 dark:bg-black/30 px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 tabular-nums">
                      <Clock className="h-3 w-3" />
                      {mins} min
                    </span>
                  </div>
                  <span className="bg-white/90 dark:bg-black/40 px-3.5 py-1 rounded-full text-xs font-bold capitalize">
                    {statusLabel(activeDetailOrder.status)}
                  </span>
                </div>

                {/* Middle: Big Title & Subtitle */}
                <div className="space-y-1 mb-6">
                  <h2 className="font-display font-extrabold text-3xl">
                    {activeDetailOrder.table_id
                      ? `Mesa ${activeDetailOrder.tables?.table_number || 'T3'}`
                      : 'Orden Para Llevar'}
                  </h2>
                  <div className="inline-block bg-white/70 dark:bg-black/30 px-3 py-0.5 rounded-full text-xs font-medium">
                    {activeDetailOrder.customer_name || 'Comensales'} · {activeDetailOrder.tables?.capacity || 4} puestos
                  </div>
                </div>

                {/* Bottom Row: Large Price & Waiter Avatar */}
                <div className="flex items-end justify-between pt-2 border-t border-black/10 dark:border-white/10">
                  <span className="font-display font-extrabold text-4xl tabular-nums">
                    {formatMoney(total)}
                  </span>
                  <div className="flex items-center gap-2 bg-white/80 dark:bg-black/40 px-3 py-1.5 rounded-full shadow-2xs">
                    <div className="h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center text-[10px] font-bold text-accent">
                      {waiterName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-bold text-ink dark:text-line">{waiterName}</span>
                  </div>
                </div>
              </div>

              {/* 2. SELECTOR DE ESTADOS (SEGMENTED CONTROL EN PILLS) */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  Estado de la comanda
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-surface-2 border border-line">
                  {[
                    { id: 'pendiente', label: 'Pendiente' },
                    { id: 'en_preparacion', label: 'En cocina' },
                    { id: 'terminado', label: 'Lista' },
                    { id: 'facturada', label: 'Entregada' },
                  ].map((s) => {
                    const active = activeDetailOrder.status === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => updateOrderStatus(activeDetailOrder.id, s.id)}
                        className={`py-2 rounded-xl text-xs font-bold transition-all ${
                          active
                            ? 'bg-surface text-ink dark:text-line shadow-sm'
                            : 'text-muted hover:text-fg'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 3. TIMELINE STEPPER HORIZONTAL */}
              <div className="p-4 rounded-2xl bg-surface border border-line shadow-xs">
                <div className="relative flex items-center justify-between">
                  {/* Línea horizontal de fondo */}
                  <div className="absolute left-6 right-6 top-3 h-0.5 bg-line -z-0" />

                  {/* Pasos */}
                  {[
                    { label: 'Registrada', time: formatClock(activeDetailOrder.created_at), color: 'bg-[#EBD699] text-[#292212]' },
                    { label: 'En marcha', time: 'En cocina', color: 'bg-[#F9C9BB] text-[#331C16]' },
                    { label: 'Lista', time: 'Terminada', color: 'bg-[#BCE3CB] text-[#143021]' },
                    { label: 'Entregada', time: 'Servida', color: 'bg-[#202938] text-white' },
                  ].map((step, idx) => {
                    const isPassed = idx <= (currentStepIdx === -1 ? 0 : currentStepIdx);
                    return (
                      <div key={step.label} className="relative z-10 flex flex-col items-center">
                        <div
                          className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                            isPassed ? step.color : 'bg-surface-2 text-muted border border-line'
                          }`}
                        >
                          {isPassed ? <Check className="h-3.5 w-3.5" /> : idx + 1}
                        </div>
                        <span className="text-[11px] font-bold text-fg mt-1.5">{step.label}</span>
                        <span className="text-[10px] text-muted">{step.time}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. ON THE TICKET (ITEMS CON ICONOS) */}
              <div>
                <h3 className="font-display font-bold text-base text-ink dark:text-line mb-3">
                  Artículos de la comanda
                </h3>
                <div className="divide-y divide-line/60">
                  {activeDetailOrder.order_items.map((item) => {
                    const DishIcon = getDishIcon(item.dishes?.name, item.dishes?.categories?.name);
                    const lineTotal = (item.dishes?.price || 0) * item.quantity;

                    return (
                      <div key={item.id} className="py-3 flex items-center justify-between gap-3 group">
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Dish Icon */}
                          <div className="h-11 w-11 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-accent shrink-0 shadow-2xs">
                            <DishIcon className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-sm text-ink dark:text-line truncate">
                              {item.quantity}× {item.dishes?.name || 'Platillo'}
                            </p>
                            <p className="text-xs text-muted">
                              {item.dishes?.categories?.name || 'Comida'} · {formatMoney(item.dishes?.price || 0)} c/u
                            </p>
                            {item.notes && (
                              <span className="inline-flex items-center gap-1 bg-warn-soft text-warn text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1">
                                <AlertCircle className="h-3 w-3" />
                                {item.notes}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-bold text-sm text-ink dark:text-line tabular-nums">
                            {formatMoney(lineTotal)}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteOrderItem(item.id)}
                            className="p-1.5 text-muted hover:text-bad rounded-lg transition-colors opacity-60 hover:opacity-100"
                            title="Eliminar plato"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. FINANCIAL SUMMARY BOX */}
              <div className="p-4 rounded-2xl bg-surface-2 border border-line space-y-2 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Subtotal · {itemCount} artículos</span>
                  <span className="font-semibold text-fg tabular-nums">{formatMoney(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Impuesto ITBIS ({config?.tax_percentage ?? 18}%)</span>
                  <span className="font-semibold text-fg tabular-nums">{formatMoney(tax)}</span>
                </div>
                <div className="border-t border-line/60 pt-2 flex justify-between items-baseline text-base font-bold text-ink dark:text-line">
                  <span>Total</span>
                  <span className="font-display font-extrabold text-xl text-fg tabular-nums">
                    {formatMoney(total)}
                  </span>
                </div>
              </div>

              {/* 6. ACCIONES INFERIORES */}
              <div className="flex flex-col gap-2 pt-1">
                {/* Botón principal */}
                <button
                  type="button"
                  onClick={() => advanceOrder(activeDetailOrder.id, activeDetailOrder.status)}
                  className="w-full py-3.5 rounded-full font-bold text-sm bg-[#F08066] hover:bg-[#E27157] text-white shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {activeDetailOrder.status === 'pendiente'
                      ? 'Marchar a cocina'
                      : activeDetailOrder.status === 'en_preparacion'
                      ? 'Marcar como lista'
                      : activeDetailOrder.status === 'terminado'
                      ? 'Marcar entregada'
                      : 'Orden completada'}
                  </span>
                </button>

                {/* Botones secundarios en pills */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleRush(activeDetailOrder)}
                    className="flex-1 py-2.5 rounded-full border border-line bg-surface hover:bg-surface-2 text-xs font-bold text-fg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Bell className="h-3.5 w-3.5 text-warn" />
                    <span>Urgente</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (onNavigate) onNavigate('tables');
                    }}
                    className="flex-1 py-2.5 rounded-full border border-line bg-surface hover:bg-surface-2 text-xs font-bold text-fg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Armchair className="h-3.5 w-3.5" />
                    <span>Mesa {activeDetailOrder.tables?.table_number || 'S/N'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleBillOrder(activeDetailOrder)}
                    className="flex-1 py-2.5 rounded-full border border-line bg-surface hover:bg-surface-2 text-xs font-bold text-fg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <DollarSign className="h-3.5 w-3.5 text-ok" />
                    <span>Cobrar comanda</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Drawer>

      {/* -------------------- DRAWER DE NUEVA ORDEN -------------------- */}
      <Drawer
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Crear Nueva Orden"
        description="Selecciona mesa o modalidad para llevar y agrega platillos a la comanda"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs font-semibold text-muted">
              {cart.reduce((s, i) => s + i.quantity, 0)} platillos · Total aprox:{' '}
              {formatMoney(
                cart.reduce((s, i) => s + i.price * i.quantity, 0) * (1 + (config?.tax_percentage ?? 18) / 100)
              )}
            </span>
            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={() => setCreateDrawerOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="acc"
                loading={submittingOrder}
                leftIcon={<Send className="h-4 w-4" />}
                onClick={(e) => handleCreateOrder(e)}
              >
                Enviar a Cocina
              </Button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleCreateOrder} className="space-y-6">
          {/* Modalidad de servicio */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setOrderChannel('dine_in')}
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                orderChannel === 'dine_in'
                  ? 'border-accent bg-accent/10 text-accent font-bold'
                  : 'border-line bg-surface-2 text-muted hover:text-fg'
              }`}
            >
              <Armchair className="h-4 w-4" />
              <span>Consumo en Mesa</span>
            </button>
            <button
              type="button"
              onClick={() => setOrderChannel('takeout')}
              className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
                orderChannel === 'takeout'
                  ? 'border-accent bg-accent/10 text-accent font-bold'
                  : 'border-line bg-surface-2 text-muted hover:text-fg'
              }`}
            >
              <ShoppingBag className="h-4 w-4" />
              <span>Para Llevar</span>
            </button>
          </div>

          {/* Selector de mesa o cliente */}
          {orderChannel === 'dine_in' ? (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
                Selecciona la Mesa *
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {tables.map((t) => {
                  const isSelected = selectedTableId === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTableId(t.id)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-accent bg-accent text-white font-bold shadow-xs'
                          : 'border-line bg-surface hover:bg-surface-2 text-fg'
                      }`}
                    >
                      <span className="block text-xs font-bold">Mesa {t.table_number}</span>
                      <span className="block text-[10px] opacity-75">{t.capacity || 4}p</span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Nombre del Cliente (Opcional)
              </label>
              <input
                type="text"
                value={customerNameInput}
                onChange={(e) => setCustomerNameInput(e.target.value)}
                placeholder="Ej. Lucy H."
                className="field"
              />
            </div>
          )}

          {/* Menú y Catálogo */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-muted uppercase tracking-wider">
                Catálogo de Platillos
              </label>
              {/* Filtro de categoría */}
              <select
                value={activeCategory}
                onChange={(e) => setActiveCategory(e.target.value)}
                className="text-xs field py-1 w-44"
              >
                <option value="all">Todas las categorías</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto custom-scrollbar p-1">
              {dishes
                .filter((d) => activeCategory === 'all' || d.category_id === activeCategory)
                .map((dish) => {
                  const DishIcon = getDishIcon(dish.name, dish.categories?.name);
                  return (
                    <div
                      key={dish.id}
                      onClick={() => addItemToCart(dish)}
                      className="p-2.5 rounded-xl border border-line bg-surface hover:border-accent/40 cursor-pointer transition-colors flex items-center gap-2.5"
                    >
                      <div className="h-10 w-10 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-accent shrink-0 shadow-2xs">
                        <DishIcon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-ink dark:text-line truncate">
                          {dish.name}
                        </p>
                        <p className="text-[11px] font-semibold text-ok tabular-nums">
                          {formatMoney(dish.price)}
                        </p>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Comanda actual */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Platillos en Comanda ({cart.length})
            </label>
            {cart.length === 0 ? (
              <div className="p-6 rounded-2xl border border-dashed border-line text-center text-xs text-muted">
                Haz clic en los platillos arriba para agregarlos a la comanda.
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.dish_id}
                    className="p-3 rounded-xl border border-line bg-surface-2 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-fg truncate">{item.dish_name}</p>
                      <p className="text-muted tabular-nums">{formatMoney(item.price)} c/u</p>
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) => {
                          const n = e.target.value;
                          setCart((prev) =>
                            prev.map((i) => (i.dish_id === item.dish_id ? { ...i, notes: n } : i))
                          );
                        }}
                        placeholder="Nota de cocina (ej. Sin cebolla, bien cocido...)"
                        className="field mt-1 py-1 text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center gap-1 border border-line rounded-lg bg-surface p-0.5">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.dish_id, -1)}
                          className="p-1 hover:bg-surface-2 rounded text-muted hover:text-fg"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center font-bold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.dish_id, 1)}
                          className="p-1 hover:bg-surface-2 rounded text-muted hover:text-fg"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="font-bold tabular-nums w-16 text-right text-fg">
                        {formatMoney(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nota general */}
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Nota General para la Cocina
            </label>
            <input
              type="text"
              value={generalNote}
              onChange={(e) => setGeneralNote(e.target.value)}
              placeholder="Ej. Servir juntos, cliente alérgico al marisco..."
              className="field"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}

function statusLabel(status: string): string {
  switch (status) {
    case 'pendiente':
      return 'Pendiente';
    case 'en_preparacion':
      return 'En cocina';
    case 'terminado':
      return 'Lista';
    case 'entregado':
    case 'facturada':
      return 'Entregada';
    default:
      return status;
  }
}

function statusTone(status: string): 'warn' | 'accent' | 'ok' | 'neutral' {
  switch (status) {
    case 'pendiente':
      return 'warn';
    case 'en_preparacion':
      return 'accent';
    case 'terminado':
      return 'ok';
    default:
      return 'neutral';
  }
}
