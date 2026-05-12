import { supabase } from '../lib/supabase';

/**
 * Crea un usuario administrador en el sistema
 * Esta función debe usarse solo para configuración inicial
 */
export async function createAdminUser(email: string, password: string, fullName: string) {
  try {
    // 1. Crear usuario en auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      console.error('Error creando usuario en auth:', authError);
      return { success: false, error: authError.message };
    }

    if (!authData.user) {
      return { success: false, error: 'No se pudo crear el usuario' };
    }

    // 2. Crear perfil en la tabla users_profile
    const { error: profileError } = await supabase
      .from('users_profile')
      .insert({
        id: authData.user.id,
        full_name: fullName,
        role: 'admin',
        is_active: true,
      });

    if (profileError) {
      console.error('Error creando perfil:', profileError);
      // Intentar eliminar el usuario de auth si falló el perfil
      await supabase.auth.admin.deleteUser(authData.user.id);
      return { success: false, error: profileError.message };
    }

    return { 
      success: true, 
      message: 'Usuario administrador creado exitosamente',
      userId: authData.user.id 
    };

  } catch (error) {
    console.error('Error inesperado:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Error desconocido' 
    };
  }
}

/**
 * Función de conveniencia para crear el admin por defecto
 */
export async function createDefaultAdmin() {
  return createAdminUser(
    'admin@restaurant.com',
    'admin123456',
    'Administrador del Sistema'
  );
}
