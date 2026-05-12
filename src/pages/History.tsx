
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, X, Trash2, Pencil, FileText, Printer, Clock, MapPin, Utensils, ChefHat, ClipboardList } from 'lucide-react';
import { useConfig } from '../contexts/ConfigContext';
import { generateInvoicePDF } from '../lib/invoice';

interface HistoryItem {
  id: string;
  number: string;
  type: 'order' | 'sale';
  amount?: number;
  table?: string;
  status?: string;
  customer_name?: string | null;
  created_at: string;
}

interface OrderDetail {
  id: string;
  order_number: string;
  status: string;
  created_at: string;
  tables: { table_number: string };
  order_items: Array<{
    quantity: number;
    notes: string | null;
    dishes: { name: string; price: number };
  }>;
}

interface SaleDetail {
  id: string;
  sale_number: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  customer_name?: string | null;
  created_at: string;
  created_by?: string;
  sale_items: Array<{
    id?: string;
    dish_id: string;
    dish_name: string;
    quantity: number;
    price: number;
    subtotal: number;
    percentage: number;
  }>;
}

interface HistoryProps {
  onNavigate?: (page: string) => void;
}

export default function History({ onNavigate }: HistoryProps) {
  const { config } = useConfig();
  const [activeTab, setActiveTab] = useState<'orders' | 'sales'>('orders');
  const [ordersHistory, setOrdersHistory] = useState<HistoryItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'order' | 'sale'>('all');
  const [showDetail, setShowDetail] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<OrderDetail | SaleDetail | null>(null);
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
  const [editForm, setEditForm] = useState({ amount: 0, status: '' });
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [dateFilter, typeFilter]);

  useEffect(() => {
    return () => {
      if (invoiceUrl) URL.revokeObjectURL(invoiceUrl);
    };
  }, [invoiceUrl]);

  const loadHistory = async () => {
    try {
      const items: HistoryItem[] = [];

      // Always load orders
      let orderQuery = supabase
        .from('orders')
        .select('id, order_number, status, created_at, tables(table_number)')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        orderQuery = orderQuery.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
      }

      const { data: orders } = await orderQuery;

      const ordersItems: HistoryItem[] = [];
      if (orders) {
        (orders as any[]).forEach(order => {
          const hi: HistoryItem = {
            id: order.id,
            number: order.order_number,
            type: 'order',
            table: order.tables?.table_number,
            status: order.status,
            created_at: order.created_at,
          };
          items.push(hi);
          ordersItems.push(hi);
        });
      }

      // Always load sales
      let saleQuery = supabase
        .from('sales')
        .select('id, sale_number, total, customer_name, created_at')
        .order('created_at', { ascending: false });

      if (dateFilter) {
        const startOfDay = new Date(dateFilter);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(dateFilter);
        endOfDay.setHours(23, 59, 59, 999);
        saleQuery = saleQuery.gte('created_at', startOfDay.toISOString()).lte('created_at', endOfDay.toISOString());
      }

      const { data: sales } = await saleQuery;

      const salesItems: HistoryItem[] = [];
      if (sales) {
        (sales as any[]).forEach(sale => {
          const hi: HistoryItem = {
            id: sale.id,
            number: sale.sale_number,
            type: 'sale',
            amount: sale.total,
            customer_name: sale.customer_name,
            created_at: sale.created_at,
          };
          items.push(hi);
          salesItems.push(hi);
        });
      }

      items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      setOrdersHistory(ordersItems);
      setSalesHistory(salesItems);
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = async (item: HistoryItem) => {
    try {
      if (item.type === 'order') {
        const { data } = await supabase
          .from('orders')
          .select(`
  *,
  tables(table_number),
  order_items(
    quantity,
    notes,
    dishes(name, price)
  )
    `)
          .eq('id', item.id)
          .single();

        if (data) {
          setSelectedDetail(data);
          setShowDetail(true);
        }
      } else {
        const { data } = await supabase
          .from('sales')
          .select(`
  *,
  sale_items(
    dish_name,
    quantity,
    price,
    subtotal
  )
    `)
          .eq('id', item.id)
          .single();

        if (data) {
          setSelectedDetail(data);
          setShowDetail(true);
        }
      }
    } catch (error) {
      console.error('Error loading detail:', error);
    }
  };

  const openEditModal = async (item: HistoryItem) => {
    if (item.type === 'sale') {
      // Redirect to Sales page for full editing
      sessionStorage.setItem('edit_sale_id', item.id);
      if (onNavigate) {
        onNavigate('sales');
      }
      return;
    }

    setEditingItem(item);
    setEditForm({
      amount: item.amount || 0,
      status: item.status || 'pendiente'
    });
  };

  const handleSaveOrderEdit = async () => {
    if (!editingItem || editingItem.type !== 'order') return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: editForm.status } as any)
        .eq('id', editingItem.id);

      if (error) throw error;

      loadHistory();
      setEditingItem(null);
      alert('Orden actualizada correctamente');
    } catch (error) {
      console.error('Error updating order:', error);
      alert('Error al actualizar orden');
    }
  };





  const handleDeleteOrder = async (item: HistoryItem) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la orden ${item.number}?`)) {
      return;
    }

    try {
      const { error: itemsError } = await supabase
        .from('order_items')
        .delete()
        .eq('order_id', item.id);

      if (itemsError) throw itemsError;

      const { error: orderError } = await supabase
        .from('orders')
        .delete()
        .eq('id', item.id);

      if (orderError) throw orderError;

      loadHistory();
      alert('Orden eliminada correctamente');
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Error al eliminar orden');
    }
  };

  const handleDeleteSale = async (item: HistoryItem) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la venta ${item.number}?`)) {
      return;
    }

    try {
      await supabase
        .from('sales')
        .delete()
        .eq('id', item.id);
      loadHistory();
    } catch (error) {
      console.error('Error deleting sale:', error);
      alert('Error al eliminar venta');
    }
  };

  const handlePrintInvoice = async (item: HistoryItem) => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
  *,
  sale_items(
    dish_name,
    quantity,
    price,
    subtotal
  )
    `)
        .eq('id', item.id)
        .single();

      if (error) throw error;

      if (data) {
        const saleData = data as Record<string, unknown> & {
          sale_number: string;
          customer_name?: string | null;
          subtotal: number;
          tax_amount: number;
          total: number;
          created_at: string;
          payment_method?: string;
          money_received?: number;
          change?: number;
          sale_items: Array<{
            dish_name: string;
            quantity: number;
            price: number;
            subtotal: number;
          }>;
        };
        const subtotal = Number(saleData.subtotal);
        const taxAmt = Number(saleData.tax_amount);
        const invoiceData = {
          saleNumber: saleData.sale_number,
          customerName: saleData.customer_name || 'Cliente general',
          subtotal,
          tax: taxAmt,
          taxRatePercent: subtotal > 0 ? (taxAmt / subtotal) * 100 : 0,
          total: Number(saleData.total),
          items: saleData.sale_items.map((i) => ({
            name: i.dish_name,
            quantity: i.quantity,
            price: i.price,
            lineTotal: i.subtotal ?? i.price * i.quantity,
          })),
          date: new Date(saleData.created_at),
          paymentMethod: saleData.payment_method,
          moneyReceived:
            saleData.payment_method === 'cash'
              ? Number(saleData.money_received ?? 0)
              : Number(saleData.total),
          change: saleData.payment_method === 'cash' ? Number(saleData.change ?? 0) : 0,
          restaurantName: config?.restaurant_name,
          address: config?.address,
          phone: config?.phone,
          currency: config?.currency || 'DOP',
          invoiceFooter: config?.invoice_footer,
          purchaseMessage: config?.purchase_message,
          socialInstagram: config?.social_instagram,
          socialFacebook: config?.social_facebook,
          socialTwitter: config?.social_twitter,
          paperSize: config?.invoice_paper_size,
          fontSize: config?.invoice_font_size,
          fontFamily: config?.invoice_font_family,
          primaryColor: config?.invoice_primary_color,
          showSocial: config?.invoice_show_social,
          showCustomer: config?.invoice_show_customer,
          businessId: config?.business_id,
          template: config?.invoice_template,
          showQr: config?.invoice_show_qr,
        };
        const blob = await generateInvoicePDF(invoiceData);
        const url = URL.createObjectURL(blob);
        setInvoiceUrl(url);
      }
    } catch (error) {
      console.error('Error loading sale for print:', error);
      alert('Error al generar factura');
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pendiente': return 'Pendiente';
      case 'en_preparacion': return 'En Preparación';
      case 'terminado': return 'Terminado';
      case 'facturada': return 'Facturada';
      case 'entregado': return 'Entregado';
      default: return status;
    }
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
      <div className="flex flex-col sm:flex-row gap-4">
        <input
          type="date"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as 'all' | 'order' | 'sale')}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
        >
          <option value="all">Todos</option>
          <option value="order">Órdenes</option>
          <option value="sale">Ventas</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="flex gap-2 p-4 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              activeTab === 'orders' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Órdenes
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              activeTab === 'sales' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'
            }`}
          >
            Ventas
          </button>
        </div>
      </div>

      {activeTab === 'orders' && (
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Órdenes</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado / Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ordersHistory.map((item) => (
                <tr key={`${item.type} -${item.id} `} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <ClipboardList className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">Orden</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">#{item.number}</span>
                      <div className="flex items-center text-gray-500 text-xs mt-1">
                        <MapPin className="w-3 h-3 mr-1" />
                        Mesa {item.table}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${item.status === 'pendiente' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        item.status === 'en_preparacion' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          item.status === 'terminado' ? 'bg-green-50 text-green-700 border-green-200' :
                          item.status === 'facturada' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                      }`}>
                      {item.status === 'en_preparacion' && <ChefHat className="w-3 h-3 mr-1" />}
                      {item.status === 'pendiente' && <Clock className="w-3 h-3 mr-1" />}
                      {getStatusText(item.status!)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col text-sm text-gray-500">
                      <span className="font-medium text-gray-900">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => viewDetail(item)}
                        className="p-1 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar orden"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteOrder(item)}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar orden"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {activeTab === 'sales' && (
      <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Ventas</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Info
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado / Monto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {salesHistory.map((item) => (
                <tr key={`sale-${item.id}`} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                        <FileText className="w-5 h-5" />
                      </div>
                      <span className="font-medium text-gray-900">Venta</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-900">#{item.number}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-900">
                      {item.customer_name || 'Cliente general'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full inline-block border border-green-100">
                      ${item.amount?.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex flex-col text-sm text-gray-500">
                      <span className="font-medium text-gray-900">
                        {new Date(item.created_at).toLocaleDateString()}
                      </span>
                      <span className="text-xs">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => viewDetail(item)}
                        className="p-1 text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        title="Ver detalle"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar venta"
                      >
                        <Pencil className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handlePrintInvoice(item)}
                        className="p-1 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Imprimir factura"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSale(item)}
                        className="p-1 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar venta"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}
      {showDetail && selectedDetail && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                {'order_number' in selectedDetail ? 'Detalle de Orden' : 'Detalle de Venta'}
              </h3>
              <button onClick={() => setShowDetail(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {'order_number' in selectedDetail ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="bg-orange-100 p-2 rounded-full">
                      <MapPin className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Ubicación</p>
                      <p className="text-lg font-bold text-gray-900">Mesa {selectedDetail.tables.table_number}</p>
                    </div>
                  </div>

                  <div className="flex flex-col items-end">
                    <span className={`px - 3 py - 1 rounded - full text - xs font - bold border ${selectedDetail.status === 'pendiente' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        selectedDetail.status === 'en_preparacion' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          selectedDetail.status === 'terminado' ? 'bg-green-50 text-green-700 border-green-200' :
                            'bg-gray-100 text-gray-700 border-gray-200'
                      } `}>
                      {getStatusText(selectedDetail.status)}
                    </span>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(selectedDetail.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Utensils className="w-4 h-4 text-gray-400" />
                    <h4 className="font-bold text-gray-900 text-sm uppercase tracking-wide">Platillos Ordenados</h4>
                  </div>

                  <div className="grid gap-3">
                    {selectedDetail.order_items.map((item, index) => (
                      <div key={index} className="flex gap-4 p-4 bg-white border border-gray-100 rounded-xl shadow-sm hover:border-orange-200 transition-all">
                        <div className="flex-shrink-0 w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center font-bold text-lg">
                          {item.quantity}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <span className="font-semibold text-gray-900">{item.dishes.name}</span>
                            <span className="text-gray-500 font-medium">${item.dishes.price.toFixed(2)}</span>
                          </div>
                          {item.notes && (
                            <div className="mt-2 bg-yellow-50 text-yellow-800 text-sm px-3 py-2 rounded-lg border border-yellow-100">
                              <span className="font-semibold text-xs uppercase mr-1">Nota:</span>
                              {item.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Número</p>
                    <p className="font-medium">{selectedDetail.sale_number}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Fecha</p>
                    <p className="font-medium">{new Date(selectedDetail.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Items</h4>
                  <div className="space-y-2">
                    {selectedDetail.sale_items.map((item, index) => (
                      <div key={index} className="p-3 bg-gray-50 rounded-lg flex justify-between">
                        <span className="font-medium">{item.quantity}x {item.dish_name}</span>
                        <span className="text-gray-600">${item.subtotal.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-4 space-y-2">
                  <div className="flex justify-between text-gray-600">
                    <span>Subtotal:</span>
                    <span>${selectedDetail.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Impuestos:</span>
                    <span>${selectedDetail.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-bold text-gray-900">
                    <span>Total:</span>
                    <span>${selectedDetail.total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hidden iframe for printing */}
      <iframe
        id="history-print-frame"
        src={invoiceUrl || ''}
        className="fixed opacity-0 pointer-events-none w-0 h-0"
        title="print-frame"
        onLoad={() => {
          if (invoiceUrl) {
            const iframe = document.getElementById('history-print-frame') as HTMLIFrameElement;
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.print();
            }
          }
        }}
      />

      {editingItem && editingItem.type === 'order' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-sm w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Editar Orden
              </h3>
              <button onClick={() => setEditingItem(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-orange-500 focus:border-orange-500"
                >
                  <option value="pendiente">Pendiente</option>
                  <option value="en_preparacion">En Preparación</option>
                  <option value="terminado">Terminado</option>
                  <option value="entregado">Entregado</option>
                </select>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleSaveOrderEdit}
                  className="flex-1 bg-orange-600 text-white py-2 rounded-lg font-medium hover:bg-orange-700"
                >
                  Guardar
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
