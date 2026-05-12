import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';
import { 
  Download, 
  Calendar as CalendarIcon,
  TrendingUp,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  ArrowUp,
  ArrowDown,
  Filter,
  FileText,
  Table,
  BarChart3,
  PieChart as PieChartIcon,
  Activity,
  Target,
  Zap,
  Award,
  Clock,
  Calculator,
  Percent,
  Wallet
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  warning: '#f97316',
  danger: '#ef4444',
  info: '#8b5cf6',
  secondary: '#6b7280'
};

const CHART_COLORS = ['#3b82f6', '#10b981', '#f97316', '#8b5cf6', '#ec4899', '#f59e0b', '#14b8a6', '#6366f1'];

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);
}

function formatNumber(num: number) {
  return new Intl.NumberFormat('es-DO').format(num);
}

// Componentes de UI mejorados
const MetricCard = ({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  color = 'blue',
  trend = 'up'
}: {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<any>;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  trend?: 'up' | 'down';
}) => {
  const colorConfig = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', iconBg: 'bg-blue-100' },
    green: { bg: 'bg-green-50', text: 'text-green-600', iconBg: 'bg-green-100' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', iconBg: 'bg-orange-100' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', iconBg: 'bg-purple-100' },
    red: { bg: 'bg-red-50', text: 'text-red-600', iconBg: 'bg-red-100' }
  };

  const config = colorConfig[color];

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${
              trend === 'up' && change > 0 ? 'text-green-600' : 
              trend === 'down' && change < 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? <ArrowUp className="h-3 w-3 mr-1" /> : <ArrowDown className="h-3 w-3 mr-1" />}
              {Math.abs(change)}%
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${config.iconBg}`}>
          <Icon className={`h-6 w-6 ${config.text}`} />
        </div>
      </div>
    </div>
  );
};

const ChartCard = ({ 
  title, 
  children, 
  icon: Icon,
  action
}: {
  title: string;
  children: React.ReactNode;
  icon?: React.ComponentType<any>;
  action?: React.ReactNode;
}) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          {Icon && (
            <div className="p-2 bg-blue-50 rounded-lg">
              <Icon className="h-5 w-5 text-blue-600" />
            </div>
          )}
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
};

const StatCard = ({ title, value, variant = 'green' }: { title: string; value: string | number; variant?: 'green' | 'blue' | 'orange' | 'teal' }) => {
  const variantClasses = {
    green: 'from-green-500 to-green-600',
    blue: 'from-blue-500 to-blue-600',
    orange: 'from-orange-500 to-orange-600',
    teal: 'from-teal-500 to-teal-600',
  };
  
  return (
    <div className={`rounded-2xl bg-gradient-to-br ${variantClasses[variant]} p-6 text-white shadow-lg`}>
      <p className="text-sm font-medium uppercase tracking-wider">{title}</p>
      <p className="mt-2 text-4xl font-bold">{value}</p>
    </div>
  );
};

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {cx: number, cy: number, midAngle: number, innerRadius: number, outerRadius: number, percent: number}) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={12}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const KPI_COLORS = ['bg-green-500', 'bg-blue-500', 'bg-orange-500', 'bg-teal-500'];

export default function Reports() {
  const { state } = useApp();
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'sales' | 'products' | 'customers'>('overview');
  
  // Financial calculation states
  const [withdrawalPercentage, setWithdrawalPercentage] = useState<string>('');
  const [financialResults, setFinancialResults] = useState<{
    totalRevenue: number;
    totalCosts: number;
    grossProfit: number;
    appliedPercentage: number;
    reinvestmentAmount: number;
    netProfit: number;
  } | null>(null);
  const [showFinancialResults, setShowFinancialResults] = useState(false);

  const filteredSales = useMemo(() => {
    if (!startDate && !endDate) return state.sales;
    return state.sales.filter(sale => {
      const saleDate = sale.date instanceof Date ? sale.date : new Date(sale.date);
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      if (start && saleDate < start) return false;
      if (end) {
        end.setHours(23,59,59,999);
        if (saleDate > end) return false;
      }
      return true;
    });
  }, [state.sales, startDate, endDate]);

  // Calculate financial data
  const calculateFinancials = () => {
    const percentage = parseFloat(withdrawalPercentage);
    
    // Validate percentage
    if (isNaN(percentage) || percentage < 0 || percentage > 100) {
      alert('Por favor ingrese un porcentaje válido entre 0 y 100');
      return;
    }

    // Calculate totals from filtered sales
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    
    // Calculate total costs (sum of cost of goods sold)
    const totalCosts = filteredSales.reduce((sum, sale) => {
      const saleCost = sale.items?.reduce((itemSum: number, item: any) => {
        const product = state.products.find(p => p.id === item.productId);
        if (product) {
          return itemSum + (Number(product.cost) || 0) * (Number(item.quantity) || 0);
        }
        return itemSum;
      }, 0) || 0;
      return sum + saleCost;
    }, 0);

    const grossProfit = totalRevenue - totalCosts;
    const reinvestmentAmount = grossProfit * (percentage / 100);
    const netProfit = grossProfit - reinvestmentAmount;

    setFinancialResults({
      totalRevenue,
      totalCosts,
      grossProfit,
      appliedPercentage: percentage,
      reinvestmentAmount,
      netProfit
    });
    setShowFinancialResults(true);
  };

  // Download financial PDF
  const downloadFinancialPDF = () => {
    if (!financialResults) return;
    
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Resumen Financiero', 14, 18);
    doc.setFontSize(12);
    
    let y = 30;
    
    // Add date range if filtered
    if (startDate || endDate) {
      doc.text(`Período: ${startDate || '...'} - ${endDate || '...'}`, 14, y);
      y += 15;
    }
    
    // Financial summary
    const summaryData = [
      ['Concepto', 'Monto'],
      ['Total Ventas', formatCurrency(financialResults.totalRevenue)],
      ['Total Costos', formatCurrency(financialResults.totalCosts)],
      ['Ganancia Bruta', formatCurrency(financialResults.grossProfit)],
      ['Porcentaje Aplicado', `${financialResults.appliedPercentage}%`],
      ['Monto para Reinversión', formatCurrency(financialResults.reinvestmentAmount)],
      ['Ganancia Neta Final', formatCurrency(financialResults.netProfit)]
    ];
    
    autoTable(doc, {
      head: [summaryData[0]],
      body: summaryData.slice(1),
      startY: y,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
      columnStyles: {
        0: { cellWidth: 80 },
        1: { cellWidth: 60, halign: 'right' }
      }
    });
    
    doc.save(`Resumen-Financiero-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const reportData = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0);
    const totalProfit = filteredSales.reduce((sum, sale) => sum + (Number(sale.totalProfit) || 0), 0);
    const salesByProduct = filteredSales.flatMap(s => s.items).reduce((acc, item) => {
      const name = item.productName || 'Desconocido';
      acc[name] = (acc[name] || 0) + (Number(item.quantity) || 0);
      return acc;
    }, {} as Record<string, number>);
    const salesByProductArr = Object.entries(salesByProduct)
      .map(([name, value]) => ({ name: String(name), value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    
    const salesBySalesperson = filteredSales.reduce((acc, sale) => {
      acc[sale.userName] = (acc[sale.userName] || 0) + sale.total;
      return acc;
    }, {} as Record<string, number>);
    
    const salesOverTimeAggregated = filteredSales.reduce((acc, {date, total}) => {
      const dayIndex = new Date(date).getDay();
      const weekDays = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      const dayName = weekDays[dayIndex];
      acc[dayName] = (acc[dayName] || 0) + total;
      return acc;
    }, {} as Record<string, number>);

    const weekDaysOrder = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    const salesOverTime = weekDaysOrder.map(day => ({ date: day, sales: salesOverTimeAggregated[day] || 0 }));
    
    // Calcular tendencias
    const previousPeriodRevenue = totalRevenue * 0.85; // Simulación
    const revenueChange = ((totalRevenue - previousPeriodRevenue) / previousPeriodRevenue) * 100;
    
    return {
      totalRevenue,
      totalProfit,
      totalSales: filteredSales.length,
      avgOrderValue: filteredSales.length > 0 ? totalRevenue / filteredSales.length : 0,
      salesByProduct: salesByProductArr,
      salesBySalesperson: Object.entries(salesBySalesperson).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value),
      salesOverTime,
      revenueChange
    };
  }, [filteredSales, state.products]);

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Ventas', 14, 18);
    doc.setFontSize(12);
    let y = 30;
    if (startDate || endDate) {
      doc.text(`Filtrado por fecha: ${startDate || '...'} - ${endDate || '...'} `, 14, y);
      y += 10;
    }
    const tableData = filteredSales.map(sale => [
      sale.invoiceNumber,
      sale.customerName || 'Cliente General',
      sale.userName,
      sale.date instanceof Date ? sale.date.toLocaleDateString('es-DO') : new Date(sale.date).toLocaleDateString('es-DO'),
      formatCurrency(sale.total),
      formatCurrency(sale.totalProfit),
      sale.paymentMethod
    ]);
    autoTable(doc, {
      head: [['Factura', 'Cliente', 'Vendedor', 'Fecha', 'Total', 'Ganancia', 'Método']],
      body: tableData,
      startY: y,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save('Reporte-Ventas.pdf');
  };

  const downloadExcel = () => {
    const wsData = [
      ['Factura', 'Cliente', 'Vendedor', 'Fecha', 'Total', 'Ganancia', 'Método'],
      ...filteredSales.map(sale => [
        sale.invoiceNumber,
        sale.customerName || 'Cliente General',
        sale.userName,
        sale.date instanceof Date ? sale.date.toLocaleDateString('es-DO') : new Date(sale.date).toLocaleDateString('es-DO'),
        sale.total,
        sale.totalProfit,
        sale.paymentMethod
      ])
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    XLSX.writeFile(wb, 'Reporte-Ventas.xlsx');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <BarChart3 className="h-8 w-8 text-blue-600" />
                Reportes
              </h1>
              <p className="text-gray-600 mt-1">Análisis detallado del rendimiento de ventas</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2 shadow-sm">
                <CalendarIcon className="h-4 w-4 text-gray-500" />
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="bg-transparent outline-none text-sm text-gray-700"
                  placeholder="Fecha inicio"
                />
                <span className="text-gray-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="bg-transparent outline-none text-sm text-gray-700"
                  placeholder="Fecha fin"
                />
                {(startDate || endDate) && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); }} 
                    className="ml-2 text-xs text-red-500 hover:text-red-700"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <button 
                onClick={downloadPDF} 
                className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
              <button 
                onClick={downloadExcel} 
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                Excel
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-1 bg-white rounded-lg p-1 shadow-sm">
            {[
              { id: 'overview', label: 'Vista General', icon: Activity },
              { id: 'sales', label: 'Ventas', icon: ShoppingCart },
              { id: 'products', label: 'Productos', icon: Package },
              { id: 'customers', label: 'Clientes', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-50 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-sm font-medium">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Ingresos Totales"
            value={formatCurrency(reportData.totalRevenue)}
            change={reportData.revenueChange}
            icon={DollarSign}
            color="blue"
            trend={reportData.revenueChange > 0 ? 'up' : 'down'}
          />
          <MetricCard
            title="Ganancia Neta"
            value={formatCurrency(Number(reportData.totalProfit) || 0)}
            icon={TrendingUp}
            color="green"
          />
          <MetricCard
            title="Total de Ventas"
            value={formatNumber(reportData.totalSales)}
            icon={ShoppingCart}
            color="orange"
          />
          <MetricCard
            title="Ticket Promedio"
            value={formatCurrency(reportData.avgOrderValue)}
            icon={Target}
            color="purple"
          />
        </div>

        {/* Charts Grid */}
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              <ChartCard title="Ventas por Día de la Semana" icon={Activity}>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reportData.salesOverTime}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      formatter={(value: number) => formatCurrency(value)}
                      contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    />
                    <Bar dataKey="sales" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Productos Más Vendidos" icon={Package}>
                <div className="space-y-3">
                  {reportData.salesByProduct.slice(0, 8).map((product, index) => {
                    const productDetails = state.products.find(p => p.name === product.name);
                    const percentage = reportData.salesByProduct.length > 0 
                      ? (product.value / reportData.salesByProduct.reduce((sum, p) => sum + p.value, 0)) * 100 
                      : 0;
                    
                    return (
                      <div key={product.name} className="flex items-center space-x-4 p-3 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:shadow-md transition-all duration-200">
                        {/* Rank Badge */}
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-400' :
                          index === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-700' :
                          'bg-gradient-to-br from-blue-400 to-blue-500'
                        }`}>
                          {index + 1}
                        </div>
                        
                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <h4 className="font-semibold text-gray-900 truncate pr-2">{product.name}</h4>
                            <span className="text-lg font-bold text-emerald-600">{product.value}</span>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="flex items-center space-x-3">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div 
                                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                            <span className="text-xs text-gray-500 font-medium min-w-12 text-right">
                              {percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        
                        {/* Product Details */}
                        {productDetails && (
                          <div className="flex-shrink-0 text-right">
                            <p className="text-xs text-gray-500">Precio</p>
                            <p className="text-sm font-semibold text-gray-900">{formatCurrency(productDetails.price)}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  
                  {/* Show More Indicator */}
                  {reportData.salesByProduct.length > 8 && (
                    <div className="text-center pt-2">
                      <button className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center space-x-1 mx-auto">
                        <span>Ver {reportData.salesByProduct.length - 8} productos más</span>
                        <Package className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              </ChartCard>
            </div>

            {/* Financial Calculation Section */}
            <div className="bg-gradient-to-br from-slate-50 via-white to-blue-50 rounded-3xl shadow-xl border border-slate-200 p-8 mb-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg">
                    <Calculator className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
                      Cálculo Financiero
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">Analiza tu rentabilidad y planifica reinversiones</p>
                  </div>
                </div>
                {showFinancialResults && (
                  <button
                    onClick={downloadFinancialPDF}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 text-sm font-semibold"
                  >
                    <Download className="h-4 w-4" />
                    Descargar PDF
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Input Section */}
                <div className="lg:col-span-4">
                  <div className="bg-white rounded-2xl shadow-md border border-slate-200 p-6">
                    <div className="mb-6">
                      <label className="block text-sm font-semibold text-slate-700 mb-3 flex items-center">
                        <div className="p-2 bg-violet-100 rounded-lg mr-2">
                          <Percent className="h-4 w-4 text-violet-600" />
                        </div>
                        Porcentaje a Retirar
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={withdrawalPercentage}
                          onChange={(e) => setWithdrawalPercentage(e.target.value)}
                          className="w-full px-4 py-4 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-lg font-semibold transition-all duration-200"
                          placeholder="Ej: 20.5"
                        />
                        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 text-slate-400 font-semibold">
                          %
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 flex items-center">
                        <div className="w-1 h-1 bg-emerald-500 rounded-full mr-2"></div>
                        Ingrese un valor entre 0 y 100
                      </p>
                    </div>
                    
                    <button
                      onClick={calculateFinancials}
                      className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white px-6 py-4 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center space-x-3 font-semibold"
                    >
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Wallet className="h-5 w-5" />
                      </div>
                      <span>Sacar Porcentaje</span>
                    </button>

                    {/* Quick Percentage Buttons */}
                    <div className="mt-6 pt-6 border-t border-slate-200">
                      <p className="text-xs font-semibold text-slate-600 mb-3">Porcentajes rápidos:</p>
                      <div className="grid grid-cols-3 gap-2">
                        {[10, 20, 30, 40, 50, 75].map((percent) => (
                          <button
                            key={percent}
                            onClick={() => setWithdrawalPercentage(percent.toString())}
                            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                          >
                            {percent}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Results Section */}
                {showFinancialResults && financialResults && (
                  <div className="lg:col-span-8">
                    <div className="space-y-6">
                      {/* Main Metrics Grid */}
                      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                              <DollarSign className="h-5 w-5" />
                            </div>
                            <div className="bg-white/20 px-2 py-1 rounded-lg text-xs font-semibold">
                              Ventas
                            </div>
                          </div>
                          <p className="text-2xl font-bold">{formatCurrency(financialResults.totalRevenue)}</p>
                        </div>

                        <div className="bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl p-5 text-white shadow-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                              <TrendingUp className="h-5 w-5 rotate-180" />
                            </div>
                            <div className="bg-white/20 px-2 py-1 rounded-lg text-xs font-semibold">
                              Costos
                            </div>
                          </div>
                          <p className="text-2xl font-bold">{formatCurrency(financialResults.totalCosts)}</p>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-5 text-white shadow-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                              <TrendingUp className="h-5 w-5" />
                            </div>
                            <div className="bg-white/20 px-2 py-1 rounded-lg text-xs font-semibold">
                              Bruta
                            </div>
                          </div>
                          <p className="text-2xl font-bold">{formatCurrency(financialResults.grossProfit)}</p>
                        </div>

                        <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                              <Percent className="h-5 w-5" />
                            </div>
                            <div className="bg-white/20 px-2 py-1 rounded-lg text-xs font-semibold">
                              Aplicado
                            </div>
                          </div>
                          <p className="text-2xl font-bold">{financialResults.appliedPercentage}%</p>
                        </div>

                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                              <Target className="h-5 w-5" />
                            </div>
                            <div className="bg-white/20 px-2 py-1 rounded-lg text-xs font-semibold">
                              Reinversión
                            </div>
                          </div>
                          <p className="text-2xl font-bold">{formatCurrency(financialResults.reinvestmentAmount)}</p>
                        </div>

                        <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-2xl p-5 text-white shadow-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="p-2 bg-white/20 rounded-xl">
                              <Wallet className="h-5 w-5" />
                            </div>
                            <div className="bg-white/20 px-2 py-1 rounded-lg text-xs font-semibold">
                              Neta
                            </div>
                          </div>
                          <p className="text-2xl font-bold">{formatCurrency(financialResults.netProfit)}</p>
                        </div>
                      </div>

                      {/* Summary Box */}
                      <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 rounded-2xl p-6 border-2 border-emerald-200 shadow-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="text-lg font-bold text-slate-800 mb-3 flex items-center">
                              <div className="p-2 bg-emerald-500 rounded-lg mr-3">
                                <Calculator className="h-5 w-5 text-white" />
                              </div>
                              Resumen Financiero
                            </h4>
                            <div className="space-y-2">
                              <p className="text-slate-700">
                                <span className="font-semibold text-emerald-600">{financialResults.appliedPercentage}%</span> de la ganancia bruta 
                                (<span className="font-semibold">{formatCurrency(financialResults.grossProfit)}</span>) 
                                se destina a reinversión
                              </p>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center">
                                  <div className="w-3 h-3 bg-amber-500 rounded-full mr-2"></div>
                                  <span className="text-sm">Reinversión: <strong>{formatCurrency(financialResults.reinvestmentAmount)}</strong></span>
                                </div>
                                <div className="flex items-center">
                                  <div className="w-3 h-3 bg-cyan-500 rounded-full mr-2"></div>
                                  <span className="text-sm">Ganancia neta: <strong>{formatCurrency(financialResults.netProfit)}</strong></span>
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="text-center ml-6">
                            <div className="bg-white rounded-2xl p-4 shadow-md">
                              <p className="text-sm text-slate-600 mb-1">Retorno Efectivo</p>
                              <p className="text-3xl font-bold text-emerald-600">
                                {((financialResults.netProfit / financialResults.grossProfit) * 100).toFixed(1)}%
                              </p>
                              <div className="mt-2 h-2 bg-slate-200 rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full transition-all duration-500"
                                  style={{ width: `${(financialResults.netProfit / financialResults.grossProfit) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'sales' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Historial de Ventas</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Factura</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Cliente</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Vendedor</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Fecha</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Total</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-gray-700">Ganancia</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-gray-700">Método</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSales.slice(0, 10).map((sale, index) => (
                    <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 text-sm">{sale.invoiceNumber}</td>
                      <td className="py-3 px-4 text-sm">{sale.customerName || 'Cliente General'}</td>
                      <td className="py-3 px-4 text-sm">{sale.userName}</td>
                      <td className="py-3 px-4 text-sm">
                        {sale.date instanceof Date ? sale.date.toLocaleDateString('es-DO') : new Date(sale.date).toLocaleDateString('es-DO')}
                      </td>
                      <td className="py-3 px-4 text-sm text-right font-medium">{formatCurrency(sale.total)}</td>
                      <td className="py-3 px-4 text-sm text-right text-green-600">{formatCurrency(sale.totalProfit)}</td>
                      <td className="py-3 px-4 text-sm">
                        <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                          {sale.paymentMethod}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartCard title="Top 10 Productos Más Vendidos" icon={Package}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={reportData.salesByProduct} margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-45} textAnchor="end" height={80} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value) => `${value} unidades`}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill={COLORS.success} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Rendimiento por Vendedor" icon={Users}>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={reportData.salesBySalesperson} margin={{ left: 40, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                  />
                  <Bar dataKey="value" fill={COLORS.info} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}

        {activeTab === 'customers' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Análisis de Clientes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-xl">
                <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{state.customers.length}</p>
                <p className="text-sm text-gray-600">Total Clientes</p>
              </div>
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <ShoppingCart className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{reportData.totalSales}</p>
                <p className="text-sm text-gray-600">Ventas Realizadas</p>
              </div>
              <div className="text-center p-6 bg-purple-50 rounded-xl">
                <Target className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(reportData.avgOrderValue)}</p>
                <p className="text-sm text-gray-600">Ticket Promedio</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}