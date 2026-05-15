import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useNotification } from '../contexts/NotificationContext';
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  X,
  Shield,
  ChefHat,
  UserRound,
  DollarSign
} from 'lucide-react';
import type { UserRole } from '../lib/database.types';

interface UserProfile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  email?: string;
  allowed_modules?: string[];
}

export const AVAILABLE_MODULES = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'users', label: 'Usuarios' },
  { id: 'customers', label: 'Clientes' },
  { id: 'categories', label: 'Categorías' },
  { id: 'dishes', label: 'Platillos' },
  { id: 'tables', label: 'Mesas' },
  { id: 'expenses', label: 'Gastos' },
  { id: 'sales', label: 'Facturación' },
  { id: 'orders', label: 'Órdenes' },
  { id: 'kitchen', label: 'Cocina' },
  { id: 'history', label: 'Historial' },
  { id: 'reports', label: 'Reportes' },
  { id: 'config', label: 'Configuración' },
];

export const DEFAULT_MODULES_BY_ROLE: Record<string, string[]> = {
  admin: ['dashboard', 'users', 'customers', 'categories', 'dishes', 'tables', 'expenses', 'sales', 'orders', 'kitchen', 'history', 'reports', 'config'],
  mesero: ['dashboard', 'customers', 'sales', 'orders'],
  cocinero: ['dashboard', 'kitchen'],
};

