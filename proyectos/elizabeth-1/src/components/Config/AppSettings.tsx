import { useState, useEffect } from 'react';
import { useApp } from '../../contexts/AppContext';
import { Building2, Database, CheckCircle, AlertCircle, Download, Save, Globe, Key } from 'lucide-react';

interface AppSettings {
  supabaseUrl: string;
  supabaseAnonKey: string;
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
}

export default function AppSettings() {
  const { state, dispatch } = useApp();
  const [settings, setSettings] = useState<AppSettings>({
    supabaseUrl: state.appSettings.supabaseUrl,
    supabaseAnonKey: state.appSettings.supabaseAnonKey,
    companyName: state.config.name || '',
    companyAddress: state.config.address || '',
    companyPhone: state.config.phone || '',
    companyEmail: state.config.email || ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // Sincronizar con el estado global cuando cambie
    setSettings({
      supabaseUrl: state.appSettings.supabaseUrl,
      supabaseAnonKey: state.appSettings.supabaseAnonKey,
      companyName: state.config.name || '',
      companyAddress: state.config.address || '',
      companyPhone: state.config.phone || '',
      companyEmail: state.config.email || ''
    });
  }, [state.appSettings, state.config]);

  const loadSettings = async () => {
    try {
      // Cargar configuración desde localStorage o API
      const savedSettings = localStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }
    } catch (error) {
      console.error('Error al cargar configuración:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Actualizar appSettings en el estado global
      dispatch({ 
        type: 'SET_APP_SETTINGS', 
        payload: {
          supabaseUrl: settings.supabaseUrl,
          supabaseAnonKey: settings.supabaseAnonKey
        }
      });

      // Actualizar config de empresa en el estado global
      dispatch({ 
        type: 'SET_CONFIG', 
        payload: {
          ...state.config,
          name: settings.companyName,
          address: settings.companyAddress,
          phone: settings.companyPhone,
          email: settings.companyEmail
        }
      });

      setMessage({ type: 'success', text: 'Configuración guardada correctamente' });
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al guardar la configuración' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Probar conexión con Supabase
      const { supabase } = await import('../../lib/supabase');
      const { error } = await supabase.from('categories').select('count').single();
      
      if (error) {
        setMessage({ type: 'error', text: 'Error de conexión con Supabase: ' + error.message });
      } else {
        setMessage({ type: 'success', text: 'Conexión con Supabase establecida correctamente' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al probar conexión con Supabase' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    setMessage(null);
    
    try {
      // Exportar datos desde Supabase
      const { supabase } = await import('../../lib/supabase');
      const { data: products, error } = await supabase.from('products').select('*');
      
      if (error) {
        setMessage({ type: 'error', text: 'Error al exportar datos' });
      } else {
        // Crear archivo JSON para descargar
        const dataStr = JSON.stringify({ products }, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `export_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        setMessage({ type: 'success', text: 'Datos exportados correctamente' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Error al exportar datos' });
    } finally {
      setLoading(false);
    }
  };

  const handleShowNotification = async () => {
    try {
      // Usar notificaciones del navegador
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Sistema de Ventas MC', {
          body: 'Esta es una notificación de prueba del sistema'
        });
      } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification('Sistema de Ventas MC', {
              body: 'Esta es una notificación de prueba del sistema'
            });
          }
        });
      }
    } catch (error) {
      console.error('Error al mostrar notificación:', error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Configuración de la Aplicación</h1>
        <button 
          onClick={handleShowNotification}
          className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Probar Notificación
        </button>
      </div>

      {message && (
        <div className={`p-4 rounded-lg flex items-center gap-2 ${
          message.type === 'success' 
            ? 'bg-green-50 border border-green-200 text-green-800' 
            : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          {message.type === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : (
            <AlertCircle className="h-5 w-5" />
          )}
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Información de la Empresa */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Información de la Empresa
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la Empresa
              </label>
              <input
                id="companyName"
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                placeholder="Sistema de Ventas MC"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="companyAddress" className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <input
                id="companyAddress"
                type="text"
                value={settings.companyAddress}
                onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                placeholder="Dirección de la empresa"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                id="companyPhone"
                type="text"
                value={settings.companyPhone}
                onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                placeholder="+1234567890"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="companyEmail"
                type="email"
                value={settings.companyEmail}
                onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                placeholder="empresa@ejemplo.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Configuración de Supabase */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Database className="h-5 w-5" />
              Base de Datos (Supabase)
            </h3>
          </div>
          <div className="p-6 space-y-4">
            <div>
              <label htmlFor="supabaseUrl" className="block text-sm font-medium text-gray-700 mb-1">
                <Globe className="inline h-4 w-4 mr-1" />
                URL de Supabase
              </label>
              <input
                id="supabaseUrl"
                type="text"
                value={settings.supabaseUrl}
                onChange={(e) => setSettings({ ...settings, supabaseUrl: e.target.value })}
                placeholder="https://your-project.supabase.co"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label htmlFor="supabaseAnonKey" className="block text-sm font-medium text-gray-700 mb-1">
                <Key className="inline h-4 w-4 mr-1" />
                Clave Anónima de Supabase
              </label>
              <input
                id="supabaseAnonKey"
                type="password"
                value={settings.supabaseAnonKey}
                onChange={(e) => setSettings({ ...settings, supabaseAnonKey: e.target.value })}
                placeholder="your-anon-key"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <hr className="my-4" />

            <div className="flex gap-2">
              <button 
                onClick={handleTestConnection}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Database className="h-4 w-4" />
                Probar Conexión
              </button>
              
              <button 
                onClick={handleExportData}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" />
                Exportar Datos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Botón de Guardar */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="p-6">
          <button 
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}