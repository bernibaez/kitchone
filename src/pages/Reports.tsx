import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import { tokenColor } from '../lib/theme';
import {
  PageHeader,
  Button,
  StatCard,
  Panel,
  Tag,
  Tabs,
  type TabItem,
  EmptyState,
} from '../components/ui';
import {
  TrendingUp,
  DollarSign,
  TrendingDown,
  UtensilsCrossed,
  FileText,
  FileSpreadsheet,
  ShoppingCart,
  Lock,
  Calendar,
  Download,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ReportStats {
  totalSales: number;
  totalExpenses: number;
  profit: number;
  orderCount: number;
  topDishes: Array<{
    name: string;
    quantity: number;
    revenue: number;
  }>;
  dailySales: Array<{
    date: string;
    sales: number;
    expenses: number;
    orders: number;
  }>;
  categorySales: Array<{
    category: string;
    amount: number;
    percentage: number;
  }>;
  hourlySales: Array<{
    hour: string;
    sales: number;
    orders: number;
  }>;
  salesHistory: Array<{
    id: string;
    sale_number: string;
    customer_name: string | null;
    total: number;
    payment_method: string;
    created_at: string;
  }>;
}

interface CashClosing {
  id: string;
  closing_number: string;
  opening_id: string;
  total_sales: number;
  cash_amount: number;
  transaction_amount: number;
  card_amount: number;
  expected_cash: number;
  difference: number;
  notes: string | null;
  closed_at: string;
  closed_by: string;
  cash_opening?: {
    opening_number: string;
    opening_amount: number;
    opened_at: string;
  };
}

const PIE_COLORS = ['#E4570F', '#27362B', '#10B981', '#3B82F6', '#8B5CF6', '#F59E0B'];

export default function Reports() {
  const { formatMoney, config } = useConfig();
  const { toast } = useToast();

  const [stats, setStats] = useState<ReportStats>({
    totalSales: 0,
    totalExpenses: 0,
    profit: 0,
    orderCount: 0,
    topDishes: [],
    dailySales: [],
    categorySales: [],
    hourlySales: [],
    salesHistory: [],
  });
  const [cashClosings, setCashClosings] = useState<CashClosing[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<'day' | 'week' | 'month' | 'year'>('month');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeTab, setActiveTab] = useState<string>('overview');

  const loadCashClosings = async () => {
    try {
      const { data, error } = await supabase
        .from('cash_closings')
        .select(`
          *,
          cash_opening (
            opening_number,
            opening_amount,
            opened_at
          )
        `)
        .order('closed_at', { ascending: false });

      if (error) throw error;
      setCashClosings(data || []);
    } catch (error: any) {
      console.error('Error loading cash closings:', error);
    }
  };

  useEffect(() => {
    loadReports();
    loadCashClosings();
  }, [period, startDate, endDate]);

  const loadReports = async () => {
    setLoading(true);
    try {
      let start: Date;
      let end: Date = new Date();

      if (startDate && endDate) {
        start = new Date(startDate);
        end = new Date(endDate);
      } else {
        switch (period) {
          case 'day':
            start = new Date();
            start.setHours(0, 0, 0, 0);
            break;
          case 'week':
            start = new Date();
            start.setDate(start.getDate() - 7);
            break;
          case 'month':
            start = new Date();
            start.setMonth(start.getMonth() - 1);
            break;
          case 'year':
            start = new Date();
            start.setFullYear(start.getFullYear() - 1);
            break;
        }
      }

      const [salesRes, expensesRes, ordersRes, topDishesRes, salesHistoryRes] = await Promise.all([
        supabase
          .from('sales')
          .select('total, created_at')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true }) as any,
        supabase
          .from('expenses')
          .select('amount, date, category')
          .gte('date', start.toISOString().split('T')[0])
          .lte('date', end.toISOString().split('T')[0]) as any,
        supabase
          .from('orders')
          .select('id, created_at, total')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true }) as any,
        supabase
          .from('sale_items')
          .select('dish_name, quantity, price, sale_id, category')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString()) as any,
        supabase
          .from('sales')
          .select('id, sale_number, customer_name, total, payment_method, created_at')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: false }) as any,
      ]);

      const totalSales = salesRes.data?.reduce((sum: number, sale: any) => sum + sale.total, 0) || 0;
      const totalExpenses = expensesRes.data?.reduce((sum: number, exp: any) => sum + exp.amount, 0) || 0;
      const profit = totalSales - totalExpenses;
      const orderCount = ordersRes.data?.length || 0;

      // Process daily sales data
      const dailyMap = new Map<string, { sales: number; expenses: number; orders: number }>();
      salesRes.data?.forEach((sale: any) => {
        const date = sale.created_at.split('T')[0];
        const existing = dailyMap.get(date) || { sales: 0, expenses: 0, orders: 0 };
        existing.sales += sale.total;
        dailyMap.set(date, existing);
      });

      ordersRes.data?.forEach((order: any) => {
        const date = order.created_at.split('T')[0];
        const existing = dailyMap.get(date) || { sales: 0, expenses: 0, orders: 0 };
        existing.orders += 1;
        dailyMap.set(date, existing);
      });

      expensesRes.data?.forEach((expense: any) => {
        const existing = dailyMap.get(expense.date) || { sales: 0, expenses: 0, orders: 0 };
        existing.expenses += expense.amount;
        dailyMap.set(expense.date, existing);
      });

      const dailySales = Array.from(dailyMap.entries())
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // Process category sales
      const categoryMap = new Map<string, number>();
      topDishesRes.data?.forEach((item: any) => {
        const category = item.category || 'Sin categoría';
        const revenue = item.quantity * item.price;
        categoryMap.set(category, (categoryMap.get(category) || 0) + revenue);
      });

      const categorySales = Array.from(categoryMap.entries())
        .map(([category, amount]) => ({
          category,
          amount,
          percentage: totalSales > 0 ? (amount / totalSales) * 100 : 0,
        }))
        .sort((a, b) => b.amount - a.amount);

      // Process hourly sales
      const hourlyMap = new Map<string, { sales: number; orders: number }>();
      ordersRes.data?.forEach((order: any) => {
        const hour = new Date(order.created_at).getHours().toString().padStart(2, '0') + ':00';
        const existing = hourlyMap.get(hour) || { sales: 0, orders: 0 };
        existing.sales += order.total || 0;
        existing.orders += 1;
        hourlyMap.set(hour, existing);
      });

      const hourlySales = Array.from(hourlyMap.entries())
        .map(([hour, data]) => ({ hour, ...data }))
        .sort((a, b) => a.hour.localeCompare(b.hour));

      // Process sales history
      const salesHistory = (salesHistoryRes.data || []).map((sale: any) => ({
        id: sale.id,
        sale_number: sale.sale_number,
        customer_name: sale.customer_name,
        total: sale.total,
        payment_method: sale.payment_method,
        created_at: sale.created_at,
      }));

      // Process top dishes
      const dishMap = new Map<string, { quantity: number; revenue: number }>();
      topDishesRes.data?.forEach((item: any) => {
        const existing = dishMap.get(item.dish_name);
        const revenue = item.quantity * item.price;
        if (existing) {
          existing.quantity += item.quantity;
          existing.revenue += revenue;
        } else {
          dishMap.set(item.dish_name, { quantity: item.quantity, revenue });
        }
      });

      const topDishes = Array.from(dishMap.entries())
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 10);

      setStats({
        totalSales,
        totalExpenses,
        profit,
        orderCount,
        topDishes,
        dailySales,
        categorySales,
        hourlySales,
        salesHistory,
      });
    } catch (error: any) {
      toast({ title: 'Error al cargar reportes', message: error.message, tone: 'bad' });
    } finally {
      setLoading(false);
    }
  };

  const generateClosingPDF = async (closing: CashClosing) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 15;
      let yPos = margin;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(config?.restaurant_name || 'Kitch One', pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;

      doc.setFontSize(14);
      doc.setFont('helvetica', 'normal');
      doc.text('Cierre de Caja', pageWidth / 2, yPos, { align: 'center' });
      yPos += 12;

      // Closing Info
      doc.setFontSize(10);
      doc.text(`Cierre #: ${closing.closing_number}`, margin, yPos);
      doc.text(
        `Fecha: ${new Date(closing.closed_at).toLocaleString()}`,
        pageWidth - margin,
        yPos,
        { align: 'right' }
      );
      yPos += 6;

      if (closing.cash_opening) {
        doc.text(`Apertura #: ${closing.cash_opening.opening_number}`, margin, yPos);
        yPos += 10;
      }

      autoTable(doc, {
        startY: yPos,
        head: [['Método de Pago', 'Monto']],
        body: [
          ['Efectivo en Caja', formatMoney(closing.cash_amount)],
          ['Transferencia', formatMoney(closing.transaction_amount)],
          ['Tarjeta de Crédito / Débito', formatMoney(closing.card_amount)],
          ['Total de Ventas', formatMoney(closing.total_sales)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [39, 54, 43] },
        styles: { fontSize: 10 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      if (closing.notes) {
        doc.setFontSize(10);
        doc.text('Notas:', margin, yPos);
        yPos += 5;
        doc.setFontSize(9);
        doc.text(closing.notes, margin, yPos);
      }

      doc.save(`cierre_${closing.closing_number}.pdf`);
      toast({ title: 'PDF generado', message: `Cierre #${closing.closing_number}`, tone: 'ok' });
    } catch (err: any) {
      toast({ title: 'Error al generar PDF', message: err.message, tone: 'bad' });
    }
  };

  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(config?.restaurant_name || 'Kitch One', pageWidth / 2, 15, { align: 'center' });

      doc.setFontSize(13);
      doc.setFont('helvetica', 'normal');
      doc.text('Reporte de Desempeño Financiero', pageWidth / 2, 23, { align: 'center' });

      const periodText =
        startDate && endDate
          ? `Período: ${startDate} al ${endDate}`
          : `Período: ${period === 'day' ? 'Hoy' : period === 'week' ? 'Última semana' : period === 'month' ? 'Último mes' : 'Último año'}`;
      doc.setFontSize(10);
      doc.text(periodText, pageWidth / 2, 30, { align: 'center' });

      autoTable(doc, {
        startY: 38,
        head: [['Métrica', 'Valor']],
        body: [
          ['Ventas Totales', formatMoney(stats.totalSales)],
          ['Gastos Totales', formatMoney(stats.totalExpenses)],
          ['Utilidad Neta', formatMoney(stats.profit)],
          ['Total de Órdenes', stats.orderCount.toString()],
        ],
        theme: 'grid',
        headStyles: { fillColor: [39, 54, 43] },
        styles: { fontSize: 10 },
      });

      let lastY = (doc as any).lastAutoTable?.finalY || 80;

      if (stats.topDishes.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Platillos Más Vendidos', 15, lastY + 12);

        autoTable(doc, {
          startY: lastY + 16,
          head: [['#', 'Platillo', 'Unidades', 'Ingresos']],
          body: stats.topDishes.map((dish, idx) => [
            (idx + 1).toString(),
            dish.name,
            dish.quantity.toString(),
            formatMoney(dish.revenue),
          ]),
          theme: 'grid',
          headStyles: { fillColor: [228, 87, 15] },
          styles: { fontSize: 9 },
        });
      }

      doc.save(`reporte_${new Date().toISOString().split('T')[0]}.pdf`);
      toast({ title: 'Reporte PDF descargado', tone: 'ok' });
    } catch (err: any) {
      toast({ title: 'Error al exportar PDF', message: err.message, tone: 'bad' });
    }
  };

  const exportToExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      const summaryData = [
        ['Métrica', 'Valor'],
        ['Ventas Totales', stats.totalSales],
        ['Gastos Totales', stats.totalExpenses],
        ['Utilidad', stats.profit],
        ['Total de Órdenes', stats.orderCount],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');

      if (stats.topDishes.length > 0) {
        const dishesData = [
          ['Platillo', 'Unidades Vendidas', 'Ingresos'],
          ...stats.topDishes.map((dish) => [dish.name, dish.quantity, dish.revenue]),
        ];
        const dishesWs = XLSX.utils.aoa_to_sheet(dishesData);
        XLSX.utils.book_append_sheet(wb, dishesWs, 'Platillos Más Vendidos');
      }

      if (stats.dailySales.length > 0) {
        const dailyData = [
          ['Fecha', 'Ventas', 'Gastos', 'Órdenes'],
          ...stats.dailySales.map((day) => [day.date, day.sales, day.expenses, day.orders]),
        ];
        const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
        XLSX.utils.book_append_sheet(wb, dailyWs, 'Ventas Diarias');
      }

      XLSX.writeFile(wb, `reporte_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast({ title: 'Reporte Excel descargado', tone: 'ok' });
    } catch (err: any) {
      toast({ title: 'Error al exportar Excel', message: err.message, tone: 'bad' });
    }
  };

  const reportTabs: TabItem[] = [
    { id: 'overview', label: 'Vista General' },
    { id: 'sales', label: 'Ventas y Horarios' },
    { id: 'products', label: 'Platillos Más Vendidos' },
    { id: 'analytics', label: 'Categorías' },
    { id: 'cash-closings', label: 'Cierres de Caja', count: cashClosings.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reportes y Análisis"
        description="Métricas financieras, rendimiento de ventas y auditoría de cierres de caja"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              leftIcon={<FileText className="h-4 w-4 text-bad" />}
              onClick={exportToPDF}
            >
              Exportar PDF
            </Button>
            <Button
              variant="outline"
              leftIcon={<FileSpreadsheet className="h-4 w-4 text-ok" />}
              onClick={exportToExcel}
            >
              Exportar Excel
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Ventas Totales"
          value={formatMoney(stats.totalSales)}
          icon={<TrendingUp className="h-5 w-5 text-ok" />}
          tone="ok"
        />
        <StatCard
          label="Gastos Totales"
          value={formatMoney(stats.totalExpenses)}
          icon={<TrendingDown className="h-5 w-5 text-bad" />}
          tone="bad"
        />
        <StatCard
          label="Utilidad Neta"
          value={formatMoney(stats.profit)}
          icon={<DollarSign className={`h-5 w-5 ${stats.profit >= 0 ? 'text-ok' : 'text-bad'}`} />}
          tone={stats.profit >= 0 ? 'ok' : 'bad'}
        />
        <StatCard
          label="Total de Órdenes"
          value={stats.orderCount}
          icon={<ShoppingCart className="h-5 w-5 text-accent" />}
          tone="accent"
        />
      </div>

      {/* Filtros de período */}
      <Panel
        title="Rango Temporal"
        description="Selecciona un período predeterminado o un intervalo personalizado de fechas"
      >
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1 rounded-lg border border-line bg-surface-2 p-1">
            {(['day', 'week', 'month', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => {
                  setPeriod(p);
                  setStartDate('');
                  setEndDate('');
                }}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  period === p && !startDate
                    ? 'bg-ink text-ink-on shadow-xs'
                    : 'text-muted hover:text-fg'
                }`}
              >
                {p === 'day' ? 'Día' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-muted font-medium">Desde:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="field py-1 text-xs w-36"
            />
            <span className="text-muted font-medium">Hasta:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="field py-1 text-xs w-36"
            />
            {(startDate || endDate) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartDate('');
                  setEndDate('');
                }}
              >
                Restablecer
              </Button>
            )}
          </div>
        </div>
      </Panel>

      {/* Tabs y Contenido de Reportes */}
      <Panel
        title={
          <Tabs
            items={reportTabs}
            value={activeTab}
            onChange={setActiveTab}
          />
        }
      >
        {loading ? (
          <div className="py-16 text-center text-muted text-sm">Calculando métricas...</div>
        ) : (
          <div className="space-y-6 pt-2">
            {/* TAB: VISTA GENERAL */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de tendencia */}
                  <div className="p-4 rounded-xl border border-line bg-surface-2">
                    <h3 className="font-bold text-sm text-ink dark:text-line mb-4">
                      Tendencia Diaria (Ventas vs Gastos)
                    </h3>
                    {stats.dailySales.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={stats.dailySales}>
                          <CartesianGrid strokeDasharray="3 3" stroke={tokenColor('line')} opacity={0.6} />
                          <XAxis dataKey="date" stroke={tokenColor('muted')} fontSize={11} />
                          <YAxis stroke={tokenColor('muted')} fontSize={11} />
                          <Tooltip formatter={(value) => formatMoney(Number(value))} />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="sales"
                            stroke={tokenColor('accent')}
                            name="Ventas"
                            strokeWidth={2.5}
                            dot={{ r: 3 }}
                          />
                          <Line
                            type="monotone"
                            dataKey="expenses"
                            stroke={tokenColor('bad')}
                            name="Gastos"
                            strokeWidth={2}
                            dot={{ r: 3 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted text-xs">
                        Sin datos para el período seleccionado
                      </div>
                    )}
                  </div>

                  {/* Distribución por Categoría */}
                  <div className="p-4 rounded-xl border border-line bg-surface-2">
                    <h3 className="font-bold text-sm text-ink dark:text-line mb-4">
                      Ventas por Categoría
                    </h3>
                    {stats.categorySales.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <RePieChart>
                          <Pie
                            data={stats.categorySales}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={85}
                            paddingAngle={3}
                            dataKey="amount"
                          >
                            {stats.categorySales.map((_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={PIE_COLORS[index % PIE_COLORS.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value) => formatMoney(Number(value))} />
                          <Legend />
                        </RePieChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-muted text-xs">
                        Sin categorías registradas en el período
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Platillos resumen */}
                <div className="p-4 rounded-xl border border-line bg-surface-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-bold text-sm text-ink dark:text-line">
                      Top 5 Platillos Más Vendidos
                    </h3>
                    <Tag tone="accent">Top 5</Tag>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                    {stats.topDishes.slice(0, 5).map((dish, idx) => (
                      <div
                        key={dish.name}
                        className="p-3 rounded-lg border border-line bg-surface flex flex-col justify-between"
                      >
                        <div className="flex items-center justify-between gap-1 mb-2">
                          <span className="font-bold text-xs text-ink dark:text-line truncate">
                            {dish.name}
                          </span>
                          <span className="text-[10px] font-bold text-muted tabular-nums">
                            #{idx + 1}
                          </span>
                        </div>
                        <div className="flex items-baseline justify-between text-xs pt-2 border-t border-line/60">
                          <span className="text-muted tabular-nums">{dish.quantity} un.</span>
                          <span className="font-bold text-ok tabular-nums">
                            {formatMoney(dish.revenue)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: VENTAS Y HORARIOS */}
            {activeTab === 'sales' && (
              <div className="space-y-6">
                {/* Horarios con mayor afluencia */}
                <div className="p-4 rounded-xl border border-line bg-surface-2">
                  <h3 className="font-bold text-sm text-ink dark:text-line mb-4">
                    Ventas por Hora del Día
                  </h3>
                  {stats.hourlySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={stats.hourlySales}>
                        <CartesianGrid strokeDasharray="3 3" stroke={tokenColor('line')} opacity={0.6} />
                        <XAxis dataKey="hour" stroke={tokenColor('muted')} fontSize={11} />
                        <YAxis stroke={tokenColor('muted')} fontSize={11} />
                        <Tooltip formatter={(value) => formatMoney(Number(value))} />
                        <Legend />
                        <Bar dataKey="sales" fill={tokenColor('accent')} name="Monto ($)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="orders" fill={tokenColor('ink')} name="Órdenes" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted text-xs">
                      Sin datos de horarios registrados
                    </div>
                  )}
                </div>

                {/* Historial reciente */}
                <div className="p-4 rounded-xl border border-line bg-surface-2">
                  <h3 className="font-bold text-sm text-ink dark:text-line mb-3">
                    Últimas 20 Ventas Registradas
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-line text-left text-muted">
                          <th className="py-2.5 px-3 font-semibold">Factura</th>
                          <th className="py-2.5 px-3 font-semibold">Cliente</th>
                          <th className="py-2.5 px-3 font-semibold">Fecha y Hora</th>
                          <th className="py-2.5 px-3 font-semibold">Método</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {stats.salesHistory.slice(0, 20).map((sale) => (
                          <tr key={sale.id} className="hover:bg-surface/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-ink dark:text-line">
                              #{sale.sale_number}
                            </td>
                            <td className="py-2.5 px-3 text-fg">
                              {sale.customer_name || 'Consumidor Final'}
                            </td>
                            <td className="py-2.5 px-3 text-muted tabular-nums">
                              {new Date(sale.created_at).toLocaleString()}
                            </td>
                            <td className="py-2.5 px-3">
                              <Tag tone={sale.payment_method === 'cash' ? 'ok' : 'info'}>
                                {sale.payment_method === 'cash' ? 'Efectivo' : 'Tarjeta'}
                              </Tag>
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-ok tabular-nums">
                              {formatMoney(sale.total)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB: PRODUCTOS */}
            {activeTab === 'products' && (
              <div className="p-4 rounded-xl border border-line bg-surface-2">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-sm text-ink dark:text-line">
                    Ranking de Platillos (Top 10)
                  </h3>
                  <span className="text-xs text-muted">Ordenado por unidades vendidas</span>
                </div>
                {stats.topDishes.length === 0 ? (
                  <EmptyState
                    icon={<UtensilsCrossed className="h-10 w-10 text-muted" />}
                    title="Sin ventas de productos"
                    description="No hay información de ítems vendidos en el intervalo seleccionado."
                  />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-line text-left text-muted">
                          <th className="py-2.5 px-3 font-semibold w-12">#</th>
                          <th className="py-2.5 px-3 font-semibold">Platillo</th>
                          <th className="py-2.5 px-3 font-semibold text-center">Unidades</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Precio Promedio</th>
                          <th className="py-2.5 px-3 font-semibold text-right">Ingresos Totales</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-line/60">
                        {stats.topDishes.map((dish, idx) => (
                          <tr key={dish.name} className="hover:bg-surface/50">
                            <td className="py-2.5 px-3 font-bold text-muted tabular-nums">
                              #{idx + 1}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-ink dark:text-line">
                              {dish.name}
                            </td>
                            <td className="py-2.5 px-3 text-center tabular-nums">
                              <span className="font-bold text-fg bg-surface px-2.5 py-1 rounded-md border border-line">
                                {dish.quantity}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-right text-muted tabular-nums">
                              {formatMoney(dish.revenue / dish.quantity)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold text-ok tabular-nums">
                              {formatMoney(dish.revenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB: CATEGORÍAS */}
            {activeTab === 'analytics' && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="p-4 rounded-xl border border-line bg-surface-2">
                  <h3 className="font-bold text-sm text-ink dark:text-line mb-4">
                    Participación de Ventas por Categoría
                  </h3>
                  {stats.categorySales.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                      <RePieChart>
                        <Pie
                          data={stats.categorySales}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ payload }: any) => `${payload.category}: ${payload.percentage.toFixed(0)}%`}
                          outerRadius={95}
                          dataKey="amount"
                        >
                          {stats.categorySales.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => formatMoney(Number(value))} />
                      </RePieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted text-xs">
                      Sin datos de categorías
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl border border-line bg-surface-2 space-y-3">
                  <h3 className="font-bold text-sm text-ink dark:text-line">
                    Detalle por Categoría
                  </h3>
                  <div className="space-y-2">
                    {stats.categorySales.map((cat, idx) => (
                      <div
                        key={cat.category}
                        className="p-3 rounded-lg border border-line bg-surface flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                          />
                          <span className="font-semibold text-xs text-ink dark:text-line">
                            {cat.category}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-muted tabular-nums">
                            {cat.percentage.toFixed(1)}%
                          </span>
                          <span className="font-bold text-ok tabular-nums">
                            {formatMoney(cat.amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: CIERRES DE CAJA */}
            {activeTab === 'cash-closings' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-ink dark:text-line">
                      Historial de Cierres de Turno
                    </h3>
                    <p className="text-xs text-muted">
                      Descarga los comprobantes de arqueo en PDF
                    </p>
                  </div>
                </div>

                {cashClosings.length === 0 ? (
                  <EmptyState
                    icon={<Lock className="h-10 w-10 text-muted" />}
                    title="No hay cierres de caja"
                    description="Los cierres de caja registrados desde el POS aparecerán aquí."
                  />
                ) : (
                  <div className="grid gap-3">
                    {cashClosings.map((closing) => (
                      <div
                        key={closing.id}
                        className="p-4 rounded-xl border border-line bg-surface-2 flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <Lock className="h-4 w-4 text-accent" />
                            <span className="font-bold text-sm text-ink dark:text-line">
                              {closing.closing_number}
                            </span>
                            <Tag tone="ok">Cerrada</Tag>
                          </div>
                          <p className="text-xs text-muted flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(closing.closed_at).toLocaleString()}
                          </p>
                          {closing.cash_opening && (
                            <p className="text-xs text-muted mt-0.5">
                              Apertura: {closing.cash_opening.opening_number} (
                              {formatMoney(closing.cash_opening.opening_amount)})
                            </p>
                          )}
                        </div>

                        {/* Breakdown */}
                        <div className="flex flex-wrap items-center gap-3 text-xs">
                          <div className="px-3 py-1.5 rounded-lg border border-line bg-surface">
                            <span className="text-muted block text-[10px]">Efectivo</span>
                            <span className="font-bold text-ok tabular-nums">
                              {formatMoney(closing.cash_amount)}
                            </span>
                          </div>
                          <div className="px-3 py-1.5 rounded-lg border border-line bg-surface">
                            <span className="text-muted block text-[10px]">Tarjeta</span>
                            <span className="font-bold text-fg tabular-nums">
                              {formatMoney(closing.card_amount)}
                            </span>
                          </div>
                          <div className="px-3 py-1.5 rounded-lg border border-line bg-surface">
                            <span className="text-muted block text-[10px]">Total Ventas</span>
                            <span className="font-bold text-accent tabular-nums">
                              {formatMoney(closing.total_sales)}
                            </span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Download className="h-3.5 w-3.5" />}
                            onClick={() => generateClosingPDF(closing)}
                          >
                            PDF
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Panel>
    </div>
  );
}
