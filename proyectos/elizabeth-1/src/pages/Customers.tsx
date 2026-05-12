import React, { useEffect, useState, useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { Customer } from '../types';
import {
  Plus,
  Search,
  Check,
  X,
  MoreHorizontal,
  Edit,
  Trash2,
  Power,
  CheckCircle,
} from 'lucide-react';

const Input = ({ label, ...props }: { label: string, [key: string]: any }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</label>
    <input 
      {...props}
      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition"
    />
  </div>
);

const CustomerForm = ({
  customer,
  onClose,
  onSave,
}: {
  customer: Partial<Customer> | null;
  onClose: () => void;
  onSave: (customerData: Omit<Customer, 'id' | 'totalPurchases' | 'createdAt' | 'lastPurchase'>) => void;
}) => {
  const [formData, setFormData] = useState({
    name: customer?.name || '',
    phone: customer?.phone || '',
    email: customer?.email || '',
    address: customer?.address || '',
    active: customer?.active ?? true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev, 
      [name]: type === 'checkbox' ? checked : value
    }));
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
            {customer?.id ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h2>
          <button onClick={onClose} className="rounded-full p-1 text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Nombre Completo" name="name" value={formData.name} onChange={handleChange} required />
          <Input label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
          <Input label="Teléfono" name="phone" value={formData.phone} onChange={handleChange} required />
          <Input label="Dirección" name="address" value={formData.address} onChange={handleChange} />
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="active"
              name="active"
              checked={formData.active}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
            />
            <label htmlFor="active" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Cliente Activo
            </label>
          </div>
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              {customer?.id ? 'Guardar Cambios' : 'Crear Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const CustomerRow = ({ 
  customer, 
  index,
  onEdit,
  onDelete,
  onToggleStatus,
  purchaseCount,
}: { 
  customer: Customer, 
  index: number,
  onEdit: (c: Customer) => void,
  onDelete: (id: string) => void,
  onToggleStatus: (c: Customer) => void, 
  purchaseCount: number,
}) => {
  const avatarColor = useMemo(() => {
    const colors = [
      'bg-pink-100 text-pink-700', 'bg-blue-100 text-blue-700', 'bg-yellow-100 text-yellow-700', 
      'bg-green-100 text-green-700', 'bg-purple-100 text-purple-700', 'bg-indigo-100 text-indigo-700'
    ];
    return colors[Math.abs(String(customer.id).charCodeAt(0)) % colors.length];
  }, [customer.id]);

  const formatDate = (date: Date | undefined) => date ? new Date(date).toLocaleDateString('es-DO', { year: 'numeric', month: 'short', day: 'numeric' }) : '-';

  return (
    <div className="grid grid-cols-12 items-center gap-4 rounded-lg bg-white p-3.5 shadow-sm transition-all duration-300 hover:shadow-md dark:bg-gray-800/80">
      <div className="col-span-12 flex items-center gap-4 sm:col-span-4">
        <div className="relative flex-shrink-0">
          <div className={`flex h-11 w-11 items-center justify-center rounded-full font-bold ${avatarColor}`}>
            {customer.name.charAt(0).toUpperCase()}
          </div>
          <span className="absolute -top-1 -left-1 flex h-5 w-5 items-center justify-center rounded-full bg-gray-700 text-xs font-semibold text-white dark:bg-gray-200 dark:text-gray-800">
            {index + 1}
          </span>
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white">{customer.name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{customer.email || 'Sin email'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
              customer.active 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' 
                : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
            }`}>
              {customer.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
        </div>
      </div>
      <div className="col-span-6 sm:col-span-2">
        <p className="font-medium text-gray-800 dark:text-gray-200">{purchaseCount}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Compras realizadas</p>
      </div>
      <div className="col-span-6 sm:col-span-2">
        <p className="font-medium text-gray-800 dark:text-gray-200">{formatDate(customer.lastPurchase)}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Última Compra</p>
      </div>
      <div className="col-span-12 flex items-center justify-end gap-2 sm:col-span-4">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onEdit(customer)} 
            title="Editar Cliente"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            <Edit size={16} />
          </button>
          <button 
            onClick={() => onToggleStatus(customer)}
            title={customer.active ? 'Marcar como Inactivo' : 'Marcar como Activo'}
            className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
              customer.active 
                ? 'bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900' 
                : 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/40 dark:text-red-300 dark:hover:bg-red-900'
            }`}
          >
            {customer.active ? <CheckCircle size={16} /> : <Power size={16} />}
          </button>
          <button 
            onClick={() => onDelete(customer.id)} 
            title="Eliminar Cliente"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition-colors hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Customers() {
  const { state, dispatch, createCustomer, updateCustomer, deleteCustomer } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const filteredCustomers = useMemo(() => {
    return state.customers
      .filter(c => {
        if (statusFilter === 'active') return c.active;
        if (statusFilter === 'inactive') return !c.active;
        return true;
      })
      .filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
  }, [state.customers, searchTerm, statusFilter]);
  
  const handleAddNew = () => {
    setEditingCustomer(null);
    setShowForm(true);
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const handleToggleStatus = async (customer: Customer) => {
    setLoading(true);
    try {
      const updateData = {
        name: customer.name,
        email: customer.email || '',
        phone: customer.phone,
        address: customer.address || '',
        active: !customer.active
      };
      
      await updateCustomer(customer.id, updateData);
      const newStatus = !customer.active;
      showSuccessMessage(
        newStatus 
          ? `Cliente "${customer.name}" activado correctamente` 
          : `Cliente "${customer.name}" desactivado correctamente`
      );
    } catch (e) {
      showErrorMessage('Error al actualizar el estado del cliente');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar cliente?')) return;
    setLoading(true);
    try {
      await deleteCustomer(id);
      showSuccessMessage('Cliente eliminado correctamente');
    } catch (e) {
      showErrorMessage('Error al eliminar cliente');
    }
    setLoading(false);
  };
  
  const handleSave = async (data: Omit<Customer, 'id' | 'totalPurchases' | 'createdAt' | 'lastPurchase'>) => {
    setLoading(true);
    try {
      if (editingCustomer?.id) {
        await updateCustomer(editingCustomer.id, data);
        showSuccessMessage('Cliente actualizado correctamente');
      } else {
        await createCustomer(data);
        showSuccessMessage('Cliente agregado correctamente');
      }
      setShowForm(false);
      setEditingCustomer(null);
    } catch (e) {
      showErrorMessage('Error al guardar cliente');
    }
    setLoading(false);
  };

  const TABS = useMemo(() => ([
    { id: 'all', label: 'Todos', count: state.customers.length },
    { id: 'active', label: 'Activos', count: state.customers.filter(c => c.active).length },
    { id: 'inactive', label: 'Inactivos', count: state.customers.filter(c => !c.active).length },
  ]), [state.customers]);

  // Calcular la cantidad de compras por cliente
  const customerPurchaseCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    state.sales.forEach(sale => {
      if (sale.customerId) {
        counts[sale.customerId] = (counts[sale.customerId] || 0) + 1;
      }
    });
    return counts;
  }, [state.sales]);

  // Función para mostrar mensaje de éxito
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Función para mostrar mensaje de error
  const showErrorMessage = (message: string) => {
    setErrorMessage(message);
    setTimeout(() => setErrorMessage(''), 5000);
  };

  return (
    <div className="min-h-full bg-gray-50 p-4 dark:bg-gray-900/90 sm:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Clientes</h1>
        <button onClick={handleAddNew} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          <span>Añadir Cliente</span>
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in">
          {errorMessage}
        </div>
      )}

      <div className="mb-5 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700/60 dark:bg-gray-800">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Buscar cliente por nombre o email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border-gray-200 bg-gray-100/80 py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900/50"
          />
        </div>
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex space-x-6">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id as any)}
                className={`whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  statusFilter === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                {tab.label} <span className={`ml-1.5 rounded-full px-2 py-0.5 text-xs ${statusFilter === tab.id ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'}`}>{tab.count}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      <div className="space-y-3">
        {filteredCustomers.map((customer, i) => (
          <CustomerRow 
            key={customer.id} 
            customer={customer} 
            index={i} 
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggleStatus={handleToggleStatus} 
            purchaseCount={customerPurchaseCounts[customer.id] || 0}
          />
        ))}
        {filteredCustomers.length === 0 && (
          <div className="py-12 text-center text-gray-500 dark:text-gray-400">
            <p>No se encontraron clientes que coincidan con su búsqueda.</p>
          </div>
        )}
      </div>

      {showForm && (
        <CustomerForm 
          customer={editingCustomer}
          onClose={() => setShowForm(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}