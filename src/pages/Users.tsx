import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { useToast } from '../components/ui/Toast';
import {
  PageHeader,
  Button,
  IconButton,
  StatCard,
  Panel,
  Tag,
  Avatar,
  Drawer,
  SearchInput,
  DataTable,
  type Column,
  EmptyState,
} from '../components/ui';
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  ChefHat,
  UserRound,
  DollarSign,
  Users as UsersIcon,
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
  cajero: ['dashboard', 'sales', 'history'],
};

const ROLE_LABELS: Record<string, { label: string; tone: 'accent' | 'info' | 'ok' | 'warn' | 'neutral' }> = {
  admin: { label: 'Administrador', tone: 'accent' },
  mesero: { label: 'Mesero', tone: 'info' },
  cocinero: { label: 'Cocinero', tone: 'ok' },
  cajero: { label: 'Cajero', tone: 'warn' },
};

export default function Users() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'mesero' as UserRole,
    allowed_modules: DEFAULT_MODULES_BY_ROLE['mesero'],
  });
  const { toast } = useToast();

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

      if (error) throw error;
      if (profiles) setUsers(profiles);
    } catch (error: any) {
      toast({ title: 'Error al cargar usuarios', message: error.message, tone: 'bad' });
    } finally {
      setLoading(false);
    }
  };

  const roleCounts = useMemo(() => {
    const counts = { admin: 0, mesero: 0, cocinero: 0, cajero: 0 };
    for (const u of users) {
      if (counts[u.role] !== undefined) {
        counts[u.role]++;
      }
    }
    return counts;
  }, [users]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      if (editingUser) {
        const { error } = await supabase
          .from('users_profile')
          .update({
            full_name: formData.full_name.trim(),
            role: formData.role,
            allowed_modules: formData.allowed_modules,
          })
          .eq('id', editingUser.id);
        if (error) throw error;

        toast({
          title: 'Usuario actualizado',
          message: formData.full_name,
          tone: 'ok',
        });
      } else {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('No se encontraron las credenciales de Supabase en el entorno.');
        }

        // Cliente secundario sin persistencia para no desloguear al admin
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

        if (signUpError) throw signUpError;
        if (!signUpData.user) throw new Error('No se pudo crear el usuario.');

        const { error: profileError } = await supabase.from('users_profile').insert({
          id: signUpData.user.id,
          full_name: formData.full_name.trim(),
          role: formData.role,
          allowed_modules: formData.allowed_modules,
        });

        if (profileError) throw profileError;

        toast({
          title: 'Usuario creado',
          message: `${formData.full_name} registrado exitosamente`,
          tone: 'ok',
        });
      }

      setShowDrawer(false);
      setEditingUser(null);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        role: 'mesero',
        allowed_modules: DEFAULT_MODULES_BY_ROLE['mesero'],
      });
      loadUsers();
    } catch (error: any) {
      toast({ title: 'Error al guardar usuario', message: error.message, tone: 'bad' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas desactivar al usuario "${name}"?`)) return;

    try {
      const { error } = await supabase
        .from('users_profile')
        .update({ is_active: false })
        .eq('id', id);

      if (error) throw error;

      toast({ title: 'Usuario desactivado', message: name, tone: 'ok' });
      loadUsers();
    } catch (error: any) {
      toast({ title: 'Error al desactivar usuario', message: error.message, tone: 'bad' });
    }
  };

  const handleOpenCreate = () => {
    setEditingUser(null);
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'mesero',
      allowed_modules: DEFAULT_MODULES_BY_ROLE['mesero'],
    });
    setShowDrawer(true);
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
    setShowDrawer(true);
  };

  const filteredUsers = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return users;
    return users.filter(
      (u) =>
        u.full_name.toLowerCase().includes(term) ||
        (u.email && u.email.toLowerCase().includes(term)) ||
        u.role.toLowerCase().includes(term)
    );
  }, [users, searchTerm]);

  const columns: Column<UserProfile>[] = [
    {
      key: 'user',
      header: 'Usuario',
      sortValue: (u) => u.full_name,
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar name={u.full_name} size="md" />
          <div className="flex flex-col">
            <span className="font-semibold text-ink dark:text-line">{u.full_name}</span>
            <span className="text-xs text-muted truncate max-w-[200px]">
              {u.email || 'Credenciales de acceso activas'}
            </span>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      cell: (u) => {
        const conf = ROLE_LABELS[u.role] || { label: u.role, tone: 'neutral' };
        return <Tag tone={conf.tone}>{conf.label}</Tag>;
      },
    },
    {
      key: 'modules',
      header: 'Módulos Permitidos',
      cell: (u) => {
        const mods = u.allowed_modules || DEFAULT_MODULES_BY_ROLE[u.role] || [];
        return (
          <div className="flex flex-wrap items-center gap-1 max-w-[260px]">
            {mods.slice(0, 3).map((mod) => (
              <span
                key={mod}
                className="px-2 py-0.5 rounded bg-surface-2 border border-line text-[11px] font-medium text-fg"
              >
                {mod}
              </span>
            ))}
            {mods.length > 3 && (
              <span className="text-[11px] font-bold text-muted tabular-nums">
                +{mods.length - 3} más
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      cell: (u) => (
        <div className="flex items-center justify-end gap-1">
          <IconButton
            label="Editar usuario"
            variant="ghost"
            size="sm"
            onClick={() => handleEdit(u)}
          >
            <Pencil className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Desactivar usuario"
            variant="ghost"
            size="sm"
            onClick={() => handleDelete(u.id, u.full_name)}
          >
            <Trash2 className="h-4 w-4 text-bad" />
          </IconButton>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gestión de Personal"
        description="Administración de cuentas de empleados, roles de acceso y permisos por módulo"
        actions={
          <Button
            variant="pri"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={handleOpenCreate}
          >
            Nuevo Usuario
          </Button>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Administradores"
          value={roleCounts.admin}
          icon={<Shield className="h-5 w-5 text-accent" />}
          tone="accent"
        />
        <StatCard
          label="Meseros"
          value={roleCounts.mesero}
          icon={<UserRound className="h-5 w-5 text-info" />}
          tone="info"
        />
        <StatCard
          label="Cocineros"
          value={roleCounts.cocinero}
          icon={<ChefHat className="h-5 w-5 text-ok" />}
          tone="ok"
        />
        <StatCard
          label="Cajeros"
          value={roleCounts.cajero}
          icon={<DollarSign className="h-5 w-5 text-warn" />}
          tone="warn"
        />
      </div>

      {/* Directorio de usuarios */}
      <Panel
        title="Plantilla de Empleados"
        description={`${filteredUsers.length} usuarios activos`}
        action={
          <div className="w-64">
            <SearchInput
              value={searchTerm}
              onChange={setSearchTerm}
              placeholder="Buscar por nombre o rol..."
            />
          </div>
        }
      >
        <DataTable<UserProfile>
          columns={columns}
          rows={filteredUsers}
          rowKey={(u) => u.id}
          loading={loading}
          pageSize={10}
          empty={
            <EmptyState
              icon={<UsersIcon className="h-10 w-10 text-muted" />}
              title={searchTerm ? 'Sin coincidencias' : 'No hay usuarios registrados'}
              description={
                searchTerm
                  ? 'Intenta con otro término de búsqueda.'
                  : 'Crea las cuentas de tus meseros y cocineros para que accedan al sistema.'
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
                    Crear primer usuario
                  </Button>
                )
              }
            />
          }
        />
      </Panel>

      {/* Drawer: Crear / Editar Usuario */}
      <Drawer
        open={showDrawer}
        onClose={() => {
          setShowDrawer(false);
          setEditingUser(null);
        }}
        title={editingUser ? `Editar — ${editingUser.full_name}` : 'Nuevo Usuario'}
        description="Asigna rol y selecciona los módulos del sistema a los que tendrá acceso"
        size="md"
        footer={
          <div className="flex items-center justify-end gap-2 w-full">
            <Button
              variant="ghost"
              onClick={() => {
                setShowDrawer(false);
                setEditingUser(null);
              }}
            >
              Cancelar
            </Button>
            <Button
              variant="pri"
              loading={saving}
              onClick={(e) => handleSubmit(e)}
            >
              {editingUser ? 'Guardar Cambios' : 'Crear Usuario'}
            </Button>
          </div>
        }
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingUser && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="usuario@kitchone.com"
                  className="field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  className="field"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Nombre Completo *
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              placeholder="Ej. Roberto Gómez"
              className="field"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1">
              Rol Principal *
            </label>
            <select
              value={formData.role}
              onChange={(e) => {
                const newRole = e.target.value as UserRole;
                setFormData({
                  ...formData,
                  role: newRole,
                  allowed_modules: DEFAULT_MODULES_BY_ROLE[newRole] || [],
                });
              }}
              className="field"
            >
              <option value="mesero">Mesero (Toma de órdenes y mesas)</option>
              <option value="cocinero">Cocinero (Pantalla KDS de cocina)</option>
              <option value="cajero">Cajero (Facturación y cobro)</option>
              <option value="admin">Administrador (Acceso completo)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-2">
              Módulos Habilitados en el Menú
            </label>
            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg border border-line bg-surface-2">
              {AVAILABLE_MODULES.map((module) => {
                const checked = formData.allowed_modules.includes(module.id);
                return (
                  <label
                    key={module.id}
                    className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer text-xs font-medium transition-colors border ${
                      checked
                        ? 'border-accent/40 bg-surface text-ink dark:text-line shadow-xs'
                        : 'border-transparent text-muted hover:text-fg'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({
                            ...formData,
                            allowed_modules: [...formData.allowed_modules, module.id],
                          });
                        } else {
                          setFormData({
                            ...formData,
                            allowed_modules: formData.allowed_modules.filter((id) => id !== module.id),
                          });
                        }
                      }}
                      className="rounded border-line text-accent focus:ring-accent"
                    />
                    <span>{module.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </form>
      </Drawer>
    </div>
  );
}
