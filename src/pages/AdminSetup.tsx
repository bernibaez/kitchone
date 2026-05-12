import { useState } from 'react';
import { createAdminUser, createDefaultAdmin } from '../utils/createAdmin';
import { useNotification } from '../contexts/NotificationContext';

export default function AdminSetup() {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: 'admin@restaurant.com',
    password: 'admin123456',
    fullName: 'Administrador del Sistema',
  });
  const { showNotification } = useNotification();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const result = await createAdminUser(
        formData.email,
        formData.password,
        formData.fullName
      );

      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Admin Creado',
          message: result.message || 'Usuario administrador creado exitosamente',
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: result.error || 'No se pudo crear el usuario administrador',
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error inesperado al crear admin',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDefault = async () => {
    setLoading(true);

    try {
      const result = await createDefaultAdmin();

      if (result.success) {
        showNotification({
          type: 'success',
          title: 'Admin por Defecto Creado',
          message: 'Usuario admin@restaurant.com creado con contraseña: admin123456',
        });
      } else {
        showNotification({
          type: 'error',
          title: 'Error',
          message: result.error || 'No se pudo crear el admin por defecto',
        });
      }
    } catch (error) {
      showNotification({
        type: 'error',
        title: 'Error',
        message: 'Error inesperado al crear admin por defecto',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Crear Usuario Administrador</h1>
      
      <div className="space-y-4">
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-semibold text-blue-900 mb-2">Opción Rápida:</h3>
          <p className="text-sm text-blue-700 mb-3">
            Crear admin con credenciales por defecto:
          </p>
          <div className="text-xs text-blue-600 mb-3">
            <p>Email: admin@restaurant.com</p>
            <p>Contraseña: admin123456</p>
          </div>
          <button
            onClick={handleCreateDefault}
            disabled={loading}
            className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creando...' : 'Crear Admin por Defecto'}
          </button>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-gray-900 mb-3">Opción Personalizada:</h3>
          <form onSubmit={handleCreateAdmin} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
                minLength={6}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre Completo
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Creando...' : 'Crear Admin Personalizado'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
