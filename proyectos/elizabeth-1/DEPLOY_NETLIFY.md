# 🚀 Despliegue en Netlify

## 📋 Prerrequisitos
- Cuenta en Netlify
- Repositorio en GitHub conectido a Netlify
- Variables de entorno configuradas

## 🔧 Configuración realizada

### 1. Archivos creados/actualizados:
- ✅ `public/_redirects` - Maneja rutas de React Router
- ✅ `.env.example` - Plantilla para variables de entorno
- ✅ `netlify.toml` - Configuración específica de Netlify
- ✅ `vite.config.ts` - Optimizado para producción
- ✅ `package.json` - Terser agregado para minificación

### 2. Optimizaciones aplicadas:
- **Code splitting**: Separación automática de vendor chunks
- **Minificación**: Terser configurado para eliminar console.log
- **Caching**: Headers configurados para assets estáticos
- **Security**: Headers de seguridad implementados

## 🌐 Pasos para desplegar en Netlify

### Opción 1: Desde el panel de Netlify
1. Ve a [netlify.com](https://netlify.com) y haz login
2. Click en "Add new site" → "Import an existing project"
3. Conecta tu cuenta de GitHub
4. Selecciona el repositorio `bernibaez/elizabeth`
5. Configura las siguientes opciones:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`

### Opción 2: Con Netlify CLI
```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login en Netlify
netlify login

# Inicializar el sitio
netlify init

# Desplegar
netlify deploy --prod
```

## 🔑 Variables de Entorno

Configura estas variables en Netlify (Site settings → Environment variables):

```bash
VITE_SUPABASE_URL=tu_url_de_supabase
VITE_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
VITE_APP_NAME=FactusSoft
```

## 📊 Estadísticas del Build

El build optimizado genera:
- **Total size**: ~1.2MB (gzipped: ~580KB)
- **Chunks principales**: 6 archivos optimizados
- **Tiempo de build**: ~30 segundos

## 🔄 Despliegue Automático

Netlify automáticamente:
- ✅ Detecta cambios en GitHub
- ✅ Ejecuta el build
- ✅ Despliega la nueva versión
- ✅ Asigna URLs únicas para cada deploy

## 🌍 URL del sitio

Una vez desplegado, tu sitio estará disponible en:
- URL principal: `https://tu-sitio.netlify.app`
- Preview URLs: Para cada pull request

## 🐛 Solución de problemas

### Si las rutas no funcionan:
- Verifica que `public/_redirects` esté presente
- Confirma que `netlify.toml` tenga la configuración de redirects

### Si el build falla:
- Verifica la versión de Node.js (18+)
- Asegúrate de tener todas las dependencias: `npm install`

### Si los estilos no cargan:
- Verifica que `base: './'` esté en `vite.config.ts`
- Confirma que los assets estén en la carpeta `dist`

## 📱 Características implementadas
- ✅ React Router con soporte para rutas
- ✅ PWA ready (service worker)
- ✅ Optimización de imágenes
- ✅ Caching agresivo para assets
- ✅ Headers de seguridad
- ✅ Build optimizado y dividido

## 🚀 Listo para producción

Tu aplicación está completamente optimizada y lista para desplegar en Netlify con:
- Rendimiento optimizado
- Seguridad configurada
- Despliegues automáticos
- URLs amigables
