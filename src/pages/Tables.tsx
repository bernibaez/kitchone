import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import { Plus, Pencil, Search, X, LayoutGrid, Trash2, Users } from 'lucide-react';

interface Table {
  id: string;
  table_number: string;
  capacity: number;
  is_active: boolean;
  created_at: string;
}

export default function Tables() {
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    table_number: '',
    capacity: '4',
  });
  const { showNotification } = useNotification();

  useEffect(() => {
    loadTables();
  }, []);

  const loadTables = async () => {
    try {
      const { data } = await supabase
        .from('tables')
        .select('*')
        .order('table_number');

      if (data) setTables(data);
    } catch (error) {
      console.error('Error loading tables:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const tableData = {
        table_number: formData.table_number,
        capacity: parseInt(formData.capacity),
      };

      if (editingTable) {
        await supabase
          .from('tables')
          .update(tableData)
          .eq('id', editingTable.id);
      } else {
        await supabase.from('tables').insert(tableData);
      }

      showNotification({
        type: 'success',
        title: editingTable ? 'Mesa actualizada' : 'Mesa creada',
        message: editingTable
          ? 'La mesa se actualizó correctamente.'
          : 'La mesa se creó correctamente.',
      });
      setShowModal(false);
      setEditingTable(null);
      setFormData({ table_number: '', capacity: '4' });
      loadTables();
    } catch (error) {
      console.error('Error saving table:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al guardar mesa',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (table: Table) => {
    setEditingTable(table);
    setFormData({
      table_number: table.table_number,
      capacity: table.capacity.toString(),
    });
    setShowModal(true);
  };

  const handleToggleActive = async (table: Table) => {
    try {
      await supabase
        .from('tables')
        .update({ is_active: !table.is_active })
        .eq('id', table.id);
      loadTables();
    } catch (error) {
      console.error('Error toggling table status:', error);
    }
  };

  const handleDelete = async (table: Table) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la Mesa ${table.table_number}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tables')
        .delete()
        .eq('id', table.id);

      if (error) throw error;

      showNotification({
        type: 'success',
        title: 'Mesa eliminada',
        message: 'La mesa se eliminó correctamente.',
      });
      loadTables();
    } catch (error) {
      console.error('Error deleting table:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error al eliminar mesa',
      });
    }
  };

  const filteredTables = tables.filter(table =>
    table.table_number.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar mesas..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => {
            setEditingTable(null);
            setFormData({ table_number: '', capacity: '4' });
            setShowModal(true);
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Nueva Mesa</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {filteredTables.map((table) => (
          <div
            key={table.id}
            className={`bg-white rounded-2xl shadow-sm p-5 border transition-all hover:shadow-md group relative overflow-hidden ${table.is_active ? 'border-gray-100' : 'border-red-100 bg-red-50/30'
              }`}
          >
            {/* Active Status Dot */}
            <div className={`absolute top-4 right-4 w-2.5 h-2.5 rounded-full ${table.is_active ? 'bg-emerald-400' : 'bg-red-400'
              }`} />

            <div className="flex items-start justify-between mb-4">
              {/* Icon Box */}
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-orange-600 mb-2 ${table.is_active ? 'bg-orange-50' : 'bg-white'
                }`}>
                <LayoutGrid className="w-6 h-6" />
              </div>
            </div>

            <div>
              <h3 className="text-xl font-bold text-gray-900 leading-tight">Mesa {table.table_number}</h3>
              <div className="flex items-center gap-2 mt-1 text-gray-500 text-sm font-medium">
                <Users className="w-4 h-4" />
                <span>{table.capacity} Personas</span>
              </div>
            </div>

            {/* Actions Toolbar */}
            <div className="flex items-center gap-2 mt-6 pt-4 border-t border-gray-100">
              <button
                onClick={() => handleToggleActive(table)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-colors ${table.is_active
                    ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    : 'bg-red-100 text-red-600 hover:bg-red-200'
                  }`}
              >
                {table.is_active ? 'Desactivar' : 'Activar'}
              </button>

              <button
                onClick={() => handleEdit(table)}
                className="p-2 text-gray-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleDelete(table)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {
        showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingTable ? 'Editar Mesa' : 'Nueva Mesa'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Mesa
                  </label>
                  <input
                    type="text"
                    value={formData.table_number}
                    onChange={(e) => setFormData({ ...formData, table_number: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Capacidad (personas)
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    required
                    min="1"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }
    </div >
  );
}
