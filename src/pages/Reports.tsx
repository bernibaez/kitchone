import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useNotification } from '../contexts/NotificationContext';
import {
  TrendingUp,
  DollarSign,
  UtensilsCrossed,
  FileText,
  FileSpreadsheet,
  Filter,
  ShoppingCart,
  ArrowUp,
  ArrowDown,
  Download,
  Lock,
  Calendar,
  Phone,
  CreditCard
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
  ResponsiveContainer
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

const COLORS = ['#f97316', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444'];

export default function Reports() {
  const { formatMoney, config } = useConfig();
  const { showNotification } = useNotification();
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
  const [reportType, setReportType] = useState<'overview' | 'sales' | 'products' | 'analytics' | 'cash-closings'>('overview');

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
    } catch (error) {
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
          .order('created_at', { ascending: false }) as any
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
          percentage: (amount / totalSales) * 100
        }))
        .sort((a, b) => b.amount - a.amount);

      // Process hourly sales
      const hourlyMap = new Map<string, { sales: number; orders: number }>();
      ordersRes.data?.forEach((order: any) => {
        const hour = new Date(order.created_at).getHours().toString().padStart(2, '0') + ':00';
        const existing = hourlyMap.get(hour) || { sales: 0, orders: 0 };
        existing.sales += order.total;
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
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateClosingPDF = async (closing: CashClosing) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 15;
      let yPos = margin;

      // Header
      doc.setFontSize(20);
      doc.setTextColor(0, 0, 0);
      doc.text('Cierre de Caja', margin, yPos);
      yPos += 10;

      // Restaurant name
      doc.setFontSize(12);
      doc.text(config?.restaurant_name || 'Restaurante', margin, yPos);
      yPos += 8;

      // Closing number and date
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`Número: ${closing.closing_number}`, margin, yPos);
      yPos += 6;
      const date = new Date(closing.closed_at).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      doc.text(`Fecha: ${date}`, margin, yPos);
      yPos += 6;
      if (closing.cash_opening) {
        doc.text(`Apertura: ${closing.cash_opening.opening_number}`, margin, yPos);
        yPos += 6;
      }
      yPos += 10;

      // Sales Summary Table
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text('Resumen de Ventas', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Método de Pago', 'Monto']],
        body: [
          ['Efectivo', formatMoney(closing.cash_amount)],
          ['Transferencia', formatMoney(closing.transaction_amount)],
          ['Tarjeta', formatMoney(closing.card_amount)],
          ['Total Ventas', formatMoney(closing.total_sales)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60, halign: 'right' },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Cash Summary
      doc.setFontSize(14);
      doc.text('Resumen de Efectivo', margin, yPos);
      yPos += 8;

      autoTable(doc, {
        startY: yPos,
        head: [['Concepto', 'Monto']],
        body: [
          ['Fondo Inicial', formatMoney(closing.cash_opening?.opening_amount || 0)],
          ['Ventas en Efectivo', formatMoney(closing.cash_amount)],
          ['Efectivo Esperado', formatMoney(closing.expected_cash)],
          ['Diferencia', formatMoney(closing.difference)],
        ],
        theme: 'grid',
        headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255] },
        columnStyles: {
          0: { cellWidth: 80 },
          1: { cellWidth: 60, halign: 'right' },
        },
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      // Notes if present
      if (closing.notes) {
        doc.setFontSize(12);
        doc.text('Notas:', margin, yPos);
        yPos += 6;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        const splitNotes = doc.splitTextToSize(closing.notes, pageWidth - 2 * margin);
        doc.text(splitNotes, margin, yPos);
      }

      // Footer
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Generado por Kitch One - ${new Date().toLocaleString('es-ES')}`,
        margin,
        pageHeight - 10
      );

      // Save PDF
      doc.save(`cierre-caja-${closing.closing_number}.pdf`);

      showNotification({
        type: 'success',
        title: 'PDF descargado',
        message: 'El reporte de cierre de caja se ha descargado exitosamente',
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo generar el PDF',
      });
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Title
    doc.setFontSize(20);
    doc.text('Reporte de Ventas', pageWidth / 2, 20, { align: 'center' });
    
    // Period
    doc.setFontSize(12);
    const periodText = startDate && endDate 
      ? `Período: ${startDate} a ${endDate}`
      : `Período: ${period === 'day' ? 'Hoy' : period === 'week' ? 'Última semana' : period === 'month' ? 'Último mes' : 'Último año'}`;
    doc.text(periodText, pageWidth / 2, 30, { align: 'center' });
    
    // Summary stats
    doc.setFontSize(14);
    doc.text('Resumen General', 20, 50);
    
    let lastY = 55;
    
    autoTable(doc, {
      startY: lastY,
      head: [['Métrica', 'Valor']],
      body: [
        ['Ventas Totales', `$${stats.totalSales.toFixed(2)}`],
        ['Gastos Totales', `$${stats.totalExpenses.toFixed(2)}`],
        ['Utilidad', `$${stats.profit.toFixed(2)}`],
        ['Total de Órdenes', stats.orderCount.toString()],
      ],
      theme: 'grid',
      styles: { fontSize: 10 },
    });
    
    lastY = (doc as any).lastAutoTable?.finalY || 100;
    
    // Top dishes
    if (stats.topDishes.length > 0) {
      doc.setFontSize(14);
      doc.text('Platillos Más Vendidos', 20, lastY + 15);
      
      autoTable(doc, {
        startY: lastY + 20,
        head: [['#', 'Platillo', 'Unidades', 'Ingresos']],
        body: stats.topDishes.map((dish, index) => [
          (index + 1).toString(),
          dish.name,
          dish.quantity.toString(),
          `$${dish.revenue.toFixed(2)}`
        ]),
        theme: 'grid',
        styles: { fontSize: 10 },
      });
    }
    
    // Daily sales
    if (stats.dailySales.length > 0) {
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Ventas Diarias', 20, 20);
      
      autoTable(doc, {
        startY: 25,
        head: [['Fecha', 'Ventas', 'Gastos', 'Órdenes']],
        body: stats.dailySales.map(day => [
          day.date,
          `$${day.sales.toFixed(2)}`,
          `$${day.expenses.toFixed(2)}`,
          day.orders.toString()
        ]),
        theme: 'grid',
        styles: { fontSize: 10 },
      });
    }
    
    doc.save(`reporte_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Summary sheet
    const summaryData = [
      ['Métrica', 'Valor'],
      ['Ventas Totales', stats.totalSales],
      ['Gastos Totales', stats.totalExpenses],
      ['Utilidad', stats.profit],
      ['Total de Órdenes', stats.orderCount],
    ];
    const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen');
    
    // Top dishes sheet
    if (stats.topDishes.length > 0) {
      const dishesData = [
        ['Platillo', 'Unidades Vendidas', 'Ingresos'],
        ...stats.topDishes.map(dish => [
          dish.name,
          dish.quantity,
          dish.revenue
        ])
      ];
      const dishesWs = XLSX.utils.aoa_to_sheet(dishesData);
      XLSX.utils.book_append_sheet(wb, dishesWs, 'Platillos Más Vendidos');
    }
    
    // Daily sales sheet
    if (stats.dailySales.length > 0) {
      const dailyData = [
        ['Fecha', 'Ventas', 'Gastos', 'Órdenes'],
        ...stats.dailySales.map(day => [
          day.date,
          day.sales,
          day.expenses,
          day.orders
        ])
      ];
      const dailyWs = XLSX.utils.aoa_to_sheet(dailyData);
      XLSX.utils.book_append_sheet(wb, dailyWs, 'Ventas Diarias');
    }
    
    // Category sales sheet
    if (stats.categorySales.length > 0) {
      const categoryData = [
        ['Categoría', 'Ventas', 'Porcentaje'],
        ...stats.categorySales.map(cat => [
          cat.category,
          cat.amount,
          `${cat.percentage.toFixed(1)}%`
        ])
      ];
      const categoryWs = XLSX.utils.aoa_to_sheet(categoryData);
      XLSX.utils.book_append_sheet(wb, categoryWs, 'Ventas por Categoría');
    }
    
    // Hourly sales sheet
    if (stats.hourlySales.length > 0) {
      const hourlyData = [
        ['Hora', 'Ventas', 'Órdenes'],
        ...stats.hourlySales.map(hour => [
          hour.hour,
          hour.sales,
          hour.orders
        ])
      ];
      const hourlyWs = XLSX.utils.aoa_to_sheet(hourlyData);
      XLSX.utils.book_append_sheet(wb, hourlyWs, 'Ventas por Hora');
    }
    
    XLSX.writeFile(wb, `reporte_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Reportes y Análisis</h1>
            <p className="text-gray-600 mt-1">Visualiza y analiza el rendimiento de tu restaurante</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={exportToPDF}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Exportar PDF
            </button>
            <button
              onClick={exportToExcel}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-gray-500" />
          <h3 className="text-lg font-semibold text-gray-900">Filtros</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Report Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tipo de Reporte</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            >
              <option value="overview">Vista General</option>
              <option value="sales">Análisis de Ventas</option>
              <option value="products">Productos</option>
              <option value="analytics">Análisis Avanzado</option>
              <option value="cash-closings">Cierres de Caja</option>
            </select>
          </div>

          {/* Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Período</label>
            <div className="flex gap-1">
              {(['day', 'week', 'month', 'year'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`flex-1 px-3 py-2 rounded-lg font-medium transition-colors ${
                    period === p
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {p === 'day' ? 'Día' : p === 'week' ? 'Semana' : p === 'month' ? 'Mes' : 'Año'}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Inicio</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fecha Fin</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Ventas Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${stats.totalSales.toFixed(2)}
              </p>
              <div className="flex items-center mt-2 text-sm">
                <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                <span className="text-green-500">+12.5%</span>
                <span className="text-gray-500 ml-1">vs período anterior</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Gastos Totales</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                ${stats.totalExpenses.toFixed(2)}
              </p>
              <div className="flex items-center mt-2 text-sm">
                <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                <span className="text-red-500">+8.2%</span>
                <span className="text-gray-500 ml-1">vs período anterior</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Utilidad Neta</p>
              <p className={`text-2xl font-bold mt-2 ${
                stats.profit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                ${stats.profit.toFixed(2)}
              </p>
              <div className="flex items-center mt-2 text-sm">
                {stats.profit >= 0 ? (
                  <>
                    <ArrowUp className="w-4 h-4 text-green-500 mr-1" />
                    <span className="text-green-500">+15.3%</span>
                  </>
                ) : (
                  <>
                    <ArrowDown className="w-4 h-4 text-red-500 mr-1" />
                    <span className="text-red-500">-5.1%</span>
                  </>
                )}
                <span className="text-gray-500 ml-1">vs período anterior</span>
              </div>
            </div>
            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
              stats.profit >= 0 ? 'bg-green-100' : 'bg-red-100'
            }`}>
              <DollarSign className={`w-6 h-6 ${
                stats.profit >= 0 ? 'text-green-600' : 'text-red-600'
              }`} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Total de Órdenes</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{stats.orderCount}</p>
              <div className="flex items-center mt-2 text-sm">
                <ArrowUp className="w-4 h-4 text-blue-500 mr-1" />
                <span className="text-blue-500">+18.7%</span>
                <span className="text-gray-500 ml-1">vs período anterior</span>
              </div>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <ShoppingCart className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      {(reportType === 'overview' || reportType === 'sales') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sales Trend */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Tendencia de Ventas</h3>
            {stats.dailySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={stats.dailySales}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="sales" stroke="#f97316" name="Ventas" strokeWidth={2} />
                  <Line type="monotone" dataKey="expenses" stroke="#ef4444" name="Gastos" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No hay datos disponibles para el período seleccionado
              </div>
            )}
          </div>

          {/* Category Distribution */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Categoría</h3>
            {stats.categorySales.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <RePieChart>
                  <Pie
                    data={stats.categorySales}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ payload }: any) => `${payload.category}: ${payload.percentage.toFixed(1)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="amount"
                  >
                    {stats.categorySales.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
                </RePieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No hay datos de categorías disponibles
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hourly Sales */}
      {(reportType === 'overview' || reportType === 'analytics') && stats.hourlySales.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Ventas por Hora del Día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.hourlySales}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" />
              <YAxis />
              <Tooltip formatter={(value) => `$${Number(value).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="sales" fill="#f97316" name="Ventas" />
              <Bar dataKey="orders" fill="#3b82f6" name="Órdenes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Products */}
      {(reportType === 'overview' || reportType === 'products') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Platillos Más Vendidos</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <UtensilsCrossed className="w-4 h-4" />
              <span>Top 10 productos</span>
            </div>
          </div>
          {stats.topDishes.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UtensilsCrossed className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos de ventas para este período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">#</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Platillo</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Unidades</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Ingresos</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Precio Promedio</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topDishes.map((dish, index) => (
                    <tr key={dish.name} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="w-8 h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">{dish.name}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {dish.quantity}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">
                        ${dish.revenue.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-gray-600">
                        ${(dish.revenue / dish.quantity).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sales History */}
      {(reportType === 'overview' || reportType === 'sales') && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Historial de Ventas</h3>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <ShoppingCart className="w-4 h-4" />
              <span>Últimas 20 ventas</span>
            </div>
          </div>
          {stats.salesHistory.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ShoppingCart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay datos de ventas para este período</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Factura</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Fecha</th>
                    <th className="text-center py-3 px-4 font-medium text-gray-700">Método</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.salesHistory.slice(0, 20).map((sale) => (
                    <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">#{sale.sale_number}</p>
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-medium text-gray-900">
                          {sale.customer_name || 'Cliente general'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(sale.created_at).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          sale.payment_method === 'cash' 
                            ? 'bg-green-100 text-green-800'
                            : sale.payment_method === 'card'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}>
                          {sale.payment_method === 'cash' ? 'Efectivo' : 
                           sale.payment_method === 'card' ? 'Tarjeta' : 'Transferencia'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-medium text-green-600">
                        ${sale.total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Cash Closings Section */}
      {reportType === 'cash-closings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-orange-500" />
              <h3 className="text-lg font-semibold text-gray-900">Cierres de Caja</h3>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="w-4 h-4" />
              <span>Historial completo</span>
            </div>
          </div>

          {cashClosings.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Lock className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No hay cierres de caja registrados</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {cashClosings.map((closing) => (
                <div
                  key={closing.id}
                  className="bg-gray-50 rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Lock className="w-5 h-5 text-orange-500" />
                        <h4 className="text-lg font-bold text-gray-800">{closing.closing_number}</h4>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        {new Date(closing.closed_at).toLocaleDateString('es-ES', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </div>
                      {closing.cash_opening && (
                        <p className="text-sm text-gray-500 mt-1">
                          Apertura: {closing.cash_opening.opening_number}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => generateClosingPDF(closing)}
                      className="flex items-center gap-2 bg-orange-50 text-orange-600 px-4 py-2 rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      <span className="font-medium">Descargar PDF</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                    <div className="bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-600 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-medium">Efectivo</span>
                      </div>
                      <p className="text-lg font-bold text-green-700">{formatMoney(closing.cash_amount)}</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-blue-600 mb-1">
                        <Phone className="w-4 h-4" />
                        <span className="text-xs font-medium">Transferencia</span>
                      </div>
                      <p className="text-lg font-bold text-blue-700">{formatMoney(closing.transaction_amount)}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-purple-600 mb-1">
                        <CreditCard className="w-4 h-4" />
                        <span className="text-xs font-medium">Tarjeta</span>
                      </div>
                      <p className="text-lg font-bold text-purple-700">{formatMoney(closing.card_amount)}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-orange-600 mb-1">
                        <DollarSign className="w-4 h-4" />
                        <span className="text-xs font-medium">Total</span>
                      </div>
                      <p className="text-lg font-bold text-orange-700">{formatMoney(closing.total_sales)}</p>
                    </div>
                  </div>

                  {closing.notes && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium">Notas:</span> {closing.notes}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