const ROLE_CONFIG: Record<string, { label: string; icon: any; color: string; modules: string[] }> = {
  admin: {
    label: 'Administrador',
    icon: Shield,
    color: 'bg-orange-500',
    modules: ['Dashboard', 'Inventario', 'Órdenes', '+7'],
  },
  mesero: {
    label: 'Mesero',
    icon: UserRound,
    color: 'bg-blue-600',
    modules: ['Órdenes'],
  },
  cocinero: {
    label: 'Cocinero',
    icon: ChefHat,
    color: 'bg-emerald-500',
    modules: ['Cocina'],
  },
  cajero: {
    label: 'Cajero',
    icon: DollarSign,
    color: 'bg-yellow-500',
    modules: ['Facturación'],
  }
};

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'mesero' as UserRole,
    allowed_modules: DEFAULT_MODULES_BY_ROLE['mesero'],
  });
  const { showNotification } = useNotification();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data: profiles, error } = await supabase
        .from('users_profile')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error loading users:', error);
        showNotification({
          type: 'error',
          title: 'Database Error',
          message: `Failed to load users: ${error.message}`,
        });
        return;
      }

      if (profiles) {
        setUsers(profiles);
      }
    } catch (error) {
      console.error('Error loading users:', error);
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Failed to load users',
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleCounts = () => {
    const counts = { admin: 0, mesero: 0, cocinero: 0, cajero: 0 };
    users.forEach(user => {
      if (counts[user.role] !== undefined) {
        counts[user.role]++;
      }
    });
    return counts;
  };

  const roleCounts = getRoleCounts();



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingUser) {
        const { error } = await supabase
          .from('users_profile')
          .update({
            full_name: formData.full_name,
            role: formData.role,
            allowed_modules: formData.allowed_modules,
          })
          .eq('id', editingUser.id);
        if (error) throw error;
      } else {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('No se encontraron las credenciales de Supabase en el entorno.');
        }

        // Cliente secundario sin persistencia de sesión para no desloguear al admin
        const secondarySupabase = createClient(supabaseUrl, supabaseAnonKey, {
          auth: {
            autoRefreshToken: false,
            persistSession: false,
          },
        });

        const { data: signUpData, error: signUpError } = await secondarySupabase.auth.signUp({
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
        });

        if (signUpError) {
          throw new Error(signUpError.message);
        }

        if (!signUpData.user) {
          throw new Error('No se pudo crear el usuario en el sistema de autenticación.');
        }

        // Insertar el perfil con el cliente principal (ya que el script SQL ahora le da permiso al Admin)
        const { error: profileError } = await supabase.from('users_profile').insert({
          id: signUpData.user.id,
          full_name: formData.full_name.trim(),
          role: formData.role,
          allowed_modules: formData.allowed_modules,
        });

        if (profileError) {
          throw new Error(`Error al crear el perfil: ${profileError.message}`);
        }
      }

      showNotification({
        type: 'success',
        title: editingUser ? 'Usuario actualizado' : 'Usuario creado',
        message: editingUser
          ? 'El usuario se actualizó correctamente.'
          : `Usuario "${formData.full_name}" creado exitosamente. Ya puede iniciar sesión.`,
      });
      setShowModal(false);
      setEditingUser(null);
      setFormData({ email: '', password: '', full_name: '', role: 'mesero', allowed_modules: DEFAULT_MODULES_BY_ROLE['mesero'] });
      loadUsers();
    } catch (error: unknown) {
      console.error('Error saving user:', error);
      const message =
        error instanceof Error ? error.message : typeof error === 'string' ? error : 'Error al guardar usuario';
      showNotification({
        type: 'error',
        title: 'Error',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) return;

    try {
      const { error } = await supabase
        .from('users_profile')
        .update({ is_active: false })
        .eq('id', id);

      if (error) {
        throw error;
      }

      showNotification({ type: 'success', title: 'Usuario eliminado', message: 'Usuario eliminado correctamente' });
      loadUsers();
    } catch (error: unknown) {
      console.error('Error deleting user:', error);
      const message = error instanceof Error ? error.message : 'No se pudo eliminar el usuario';
      showNotification({ type: 'error', title: 'Error', message });
    }
  };

  const handleEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormData({
      email: '',
      password: '',
      full_name: user.full_name,
      role: user.role,
      allowed_modules: user.allowed_modules || DEFAULT_MODULES_BY_ROLE[user.role] || [],
    });
    setShowModal(true);
  };

  const filteredUsers = users.filter(user =>
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading && users.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Usuarios</h1>
          <p className="text-gray-500 mt-1">Gestiona los usuarios y permisos</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setFormData({ email: '', password: '', full_name: '', role: 'mesero', allowed_modules: DEFAULT_MODULES_BY_ROLE['mesero'] });
            setShowModal(true);
          }}
          className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 flex items-center space-x-2 shadow-sm"
        >
          <Plus className="w-5 h-5" />
          <span>Nuevo Usuario</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {['admin', 'mesero', 'cocinero', 'cajero'].map((roleKey) => {
          const config = ROLE_CONFIG[roleKey];
          const count = roleCounts[roleKey as keyof typeof roleCounts] || 0;
          const Icon = config.icon;

          // Render specific colors for cards based on design
          const iconBg = roleKey === 'admin' ? 'bg-orange-500' :
            roleKey === 'mesero' ? 'bg-blue-600' :
              roleKey === 'cocinero' ? 'bg-emerald-500' : 'bg-yellow-500';

          return (
            <div key={roleKey} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
              <div className="flex items-start space-x-4">
                <div className={`p-3 rounded-xl ${iconBg} text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{config.label}</h3>
                  <p className="text-gray-500 text-sm">{count} usuarios</p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-50 text-xs text-gray-500">
                Módulos: {roleKey === 'admin' ? 10 : 1}
              </div>
            </div>
          )
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-none bg-gray-50 rounded-lg focus:ring-0 text-sm"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Rol
                </th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Módulos
                </th>
                <th className="px-6 py-4 text-right text-xs font-bold text-gray-900 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => {
                const initials = user.full_name
                  .split(' ')
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((p) => p[0]?.toUpperCase())
                  .join('');

                const roleConfig = ROLE_CONFIG[user.role] || ROLE_CONFIG['mesero'];
                const RoleIcon = roleConfig.icon;

                return (
                  <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                          {initials}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm text-gray-500">{user.email || 'sin-email@restaurant.com'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-medium text-white ${user.role === 'admin' ? 'bg-orange-500' :
                          user.role === 'mesero' ? 'bg-blue-600' : 'bg-emerald-500'
                        }`}>
                        <RoleIcon className="w-3.5 h-3.5" />
                        <span>{roleConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {(user.allowed_modules || roleConfig.modules).slice(0, 3).map((mod, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-medium">
                            {mod}
                          </span>
                        ))}
                        {(user.allowed_modules || roleConfig.modules).length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 rounded text-xs text-gray-600 font-medium">
                            +{ (user.allowed_modules || roleConfig.modules).length - 3 }
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => handleEdit(user)}
                          className="p-2 text-gray-400 hover:text-orange-500 transition-colors"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user.id)}
                          className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Correo Electrónico
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all outline-none"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña
                    </label>
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all outline-none"
                      required
                      minLength={6}
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => {
                    const newRole = e.target.value as UserRole;
                    setFormData({ 
                      ...formData, 
                      role: newRole,
                      allowed_modules: DEFAULT_MODULES_BY_ROLE[newRole] || []
                    });
                  }}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-gray-50 focus:bg-white transition-all outline-none"
                >
                  <option value="mesero">Mesero</option>
                  <option value="cocinero">Cocinero</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Módulos Permitidos
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                  {AVAILABLE_MODULES.map((module) => (
                    <label key={module.id} className="flex items-center space-x-2 cursor-pointer p-2 rounded-lg hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-colors">
                      <input
                        type="checkbox"
                        checked={formData.allowed_modules.includes(module.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, allowed_modules: [...formData.allowed_modules, module.id] });
                          } else {
                            setFormData({ ...formData, allowed_modules: formData.allowed_modules.filter(id => id !== module.id) });
                          }
                        }}
                        className="rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                      />
                      <span className="text-sm text-gray-700">{module.label}</span>
                    </label>
                  ))}
                </div>
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
