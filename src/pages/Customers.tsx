import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  IconButton,
  StatCard,
  Panel,
  Tag,
  Drawer,
  DetailRow,
  DrawerSection,
  SearchInput,
  DataTable,
  type Column,
  EmptyState,
} from '../components/ui';
import {
  Plus,
  Edit2,
  Eye,
  Users,
  DollarSign,
  ShoppingBag,
  UserCheck,
  Calendar,
} from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  total_orders: number;
  total_spent: number;
  last_order_date: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerSale {
  id: string;
  sale_id: string;
  created_at: string;
  sales: {
    sale_number: string;
    total: number;
    created_at: string;
    sale_items: {
      dish_name: string;
      quantity: number;
      price: number;
    }[];
  };
}

export default function Customers() {
  const { formatMoney } = useConfig();
  const { toast } = useToast();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Drawers
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerHistory, setCustomerHistory] = useState<CustomerSale[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  const loadCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setCustomers(data);
    } catch (error: any) {
      toast({ title: 'Error al cargar clientes', message: error.message, tone: 'bad' });
    } finally {
      setLoading(false);
    }
  };

  const loadCustomerHistory = async (customerId: string) => {
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('customer_sales')
        .select(`
          *,
          sales(
            sale_number,
            total,
            created_at,
            sale_items(
              dish_name,
              quantity,
              price
            )
          )
        `)
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setCustomerHistory(data as CustomerSale[]);
    } catch (error: any) {
      toast({ title: 'Error al cargar historial', message: error.message, tone: 'bad' });
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadCustomers();
  }, []);

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      notes: '',
    });
  };

  const handleOpenCreate = () => {
    setEditingCustomer(null);
    resetForm();
    setShowDrawer(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      email: customer.email || '',
      phone: customer.phone || '',
      address: customer.address || '',
      notes: customer.notes || '',
    });
    setShowDrawer(true);
  };

  const handleViewHistory = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowHistoryDrawer(true);
    await loadCustomerHistory(customer.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        const { error } = await supabase
          .from('customers')
          .update({
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            notes: formData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingCustomer.id);

        if (error) throw error;
        toast({ title: 'Cliente actualizado', message: formData.name, tone: 'ok' });
      } else {
        const { error } = await supabase
          .from('customers')
          .insert([{
            name: formData.name,
            email: formData.email || null,
            phone: formData.phone || null,
            address: formData.address || null,
            notes: formData.notes || null,
          }]);

        if (error) throw error;
        toast({ title: 'Cliente registrado', message: formData.name, tone: 'ok' });
      }

      setShowDrawer(false);
      setEditingCustomer(null);
      resetForm();
      loadCustomers();
    } catch (error: any) {
      toast({ title: 'Error al guardar cliente', message: error.message, tone: 'bad' });
    }
  };

  const filteredCustomers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        (c.email && c.email.toLowerCase().includes(term)) ||
        (c.phone && c.phone.includes(term))
    );
  }, [customers, searchTerm]);

  const frequentCustomers = useMemo(() => {
    return customers
      .filter((c) => c.total_orders > 0)
      .sort((a, b) => b.total_orders - a.total_orders)
      .slice(0, 4);
  }, [customers]);

  const totalRevenue = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.total_spent || 0), 0);
  }, [customers]);

  const totalOrders = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.total_orders || 0), 0);
  }, [customers]);

  const activeCount = useMemo(() => {
    return customers.filter((c) => c.is_active).length;
  }, [customers]);

  const columns: Column<Customer>[] = [
    {
      key: 'name',
      header: 'Cliente',
      sortValue: (c: Customer) => c.name,
      cell: (c: Customer) => (
        <div className="flex flex-col">
          <span className="font-semibold text-ink dark:text-line">{c.name}</span>
          {c.notes && (
            <span className="text-xs text-muted truncate max-w-xs">{c.notes}</span>
          )}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contacto',
      cell: (c: Customer) => (
        <div className="flex flex-col text-xs">
          {c.phone ? (
            <span className="font-mono text-fg">{c.phone}</span>
          ) : (
            <span className="text-muted">Sin teléfono</span>
          )}
          {c.email && <span className="text-muted truncate max-w-[180px]">{c.email}</span>}
        </div>
      ),
    },
    {
      key: 'stats',
      header: 'Consumo',
      sortValue: (c: Customer) => c.total_spent,
      cell: (c: Customer) => (
        <div className="flex flex-col">
          <span className="font-bold tabular-nums text-ok">
            {formatMoney(c.total_spent || 0)}
          </span>
          <span className="text-xs text-muted tabular-nums">
            {c.total_orders} {c.total_orders === 1 ? 'orden' : 'órdenes'}
          </span>
        </div>
      ),
    },
    {
      key: 'last_order_date',
      header: 'Última Visita',
      sortValue: (c: Customer) => c.last_order_date || '',
      cell: (c: Customer) =>
        c.last_order_date ? (
          <span className="text-xs tabular-nums text-fg">
            {new Date(c.last_order_date).toLocaleDateString()}
          </span>
        ) : (
          <span className="text-xs text-muted">Sin visitas</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (c: Customer) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label="Ver historial de compras"
            variant="ghost"
            size="sm"
            onClick={() => handleViewHistory(c)}
          >
            <Eye className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Editar cliente"
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(c)}
          >
            <Edit2 className="h-4 w-4" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes"
        description="Directorio de clientes, frecuencia de consumo e historial de compras"
        actions={
          <Button
            variant="pri"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            Nuevo Cliente
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Clientes"
          value={customers.length}
          icon={<Users className="h-5 w-5 text-accent" />}
        />
        <StatCard
          label="Ingresos Acumulados"
          value={formatMoney(totalRevenue)}
          icon={<DollarSign className="h-5 w-5 text-ok" />}
          tone="ok"
        />
        <StatCard
          label="Órdenes Registradas"
          value={totalOrders}
          icon={<ShoppingBag className="h-5 w-5 text-muted" />}
        />
        <StatCard
          label="Clientes Activos"
          value={activeCount}
          icon={<UserCheck className="h-5 w-5 text-info" />}
          tone="info"
        />
      </div>

      {/* Clientes frecuentes destacados */}
      {frequentCustomers.length > 0 && (
        <Panel
          title="Clientes Frecuentes"
          description="Top comensales con mayor volumen de visitas"
          action={<Tag tone="accent">Top {frequentCustomers.length}</Tag>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
            {frequentCustomers.map((cust, idx) => (
              <div
                key={cust.id}
                onClick={() => handleViewHistory(cust)}
                className="p-3.5 rounded-lg border border-line bg-surface-2 hover:border-accent/40 cursor-pointer transition-colors flex flex-col justify-between"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-ink dark:text-line truncate">
                      {cust.name}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {cust.phone || cust.email || 'Sin contacto'}
                    </p>
                  </div>
                  <Tag tone={idx === 0 ? 'accent' : 'neutral'}>
                    #{idx + 1}
                  </Tag>
                </div>
                <div className="flex items-baseline justify-between pt-2 border-t border-line/60 text-xs">
                  <span className="text-muted tabular-nums">
                    {cust.total_orders} órdenes
                  </span>
                  <span className="font-bold text-ok tabular-nums">
                    {formatMoney(cust.total_spent)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Búsqueda y listado principal */}
      <Panel
        title="Directorio de Clientes"
        description={`${filteredCustomers.length} de ${customers.length} clientes encontrados`}
        action={
          <div className="w-72">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por nombre, teléfono o email..."
            />
          </div>
        }
      >
        <DataTable<Customer>
          columns={columns}
          rows={filteredCustomers}
          rowKey={(c) => c.id}
          loading={loading}
          pageSize={10}
          empty={
            <EmptyState
              icon={<Users className="h-10 w-10 text-muted" />}
              title={searchTerm ? 'Sin coincidencias' : 'Aún no hay clientes'}
              description={
                searchTerm
                  ? 'Prueba con otro término de búsqueda o limpia el filtro.'
                  : 'Registra a tus clientes habituales para llevar registro de sus compras.'
              }
              action={
                searchTerm ? (
                  <Button variant="ghost" size="sm" onClick={() => setSearchTerm('')}>
                    Limpiar búsqueda
                  </Button>
                ) : (
                  <Button
                    variant="pri"
                    size="sm"
                    leftIcon={<Plus className="h-4 w-4" />}
                    onClick={handleOpenCreate}
                  >
                    Registrar primer cliente
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      {/* Drawer: Crear / Editar Cliente */}
      <Drawer
        open={showDrawer}
        onClose={() => {
          setShowDrawer(false);
          setEditingCustomer(null);
          resetForm();
        }}
        title={editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
        description="Información de contacto y notas para el perfil del cliente"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDrawer(false);
                setEditingCustomer(null);
                resetForm();
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="pri"
              onClick={(e) => handleSubmit(e)}
            >
              {editingCustomer ? 'Actualizar Cliente' : 'Guardar Cliente'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ej. Juan Pérez"
              className="field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="809-555-0123"
                className="field"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@ejemplo.com"
                className="field"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Dirección de Entrega
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              rows={3}
              placeholder="Calle, sector, referencia para delivery..."
              className="field resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Notas y Preferencias
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              placeholder="Alergias, mesa preferida, término de carne, etc."
              className="field resize-none"
            />
          </div>
        </form>
      </Drawer>

      {/* Drawer: Historial de Compras */}
      <Drawer
        open={showHistoryDrawer}
        onClose={() => {
          setShowHistoryDrawer(false);
          setSelectedCustomer(null);
          setCustomerHistory([]);
        }}
        title={`Historial — ${selectedCustomer?.name || 'Cliente'}`}
        description="Registro detallado de facturas emitidas a este cliente"
        size="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-muted">
              {customerHistory.length} compras registradas
            </span>
            <Button
              variant="outline"
              onClick={() => {
                setShowHistoryDrawer(false);
                setSelectedCustomer(null);
                setCustomerHistory([]);
              }}
            >
              Cerrar
            </Button>
          </div>
        }
      >
        {selectedCustomer && (
          <div className="space-y-6">
            {/* Resumen del cliente */}
            <DrawerSection title="Resumen de Cuenta">
              <DetailRow label="Teléfono">{selectedCustomer.phone || 'No registrado'}</DetailRow>
              <DetailRow label="Correo">{selectedCustomer.email || 'No registrado'}</DetailRow>
              <DetailRow label="Dirección">{selectedCustomer.address || 'No registrada'}</DetailRow>
              <DetailRow label="Total Consumido">
                <span className="font-bold text-ok tabular-nums">
                  {formatMoney(selectedCustomer.total_spent || 0)}
                </span>
              </DetailRow>
              <DetailRow label="Órdenes Realizadas">
                <span className="font-bold tabular-nums">
                  {selectedCustomer.total_orders || 0}
                </span>
              </DetailRow>
              {selectedCustomer.notes && (
                <DetailRow label="Notas">{selectedCustomer.notes}</DetailRow>
              )}
            </DrawerSection>

            {/* Listado de Facturas */}
            <DrawerSection title="Facturas Emitidas">
              {historyLoading ? (
                <div className="py-8 text-center text-muted text-sm">
                  Cargando compras del cliente...
                </div>
              ) : customerHistory.length === 0 ? (
                <EmptyState
                  icon={<ShoppingBag className="h-10 w-10 text-muted" />}
                  title="Sin compras registradas"
                  description="Este cliente aún no tiene ventas asociadas."
                />
              ) : (
                <div className="space-y-3">
                  {customerHistory.map((hist) => (
                    <div
                      key={hist.id}
                      className="p-3.5 rounded-lg border border-line bg-surface-2 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-ink dark:text-line">
                              Factura #{hist.sales?.sale_number}
                            </span>
                            <Tag tone="ok">Pagada</Tag>
                          </div>
                          <span className="text-xs text-muted flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(hist.sales?.created_at).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-base font-bold text-ok tabular-nums">
                          {formatMoney(hist.sales?.total || 0)}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="pt-2 border-t border-line/60 space-y-1">
                        {hist.sales?.sale_items?.map((item, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs text-fg"
                          >
                            <span>
                              <strong className="text-accent">{item.quantity}×</strong> {item.dish_name}
                            </span>
                            <span className="tabular-nums text-muted">
                              {formatMoney(item.quantity * item.price)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </DrawerSection>
          </div>
        )}
      </Drawer>
    </div>
  );
}
