# Android Device Manager

Sistema de gestión de dispositivos Android con funcionalidades avanzadas de monitoreo, control remoto y análisis.

## 🚀 Despliegue

Este proyecto está configurado para desplegarse en:
- **Frontend**: Vercel (Gratis)
- **Backend**: Render (Gratis)
- **Base de Datos**: PostgreSQL en Render (Gratis)

## 📦 Tecnologías

- **Frontend**: React, Vite, TypeScript, TailwindCSS
- **Backend**: Express, tRPC, Socket.IO
- **Base de Datos**: MySQL/PostgreSQL con Drizzle ORM
- **Autenticación**: JWT, OAuth

## 🔧 Variables de Entorno

### Backend (Render)
```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
JWT_SECRET=k3S9mJ3BrxYzu9KTJINJt-pe1DlgQs_gsl_pRyGu4q4
NEXTAUTH_SECRET=ecW0HQUh1s_IdDz1Hqgy1q_kmVwiiPHuTtCxJxztXOs
```

### Frontend (Vercel)
```
VITE_API_URL=https://your-backend.onrender.com/api/trpc
VITE_WEBSOCKET_URL=wss://your-backend.onrender.com
VITE_APP_URL=https://your-app.vercel.app
```

## 📝 Desarrollo Local

```bash
# Instalar dependencias
pnpm install

# Iniciar desarrollo
pnpm run dev

# Construir para producción
pnpm run build
```

## 🆓 Plan Gratuito de Render

El plan gratuito de Render incluye:
- ✅ 750 horas/mes de servicio web
- ✅ Base de datos PostgreSQL (90 días de retención)
- ✅ SSL automático
- ⚠️ El servicio se "duerme" después de 15 minutos de inactividad
- ⚠️ Primer request después del "sueño" puede tardar 30-60 segundos

## 📄 Licencia

MIT
