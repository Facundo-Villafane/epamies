# 🏆 Sistema de Premios EPAMIES

Web app para ceremonias de premios estilo Oscars/GOTY con gestión en tiempo real.

## 🚀 Características

- ✨ **Pantalla de proyección** (`/display`) - Vista para mostrar en la sala
- 🎮 **Panel de control** (`/admin`) - Selecciona ganadores manualmente
- ⚡ **Actualización en tiempo real** - Los cambios se reflejan automáticamente
- 🎨 **UI moderna** con Tailwind CSS y efectos visuales
- 📦 **Supabase** para base de datos, storage y realtime

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

### Durante la ceremonia:

1. **Proyectar**: Abre `/display` en el navegador conectado al proyector
   - Muestra la categoría actual y nominados
   - Se actualiza automáticamente cuando seleccionas ganadores
   - Usa los botones ← → para navegar entre categorías

2. **Controlar**: Abre `/admin` en tu dispositivo (celular, tablet, laptop)
   - Selecciona la categoría
   - Haz click en "Seleccionar como ganador" en el nominado
   - La pantalla `/display` se actualiza al instante con animación

### Antes de la ceremonia:

1. Revisa `SETUP.md` para la configuración completa
2. Carga tus categorías y nominados en Supabase
3. Opcionalmente, sube imágenes a Supabase Storage

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

**No se actualiza en tiempo real**: Asegúrate de haber ejecutado el SQL que habilita realtime:
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE nominees;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
```

**No se ven las imágenes**: Verifica que las URLs en `image_url` sean accesibles públicamente

---

Hecho con ❤️ para ceremonias épicas
