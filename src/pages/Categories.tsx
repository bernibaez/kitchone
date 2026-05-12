import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
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
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  is_active: boolean;
  created_at: string;
  dishes?: { count: number }[];
}

const CATEGORY_CONFIG: Record<string, { description: string; color: string; icon: any }> = {
  'Entradas': { description: 'Aperitivos y entradas', color: 'bg-amber-400', icon: Soup },
  'Platos Fuertes': { description: 'Platillos principales', color: 'bg-red-500', icon: UtensilsCrossed },
  'Especialidades': { description: 'Platillos de la casa', color: 'bg-emerald-500', icon: Pizza },
  'Postres': { description: 'Dulces y postres', color: 'bg-pink-400', icon: IceCream },
  'Bebidas': { description: 'Refrescos y cocteles', color: 'bg-blue-400', icon: Coffee },
  'Desayunos': { description: 'Para empezar el día', color: 'bg-orange-400', icon: Sandwich },
};

const DEFAULT_CONFIG = { description: 'Categoría del menú', color: 'bg-gray-400', icon: UtensilsCrossed };

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const { showNotification } = useNotification();

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
    } catch (error) {
      console.error('Error loading categories:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las categorías',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingCategory) {
        await supabase
          .from('categories')
          .update({ name: formData.name })
          .eq('id', editingCategory.id);
      } else {
        await supabase.from('categories').insert({ name: formData.name });
      }

      showNotification({
        type: 'success',
        title: editingCategory ? 'Categoría actualizada' : 'Categoría creada',
        message: 'La operación se realizó con éxito.',
      });
      setShowModal(false);
      setEditingCategory(null);
      setFormData({ name: '' });
      loadCategories();
    } catch (error) {
      console.error('Error saving category:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al guardar categoría',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar esta categoría?')) return;
    
    try {
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) throw error;
      
      showNotification({
        type: 'success',
        title: 'Categoría eliminada',
        message: 'La categoría ha sido eliminada correctamente.',
      });
      loadCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo eliminar la categoría',
      });
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name });
    setShowModal(true);
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
           <h1 className="text-2xl font-bold text-gray-900">Categorías</h1>
           <p className="text-gray-500 mt-1">Organiza los platillos por categoría</p>
        </div>
        <button
          onClick={() => {
            setEditingCategory(null);
            setFormData({ name: '' });
            setShowModal(true);
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center space-x-2 shadow-sm transition-all hover:shadow-md"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Categoría</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.map((category) => {
          const config = CATEGORY_CONFIG[category.name] || DEFAULT_CONFIG;
          const Icon = config.icon;
          const dishCount = category.dishes?.[0]?.count || 0;

          return (
            <div key={category.id} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
              <div className="absolute top-6 right-6 flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleEdit(category)}
                  className="p-1.5 text-gray-400 hover:text-orange-500 transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(category.id)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-start mb-4">
                <div className={`w-14 h-14 rounded-2xl ${config.color === 'bg-amber-400' ? 'bg-amber-100 text-amber-600' : config.color === 'bg-red-500' ? 'bg-red-100 text-red-600' : config.color === 'bg-emerald-500' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'} flex items-center justify-center text-xl`}>
                   <Icon className="w-7 h-7" />
                </div>
              </div>

              <h3 className="text-xl font-bold text-gray-900 mb-1">{category.name}</h3>
              <p className="text-gray-500 text-sm mb-6">{config.description}</p>

              <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                <span className="text-gray-600 text-sm font-medium">
                  {dishCount} {dishCount === 1 ? 'platillo' : 'platillos'}
                </span>
                <span className={`w-4 h-4 rounded-full ${config.color}`}></span>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl transform transition-all">
            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre de la Categoría
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all outline-none bg-gray-50 focus:bg-white"
                  placeholder="Ej. Entradas"
                  required
                />
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 bg-orange-500 text-white rounded-xl hover:bg-orange-600 font-medium transition-colors shadow-lg shadow-orange-500/30 disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
