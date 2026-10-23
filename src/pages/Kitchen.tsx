import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  SegmentedControl,
  Drawer,
} from '../components/ui';
import {
  formatClock,
  minutesSince,
  useNow,
  shortOrder,
  UI_EVENTS,
} from '../lib/format';
import { getDishIcon } from '../lib/dishIcons';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Flame,
  Check,
  Utensils,
  ShoppingBag,
  MoreHorizontal,
  Bell,
  Trash2,
  Armchair,
} from 'lucide-react';

interface OrderItem {
  id: string;
  dish_id: string;
  quantity: number;
  notes: string | null;
  status: string;
  dishes?: {
    name: string;
    price?: number;
    categories?: { name: string } | null;
  } | null;
}

interface KitchenOrder {
  id: string;
  order_number: string;
  table_id: string | null;
  waiter_id: string | null;
  status: string;
  created_at: string;
  is_rush?: boolean;
  customer_name?: string | null;
  tables?: {
    table_number: string;
    capacity?: number;
  } | null;
  order_items: OrderItem[];
}

function playKitchenChime() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, now);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.5);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, now + 0.15);
    gain2.gain.setValueAtTime(0.4, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.7);
  } catch (e) {
    console.warn('Audio no permitido o no soportado:', e);
  }
}

export default function Kitchen() {
  const { config, formatMoney } = useConfig();
  void config;
  const { toast } = useToast();
  const now = useNow(10000);

  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [waiters, setWaiters] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  void loading;
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [mobileColumn, setMobileColumn] = useState<'pendiente' | 'en_preparacion' | 'terminado'>('pendiente');
  const [stationFilter, setStationFilter] = useState('all');

  // Ticket Detail Drawer
  const [activeDetailOrder, setActiveDetailOrder] = useState<KitchenOrder | null>(null);

  const knownOrderIds = useRef<Set<string>>(new Set());
  const initialLoadDone = useRef(false);

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
            tables ( table_number, capacity ),
            order_items (
              id,
              dish_id,
              quantity,
              notes,
              status,
              dishes (
                name,
                price,
                categories ( name )
              )
            )
          `)
          .in('status', ['pendiente', 'en_preparacion', 'terminado'])
          .order('created_at', { ascending: true }),
        supabase.from('users_profile').select('id, full_name'),
      ]);

      if (ordersRes.error) throw ordersRes.error;
      const loaded = (ordersRes.data as unknown as KitchenOrder[]) || [];

      if (waitersRes.data) {
        const wMap: Record<string, string> = {};
        for (const w of waitersRes.data as any[]) {
          wMap[w.id] = w.full_name;
        }
        setWaiters(wMap);
      }

      if (initialLoadDone.current && soundEnabled) {
        const hasNew = loaded.some((o) => o.status === 'pendiente' && !knownOrderIds.current.has(o.id));
        if (hasNew) {
          playKitchenChime();
          toast({
            title: '¡Nueva comanda en cocina!',
            message: 'Ha entrado un nuevo pedido para preparar.',
            tone: 'warn',
          });
        }
      }

      knownOrderIds.current = new Set(loaded.map((o) => o.id));
      initialLoadDone.current = true;
      setOrders(loaded);
    } catch (err) {
      console.error('Error loading kitchen orders:', err);
    } finally {
      setLoading(false);
    }
  }, [soundEnabled, toast]);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('kds-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadOrders();
        window.dispatchEvent(new CustomEvent(UI_EVENTS.ordersChanged));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, () => {
        loadOrders();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadOrders]);

  // Mantener actualizado el activeDetailOrder
  useEffect(() => {
    if (activeDetailOrder) {
      const refreshed = orders.find((o) => o.id === activeDetailOrder.id);
      if (refreshed) setActiveDetailOrder(refreshed);
    }
  }, [orders]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

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
        await supabase
          .from('orders')
          .update({ status: 'entregado' })
          .eq('id', orderId);
      }

      toast({
        title: `Comanda actualizada`,
        message: `Estado: ${newStatus === 'en_preparacion' ? 'En marcha' : newStatus === 'terminado' ? 'Listo' : 'Entregado'}`,
        tone: 'ok',
      });

      loadOrders();
    } catch (err: any) {
      toast({ title: 'Error al actualizar comanda', message: err.message, tone: 'bad' });
    }
  };

  const toggleRush = (order: KitchenOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === order.id ? { ...o, is_rush: !o.is_rush } : o))
    );
    toast({
      title: order.is_rush ? 'Prioridad normal' : '¡Comanda marcada como URGENTE!',
      message: `#${shortOrder(order.order_number)}`,
      tone: order.is_rush ? 'neutral' : 'bad',
    });
  };

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

  const getWaiterName = (waiterId: string | null) => {
    if (waiterId && waiters[waiterId]) return waiters[waiterId];
    return 'Lucía Vidal';
  };

  // Filtrado por estación si aplica
  const filteredOrders = orders.filter((o) => {
    if (stationFilter === 'all') return true;
    return o.order_items.some((it) =>
      it.dishes?.categories?.name?.toLowerCase().includes(stationFilter.toLowerCase())
    );
  });

  const pendingOrders = filteredOrders.filter((o) => o.status === 'pendiente');
  const inPrepOrders = filteredOrders.filter((o) => o.status === 'en_preparacion');
  const finishedOrders = filteredOrders.filter((o) => o.status === 'terminado');

  // Cálculos financieros
  const getOrderFinancials = (order: KitchenOrder) => {
    const taxRate = config?.tax_percentage ?? 18;
    const subtotal = order.order_items.reduce((sum, item) => {
      const p = item.dishes?.price || 0;
      return sum + p * item.quantity;
    }, 0);
    const tax = (subtotal * taxRate) / 100;
    const total = subtotal + tax;
    const itemCount = order.order_items.reduce((s, it) => s + it.quantity, 0);
    return { subtotal, tax, total, itemCount };
  };

  // Renderizador de Columna KDS con diseño Mavora
  const RenderKDSColumn = ({
    title,
    count,
    dotColor,
    ordersList,
    bgCard,
    btnStyle,
    btnLabel,
    btnIcon: BtnIcon,
    nextStatus,
  }: {
    title: string;
    count: number;
    dotColor: string;
    ordersList: KitchenOrder[];
    bgCard: string;
    btnStyle: string;
    btnLabel: string;
    btnIcon: any;
    nextStatus: string;
  }) => (
    <div className="flex flex-col rounded-2xl bg-surface-2/40 border border-line/60 p-3 h-full min-h-[500px]">
      {/* Header columna */}
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
          <h2 className="font-display font-bold text-sm text-fg tracking-tight">
            {title}{' '}
            <span className="font-sans font-semibold text-xs text-muted">
              {count}
            </span>
          </h2>
        </div>
        <span className="text-xs font-bold font-mono text-muted tabular-nums">
          {count} {count === 1 ? 'ticket' : 'tickets'}
        </span>
      </div>

      {/* Tarjetas */}
      <div className="flex-1 overflow-y-auto space-y-3.5 custom-scrollbar pr-0.5 max-h-[calc(100vh-16rem)]">
        {ordersList.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center text-muted rounded-2xl border border-dashed border-line">
            <CheckCircle2 className="h-8 w-8 mb-2 opacity-40 text-ok" />
            <p className="text-xs font-semibold">Sin comandas en esta etapa</p>
          </div>
        ) : (
          ordersList.map((order) => {
            const mins = minutesSince(order.created_at, now);
            const isDelayed = mins >= 15;
            const waiterName = getWaiterName(order.waiter_id);

            return (
              <div
                key={order.id}
                onClick={() => setActiveDetailOrder(order)}
                className={`rounded-2xl border p-4 transition-all duration-150 cursor-pointer flex flex-col justify-between shadow-xs hover:shadow-md ${bgCard}`}
              >
                <div>
                  {/* Top row: #1069, ⏱ 5 min, action button */}
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
                      title="Ver comanda de cocina"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Mesa o canal */}
                  <div className="mb-2">
                    <h3 className="font-display font-extrabold text-lg flex items-center gap-1.5">
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
                    </h3>
                  </div>

                  {/* Listado de platillos con cantidades destacadas y notas en badge oscuro */}
                  <div className="space-y-2 text-xs pt-2 border-t border-black/10 dark:border-white/10 pb-3">
                    {order.order_items.map((item) => (
                      <div key={item.id} className="leading-tight">
                        <div className="flex items-baseline gap-2">
                          <span className="font-bold text-sm">
                            {item.quantity}× {item.dishes?.name || 'Platillo'}
                          </span>
                        </div>
                        {item.notes && (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 bg-[#1E1B18] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-2xs">
                              <AlertCircle className="h-3 w-3 text-warn" />
                              {item.notes}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer tarjeta: Waiter Avatar + Botón de avance */}
                <div className="flex items-center justify-between gap-2 pt-3 border-t border-black/10 dark:border-white/10 mt-1">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-surface/80 dark:bg-white/20 border border-black/10 flex items-center justify-center text-[10px] font-bold text-fg shrink-0 overflow-hidden">
                      {waiterName.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-semibold opacity-90">{waiterName}</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateOrderStatus(order.id, nextStatus);
                    }}
                    className={`px-4 py-2 rounded-full text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 ${btnStyle}`}
                  >
                    <BtnIcon className="h-3.5 w-3.5" />
                    <span>{btnLabel}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <PageHeader
        breadcrumb={['Operación', 'Cocina']}
        title="Pantalla de Cocina (KDS)"
        description="Sistema de comandas en tiempo real con alertas de demora y timbrado de llegada."
        actions={
          <div className="flex items-center gap-2">
            {/* Filtro de estación */}
            <select
              value={stationFilter}
              onChange={(e) => setStationFilter(e.target.value)}
              className="px-3 py-2 rounded-full text-xs font-bold bg-surface-2 text-muted border border-line outline-none cursor-pointer"
            >
              <option value="all">Todas las estaciones</option>
              <option value="entradas">Entradas / Aperitivos</option>
              <option value="platos">Platos Fuertes</option>
              <option value="bebidas">Bar / Bebidas</option>
            </select>

            <Button
              variant="outline"
              size="md"
              leftIcon={soundEnabled ? <Volume2 className="h-4 w-4 text-ok" /> : <VolumeX className="h-4 w-4 text-muted" />}
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                if (!soundEnabled) playKitchenChime();
              }}
            >
              {soundEnabled ? 'Aviso sonoro' : 'Silenciado'}
            </Button>
          </div>
        }
      />

      {/* Selector de columna en móviles */}
      <div className="md:hidden">
        <SegmentedControl
          options={[
            { value: 'pendiente', label: `Pendientes (${pendingOrders.length})` },
            { value: 'en_preparacion', label: `En cocina (${inPrepOrders.length})` },
            { value: 'terminado', label: `Listas (${finishedOrders.length})` },
          ]}
          value={mobileColumn}
          onChange={setMobileColumn}
        />
      </div>

      {/* Grid de 3 Columnas KDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* COLUMNA 1: PENDIENTES */}
        <div className={mobileColumn === 'pendiente' ? 'block' : 'hidden md:block'}>
          <RenderKDSColumn
            title="Pendientes"
            count={pendingOrders.length}
            dotColor="bg-[#D97706]"
            ordersList={pendingOrders}
            bgCard="bg-[#F6E8B9] border-[#EAD397] text-[#292212] dark:bg-[#342D1C] dark:border-[#4D4229] dark:text-[#F6E8B9]"
            btnStyle="bg-[#1E1B18] text-white hover:bg-black"
            btnLabel="Marchar"
            btnIcon={Flame}
            nextStatus="en_preparacion"
          />
        </div>

        {/* COLUMNA 2: EN COCINA */}
        <div className={mobileColumn === 'en_preparacion' ? 'block' : 'hidden md:block'}>
          <RenderKDSColumn
            title="En cocina"
            count={inPrepOrders.length}
            dotColor="bg-[#E4570F]"
            ordersList={inPrepOrders}
            bgCard="bg-[#F9C9BB] border-[#F0B2A1] text-[#331C16] dark:bg-[#3E231E] dark:border-[#5A332B] dark:text-[#F9C9BB]"
            btnStyle="bg-white text-[#1E1B18] hover:bg-white/90 shadow-sm"
            btnLabel="Marcar lista"
            btnIcon={Check}
            nextStatus="terminado"
          />
        </div>

        {/* COLUMNA 3: LISTAS */}
        <div className={mobileColumn === 'terminado' ? 'block' : 'hidden md:block'}>
          <RenderKDSColumn
            title="Listas"
            count={finishedOrders.length}
            dotColor="bg-[#10B981]"
            ordersList={finishedOrders}
            bgCard="bg-[#BCE3CB] border-[#A3D7B5] text-[#143021] dark:bg-[#1A3828] dark:border-[#28543C] dark:text-[#BCE3CB]"
            btnStyle="bg-white text-[#143021] hover:bg-white/90 shadow-sm"
            btnLabel="Entregar"
            btnIcon={CheckCircle2}
            nextStatus="entregado"
          />
        </div>
      </div>

      {/* ---------------- DRAWER DE DETALLE DE TICKET (IMAGES 1 & 2) ---------------- */}
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

          const heroBg =
            activeDetailOrder.status === 'terminado'
              ? 'bg-[#BCE3CB] text-[#143021]'
              : activeDetailOrder.status === 'en_preparacion'
              ? 'bg-[#F9C9BB] text-[#331C16]'
              : activeDetailOrder.status === 'pendiente'
              ? 'bg-[#F6E8B9] text-[#292212]'
              : 'bg-[#202938] text-white';

          const statusSteps = ['pendiente', 'en_preparacion', 'terminado', 'entregado'];
          const currentStepIdx = statusSteps.indexOf(activeDetailOrder.status);

          return (
            <div className="space-y-6">
              {/* HERO CARD */}
              <div className={`rounded-3xl p-6 transition-colors shadow-sm ${heroBg}`}>
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
                    {activeDetailOrder.status === 'pendiente'
                      ? 'Pendiente'
                      : activeDetailOrder.status === 'en_preparacion'
                      ? 'En cocina'
                      : 'Lista'}
                  </span>
                </div>

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

              {/* STATUS SELECTOR */}
              <div>
                <label className="block text-xs font-bold text-muted uppercase tracking-wider mb-2">
                  Estado de la comanda
                </label>
                <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-surface-2 border border-line">
                  {[
                    { id: 'pendiente', label: 'Pendiente' },
                    { id: 'en_preparacion', label: 'En cocina' },
                    { id: 'terminado', label: 'Lista' },
                    { id: 'entregado', label: 'Entregada' },
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

              {/* TIMELINE STEPPER */}
              <div className="p-4 rounded-2xl bg-surface border border-line shadow-xs">
                <div className="relative flex items-center justify-between">
                  <div className="absolute left-6 right-6 top-3 h-0.5 bg-line -z-0" />

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

              {/* ON THE TICKET ITEMS */}
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

              {/* FINANCIAL SUMMARY BOX */}
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

              {/* ACCIONES INFERIORES */}
              <div className="flex flex-col gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (activeDetailOrder.status === 'pendiente') updateOrderStatus(activeDetailOrder.id, 'en_preparacion');
                    else if (activeDetailOrder.status === 'en_preparacion') updateOrderStatus(activeDetailOrder.id, 'terminado');
                    else if (activeDetailOrder.status === 'terminado') updateOrderStatus(activeDetailOrder.id, 'entregado');
                  }}
                  className="w-full py-3.5 rounded-full font-bold text-sm bg-[#F08066] hover:bg-[#E27157] text-white shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Check className="h-4 w-4" />
                  <span>
                    {activeDetailOrder.status === 'pendiente'
                      ? 'Marchar a cocina'
                      : activeDetailOrder.status === 'en_preparacion'
                      ? 'Marcar como lista'
                      : 'Marcar entregada'}
                  </span>
                </button>

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
                    onClick={() => setActiveDetailOrder(null)}
                    className="flex-1 py-2.5 rounded-full border border-line bg-surface hover:bg-surface-2 text-xs font-bold text-fg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                  >
                    <Armchair className="h-3.5 w-3.5" />
                    <span>Mesa {activeDetailOrder.tables?.table_number || 'S/N'}</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })()}
      </Drawer>
    </div>
  );
}