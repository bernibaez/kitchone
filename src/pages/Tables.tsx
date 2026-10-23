import { useEffect, useState, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useConfig } from '../contexts/ConfigContext';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  IconButton,
  Tag,
  EmptyState,
  Drawer,
  DetailRow,
  DrawerSection,
  SearchInput,
  SegmentedControl,
} from '../components/ui';
import { shortOrder, UI_EVENTS } from '../lib/format';
import {
  Armchair,
  Plus,
  Pencil,
  Trash2,
  Users,
  Receipt,
  User,
  ArrowRight,
} from 'lucide-react';

interface TableRow {
  id: string;
  table_number: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

interface TableOrder {
  id: string;
  order_number: string;
  table_id: string;
  waiter_id: string | null;
  status: string;
  created_at: string;
  waiter?: { full_name: string } | null;
  order_items: Array<{
    id: string;
    quantity: number;
    notes: string | null;
    dishes?: { name: string; price: number } | null;
  }>;
}

interface TablesProps {
  onNavigate?: (page: string) => void;
}

export default function Tables({ onNavigate }: TablesProps) {
  const { formatMoney } = useConfig();
  const { toast } = useToast();

  const [tables, setTables] = useState<TableRow[]>([]);
  const [activeOrders, setActiveOrders] = useState<TableOrder[]>([]);
  const [loading, setLoading] = useState(true);
  void loading;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'free' | 'occupied'>('all');

  // Drawer de CRUD de Mesa
  const [tableDrawerOpen, setTableDrawerOpen] = useState(false);
  const [editingTable, setEditingTable] = useState<TableRow | null>(null);
  const [formData, setFormData] = useState({ table_number: '', capacity: '4' });
  const [savingTable, setSavingTable] = useState(false);

  // Drawer de Detalle de Orden activa de la Mesa
  const [selectedTableOrder, setSelectedTableOrder] = useState<{ table: TableRow; order: TableOrder } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [tablesRes, ordersRes] = await Promise.all([
        supabase.from('tables').select('*').order('table_number'),
        supabase
          .from('orders')
          .select(`
            id,
            order_number,
            table_id,
            waiter_id,
            status,
            created_at,
            order_items (
              id,
              quantity,
              notes,
              dishes ( name, price )
            )
          `)
          .in('status', ['pendiente', 'en_preparacion', 'terminado']),
      ]);

      if (tablesRes.error) throw tablesRes.error;
      setTables(tablesRes.data || []);

      if (ordersRes.data) {
        // Cargar nombres de meseros si hay waiter_id
        const rawOrders = ordersRes.data as any[];
        const waiterIds = Array.from(new Set(rawOrders.map((o) => o.waiter_id).filter(Boolean)));
        let waitersMap = new Map<string, string>();

        if (waiterIds.length > 0) {
          const { data: profiles } = await supabase
            .from('users_profile')
            .select('id, full_name')
            .in('id', waiterIds);
          if (profiles) {
            profiles.forEach((p) => waitersMap.set(p.id, p.full_name));
          }
        }

        const mapped: TableOrder[] = rawOrders.map((o) => ({
          ...o,
          waiter: o.waiter_id ? { full_name: waitersMap.get(o.waiter_id) || 'Mesero' } : null,
        }));
        setActiveOrders(mapped);
      }
    } catch (err: any) {
      console.error('Error loading tables data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel('tables-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tables' }, () => loadData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        loadData();
        window.dispatchEvent(new CustomEvent(UI_EVENTS.ordersChanged));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  // Mapa de órdenes activas por id de mesa
  const activeOrderMap = useMemo(() => {
    const map = new Map<string, TableOrder>();
    activeOrders.forEach((o) => {
      if (o.table_id) map.set(o.table_id, o);
    });
    return map;
  }, [activeOrders]);

  const calculateOrderTotal = (order?: TableOrder) => {
    if (!order) return 0;
    return order.order_items.reduce((sum, item) => sum + (item.dishes?.price || 0) * item.quantity, 0);
  };

  const handleOpenTableDrawer = (table?: TableRow) => {
    if (table) {
      setEditingTable(table);
      setFormData({ table_number: table.table_number, capacity: String(table.capacity) });
    } else {
      setEditingTable(null);
      setFormData({ table_number: '', capacity: '4' });
    }
    setTableDrawerOpen(true);
  };

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTable(true);
    try {
      const payload = {
        table_number: formData.table_number.trim(),
        capacity: parseInt(formData.capacity) || 4,
      };

      if (editingTable) {
        const { error } = await supabase.from('tables').update(payload).eq('id', editingTable.id);
        if (error) throw error;
        toast({ title: 'Mesa actualizada', tone: 'ok' });
      } else {
        const { error } = await supabase.from('tables').insert(payload);
        if (error) throw error;
        toast({ title: 'Mesa creada', tone: 'ok' });
      }

      setTableDrawerOpen(false);
      loadData();
    } catch (err: any) {
      toast({ title: 'Error al guardar mesa', message: err.message, tone: 'bad' });
    } finally {
      setSavingTable(false);
    }
  };

  const handleDeleteTable = async (table: TableRow) => {
    if (!confirm(`¿Estás seguro de eliminar la Mesa ${table.table_number}?`)) return;
    try {
      const { error } = await supabase.from('tables').delete().eq('id', table.id);
      if (error) throw error;
      toast({ title: 'Mesa eliminada', tone: 'ok' });
      loadData();
    } catch (err: any) {
      toast({ title: 'No se pudo eliminar la mesa', message: err.message, tone: 'bad' });
    }
  };

  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      const matchSearch = t.table_number.toLowerCase().includes(search.toLowerCase());
      if (!matchSearch) return false;

      const isOccupied = activeOrderMap.has(t.id);
      if (statusFilter === 'free' && isOccupied) return false;
      if (statusFilter === 'occupied' && !isOccupied) return false;

      return true;
    });
  }, [tables, search, statusFilter, activeOrderMap]);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={['Operación', 'Mesas']}
        title="Control de Mesas"
        description="Plano de mesas en tiempo real con ocupación de comensales y órdenes activas."
        actions={
          <Button
            variant="acc"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => handleOpenTableDrawer()}
          >
            Nueva Mesa
          </Button>
        }
      />

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <SegmentedControl
          options={[
            { value: 'all', label: `Todas (${tables.length})` },
            { value: 'free', label: `Libres (${tables.length - activeOrders.length})` },
            { value: 'occupied', label: `Ocupadas (${activeOrders.length})` },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Buscar por número de mesa…"
          wrapperClassName="w-full sm:w-64"
        />
      </div>

      {/* Grid de Mesas */}
      {filteredTables.length === 0 ? (
        <EmptyState
          icon={<Armchair className="h-8 w-8" />}
          title="No se encontraron mesas"
          description="Crea una mesa o ajusta los filtros de búsqueda."
          action={
            <Button variant="outline" size="sm" onClick={() => handleOpenTableDrawer()}>
              Crear Mesa
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const activeOrder = activeOrderMap.get(table.id);
            const isOccupied = Boolean(activeOrder);
            const total = calculateOrderTotal(activeOrder);
            const capacity = table.capacity || 4;

            return (
              <div
                key={table.id}
                className={`card card-hover flex flex-col p-4 border transition-all ${
                  !table.is_active
                    ? 'opacity-60 bg-surface-2'
                    : isOccupied
                    ? 'border-accent/40 bg-accent-soft/10 ring-1 ring-accent/20'
                    : 'border-line hover:border-line-strong'
                }`}
              >
                {/* Cabecera de la mesa */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center font-bold text-lg ${
                        isOccupied ? 'bg-accent-strong text-white' : 'bg-surface-2 text-fg border border-line'
                      }`}
                    >
                      {table.table_number}
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-base text-fg">Mesa {table.table_number}</h3>
                      <span className="text-xs text-muted flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Capacidad: {capacity} personas
                      </span>
                    </div>
                  </div>

                  <Tag tone={isOccupied ? 'accent' : 'ok'}>
                    {isOccupied ? 'Ocupada' : 'Libre'}
                  </Tag>
                </div>

                {/* Representación visual de asientos (ocupado/libre) */}
                <div className="my-2 p-2.5 rounded-lg bg-surface-2/60 border border-line flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-muted">Asientos</span>
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: Math.min(capacity, 10) }).map((_, seatIdx) => (
                      <span
                        key={seatIdx}
                        title={isOccupied ? 'Ocupado' : 'Disponible'}
                        className={`inline-block h-3 w-3 rounded-full transition-colors ${
                          isOccupied
                            ? 'bg-accent-strong ring-2 ring-accent-soft'
                            : 'bg-surface border border-line-strong'
                        }`}
                      />
                    ))}
                    {capacity > 10 && <span className="text-[10px] text-muted">+{capacity - 10}</span>}
                  </div>
                </div>

                {/* Información de la orden activa o estado disponible */}
                <div className="my-2 flex-1 space-y-1 text-xs">
                  {isOccupied && activeOrder ? (
                    <>
                      <div className="flex items-center justify-between text-muted">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {activeOrder.waiter?.full_name || 'Mesero'}
                        </span>
                        <span className="font-mono font-semibold text-fg">#{shortOrder(activeOrder.order_number)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-muted font-medium">Acumulado:</span>
                        <span className="tnum font-display font-bold text-sm text-accent-strong">
                          {formatMoney(total)}
                        </span>
                      </div>
                    </>
                  ) : (
                    <div className="py-2 text-center text-xs text-muted">
                      Lista para asignar comensales
                    </div>
                  )}
                </div>

                {/* Acciones principales de mesa */}
                <div className="pt-3 border-t border-line flex items-center gap-2 mt-auto">
                  {isOccupied && activeOrder ? (
                    <Button
                      variant="acc"
                      size="sm"
                      block
                      rightIcon={<ArrowRight className="h-3.5 w-3.5" />}
                      onClick={() => setSelectedTableOrder({ table, order: activeOrder })}
                    >
                      Ver Orden
                    </Button>
                  ) : (
                    <Button
                      variant="pri"
                      size="sm"
                      block
                      onClick={() => {
                        sessionStorage.setItem('kitchone:pending-new-order', '1');
                        if (onNavigate) onNavigate('orders');
                      }}
                    >
                      Abrir Mesa
                    </Button>
                  )}

                  <IconButton
                    label="Editar mesa"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleOpenTableDrawer(table)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </IconButton>

                  <IconButton
                    label="Eliminar mesa"
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteTable(table)}
                  >
                    <Trash2 className="h-3.5 w-3.5 text-bad" />
                  </IconButton>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ---------------- DRAWER DE EDITAR / CREAR MESA ---------------- */}
      <Drawer
        open={tableDrawerOpen}
        onClose={() => setTableDrawerOpen(false)}
        title={editingTable ? `Editar Mesa ${editingTable.table_number}` : 'Nueva Mesa'}
        eyebrow="Configuración de Sala"
        footer={
          <div className="flex justify-end gap-2 w-full">
            <Button variant="ghost" onClick={() => setTableDrawerOpen(false)}>
              Cancelar
            </Button>
            <Button variant="pri" loading={savingTable} onClick={handleSaveTable}>
              Guardar Mesa
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSaveTable} className="space-y-4">
          <div>
            <label className="field-label">Identificador o Número de Mesa</label>
            <input
              type="text"
              required
              placeholder="Ej: 1, 2A, Terraza 4"
              value={formData.table_number}
              onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
              className="field"
            />
          </div>

          <div>
            <label className="field-label">Capacidad de Comensales</label>
            <input
              type="number"
              required
              min="1"
              max="30"
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="field"
            />
          </div>
        </form>
      </Drawer>

      {/* ---------------- DRAWER DE ORDEN ACTIVA DE MESA ---------------- */}
      <Drawer
        open={Boolean(selectedTableOrder)}
        onClose={() => setSelectedTableOrder(null)}
        title={selectedTableOrder ? `Mesa ${selectedTableOrder.table.table_number} — Orden #${shortOrder(selectedTableOrder.order.order_number)}` : ''}
        eyebrow="Detalle de Mesa Ocupada"
        footer={
          selectedTableOrder && (
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                onClick={() => {
                  if (onNavigate) {
                    onNavigate('orders');
                  }
                  setSelectedTableOrder(null);
                }}
              >
                Ir a Tablero
              </Button>
              {onNavigate && (
                <Button
                  variant="acc"
                  leftIcon={<Receipt className="h-4 w-4" />}
                  onClick={() => {
                    sessionStorage.setItem('edit_sale_id', selectedTableOrder.order.id);
                    onNavigate('sales');
                  }}
                >
                  Cobrar / Facturar
                </Button>
              )}
            </div>
          )
        }
      >
        {selectedTableOrder && (
          <div className="space-y-6">
            <DrawerSection title="Resumen">
              <div className="rounded-card border border-line bg-surface-2/40 p-4 space-y-2 text-sm">
                <DetailRow label="Mesero asignado">
                  {selectedTableOrder.order.waiter?.full_name || 'No asignado'}
                </DetailRow>
                <DetailRow label="Hora de apertura">
                  {new Date(selectedTableOrder.order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </DetailRow>
                <DetailRow label="Estado actual">
                  <Tag tone="accent">{selectedTableOrder.order.status}</Tag>
                </DetailRow>
              </div>
            </DrawerSection>

            <DrawerSection title={`Artículos pedidos (${selectedTableOrder.order.order_items.length})`}>
              <div className="divide-y divide-line rounded-card border border-line bg-surface">
                {selectedTableOrder.order.order_items.map((it) => (
                  <div key={it.id} className="p-3 flex justify-between items-center text-sm">
                    <div>
                      <span className="font-bold text-fg mr-2">{it.quantity}×</span>
                      <span className="font-medium text-fg">{it.dishes?.name}</span>
                      {it.notes && <p className="text-xs text-warn mt-0.5">{it.notes}</p>}
                    </div>
                    <span className="tnum font-bold text-fg">
                      {formatMoney((it.dishes?.price || 0) * it.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </DrawerSection>

            <DrawerSection title="Total Acumulado">
              <div className="rounded-card border border-line bg-surface p-4 flex justify-between items-center">
                <span className="font-semibold text-fg">Total de la mesa</span>
                <span className="font-display text-xl font-bold text-accent-strong">
                  {formatMoney(calculateOrderTotal(selectedTableOrder.order))}
                </span>
              </div>
            </DrawerSection>
          </div>
        )}
      </Drawer>
    </div>
  );
}
