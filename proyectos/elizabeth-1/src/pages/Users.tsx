import React, { useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { User } from '../types';
import {
  Plus,
  Search,
  Check,
  X,
  Edit,
  Trash2,
  Power,
} from 'lucide-react';

const Input = ({ label, inputClassName = '', ...props }: { label: string, inputClassName?: string, [key: string]: any }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input 
      {...props}
      className={`w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 bg-white transition ${inputClassName}`}
    />
  </div>
);

const UserForm = ({
  user,
  onClose,
  onSave,
}: {
  user: Partial<User> | null;
  onClose: () => void;
  onSave: (userData: Omit<User, 'id' | 'lastLogin'> & { password?: string }) => void;
}) => {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'vendedor',
    password: '',
    active: user?.active ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({...prev, [e.target.name]: e.target.value}));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {user?.id ? 'Editar Usuario' : 'Nuevo Usuario'}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre Completo" name="name" value={formData.name} onChange={handleChange} required inputClassName="font-bold text-gray-900 dark:text-white" />
          <Input label="Usuario" name="username" value={formData.username} onChange={handleChange} required inputClassName="font-bold text-gray-900 dark:text-white" />
          <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} inputClassName="font-bold text-gray-900 dark:text-white" />
          <Input label="Contraseña" name="password" type="password" value={formData.password} onChange={handleChange} required={!user?.id} inputClassName="font-bold text-gray-900 dark:text-white" />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Rol</label>
            <select name="role" value={formData.role} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-bold">
              <option value="admin">Administrador</option>
              <option value="vendedor">Vendedor</option>
            </select>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {user?.id ? 'Guardar Cambios' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const UserRow = ({ 
  user, 
  index,
  onEdit,
  onDelete,
  onToggleStatus,
  deleting = false,
}: { 
  user: User, 
  index: number,
  onEdit: (u: User) => void,
  onDelete: (id: string) => void,
  onToggleStatus: (u: User) => void, 
  deleting?: boolean,
}) => {
  const avatarColor = useMemo(() => {
    const colors = [
      'bg-pink-100 text-pink-700', 'bg-blue-100 text-blue-700', 'bg-yellow-100 text-yellow-700', 
      'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-indigo-100 text-indigo-700'
    ];
    return colors[Math.abs(String(user.id).charCodeAt(0)) % colors.length];
  }, [user.id]);

  return (
    <div className="grid grid-cols-12 items-center gap-4 rounded-lg bg-white p-3.5 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-gray-800/80">
      <div className="col-span-12 flex items-center gap-4 sm:col-span-4">
        <div className="relative flex-shrink-0">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full font-bold ${avatarColor}`}>
            {user.name.charAt(0).toUpperCase()}
          </div>
          <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold text-white dark:bg-gray-200 dark:text-gray-800">
            {index + 1}
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{user.email || 'Sin email'}</p>
        </div>
      </div>
      <div className="col-span-6 sm:col-span-2">
        <p className="font-medium text-gray-800 dark:text-gray-200">{user.username}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Usuario</p>
      </div>
      <div className="col-span-6 sm:col-span-2">
        <p className="font-medium text-gray-800 dark:text-gray-200">{user.role === 'admin' ? 'Administrador' : 'Vendedor'}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Rol</p>
      </div>
      <div className="col-span-6 sm:col-span-2">
        <p className="font-medium text-gray-800 dark:text-gray-200">{user.active ? 'Activo' : 'Inactivo'}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Estado</p>
      </div>
      <div className="col-span-12 flex items-center justify-end gap-2 sm:col-span-2">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onEdit(user)} 
            title="Editar Usuario"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => onToggleStatus(user)}
            title={user.active ? 'Marcar como Inactivo' : 'Marcar como Activo'}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${user.active ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900' : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          >
            <Power size={16} />
          </button>
          <button 
            onClick={() => onDelete(user.id)} 
            title="Eliminar Usuario"
            className={`flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 relative`}
            disabled={deleting}
          >
            {deleting ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <Trash2 size={16} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Users() {
  const { state, createUser, updateUser, deleteUser } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filteredUsers = useMemo(() => {
    return state.users
      .filter(u => {
        if (statusFilter === 'active') return u.active;
        if (statusFilter === 'inactive') return !u.active;
        return true;
      })
      .filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
        u.username.toLowerCase().includes(searchTerm.toLowerCase())
      );
  }, [state.users, searchTerm, statusFilter]);
  
  const handleAddNew = () => {
    setEditingUser(null);
    setShowForm(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setShowForm(true);
  };

  const handleToggleStatus = async (user: User) => {
    setLoading(true);
    try {
      await updateUser(user.id, { ...user, active: !user.active });
    } catch (e) {
      alert('Error al actualizar el estado del usuario');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro? Esta acción eliminará al usuario permanentemente.')) return;
    setDeletingId(id);
    setLoading(true);
    try {
      await deleteUser(id);
      setMessage({ type: 'success', text: 'Usuario eliminado correctamente.' });
    } catch (e) {
      setMessage({ type: 'error', text: 'Error al eliminar usuario. Puede que tenga ventas asociadas.' });
    }
    setLoading(false);
    setDeletingId(null);
    setTimeout(() => setMessage(null), 3000);
  };

  const handleSave = async (userData: Omit<User, 'id' | 'lastLogin'> & { password?: string }) => {
    setLoading(true);
    try {
      if (editingUser?.id) {
        await updateUser(editingUser.id, { ...userData, username: editingUser.username });
      } else {
        await createUser(userData);
      }
      setShowForm(false);
      setEditingUser(null);
    } catch (e: any) {
      if (e.message && e.message.includes('ya existe')) {
        alert('El nombre de usuario o el correo electrónico ya están registrados. Por favor, usa otros datos.');
      } else {
        alert('Error al guardar usuario. Intenta de nuevo.');
      }
    }
    setLoading(false);
  };

  return (
    <div className="mx-auto max-w-5xl py-8 px-4">
      {message && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-center font-semibold ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{message.text}</div>
      )}
      <div className="mb-8 flex flex-col items-center justify-between gap-4 sm:flex-row">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Usuarios</h1>
        <button
          onClick={handleAddNew}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white font-semibold shadow hover:bg-blue-700 transition"
        >
          <Plus className="h-5 w-5" /> Nuevo Usuario
        </button>
      </div>
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nombre, usuario o email..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 pl-10 pr-4 text-gray-900 dark:text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-2 top-2.5 h-5 w-5 text-gray-400" />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 py-2 px-3 text-gray-900 dark:text-white"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>
      <div className="space-y-3">
        {filteredUsers.map((user, idx) => (
          <UserRow
            key={user.id}
            user={user}
            index={idx}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus}
            deleting={deletingId === user.id}
          />
        ))}
        {filteredUsers.length === 0 && (
          <div className="rounded-lg bg-white p-6 text-center text-gray-400 shadow dark:bg-gray-800/80">
            No se encontraron usuarios.
          </div>
        )}
      </div>
      {showForm && (
        <UserForm
          user={editingUser}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
} 