import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  IconButton,
  StatCard,
  Tag,
  Drawer,
  EmptyState,
} from '../components/ui';
import {
  Plus,
  Pencil,
  Trash2,
  UtensilsCrossed,
  Coffee,
  IceCream,
  Soup,
  Pizza,
  Sandwich,
  FolderTree,
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  dishes?: { count: number }[];
}

const CATEGORY_CONFIG: Record<string, { description: string; icon: any }> = {
  'Entradas': { description: 'Aperitivos y botanas', icon: Soup },
  'Platos Fuertes': { description: 'Platillos principales', icon: UtensilsCrossed },
  'Especialidades': { description: 'Platillos estrella de la casa', icon: Pizza },
  'Postres': { description: 'Dulces, repostería y helados', icon: IceCream },
  'Bebidas': { description: 'Refrescos, jugos y coctelería', icon: Coffee },
  'Desayunos': { description: 'Opciones matutinas', icon: Sandwich },
};

const DEFAULT_CONFIG = { description: 'Categoría del menú', icon: UtensilsCrossed };

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const { toast } = useToast();

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('categories')
        .select('*, dishes(count)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) setCategories(data);
    } catch (error: any) {
      toast({ title: 'Error al cargar categorías', message: error.message, tone: 'bad' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    if (!name) return;

    setSaving(true);
    try {
      if (editingCategory) {
        const { error } = await supabase
          .from('categories')
          .update({ name })
          .eq('id', editingCategory.id);
        if (error) throw error;
        toast({ title: 'Categoría actualizada', message: name, tone: 'ok' });
      } else {
        const { error } = await supabase.from('categories').insert({ name });
        if (error) throw error;
        toast({ title: 'Categoría creada', message: name, tone: 'ok' });
      }

      setShowDrawer(false);
      setEditingCategory(null);
      setFormData({ name: '' });
      loadCategories();
    } catch (error: any) {
      toast({ title: 'Error al guardar categoría', message: error.message, tone: 'bad' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`¿Eliminar la categoría "${category.name}"? Los platillos asociados podrían quedar sin categoría.`)) {
      return;
    }

    try {
      const { error } = await supabase.from('categories').delete().eq('id', category.id);
      if (error) throw error;

      toast({ title: 'Categoría eliminada', message: category.name, tone: 'ok' });
      loadCategories();
    } catch (error: any) {
      toast({ title: 'Error al eliminar', message: error.message, tone: 'bad' });
    }
  };

  const handleOpenCreate = () => {
    setEditingCategory(null);
    setFormData({ name: '' });
    setShowDrawer(true);
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name });
    setShowDrawer(true);
  };

  const totalDishes = useMemo(() => {
    return categories.reduce((sum, c) => sum + (c.dishes?.[0]?.count || 0), 0);
  }, [categories]);

  const topCategory = useMemo(() => {
    const sorted = [...categories].sort((a, b) => (b.dishes?.[0]?.count || 0) - (a.dishes?.[0]?.count || 0));
    return sorted[0] ? `${sorted[0].name} (${sorted[0].dishes?.[0]?.count || 0})` : 'Ninguna';
  }, [categories]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Categorías del Menú"
        description="Organización de los platillos por familias de producto para cocina y punto de venta"
        actions={
          <Button
            variant="pri"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            Nueva Categoría
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Total Categorías"
          value={categories.length}
          icon={<FolderTree className="h-5 w-5 text-accent" />}
          tone="accent"
        />
        <StatCard
          label="Platillos Catalogados"
          value={totalDishes}
          icon={<UtensilsCrossed className="h-5 w-5 text-ok" />}
          tone="ok"
        />
        <StatCard
          label="Categoría Más Poblada"
          value={topCategory}
          icon={<Soup className="h-5 w-5 text-muted" />}
        />
      </div>

      {/* Listado de tarjetas de categorías */}
      {loading ? (
        <div className="py-16 text-center text-muted text-sm">Cargando categorías...</div>
      ) : categories.length === 0 ? (
        <EmptyState
          icon={<FolderTree className="h-10 w-10 text-muted" />}
          title="No hay categorías creadas"
          description="Crea tu primera categoría para organizar los platillos de la carta."
          action={
            <Button
              variant="pri"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={handleOpenCreate}
            >
              Crear primera categoría
            </Button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((category) => {
            const conf = CATEGORY_CONFIG[category.name] || DEFAULT_CONFIG;
            const Icon = conf.icon;
            const dishCount = category.dishes?.[0]?.count || 0;

            return (
              <div
                key={category.id}
                className="card card-hover p-5 flex flex-col justify-between group transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-accent border border-line">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <IconButton
                        label="Editar categoría"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(category)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </IconButton>
                      <IconButton
                        label="Eliminar categoría"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(category)}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-bad" />
                      </IconButton>
                    </div>
                  </div>

                  <h3 className="font-bold text-base text-ink dark:text-line">
                    {category.name}
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    {conf.description}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t border-line/60 flex items-center justify-between text-xs">
                  <Tag tone={dishCount > 0 ? 'accent' : 'neutral'}>
                    {dishCount} {dishCount === 1 ? 'platillo' : 'platillos'}
                  </Tag>
                  <span className="text-muted text-[11px]">
                    Activa en POS
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Drawer: Crear / Editar Categoría */}
      <Drawer
        open={showDrawer}
        onClose={() => {
          setShowDrawer(false);
          setEditingCategory(null);
          setFormData({ name: '' });
        }}
        title={editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
        description="Agrupa tus platillos para facilitar la navegación en el POS y las comandas"
        size="sm"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDrawer(false);
                setEditingCategory(null);
                setFormData({ name: '' });
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="pri"
              loading={saving}
              onClick={(e) => handleSubmit(e)}
            >
              {editingCategory ? 'Actualizar' : 'Guardar Categoría'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">
              Nombre de la Categoría *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              placeholder="Ej. Entradas, Bebidas, Cortes, etc."
              className="field"
            />
          </div>
        </form>
      </Drawer>
    </div>
  );
}
