# 🎯 Instrucciones Actualizadas - Sistema de Premios

## ⚠️ IMPORTANTE: Actualización de Base de Datos

El sistema ha sido completamente rediseñado con un nuevo esquema. **Debes ejecutar el SQL de migración**.

## 📋 Pasos para actualizar

### 1. Ejecutar SQL de actualización

Ve a Supabase → **SQL Editor** y ejecuta el contenido del archivo `DATABASE_UPDATE.sql`

Esto creará:
- Tabla `editions` (ediciones de premios)
- Tabla `participants` (pool global de participantes)
- Tabla `nominations` (vincula participantes con categorías)
- Migrará los datos existentes al nuevo esquema

### 2. Reiniciar el servidor

```bash
cd awards-app
npm run dev
```

## 🎮 Cómo funciona el nuevo sistema

### Estructura:

```
Ediciones (ej: "Premios 2024")
  └── Categorías (ej: "Mejor Juego")
        └── Nominaciones (vincula Participantes con Categorías)
              └── Participantes (pool global)
```

### Flujo de trabajo:

1. **Crear Edición** (`/admin/editions`)
   - Nombre: "Premios EPAMIES 2024"
   - Marcar como "Activa"

2. **Agregar Participantes** (`/admin/participants`)
   - Pool global de todos los candidatos
   - Un participante puede estar en múltiples categorías
   - Puedes agregar nombre, descripción e imagen

3. **Crear Categorías** (`/admin/categories`)
   - Asociadas a una edición
   - Ej: "Mejor Juego", "Mejor Arte", etc.
   - Define el orden de aparición

4. **Nominar Participantes** (`/admin/nominations`)
   - Selecciona categoría
   - Agrega participantes del pool
   - No se puede nominar la misma persona 2 veces en la misma categoría

5. **Ceremonia en Vivo** (`/admin/ceremony`)
   - Selecciona ganadores durante el evento
   - Los cambios se reflejan automáticamente en `/display`

## 🖥️ Páginas del Admin

### Dashboard (`/admin`)
- Vista general con estadísticas
- Accesos rápidos a todas las secciones

### Ediciones (`/admin/editions`)
- Crear/editar/eliminar ediciones
- Marcar una como activa
- Solo una edición puede estar activa a la vez

### Participantes (`/admin/participants`)
- CRUD completo de participantes
- Búsqueda por nombre
- Vista de tarjetas con imágenes

### Categorías (`/admin/categories`)
- CRUD de categorías por edición
- Define el orden de presentación
- Descripción opcional

### Nominaciones (`/admin/nominations`)
- Selecciona categoría y edición
- Agrega múltiples participantes a la vez
- Solo muestra participantes no nominados

### Ceremonia (`/admin/ceremony`)
- Vista simplificada para el día del evento
- Selecciona ganadores con un click
- Actualización en tiempo real en `/display`

## 📺 Pantalla de Proyección

**URL:** `/display`

- Muestra solo la edición activa
- Navega entre categorías
- Se actualiza automáticamente cuando seleccionas ganadores
- Animación especial para ganadores

## 🔑 Características clave

✅ **Pool de Participantes Reutilizable**
- Crea una vez, nomina en múltiples categorías

✅ **Múltiples Ediciones**
- Histórico de ceremonias
- Una activa a la vez

✅ **No Duplicados**
- Constraint en BD: no se puede nominar 2 veces en la misma categoría

✅ **Realtime Updates**
- Cambios instantáneos en el proyector

✅ **Interfaz Completa**
- Gestiona todo desde el navegador
- Sin necesidad de editar SQL manualmente

## 🚀 Quick Start

1. Ejecuta `DATABASE_UPDATE.sql` en Supabase
2. Ve a `/admin`
3. Crea una edición y márcala como activa
4. Agrega participantes
5. Crea categorías
6. Nomina participantes
7. ¡Listo para la ceremonia!

## 💡 Tips

- Usa URLs de Unsplash para imágenes rápidas: `https://images.unsplash.com/photo-xxxxx?w=400`
- Prepara todo antes del evento en `/admin/nominations`
- Durante el evento usa solo `/admin/ceremony`
- Mantén `/display` abierto en el proyector
