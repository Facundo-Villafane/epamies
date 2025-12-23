# 🏆 Sistema de Premios EPAMIES

Web app para ceremonias de premios estilo Oscars/GOTY con gestión en tiempo real.

## 🚀 Características

- 🗳️ **Sistema de votación** (`/vote`) - Los usuarios pueden votar por sus favoritos
- ✨ **Pantalla de proyección** (`/display`) - Vista para mostrar en la sala
- 🎮 **Panel de control** (`/admin`) - Selecciona ganadores manualmente
- 🔐 **Autenticación con Google** - Login seguro con validación de dominio
- ⚡ **Actualización en tiempo real** - Los cambios se reflejan automáticamente
- 🎨 **UI moderna** con efectos visuales animados (Aurora, FloatingLines)
- 📦 **Supabase** para base de datos, storage, realtime y autenticación

## 📋 Stack Técnico

- **Next.js 15** con App Router
- **TypeScript**
- **Tailwind CSS**
- **Supabase** (PostgreSQL + Realtime + Storage)

## 🛠️ Setup Rápido

### 1. Instalar dependencias

Las dependencias ya están instaladas. Si necesitas reinstalar:

```bash
npm install
```

### 2. Configurar Supabase

1. Crea una cuenta gratuita en [supabase.com](https://supabase.com)
2. Crea un nuevo proyecto
3. Ve a **SQL Editor** y ejecuta el SQL del archivo `SETUP.md` (sección 2)
4. Ve a **Project Settings** > **API** y copia:
   - Project URL
   - anon public key

### 3. Variables de entorno

Edita el archivo `.env.local` con tus credenciales:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 4. Ejecutar

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

## 📖 Cómo usar

### Antes de la ceremonia:

1. Revisa `SETUP.md` para la configuración de la base de datos
2. **Revisa `AUTH_SETUP.md` para configurar la autenticación con Google**
3. Carga tus ediciones, categorías, participantes y nominados en Supabase
4. Opcionalmente, sube imágenes a Supabase Storage
5. Configura los dominios bloqueados en `components/AuthGuard.tsx`

### Durante la votación:

1. **Votantes**: Comparte el link `/vote` con los participantes
   - Deben iniciar sesión con su cuenta de Gmail personal
   - Los correos corporativos serán bloqueados automáticamente
   - Pueden votar en cada categoría según las reglas (hasta 3 votos en fase 1, 1 voto en fase 2)
   - Los votos se cuentan en tiempo real

### Durante la ceremonia:

1. **Proyectar**: Abre `/display` en el navegador conectado al proyector
   - Muestra la categoría actual y nominados
   - Se actualiza automáticamente cuando seleccionas ganadores
   - Usa los botones ← → para navegar entre categorías
   - No requiere autenticación

2. **Controlar**: Abre `/admin` en tu dispositivo (celular, tablet, laptop)
   - Gestiona ediciones, categorías, nominados y ganadores
   - Controla qué se muestra en la pantalla de proyección
   - Los cambios se reflejan al instante en `/display`

## 🗂️ Estructura de datos

### Tabla `categories`
- `name`: Nombre de la categoría
- `description`: Descripción opcional
- `order`: Orden de aparición

### Tabla `nominees`
- `name`: Nombre del nominado
- `description`: Descripción opcional
- `image_url`: URL de la imagen
- `category_id`: Referencia a la categoría
- `is_winner`: Si es el ganador actual

## 🎨 Personalización

Puedes editar los colores y estilos en:
- `app/display/page.tsx` - Vista de proyección
- `app/admin/page.tsx` - Panel de control
- `app/page.tsx` - Página principal

## 📚 Recursos

- [Documentación de Next.js](https://nextjs.org/docs)
- [Documentación de Supabase](https://supabase.com/docs)
- [Guía de Tailwind CSS](https://tailwindcss.com/docs)

## 🐛 Troubleshooting

**Error "Invalid API key"**: Verifica que copiaste bien las credenciales en `.env.local`

**No se actualiza en tiempo real**: Asegúrate de haber ejecutado el SQL que habilita realtime

**No se ven las imágenes**: Verifica que las URLs en `image_url` sean accesibles públicamente

**Error de autenticación**: Revisa la guía completa en `AUTH_SETUP.md` para configurar Google OAuth

**"Dominio bloqueado"**: Edita `BLOCKED_DOMAINS` en `components/AuthGuard.tsx` para configurar qué dominios bloquear

---

Hecho con ❤️ para ceremonias épicas
