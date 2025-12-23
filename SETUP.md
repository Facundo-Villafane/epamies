# Setup Instructions

## 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta gratis
2. Crea un nuevo proyecto
3. Espera a que se inicialice (toma ~2 minutos)

## 2. Configurar la base de datos

Ve a la sección **SQL Editor** en Supabase y ejecuta este SQL:

```sql
-- Crear tabla de categorías
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear tabla de nominados
CREATE TABLE nominees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE CASCADE,
  is_winner BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar realtime para que se actualice automáticamente
ALTER PUBLICATION supabase_realtime ADD TABLE nominees;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;

-- Insertar categorías de ejemplo
INSERT INTO categories (name, description, "order") VALUES
  ('Mejor Juego del Año', 'El juego más destacado del año', 1),
  ('Mejor Diseño de Arte', 'Excelencia en dirección artística y diseño visual', 2),
  ('Mejor Narrativa', 'Mejor historia y desarrollo de personajes', 3);

-- Insertar nominados de ejemplo (categoría 1)
INSERT INTO nominees (name, description, category_id, image_url)
SELECT
  'Baldur''s Gate 3',
  'RPG épico de fantasía',
  id,
  'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=400'
FROM categories WHERE name = 'Mejor Juego del Año';

INSERT INTO nominees (name, description, category_id, image_url)
SELECT
  'Zelda: Tears of the Kingdom',
  'Aventura de mundo abierto',
  id,
  'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400'
FROM categories WHERE name = 'Mejor Juego del Año';

INSERT INTO nominees (name, description, category_id, image_url)
SELECT
  'Alan Wake 2',
  'Thriller psicológico de supervivencia',
  id,
  'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400'
FROM categories WHERE name = 'Mejor Juego del Año';
```

## 3. Configurar variables de entorno

1. En Supabase, ve a **Project Settings** > **API**
2. Copia el **Project URL** y el **anon public** key
3. Pega estos valores en el archivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=tu-url-aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key-aqui
```

## 4. Ejecutar el proyecto

```bash
npm run dev
```

## 5. Uso

- **Pantalla de proyección**: Abre `http://localhost:3000/display` en el navegador que proyectas
- **Panel de control**: Abre `http://localhost:3000/admin` en tu dispositivo para seleccionar ganadores
- Cuando selecciones un ganador en `/admin`, la pantalla `/display` se actualizará automáticamente

## 6. Subir tus propias imágenes a Supabase

1. Ve a **Storage** en Supabase
2. Crea un bucket llamado `nominees` (marca como público)
3. Sube las imágenes de tus nominados
4. Copia la URL pública y úsala en el campo `image_url` de la tabla `nominees`
