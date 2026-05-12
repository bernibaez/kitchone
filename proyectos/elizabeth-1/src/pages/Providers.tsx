import React, { useMemo, useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { Provider } from '../types';
import { Plus, Search, X, Edit, Trash2, Phone, Mail, MapPin, UserCircle2 } from 'lucide-react';

const Input = ({ label, ...props }: { label: string; [key: string]: any }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
      {label}
    </label>
    <input
      {...props}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition"
    />
  </div>
);

interface ProviderFormProps {
  provider: Partial<Provider> | null;
  onClose: () => void;
  onSave: (data: Omit<Provider, 'id' | 'createdAt'>) => void;
}

const ProviderForm = ({ provider, onClose, onSave }: ProviderFormProps) => {
  const [formData, setFormData] = useState({
    name: provider?.name || '',
    contactName: provider?.contactName || '',
    phone: provider?.phone || '',
    email: provider?.email || '',
    address: provider?.address || '',
    rnc: provider?.rnc || '',
    active: provider?.active ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-800">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {provider?.id ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Nombre de la empresa"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
          <Input
            label="Persona de contacto"
            name="contactName"
            value={formData.contactName}
            onChange={handleChange}
          />
          <Input
            label="Teléfono"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
          />
          <Input
            label="Dirección"
            name="address"
            value={formData.address}
            onChange={handleChange}
          />
          <Input
            label="RNC"
            name="rnc"
            value={formData.rnc}
            onChange={handleChange}
          />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label
              htmlFor="active"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Proveedor Activo
            </label>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {provider?.id ? 'Guardar Cambios' : 'Crear Proveedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function Providers() {
  const { state, createProvider, updateProvider, deleteProvider } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingProvider, setEditingProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const filteredProviders = useMemo(() => {
    return state.providers.filter(p => {
      const q = searchTerm.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.contactName && p.contactName.toLowerCase().includes(q)) ||
        (p.email && p.email.toLowerCase().includes(q))
      );
    });
  }, [state.providers, searchTerm]);

  const handleAddNew = () => {
    setEditingProvider(null);
    setShowForm(true);
  };

  const handleEdit = (provider: Provider) => {
    setEditingProvider(provider);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar proveedor? Esta acción no se puede deshacer.')) return;
    setLoading(true);
    try {
      await deleteProvider(id);
      showSuccessMessage('Proveedor eliminado correctamente');
    } catch (error: any) {
      console.error('Error al eliminar proveedor:', error);
      showErrorMessage(error.message || 'Error al eliminar proveedor');
    }
    setLoading(false);
  };

  const handleSave = async (data: Omit<Provider, 'id' | 'createdAt'>) => {
    setLoading(true);
    try {
      if (editingProvider?.id) {
        await updateProvider(editingProvider.id, data);
        showSuccessMessage('Proveedor actualizado correctamente');
      } else {
        await createProvider(data);
        showSuccessMessage('Proveedor agregado correctamente');
      }
      setShowForm(false);
      setEditingProvider(null);
    } catch {
      showErrorMessage('Error al guardar proveedor');
    }
    setLoading(false);
  };

  const showSuccessMessage = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const showErrorMessage = (msg: string) => {
    setErrorMessage(msg);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  return (
    <div className="min-h-full bg-gray-50 p-4 dark:bg-gray-900/90 sm:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Proveedores</h1>
        <button
          onClick={handleAddNew}
          className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          <span>Añadir Proveedor</span>
        </button>
      </div>

      {successMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {successMessage}
        </div>
      )}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {errorMessage}
        </div>
      )}

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700/60 dark:bg-gray-800">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar proveedor por nombre, contacto o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border-gray-200 bg-gray-100/80 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/50"
          />
        </div>
      </div>

      <div className="space-y-3">
        {filteredProviders.map((provider) => (
          <div
            key={provider.id}
            className="grid grid-cols-12 items-center gap-4 rounded-lg bg-white p-3.5 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-gray-800/80"
          >
            <div className="col-span-12 flex items-center gap-4 sm:col-span-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-indigo-700">
                {provider.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{provider.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {provider.contactName || 'Sin persona de contacto'}
                </p>
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400">
                  {provider.rnc && <span>RNC: {provider.rnc}</span>}
                </div>
              </div>
            </div>
            <div className="col-span-6 space-y-1 text-xs sm:col-span-4">
              {provider.phone && (
                <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
                  <Phone className="h-3 w-3" />
                  <span>{provider.phone}</span>
                </div>
              )}
              {provider.email && (
                <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
                  <Mail className="h-3 w-3" />
                  <span>{provider.email}</span>
                </div>
              )}
              {provider.address && (
                <div className="flex items-center gap-1 text-gray-700 dark:text-gray-200">
                  <MapPin className="h-3 w-3" />
                  <span className="truncate">{provider.address}</span>
                </div>
              )}
            </div>
            <div className="col-span-6 flex items-center justify-end gap-2 sm:col-span-3">
              <span
                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  provider.active
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                }`}
              >
                {provider.active ? 'Activo' : 'Inactivo'}
              </span>
              <button
                onClick={() => handleEdit(provider)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                title="Editar proveedor"
              >
                <Edit size={16} />
              </button>
              <button
                onClick={() => handleDelete(provider.id)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
                title="Eliminar proveedor"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}

        {filteredProviders.length === 0 && (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <p>No se encontraron proveedores que coincidan con su búsqueda.</p>
          </div>
        )}
      </div>

      {showForm && (
        <ProviderForm
          provider={editingProvider}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}


