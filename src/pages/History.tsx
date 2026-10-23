import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import { generateInvoicePDF } from '../lib/invoice';
import {
  PageHeader,
  Button,
  IconButton,
  StatCard,
  Panel,
  StatusBadge,
  Drawer,
  DetailRow,
  DrawerSection,
  SearchInput,
  Tabs,
  type TabItem,
  DataTable,
  type Column,
  EmptyState,
} from '../components/ui';
import {
  Eye,
  Trash2,
  Pencil,
  Printer,
  Calendar,
  ClipboardList,
  Receipt,
  DollarSign,
  MapPin,
} from 'lucide-react';

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
  const { config, formatMoney } = useConfig();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('orders');
  const [ordersHistory, setOrdersHistory] = useState<HistoryItem[]>([]);
  const [salesHistory, setSalesHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  // Drawer de detalle
  const [showDetailDrawer, setShowDetailDrawer] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<OrderDetail | SaleDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Drawer de edición de orden
  const [editingItem, setEditingItem] = useState<HistoryItem | null>(null);
  const [editStatus, setEditStatus] = useState<string>('pendiente');

  // URL para impresión
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [dateFilter]);

  useEffect(() => {
    return () => {
      if (invoiceUrl) URL.revokeObjectURL(invoiceUrl);
    };
  }, [invoiceUrl]);

  const loadHistory = async () => {
    try {
      // Cargar órdenes
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

      const { data: orders, error: oErr } = await orderQuery;
      if (oErr) throw oErr;

      const ordersItems: HistoryItem[] = (orders || []).map((order: any) => ({
        id: order.id,
        number: order.order_number,
        type: 'order',
        table: order.tables?.table_number,
        status: order.status,
        created_at: order.created_at,
      }));

      // Cargar ventas
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

      const { data: sales, error: sErr } = await saleQuery;
      if (sErr) throw sErr;

      const salesItems: HistoryItem[] = (sales || []).map((sale: any) => ({
        id: sale.id,
        number: sale.sale_number,
        type: 'sale',
        amount: sale.total,
        customer_name: sale.customer_name,
        created_at: sale.created_at,
      }));

      setOrdersHistory(ordersItems);
      setSalesHistory(salesItems);
    } catch (error: any) {
      toast({ title: 'Error al cargar historial', message: error.message, tone: 'bad' });
    } finally {
      setLoading(false);
    }
  };

  const viewDetail = async (item: HistoryItem) => {
    setShowDetailDrawer(true);
    setDetailLoading(true);
    try {
      if (item.type === 'order') {
        const { data, error } = await supabase
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

        if (error) throw error;
        setSelectedDetail(data);
      } else {
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
        setSelectedDetail(data);
      }
    } catch (error: any) {
      toast({ title: 'Error al cargar detalle', message: error.message, tone: 'bad' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleEditItem = (item: HistoryItem) => {
    if (item.type === 'sale') {
      sessionStorage.setItem('edit_sale_id', item.id);
      if (onNavigate) {
        onNavigate('sales');
      }
      return;
    }

    setEditingItem(item);
    setEditStatus(item.status || 'pendiente');
  };

  const handleSaveOrderEdit = async () => {
    if (!editingItem || editingItem.type !== 'order') return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: editStatus } as any)
        .eq('id', editingItem.id);

      if (error) throw error;

      toast({
        title: `Orden #${editingItem.number} actualizada`,
        message: `Nuevo estado: ${editStatus}`,
        tone: 'ok',
      });
      loadHistory();
      setEditingItem(null);
    } catch (error: any) {
      toast({ title: 'Error al actualizar orden', message: error.message, tone: 'bad' });
    }
  };

  const handleDeleteOrder = async (item: HistoryItem) => {
    if (!confirm(`¿Eliminar la orden #${item.number}? Esta acción borrará también sus comandas.`)) {
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

      toast({ title: `Orden #${item.number} eliminada`, tone: 'ok' });
      loadHistory();
    } catch (error: any) {
      toast({ title: 'Error al eliminar orden', message: error.message, tone: 'bad' });
    }
  };

  const handleDeleteSale = async (item: HistoryItem) => {
    if (!confirm(`¿Eliminar la venta #${item.number}?`)) {
      return;
    }

    try {
      const { error } = await supabase.from('sales').delete().eq('id', item.id);
      if (error) throw error;

      toast({ title: `Venta #${item.number} eliminada`, tone: 'ok' });
      loadHistory();
    } catch (error: any) {
      toast({ title: 'Error al eliminar venta', message: error.message, tone: 'bad' });
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
        const saleData = data as any;
        const subtotal = Number(saleData.subtotal);
        const taxAmt = Number(saleData.tax_amount);
        const invoiceData = {
          saleNumber: saleData.sale_number,
          customerName: saleData.customer_name || 'Cliente general',
          subtotal,
          tax: taxAmt,
          taxRatePercent: subtotal > 0 ? (taxAmt / subtotal) * 100 : 0,
          total: Number(saleData.total),
          items: (saleData.sale_items || []).map((i: any) => ({
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
        toast({ title: 'Ticket generado', message: 'Enviando a impresión...', tone: 'ok' });
      }
    } catch (error: any) {
      toast({ title: 'Error al generar factura', message: error.message, tone: 'bad' });
    }
  };

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return ordersHistory;
    return ordersHistory.filter(
      (o) =>
        o.number.toLowerCase().includes(term) ||
        (o.table && o.table.toLowerCase().includes(term)) ||
        (o.status && o.status.toLowerCase().includes(term))
    );
  }, [ordersHistory, searchTerm]);

  const filteredSales = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return salesHistory;
    return salesHistory.filter(
      (s) =>
        s.number.toLowerCase().includes(term) ||
        (s.customer_name && s.customer_name.toLowerCase().includes(term))
    );
  }, [salesHistory, searchTerm]);

  const totalSalesAmount = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [filteredSales]);

  // Definición de columnas de Órdenes
  const orderColumns: Column<HistoryItem>[] = [
    {
      key: 'number',
      header: 'Orden',
      sortValue: (r) => r.number,
      cell: (r) => (
        <div className="flex flex-col">
          <span className="font-bold font-mono text-ink dark:text-line">#{r.number}</span>
          <span className="text-xs text-muted">
            {r.table ? `Mesa ${r.table}` : 'Para llevar / barra'}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (r) => <StatusBadge status={r.status || 'pendiente'} />,
    },
    {
      key: 'created_at',
      header: 'Fecha y Hora',
      sortValue: (r) => r.created_at,
      cell: (r) => (
        <div className="flex flex-col text-xs text-muted">
          <span className="font-medium text-fg">
            {new Date(r.created_at).toLocaleDateString()}
          </span>
          <span className="tabular-nums">
            {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label="Ver detalle"
            variant="ghost"
            size="sm"
            onClick={() => viewDetail(r)}
          >
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Cambiar estado"
            variant="ghost"
            size="sm"
            onClick={() => handleEditItem(r)}
          >
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Eliminar orden"
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteOrder(r)}
          >
            <Trash2 className="h-4 w-4 text-bad" />
          </IconButton>
        </div>
      ),
    },
  ];

  // Definición de columnas de Ventas
  const saleColumns: Column<HistoryItem>[] = [
    {
      key: 'number',
      header: 'Factura',
      sortValue: (r) => r.number,
      cell: (r) => (
        <span className="font-bold font-mono text-ink dark:text-line">#{r.number}</span>
      ),
    },
    {
      key: 'customer',
      header: 'Cliente',
      cell: (r) => (
        <span className="text-xs text-fg">
          {r.customer_name || 'Consumidor Final'}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Total Cobrado',
      sortValue: (r) => r.amount || 0,
      cell: (r) => (
        <span className="font-bold tabular-nums text-ok">
          {formatMoney(r.amount || 0)}
        </span>
      ),
    },
    {
      key: 'created_at',
      header: 'Fecha y Hora',
      sortValue: (r) => r.created_at,
      cell: (r) => (
        <div className="flex flex-col text-xs text-muted">
          <span className="font-medium text-fg">
            {new Date(r.created_at).toLocaleDateString()}
          </span>
          <span className="tabular-nums">
            {new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label="Ver detalle"
            variant="ghost"
            size="sm"
            onClick={() => viewDetail(r)}
          >
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Imprimir ticket"
            variant="ghost"
            size="sm"
            onClick={() => handlePrintInvoice(r)}
          >
            <Printer className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Editar venta"
            variant="ghost"
            size="sm"
            onClick={() => handleEditItem(r)}
          >
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Eliminar venta"
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteSale(r)}
          >
            <Trash2 className="h-4 w-4 text-bad" />
          </IconButton>
        </div>
      ),
    },
  ];

  const historyTabs: TabItem[] = [
    { id: 'orders', label: 'Órdenes de Cocina', count: ordersHistory.length },
    { id: 'sales', label: 'Ventas y Facturas', count: salesHistory.length },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Historial de Operaciones"
        description="Auditoría y registro cronológico de comandas despachadas y facturación"
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Órdenes"
          value={ordersHistory.length}
          icon={<ClipboardList className="h-5 w-5 text-accent" />}
        />
        <StatCard
          label="Total Facturas"
          value={salesHistory.length}
          icon={<Receipt className="h-5 w-5 text-muted" />}
        />
        <StatCard
          label="Facturado en Período"
          value={formatMoney(totalSalesAmount)}
          icon={<DollarSign className="h-5 w-5 text-ok" />}
          tone="ok"
        />
        <StatCard
          label="Filtro de Fecha"
          value={dateFilter ? new Date(dateFilter + 'T00:00:00').toLocaleDateString() : 'Todo el tiempo'}
          icon={<Calendar className="h-5 w-5 text-muted" />}
        />
      </div>

      {/* Tabs y Panel principal */}
      <Panel
        title={
          <Tabs
            items={historyTabs}
            value={activeTab}
            onChange={setActiveTab}
          />
        }
        action={
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-60">
              <SearchInput
                value={searchTerm}
                onChange={setSearchTerm}
                placeholder="Buscar por número o cliente..."
              />
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <Calendar className="h-4 w-4 text-muted" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="field py-1.5 text-xs w-36"
                title="Filtrar por fecha específica"
              />
              {dateFilter && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateFilter('')}
                >
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        }
      >
        {activeTab === 'orders' ? (
          <DataTable<HistoryItem>
            columns={orderColumns}
            rows={filteredOrders}
            rowKey={(r) => r.id}
            loading={loading}
            pageSize={10}
            empty={
              <EmptyState
                icon={<ClipboardList className="h-10 w-10 text-muted" />}
                title="Sin órdenes encontradas"
                description={
                  searchTerm || dateFilter
                    ? 'No hay órdenes que coincidan con la búsqueda o fecha seleccionada.'
                    : 'Aún no se han generado órdenes en el sistema.'
                }
                action={
                  searchTerm || dateFilter ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setDateFilter('');
                      }}
                    >
                      Restablecer filtros
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        ) : (
          <DataTable<HistoryItem>
            columns={saleColumns}
            rows={filteredSales}
            rowKey={(r) => r.id}
            loading={loading}
            pageSize={10}
            empty={
              <EmptyState
                icon={<Receipt className="h-10 w-10 text-muted" />}
                title="Sin ventas encontradas"
                description={
                  searchTerm || dateFilter
                    ? 'No hay ventas que coincidan con los criterios seleccionados.'
                    : 'Aún no se han cobrado facturas en el sistema.'
                }
                action={
                  searchTerm || dateFilter ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setDateFilter('');
                      }}
                    >
                      Restablecer filtros
                    </Button>
                  ) : undefined
                }
              />
            }
          />
        )}
      </Panel>

      {/* Drawer: Detalle de Orden / Venta */}
      <Drawer
        open={showDetailDrawer}
        onClose={() => {
          setShowDetailDrawer(false);
          setSelectedDetail(null);
        }}
        title={
          selectedDetail && 'order_number' in selectedDetail
            ? `Orden #${selectedDetail.order_number}`
            : selectedDetail && 'sale_number' in selectedDetail
            ? `Factura #${selectedDetail.sale_number}`
            : 'Detalle'
        }
        description="Desglose de platillos, montos e información de registro"
        size="md"
        footer={
          <div className="flex items-center justify-between w-full">
            {selectedDetail && 'sale_number' in selectedDetail && (
              <Button
                variant="outline"
                leftIcon={<Printer className="h-4 w-4" />}
                onClick={() => {
                  const saleItem: HistoryItem = {
                    id: selectedDetail.id,
                    number: selectedDetail.sale_number,
                    type: 'sale',
                    amount: selectedDetail.total,
                    customer_name: selectedDetail.customer_name,
                    created_at: selectedDetail.created_at,
                  };
                  handlePrintInvoice(saleItem);
                }}
              >
                Imprimir Ticket
              </Button>
            )}
            <Button
              variant="pri"
              className="ml-auto"
              onClick={() => {
                setShowDetailDrawer(false);
                setSelectedDetail(null);
              }}
            >
              Cerrar
            </Button>
          </div>
        }
      >
        {detailLoading ? (
          <div className="py-12 text-center text-muted text-sm">Cargando desglose...</div>
        ) : selectedDetail && 'order_number' in selectedDetail ? (
          /* Detalle de ORDEN */
          <div className="space-y-6">
            <DrawerSection title="Información General">
              <DetailRow label="Mesa">
                <span className="font-semibold flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-accent" />
                  Mesa {selectedDetail.tables?.table_number || 'S/N'}
                </span>
              </DetailRow>
              <DetailRow label="Estado">
                <StatusBadge status={selectedDetail.status} />
              </DetailRow>
              <DetailRow label="Fecha y Hora">
                {new Date(selectedDetail.created_at).toLocaleString()}
              </DetailRow>
            </DrawerSection>

            <DrawerSection title="Comanda de Cocina">
              <div className="space-y-2.5">
                {selectedDetail.order_items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-line bg-surface-2 flex items-start justify-between gap-3"
                  >
                    <div className="flex items-start gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-accent/10 font-bold text-sm text-accent">
                        {item.quantity}
                      </span>
                      <div>
                        <p className="font-semibold text-sm text-ink dark:text-line">
                          {item.dishes?.name}
                        </p>
                        {item.notes && (
                          <p className="text-xs text-warn mt-0.5 font-medium">
                            Nota: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-semibold tabular-nums text-muted">
                      {formatMoney((item.dishes?.price || 0) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </DrawerSection>
          </div>
        ) : selectedDetail && 'sale_number' in selectedDetail ? (
          /* Detalle de VENTA */
          <div className="space-y-6">
            <DrawerSection title="Información de Factura">
              <DetailRow label="Cliente">
                {selectedDetail.customer_name || 'Consumidor Final'}
              </DetailRow>
              <DetailRow label="Fecha y Hora">
                {new Date(selectedDetail.created_at).toLocaleString()}
              </DetailRow>
              <DetailRow label="Subtotal">
                {formatMoney(selectedDetail.subtotal || 0)}
              </DetailRow>
              <DetailRow label="ITBIS / Impuesto">
                {formatMoney(selectedDetail.tax_amount || 0)}
              </DetailRow>
              <DetailRow label="Total Cobrado">
                <span className="text-base font-bold text-ok tabular-nums">
                  {formatMoney(selectedDetail.total || 0)}
                </span>
              </DetailRow>
            </DrawerSection>

            <DrawerSection title="Artículos Facturados">
              <div className="space-y-2">
                {selectedDetail.sale_items?.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg border border-line bg-surface-2 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-ink dark:text-line">
                        {item.quantity}× {item.dish_name}
                      </span>
                      <p className="text-muted tabular-nums">
                        {formatMoney(item.price)} c/u
                      </p>
                    </div>
                    <span className="font-bold tabular-nums text-fg">
                      {formatMoney(item.subtotal)}
                    </span>
                  </div>
                ))}
              </div>
            </DrawerSection>
          </div>
        ) : null}
      </Drawer>

      {/* Drawer: Cambiar Estado de Orden */}
      <Drawer
        open={Boolean(editingItem)}
        onClose={() => setEditingItem(null)}
        title={`Editar Orden #${editingItem?.number || ''}`}
        description="Actualiza el estado de la comanda en cocina"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setEditingItem(null)}>
              Cancelar
            </Button>
            <Button variant="pri" onClick={handleSaveOrderEdit}>
              Guardar Cambios
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Estado de la Orden
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="field"
            >
              <option value="pendiente">Pendiente</option>
              <option value="en_preparacion">En Preparación</option>
              <option value="terminado">Terminado</option>
              <option value="entregado">Entregado</option>
              <option value="facturada">Facturada</option>
            </select>
          </div>
        </div>
      </Drawer>

      {/* Iframe oculto para impresión */}
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
    </div>
  );
}
