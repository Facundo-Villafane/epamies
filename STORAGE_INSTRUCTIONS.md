# 📁 Configuración de Supabase Storage para Imágenes

## 🚀 Setup Rápido

### Paso 1: Crear el Bucket en Supabase

1. Ve a tu proyecto en [Supabase](https://supabase.com)
2. Click en **Storage** en el sidebar izquierdo
3. Click en **New bucket**
4. Configuración:
   - **Name:** `images`
   - **Public bucket:** ✅ **Activado** (para que las imágenes sean públicas)
   - **File size limit:** 5 MB (por defecto)
   - **Allowed MIME types:** Deja vacío para permitir todos

5. Click en **Create bucket**

### Paso 2: Configurar Políticas de Acceso

1. En Supabase, ve a **SQL Editor**
2. Click en **New query**
3. Copia y pega el contenido de `STORAGE_SETUP.sql`
4. Click en **Run**

Esto configurará las políticas para:
- ✅ Lectura pública de imágenes
- ✅ Subida de imágenes
- ✅ Actualización de imágenes
- ✅ Borrado de imágenes

---

## 🎯 Cómo Usar en la App

### Subir Imagen desde Archivo

1. Ve a `/admin/participants`
2. Click en **+ Nuevo Participante** o edita uno existente
3. En el formulario, verás una sección de **Imagen**
4. **Opción 1: Subir archivo**
   - Click en el área de "Click para subir imagen"
   - Selecciona una imagen de tu computadora
   - Tamaño máximo: 5MB
   - Formatos: PNG, JPG, GIF, WEBP
   - La imagen se subirá automáticamente a Supabase Storage

5. **Opción 2: Pegar URL**
   - Si ya tienes una imagen en línea (Unsplash, Imgur, etc.)
   - Pega la URL en el campo de texto

6. Verás una vista previa de la imagen
7. Click en **Guardar**

---

## 📂 Estructura de Archivos

Las imágenes se guardan automáticamente en:

```
Storage bucket: images/
└── participants/
    ├── 1234567890-abc123.jpg
    ├── 1234567890-def456.png
    └── ...
```

- Los nombres de archivo son únicos (timestamp + random ID)
- Esto evita conflictos y permite subir varias imágenes con el mismo nombre original

---

## 🔒 Seguridad

**⚠️ Configuración Actual (MVP/Personal):**
- Cualquiera puede subir, actualizar y borrar imágenes
- Las imágenes son públicas (sin autenticación requerida)
- Esto está bien para un MVP o uso personal

**Para Producción:**

Si planeas usar esto en producción, modifica las políticas en `STORAGE_SETUP.sql`:

```sql
-- Solo usuarios autenticados pueden subir
CREATE POLICY "Authenticated uploads only"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images'
  AND auth.role() = 'authenticated'
);

-- Solo usuarios autenticados pueden borrar
CREATE POLICY "Authenticated deletes only"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images'
  AND auth.role() = 'authenticated'
);
```

---

## ❓ Troubleshooting

### Error: "new row violates row-level security policy"

**Causa:** Las políticas de Storage no están configuradas correctamente.

**Solución:**
1. Ve a Supabase → SQL Editor
2. Ejecuta `STORAGE_SETUP.sql`
3. Recarga la página de admin

### Error: "Failed to upload"

**Causa:** El bucket no existe o no está configurado como público.

**Solución:**
1. Ve a Supabase → Storage
2. Verifica que existe un bucket llamado `images`
3. Click en el bucket → Settings
4. Verifica que "Public bucket" está activado

### La imagen se sube pero no se ve

**Causa:** El bucket no está configurado como público.

**Solución:**
1. Ve a Supabase → Storage
2. Click en el bucket `images`
3. Click en **Settings** (engranaje)
4. Activa **Public bucket**
5. Click en **Save**

---

## 🎨 Mejoras Futuras

Posibles mejoras que podrías agregar:

1. **Compresión de imágenes** antes de subir
2. **Crop/resize** automático para tamaño consistente
3. **Borrado automático** de imágenes viejas al actualizar
4. **Galería de imágenes** ya subidas para reutilizar
5. **Drag & drop** para subir múltiples imágenes

---

¡Listo! Ahora puedes subir imágenes directamente desde tu computadora sin necesidad de URLs externas. 🎉
