import React, { useState, useRef } from 'react';
import { useApp } from '../contexts/AppContext';
import { Settings, Database, Printer, Globe, Shield, Bell } from 'lucide-react';

const socialFields = [
  { key: 'facebook', label: 'Facebook' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'twitter', label: 'Twitter' },
];

export default function Config() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState<{
    name: string;
    address: string;
    phone: string;
    email: string;
    logo: string;
    message: string;
    socials: { [key: string]: string };
    taxRate: number;
    currency: string;
    currencySymbol: string;
  }>({
    name: state.config.name || '',
    address: state.config.address || '',
    phone: state.config.phone || '',
    email: state.config.email || '',
    logo: state.config.logo || '',
    message: state.config.message || '',
    socials: state.config.socials || {},
    taxRate: state.config.taxRate || 18,
    currency: state.config.currency || 'DOP',
    currencySymbol: state.config.currencySymbol || '$',
  });
  const fileInput = useRef<HTMLInputElement>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'general' | 'tax' | 'printing' | 'notifications'>('general');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSocialChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, socials: { ...prev.socials, [name]: value } }));
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm(prev => ({ ...prev, logo: ev.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    dispatch({ type: 'SET_CONFIG', payload: {
      ...state.config,
      ...form,
      socials: form.socials,
      message: form.message,
      logo: form.logo,
      taxRate: form.taxRate,
      currency: form.currency,
      currencySymbol: form.currencySymbol,
    }});
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2500);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      {showSuccess && (
        <div className="fixed top-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in font-semibold text-lg">
          <span className="mr-2">✅</span>Configuración guardada correctamente
        </div>
      )}
      
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <Settings className="h-6 w-6" />
        Configuración del Sistema
      </h1>
      
      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('general')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'general'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Globe className="h-4 w-4" />
            General
          </button>
          <button
            onClick={() => setActiveTab('tax')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'tax'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Database className="h-4 w-4" />
            Impuestos
          </button>
          <button
            onClick={() => setActiveTab('printing')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'printing'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Printer className="h-4 w-4" />
            Impresión
          </button>
          <button
            onClick={() => setActiveTab('notifications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'notifications'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Bell className="h-4 w-4" />
            Notificaciones
          </button>
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* General Tab */}
        {activeTab === 'general' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Información de la Empresa</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nombre de la empresa</label>
                <input 
                  name="name" 
                  value={form.name} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" 
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Teléfono</label>
                <input 
                  name="phone" 
                  value={form.phone} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input 
                  name="email" 
                  value={form.email} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Moneda</label>
                <select
                  name="currency"
                  value={form.currency || 'DOP'}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="DOP">Pesos Dominicanos (DOP)</option>
                  <option value="USD">Dólares Americanos (USD)</option>
                  <option value="EUR">Euros (EUR)</option>
                </select>
              </div>
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Dirección</label>
              <input 
                name="address" 
                value={form.address} 
                onChange={handleChange} 
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" 
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Logo</label>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInput} 
                onChange={handleLogoChange} 
                className="mb-2" 
              />
              {form.logo && <img src={form.logo} alt="Logo" className="h-16 mt-2" />}
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Mensaje de compra (aparecerá en la factura)</label>
              <textarea 
                name="message" 
                value={form.message} 
                onChange={handleChange} 
                className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" 
                rows={2} 
              />
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-1">Redes Sociales</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {socialFields.map(field => (
                  <input
                    key={field.key}
                    name={field.key}
                    placeholder={field.label}
                    value={form.socials[field.key] || ''}
                    onChange={handleSocialChange}
                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white"
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tax Tab */}
        {activeTab === 'tax' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Configuración de Impuestos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Tasa de Impuesto (%)</label>
                <input 
                  name="taxRate" 
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={form.taxRate} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Símbolo de Moneda</label>
                <input 
                  name="currencySymbol" 
                  value={form.currencySymbol || '$'} 
                  onChange={handleChange} 
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" 
                />
              </div>
            </div>
          </div>
        )}

        {/* Printing Tab */}
        {activeTab === 'printing' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Configuración de Impresión</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Configuración de Facturas</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Las facturas se imprimirán con alta calidad y resolución optimizada para papel.
                </p>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
                  <li>Formato A4 estándar</li>
                  <li>Alta resolución (300 DPI)</li>
                  <li>Encabezado y pie de página personalizados</li>
                  <li>Información de empresa y cliente</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold mb-4">Configuración de Notificaciones</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h3 className="font-medium mb-2">Sistema de Notificaciones</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  El sistema puede enviar notificaciones para alertas importantes.
                </p>
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-300 list-disc list-inside">
                  <li>Alertas de stock bajo</li>
                  <li>Notificaciones de ventas</li>
                  <li>Recordatorios de sistema</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        <div className="flex justify-end">
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            Guardar Configuración
          </button>
        </div>
      </form>
      
      {/* Opciones adicionales de configuración */}
      <div className="mt-8 space-y-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Configuración del Sistema</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Base de Datos</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">Respaldo automático</span>
                  <input type="checkbox" className="rounded" defaultChecked />
                </label>
                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">Sincronización en la nube</span>
                  <input type="checkbox" className="rounded" />
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Seguridad</h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">Autenticación de dos factores</span>
                  <input type="checkbox" className="rounded" />
                </label>
                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">Sesión automática</span>
                  <input type="checkbox" className="rounded" defaultChecked />
                </label>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Interfaz</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Tema</label>
                  <select className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option>Claro</option>
                    <option>Oscuro</option>
                    <option>Automático</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Idioma</label>
                  <select className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option>Español</option>
                    <option>English</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <h3 className="font-medium text-gray-900 dark:text-white">Rendimiento</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-2">Elementos por página</label>
                  <select className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white">
                    <option>10</option>
                    <option>25</option>
                    <option>50</option>
                    <option>100</option>
                  </select>
                </div>
                <label className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                  <span className="text-sm">Animaciones</span>
                  <input type="checkbox" className="rounded" defaultChecked />
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-lg font-semibold mb-4">Configuración Avanzada</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">URL del Servidor</label>
                <input 
                  type="url" 
                  placeholder="https://api.tusistema.com"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Puerto de Impresión</label>
                <input 
                  type="number" 
                  placeholder="9100"
                  className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:text-white" 
                />
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">Restablecer Configuración</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Esto restablecerá toda la configuración a los valores predeterminados</p>
                </div>
                <button className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm">
                  Restablecer
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}