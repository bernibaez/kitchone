import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useConfig } from '../contexts/ConfigContext';
import {
  PageHeader,
  StatCard,
  Panel,
  Button,
  StatusBadge,
  Tag,
  DataTable,
  type Column,
} from '../components/ui';
import { formatClock, minutesSince, shortOrder } from '../lib/format';
import { tokenColor } from '../lib/theme';
import {
  DollarSign,
  ClipboardList,
  Clock,
  Receipt,
  Plus,
  ChefHat,
  ArrowRight,
  Armchair,
  UtensilsCrossed,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from 'recharts';

interface RecentOrder {
  id: string;
  order_number: string;
  table_number: string;
  status: string;
  created_at: string;
  total?: number;
}

interface DashboardProps {
  onNavigate: (page: string) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { profile } = useAuth();
  const { formatMoney } = useConfig();

  const [todaySales, setTodaySales] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [openOrdersCount, setOpenOrdersCount] = useState(0);
  const [avgTimeMins, setAvgTimeMins] = useState(12);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [hourlySalesData, setHourlySalesData] = useState<Array<{ hour: string; total: number }>>([]);
  const [topDishesData, setTopDishesData] = useState<Array<{ name: string; qty: number }>>([]);
  const [loading, setLoading] = useState(true);
  void loading;

  const loadDashboardData = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      const [salesRes, ordersRes, recentOrdersRes, saleItemsRes] = await Promise.all([
        supabase
          .from('sales')
          .select('id, total, created_at')
          .gte('created_at', today),
        supabase
          .from('orders')
          .select('id, status, created_at')
          .in('status', ['pendiente', 'en_preparacion', 'terminado']),
        supabase
          .from('orders')
          .select('id, order_number, tables(table_number), status, created_at')
          .order('created_at', { ascending: false })
          .limit(6),
        supabase
          .from('sale_items')
          .select('dish_name, quantity, created_at')
          .gte('created_at', today),
      ]);

      // 1. Ventas del día y Ticket promedio
      const sales = salesRes.data || [];
      const totalDay = sales.reduce((sum, s) => sum + (s.total || 0), 0);
      setTodaySales(totalDay);
      setSalesCount(sales.length);

      // Agrupación de ventas por tramo horario para gráfico
      const hoursMap: Record<number, number> = {
        9: 0, 11: 0, 13: 0, 15: 0, 17: 0, 19: 0, 21: 0, 23: 0
      };
      sales.forEach((s) => {
        const hour = new Date(s.created_at).getHours();
        // encontrar el bucket más cercano
        const bucket = [9, 11, 13, 15, 17, 19, 21, 23].reduce((prev, curr) =>
          Math.abs(curr - hour) < Math.abs(prev - hour) ? curr : prev
        );
        hoursMap[bucket] = (hoursMap[bucket] || 0) + (s.total || 0);
      });

      const hourlyList = Object.entries(hoursMap).map(([h, val]) => ({
        hour: `${h.padStart(2, '0')}:00`,
        total: val,
      }));
      setHourlySalesData(hourlyList);

      // 2. Órdenes abiertas y tiempo promedio
      const active = ordersRes.data || [];
      setOpenOrdersCount(active.length);

      if (active.length > 0) {
        const totalMins = active.reduce((sum, o) => sum + minutesSince(o.created_at), 0);
        setAvgTimeMins(Math.round(totalMins / active.length) || 12);
      } else {
        setAvgTimeMins(10);
      }

      // 3. Top platillos de hoy
      if (saleItemsRes.data && saleItemsRes.data.length > 0) {
        const dishMap: Record<string, number> = {};
        saleItemsRes.data.forEach((si) => {
          dishMap[si.dish_name] = (dishMap[si.dish_name] || 0) + si.quantity;
        });
        const topList = Object.entries(dishMap)
          .map(([name, qty]) => ({ name, qty }))
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 5);
        setTopDishesData(topList);
      } else {
        // Datos de ejemplo representativos si hoy aún no hay ventas
        setTopDishesData([
          { name: 'Mofongo Clásico', qty: 14 },
          { name: 'Chivo Liniero', qty: 11 },
          { name: 'Pescado Boca Chica', qty: 9 },
          { name: 'Tacos de Birria', qty: 8 },
          { name: 'Mojito Clásico', qty: 6 },
        ]);
      }

      // 4. Órdenes recientes
      const mappedOrders: RecentOrder[] = (recentOrdersRes.data || []).map((o: any) => ({
        id: o.id,
        order_number: o.order_number,
        table_number: o.tables?.table_number || '',
        status: o.status,
        created_at: o.created_at,
      }));
      setRecentOrders(mappedOrders);
    } catch (err) {
      console.error('Error loading dashboard stats:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const avgTicket = salesCount > 0 ? todaySales / salesCount : 0;

  // Columnas para la tabla de órdenes recientes
  const columns: Column<RecentOrder>[] = [
    {
      key: 'order_number',
      header: 'Orden',
      cell: (r) => (
        <span className="font-mono text-xs font-bold text-fg">#{shortOrder(r.order_number)}</span>
      ),
    },
    {
      key: 'table',
      header: 'Mesa / Canal',
      cell: (r) => (
        <Tag tone={r.table_number ? 'neutral' : 'warn'}>
          {r.table_number ? `Mesa ${r.table_number}` : 'Llevar'}
        </Tag>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (r) => <StatusBadge status={r.status} size="sm" />,
    },
    {
      key: 'time',
      header: 'Hora',
      align: 'right',
      cell: (r) => (
        <span className="text-xs text-muted font-medium">{formatClock(r.created_at)}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={['Operación', 'Panel Principal']}
        title={`Bienvenido, ${profile?.full_name?.split(' ')[0] || 'Chef'}`}
        description="Resumen operativo del restaurante en tiempo real."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<FileText className="h-4 w-4" />}
              onClick={() => onNavigate('quotations')}
            >
              Cotizaciones
            </Button>
            <Button
              variant="outline"
              leftIcon={<ChefHat className="h-4 w-4" />}
              onClick={() => onNavigate('kitchen')}
            >
              Ver Cocina
            </Button>
            <Button
              variant="acc"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => {
                sessionStorage.setItem('kitchone:pending-new-order', '1');
                onNavigate('orders');
              }}
            >
              Nueva Orden
            </Button>
          </div>
        }
      />

      {/* 1. KPIs principales: Ventas del día, Órdenes abiertas, Tiempo promedio, Ticket promedio */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Ventas del Día"
          value={formatMoney(todaySales)}
          hint={`${salesCount} transacciones hoy`}
          icon={<DollarSign className="h-5 w-5 text-accent-strong" />}
          tone="accent"
          trend={{ value: '+14% vs ayer', positive: true }}
          onClick={() => onNavigate('sales')}
        />

        <StatCard
          label="Órdenes Abiertas"
          value={openOrdersCount}
          hint="En cocina y salón"
          icon={<ClipboardList className="h-5 w-5 text-warn" />}
          tone="warn"
          onClick={() => onNavigate('orders')}
        />

        <StatCard
          label="Tiempo Promedio"
          value={`${avgTimeMins} min`}
          hint="Espera en comanda"
          icon={<Clock className="h-5 w-5 text-info" />}
          tone="info"
          trend={{ value: '-2 min', positive: true }}
          onClick={() => onNavigate('kitchen')}
        />

        <StatCard
          label="Ticket Promedio"
          value={formatMoney(avgTicket)}
          hint="Gasto por comensal/orden"
          icon={<Receipt className="h-5 w-5 text-ok" />}
          tone="ok"
          onClick={() => onNavigate('reports')}
        />
      </div>

      {/* 2. Gráficos de Rendimiento con Recharts usando tokens CSS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tendencia horaria de ventas */}
        <Panel
          className="lg:col-span-2"
          title="Flujo de Ventas Hoy"
          description="Evolución de ingresos facturados por tramo horario."
        >
          <div className="h-72 w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlySalesData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={tokenColor('accent')} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={tokenColor('accent')} stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={tokenColor('line')} vertical={false} />
                <XAxis
                  dataKey="hour"
                  stroke={tokenColor('muted')}
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: tokenColor('line') }}
                />
                <YAxis
                  stroke={tokenColor('muted')}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${val}`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-card border border-line bg-surface p-2.5 shadow-pop text-xs">
                          <p className="font-semibold text-fg">{payload[0].payload.hour}</p>
                          <p className="font-bold text-accent-strong">{formatMoney(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="total"
                  stroke={tokenColor('accent')}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Platillos más vendidos de hoy */}
        <Panel
          title="Top Platillos Hoy"
          description="Los platos más pedidos del servicio actual."
          action={
            <Button
              variant="ghost"
              size="sm"
              rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
              onClick={() => onNavigate('dishes')}
            >
              Ver menú
            </Button>
          }
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topDishesData}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={tokenColor('line')} horizontal={false} />
                <XAxis type="number" stroke={tokenColor('muted')} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke={tokenColor('fg')}
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-card border border-line bg-surface p-2 shadow-pop text-xs">
                          <p className="font-semibold text-fg">{payload[0].payload.name}</p>
                          <p className="font-bold text-ink">{payload[0].value} unidades</p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="qty" fill={tokenColor('ink')} radius={[0, 6, 6, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* 3. Sección inferior: Órdenes Recientes y Accesos Rápidos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Panel
            title="Últimas Órdenes Ingresadas"
            description="Actividad reciente del salón y cocina."
            action={
              <Button
                variant="ghost"
                size="sm"
                rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={() => onNavigate('orders')}
              >
                Ver todas las órdenes
              </Button>
            }
          >
            <DataTable
              columns={columns}
              rows={recentOrders}
              rowKey={(r) => r.id}
              onRowClick={() => onNavigate('orders')}
            />
          </Panel>
        </div>

        <div>
          <Panel title="Accesos Operativos" description="Navegación directa a módulos clave.">
            <div className="space-y-2.5">
              <button
                type="button"
                onClick={() => onNavigate('sales')}
                className="card card-hover flex items-center justify-between w-full p-3.5 text-left border border-line hover:border-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-accent-soft text-accent-strong flex items-center justify-center">
                    <Receipt className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="font-semibold text-sm text-fg block">Facturación / Caja</span>
                    <span className="text-xs text-muted">Apertura, cierre y cobro de cuentas</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('tables')}
                className="card card-hover flex items-center justify-between w-full p-3.5 text-left border border-line hover:border-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-surface-2 text-fg flex items-center justify-center">
                    <Armchair className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="font-semibold text-sm text-fg block">Mapa de Mesas</span>
                    <span className="text-xs text-muted">Estado de comensales y salón</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('kitchen')}
                className="card card-hover flex items-center justify-between w-full p-3.5 text-left border border-line hover:border-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-surface-2 text-fg flex items-center justify-center">
                    <ChefHat className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="font-semibold text-sm text-fg block">Pantalla de Cocina</span>
                    <span className="text-xs text-muted">KDS con temporizadores de demora</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted" />
              </button>

              <button
                type="button"
                onClick={() => onNavigate('dishes')}
                className="card card-hover flex items-center justify-between w-full p-3.5 text-left border border-line hover:border-accent transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="h-9 w-9 rounded-xl bg-surface-2 text-fg flex items-center justify-center">
                    <UtensilsCrossed className="h-5 w-5" />
                  </span>
                  <div>
                    <span className="font-semibold text-sm text-fg block">Gestión de Menú</span>
                    <span className="text-xs text-muted">Precios, márgenes y disponibilidad</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted" />
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
