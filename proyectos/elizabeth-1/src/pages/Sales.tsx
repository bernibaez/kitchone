import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { Sale } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Calendar,
  User,
  CreditCard,
  Banknote,
  Smartphone,
  Eye,
  Edit,
  Trash2,
  FileText,
  Filter,
  Download,
  X,
  CheckSquare,
  Square,
} from 'lucide-react';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { format, toZonedTime } from 'date-fns-tz';
import Invoice from '../components/Invoice/Invoice';
import SaleEditModal from '../components/Sales/SaleEditModal';

export default function Sales() {
  const { state, deleteSale, updateSale } = useApp();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [showDetails, setShowDetails] = useState<string | null>(null);
  const [selectedSales, setSelectedSales] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);

  const filteredSales = state.sales.filter(sale => {
    const matchesSearch = 
      (sale.invoiceNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (sale.customerName && sale.customerName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (sale.userName || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesPayment = !selectedPaymentMethod || (sale.paymentMethod || '').toLowerCase() === selectedPaymentMethod.toLowerCase();
    
    const matchesDate = !dateFilter || sale.date.toISOString().split('T')[0] === dateFilter;
    
    return matchesSearch && matchesPayment && matchesDate;
  });

  // Limpiar selección cuando cambien los filtros
  useEffect(() => {
    setSelectedSales(new Set());
    setSelectAll(false);
  }, [searchTerm, selectedPaymentMethod, dateFilter]);

  // Actualizar selectAll cuando cambie la selección
  useEffect(() => {
    setSelectAll(selectedSales.size > 0 && selectedSales.size === filteredSales.length);
  }, [selectedSales, filteredSales.length]);

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta venta?')) {
      await deleteSale(id);
    }
  };

  const handleEditSale = (sale: Sale) => {
    setEditingSale(sale);
    setShowEditModal(true);
  };

  const handleSaveSale = async (updatedSaleData: Partial<Sale>) => {
    if (!editingSale) return;
    
    try {
      await updateSale(editingSale.id, updatedSaleData);
      setShowEditModal(false);
      setEditingSale(null);
    } catch (error) {
      console.error('Error al actualizar venta:', error);
      throw error;
    }
  };

  const handleSelectSale = (saleId: string) => {
    const newSelected = new Set(selectedSales);
    if (newSelected.has(saleId)) {
      newSelected.delete(saleId);
    } else {
      newSelected.add(saleId);
    }
    setSelectedSales(newSelected);
    setSelectAll(newSelected.size === filteredSales.length);
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedSales(new Set());
      setSelectAll(false);
    } else {
      setSelectedSales(new Set(filteredSales.map(sale => sale.id)));
      setSelectAll(true);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSales.size === 0) return;
    
    const confirmMessage = selectedSales.size === 1 
      ? '¿Estás seguro de que quieres eliminar esta venta?' 
      : `¿Estás seguro de que quieres eliminar ${selectedSales.size} ventas?`;
    
    if (confirm(confirmMessage)) {
      const deletePromises = Array.from(selectedSales).map(id => deleteSale(id));
      await Promise.all(deletePromises);
      setSelectedSales(new Set());
      setSelectAll(false);
    }
  };

  const handleExportSelected = () => {
    if (selectedSales.size === 0) return;
    
    const selectedSalesData = filteredSales.filter(sale => selectedSales.has(sale.id));
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Reporte de Ventas Seleccionadas', 14, 18);
    doc.setFontSize(12);
    doc.text(`Total de ventas: ${selectedSalesData.length}`, 14, 30);
    
    const tableData = selectedSalesData.map(sale => [
      sale.invoiceNumber,
      sale.customerName || 'Cliente General',
      sale.userName,
      sale.date instanceof Date ? sale.date.toLocaleDateString('es-DO') : new Date(sale.date).toLocaleDateString('es-DO'),
      formatCurrency(sale.total),
      formatCurrency(sale.totalProfit),
      sale.paymentMethod
    ]);
    
    (doc as any).autoTable({
      head: [['Factura', 'Cliente', 'Vendedor', 'Fecha', 'Total', 'Ganancia', 'Método']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    
    doc.save(`Ventas-Seleccionadas-${new Date().toLocaleDateString('es-DO')}.pdf`);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedPaymentMethod('');
    setDateFilter('');
  };

  const generateInvoicePDF = (sale: Sale) => {
    const doc = new jsPDF();
    
    // Logo
    if (state.config.logo) {
      // Ajusta el tamaño y posición del logo según necesidad
      doc.addImage(state.config.logo, 'PNG', 150, 10, 40, 20);
    }

    // Header
    doc.setFontSize(20);
    doc.text(state.config.name, 20, 30);
    doc.setFontSize(12);
    doc.text(`${state.config.address || ''}`, 20, 40);
    doc.text(`Tel: ${state.config.phone || ''}`, 20, 50);
    doc.text(`Email: ${state.config.email || ''}`, 20, 60);

    // Redes sociales
    if (state.config.socials) {
      let y = 70;
      const redes = Object.entries(state.config.socials).filter(([k, v]) => v);
      if (redes.length > 0) {
        doc.text('Redes:', 20, y);
        redes.forEach(([key, value]) => {
          y += 7;
          doc.text(`${key.charAt(0).toUpperCase() + key.slice(1)}: ${value}`, 20, y);
        });
      }
    }

    // Invoice details
    doc.setFontSize(16);
    doc.text('FACTURA', 150, 30);
    doc.setFontSize(12);
    doc.text(`Número: ${sale.invoiceNumber}`, 150, 40);
    doc.text(`Fecha: ${sale.date.toLocaleDateString('es-DO')}`, 150, 50);
    doc.text(`Vendedor: ${sale.userName}`, 150, 60);

    // Customer info
    if (sale.customerName) {
      doc.text('CLIENTE:', 20, 90);
      doc.text(sale.customerName, 20, 100);
      const customer = state.customers.find(c => c.id === sale.customerId);
      if (customer) {
        doc.text(`Tel: ${customer.phone}`, 20, 110);
        if (customer.email) doc.text(`Email: ${customer.email}`, 20, 120);
        if (customer.address) doc.text(`Dir: ${customer.address}`, 20, 130);
      }
    }

    // Items table
    const tableData = sale.items.map(item => [
      item.productName,
      item.quantity.toString(),
      formatCurrency(item.price),
      formatCurrency(item.subtotal)
    ]);

    (doc as any).autoTable({
      head: [['Producto', 'Cant.', 'Precio', 'Subtotal']],
      body: tableData,
      startY: sale.customerName ? 140 : 90,
      theme: 'grid',
      styles: { fontSize: 10 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.text(`Subtotal: ${formatCurrency(sale.subtotal)}`, 150, finalY);
    if (sale.discount > 0) {
      doc.text(`Descuento: -${formatCurrency(sale.discount)}`, 150, finalY + 10);
    }
    doc.text(`IVA (${state.config.taxRate}%): ${formatCurrency(sale.tax)}`, 150, finalY + (sale.discount > 0 ? 20 : 10));
    doc.setFontSize(14);
    doc.text(`TOTAL: ${formatCurrency(sale.total)}`, 150, finalY + (sale.discount > 0 ? 30 : 20));

    // Payment method
    doc.setFontSize(12);
    const paymentMethods = {
      efectivo: 'Efectivo',
      tarjeta: 'Tarjeta',
      transferencia: 'Transferencia',
      cheque: 'Cheque'
    };
    doc.text(`Método de pago: ${paymentMethods[sale.paymentMethod]}`, 20, finalY + 40);

    // Mensaje personalizado
    if (state.config.message) {
      doc.setFontSize(11);
      doc.text(state.config.message, 20, finalY + 55, { maxWidth: 170 });
    }

    doc.save(`Factura-${sale.invoiceNumber}.pdf`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP',
    }).format(amount);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'efectivo': return <Banknote className="h-4 w-4" />;
      case 'tarjeta': return <CreditCard className="h-4 w-4" />;
      case 'transferencia': return <Smartphone className="h-4 w-4" />;
      default: return <CreditCard className="h-4 w-4" />;
    }
  };

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'efectivo': return 'Efectivo';
      case 'tarjeta': return 'Tarjeta';
      case 'transferencia': return 'Transferencia';
      default: return method;
    }
  };

  const totalSales = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
  const totalProfit = filteredSales.reduce((sum, sale) => sum + sale.totalProfit, 0);

  function getZonedDate(date: Date | string) {
    // Ahora que la base de datos guarda en hora local, solo necesitamos crear un objeto Date
    if (typeof date === 'string') {
      return new Date(date);
    }
    if (date instanceof Date) {
      return date;
    }
    return new Date();
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial de Ventas</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestiona y revisa todas las ventas realizadas
          </p>
        </div>
        <div className="flex items-center space-x-4 text-sm">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Total Ventas</p>
            <span className="inline-block bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-lg">{formatCurrency(totalSales)}</span>
          </div>
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400">Ganancias</p>
            <span className="inline-block bg-green-100 text-green-700 font-bold px-3 py-1 rounded-full text-lg">{formatCurrency(totalProfit)}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por factura, cliente o vendedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <select
          value={selectedPaymentMethod}
          onChange={(e) => setSelectedPaymentMethod(e.target.value)}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">Todos los métodos</option>
          <option value="efectivo">Efectivo</option>
          <option value="tarjeta">Tarjeta</option>
          <option value="transferencia">Transferencia</option>
        </select>

        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <div className="flex gap-2">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 flex items-center gap-2"
          >
            <X className="h-4 w-4" />
            Limpiar
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedSales.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {selectedSales.size} venta{selectedSales.size !== 1 ? 's' : ''} seleccionada{selectedSales.size !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setSelectedSales(new Set())}
              className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
            >
              Deseleccionar todo
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportSelected}
              className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar seleccionadas
            </button>
            <button
              onClick={handleDeleteSelected}
              className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Eliminar seleccionadas
            </button>
          </div>
        </div>
      )}

      {/* Sales Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left">
                  <div className="flex items-center">
                    <button
                      onClick={handleSelectAll}
                      className="flex items-center justify-center w-4 h-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      {selectAll ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Factura
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Vendedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Método de Pago
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredSales.map((sale, idx) => (
                <tr key={sale.id} className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/30 hover:bg-blue-50 dark:hover:bg-blue-900/30' : 'hover:bg-blue-50 dark:hover:bg-blue-900/30'}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleSelectSale(sale.id)}
                      className="flex items-center justify-center w-4 h-4 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200"
                    >
                      {selectedSales.has(sale.id) ? (
                        <CheckSquare className="h-4 w-4" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-black dark:text-white">{sale.invoiceNumber}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{Array.isArray(sale.items) ? sale.items.length : 0} artículo{Array.isArray(sale.items) && sale.items.length !== 1 ? 's' : ''}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900 mr-2">
                        <User className="h-4 w-4 text-blue-600 dark:text-blue-300" />
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">{sale.customerName || 'Cliente General'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{
                      sale.date
                        ? format(
                            getZonedDate(sale.date),
                            "dd 'de' MMMM yyyy, HH:mm"
                          )
                        : ''
                    }</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900 dark:text-white">{sale.userName}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 dark:bg-green-900">
                        {getPaymentMethodIcon(sale.paymentMethod)}
                      </span>
                      <span className="text-sm text-gray-900 dark:text-white">{getPaymentMethodText(sale.paymentMethod)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-block bg-gray-100 text-black font-bold px-2 py-1 rounded-full">{formatCurrency(sale.total)}</span>
                    <div className="text-xs text-green-600">+{formatCurrency(sale.totalProfit)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleEditSale(sale)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 text-yellow-600 dark:text-yellow-300"
                        title="Editar venta"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setShowDetails(sale.id)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900 dark:hover:bg-blue-800 text-blue-600 dark:text-blue-300"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => generateInvoicePDF(sale)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 text-green-600 dark:text-green-300"
                        title="Descargar factura"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(sale.id)}
                        className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-600 dark:text-red-300"
                        title="Eliminar venta"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSales.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay ventas</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              No se encontraron ventas con los filtros aplicados.
            </p>
          </div>
        )}
      </div>

      {/* Sale Details Modal */}
      {showDetails && (() => {
        const sale = state.sales.find(s => s.id === showDetails);
        if (!sale) return null;
        const client = state.customers.find(c => String(c.id) === String(sale.customerId));
        const company = {
          name: state.config.name,
          email: state.config.email || '',
          phone: state.config.phone || '',
          address: state.config.address || '',
          logo: state.config.logo || '',
          socials: state.config.socials || {},
          message: state.config.message || ''
        };
        const items = (sale.items || []).map((item: any) => ({
          name: item.productName || item.product_name || '',
          qty: item.quantity,
          price: item.price || item.unit_price,
          total: item.subtotal || item.total
        }));
        const invoiceData = {
          number: sale.invoiceNumber,
          client: {
            name: client?.name || '',
            email: client?.email || '',
            phone: client?.phone || '',
            address: client?.address || ''
          },
          company,
          items,
          ivaPercent: state.config.taxRate || 0,
          ivaAmount: sale.tax,
          total: sale.total,
          payment: {
            bank: 'Banco Borcelle',
            name: company.name
          },
          date: sale.date instanceof Date ? sale.date.toISOString() : String(sale.date)
        };
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[95vh] overflow-y-auto p-6">
              <div className="flex justify-end mb-2">
                <button
                  onClick={() => setShowDetails(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                >
                  ×
                </button>
              </div>
              <Invoice invoiceData={invoiceData} />
              <div className="flex justify-end mt-4 gap-2">
                <button
                  onClick={() => window.print()}
                  className="bg-gray-700 hover:bg-gray-900 text-white px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Imprimir
                </button>
                <button
                  onClick={() => setShowDetails(null)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 px-6 py-2 rounded-lg font-semibold transition-colors"
                >
                  Salir
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Sale Edit Modal */}
      <SaleEditModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingSale(null);
        }}
        sale={editingSale}
        onSave={handleSaveSale}
      />
    </div>
  );
}