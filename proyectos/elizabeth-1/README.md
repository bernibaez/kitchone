# Factussoft - Sistema de Ventas Profesional

Sistema de ventas completo desarrollado con React, Electron y SQLite para aplicaciones de escritorio.

## 🚀 Características

- **Interfaz moderna** con React y Tailwind CSS
- **Aplicación de escritorio** con Electron
- **Base de datos SQLite** integrada
- **Backend automático** que se inicia con la aplicación
- **Gestión completa** de productos, clientes, ventas y usuarios
- **Reportes y estadísticas** en tiempo real
- **Sistema de autenticación** con roles

## 📦 Instalación y Uso

### Desarrollo

1. **Clonar el repositorio:**
```bash
git clone <url-del-repositorio>
cd factussoft
```

2. **Instalar dependencias:**
```bash
npm install
```

3. **Probar el backend:**
```bash
npm run test:backend
```

4. **Ejecutar en modo desarrollo:**
```bash
npm run dev        # Frontend
npm run backend    # Backend (en otra terminal)
npm start          # Electron
```

### Producción

1. **Construir la aplicación:**
```bash
npm run build:installer
```

2. **Ejecutar el instalador generado** en `dist-installer/`

## 🔧 Configuración del Backend Automático

La aplicación ahora incluye un sistema que **automáticamente inicia el backend** cuando abres la aplicación. Los cambios realizados incluyen:

### ✅ Cambios Implementados

1. **Módulos ES6**: Convertido el backend para usar módulos ES6 (`import/export`)
2. **Dependencias actualizadas**: Cambiado de `sqlite3` a `better-sqlite3` para mejor rendimiento
3. **Instalación automática**: El backend instala sus dependencias automáticamente si no existen
4. **Logging mejorado**: Mejor sistema de logs para debugging
5. **Manejo de rutas**: Configuración correcta para entornos de desarrollo y producción

### 🔄 Cómo Funciona

1. **Al abrir la app**: Electron detecta si el backend necesita dependencias
2. **Instalación automática**: Si faltan dependencias, las instala automáticamente
3. **Inicio del servidor**: El backend se inicia en el puerto 4000
4. **Conexión del frontend**: La interfaz se conecta automáticamente al backend

### 🛠️ Scripts Disponibles

- `npm run test:backend` - Prueba que el backend funcione correctamente
- `npm run build:backend` - Instala dependencias del backend
- `npm run build:installer` - Construye el instalador completo

## 📁 Estructura del Proyecto

```
factussoft/
├── src/                    # Frontend React
├── backend/               # Backend Express
│   ├── models/           # DAOs para la base de datos
│   ├── server.js         # Servidor principal
│   └── database.js       # Configuración de SQLite
├── main.js               # Proceso principal de Electron
├── mcventas.sqlite       # Base de datos SQLite
└── dist-installer/       # Instalador generado
```

## 🐛 Solución de Problemas

### El backend no se inicia automáticamente

1. **Verificar logs**: Revisa la consola de Electron para errores
2. **Probar manualmente**: Ejecuta `npm run test:backend`
3. **Reinstalar dependencias**: Elimina `backend/node_modules` y vuelve a ejecutar

### Error de módulos ES6

Si ves errores como "Cannot use import statement outside a module":
- Verifica que `backend/package.json` tenga `"type": "module"`
- Asegúrate de que todas las importaciones usen `.js`

### Base de datos no encontrada

- Verifica que `mcventas.sqlite` esté en la raíz del proyecto
- En producción, debe estar en `resources/mcventas.sqlite`

## 📝 Notas de Desarrollo

- **Base de datos**: SQLite con `better-sqlite3` para mejor rendimiento
- **Backend**: Express.js con módulos ES6
- **Frontend**: React con TypeScript y Tailwind CSS
- **Empaquetado**: Electron Builder con configuración personalizada

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 📞 Soporte

Para soporte técnico o preguntas:
- Email: soporte@mcventas.com
- Documentación: [Wiki del proyecto]

---

**Desarrollado con ❤️ para gestionar ventas de manera eficiente** 