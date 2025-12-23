# ✅ Próximos pasos

Tu app de premios está lista! Aquí está lo que necesitas hacer:

## 1️⃣ Configurar Supabase (15 minutos)

### Crear proyecto:
1. Ve a https://supabase.com y registrate gratis
2. Click en "New Project"
3. Elige un nombre (ej: "premios-epamies")
4. Crea una contraseña para la base de datos
5. Espera 2-3 minutos a que se cree

### Crear las tablas:
1. En tu proyecto de Supabase, ve a **SQL Editor** (menú lateral)
2. Abre el archivo `SETUP.md` de este proyecto
3. Copia TODO el código SQL de la sección 2
4. Pégalo en el SQL Editor de Supabase
5. Click en "Run" o presiona Ctrl+Enter
6. Deberías ver "Success. No rows returned"

### Copiar las credenciales:
1. Ve a **Project Settings** (icono de engranaje abajo a la izquierda)
2. Click en **API** en el menú
3. Copia el **Project URL** (algo como `https://abcdefgh.supabase.co`)
4. Copia el **anon public** key (una string larga)
5. Abre el archivo `.env.local` en este proyecto
6. Reemplaza `your-project-url.supabase.co` con tu URL
7. Reemplaza `your-anon-key` con tu key

## 2️⃣ Ejecutar el proyecto

```bash
cd awards-app
npm run dev
```

Abre http://localhost:3000 y deberías ver la página principal!

## 3️⃣ Probar que funciona

1. Abre http://localhost:3000/admin
2. Deberías ver las 3 categorías de ejemplo
3. Click en "Seleccionar como ganador" en algún nominado
4. Abre http://localhost:3000/display en otra pestaña
5. Deberías ver el ganador con el trofeo 🏆

Si esto funciona, todo está listo!

## 4️⃣ Personalizar (Opcional)

### Agregar tus propias categorías:

En Supabase > **Table Editor** > tabla `categories`:
- Click en "Insert" > "Insert row"
- Llena `name`, `description`, y `order`
- Click "Save"

### Agregar tus nominados:

En Supabase > **Table Editor** > tabla `nominees`:
- Click en "Insert" > "Insert row"
- Llena `name`, `description`, `category_id`, `image_url`
- Para `category_id`, usa el UUID de la categoría (cópialo de la tabla categories)
- Click "Save"

### Subir imágenes propias:

1. Ve a **Storage** en Supabase
2. Click "Create bucket"
3. Nombre: `nominees`, marca como **Public**
4. Sube tus imágenes
5. Click en la imagen > "Get URL"
6. Copia la URL y úsala en el campo `image_url` de tus nominados

## 5️⃣ El día de la ceremonia

1. **Preparación:**
   - Conecta tu laptop/PC al proyector
   - Abre el navegador en pantalla completa (F11)
   - Navega a `/display`

2. **Control:**
   - En tu celular/tablet, abre `/admin`
   - Mantén la pantalla de admin a mano durante toda la ceremonia

3. **Durante el evento:**
   - En `/admin`, selecciona la categoría actual
   - Cuando decidas el ganador, click en "Seleccionar como ganador"
   - El proyector se actualizará automáticamente con animación
   - Usa los botones ← → en `/display` para cambiar de categoría (si lo necesitas)

## 🆘 Si algo no funciona

**No se conecta a Supabase:**
- Verifica que las credenciales en `.env.local` sean correctas
- Reinicia el servidor (Ctrl+C y luego `npm run dev` de nuevo)

**No veo las categorías:**
- Asegúrate de haber ejecutado el SQL en Supabase
- Revisa que las credenciales sean correctas

**No se actualiza en tiempo real:**
- Verifica que ejecutaste las líneas `ALTER PUBLICATION` del SQL
- Refresca las páginas (F5)

---

¡Listo para la ceremonia! 🎉
