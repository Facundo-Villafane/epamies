# Configuración de Autenticación con Google

Este documento explica cómo configurar la autenticación de Google OAuth para la aplicación ePAMIES.

## Requisitos

- Proyecto de Supabase activo
- Cuenta de Google Cloud Platform

## 1. Configurar Google OAuth

### Paso 1: Crear credenciales en Google Cloud

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto o selecciona uno existente
3. Ve a **APIs & Services** > **Credentials**
4. Click en **Create Credentials** > **OAuth Client ID**
5. Si es tu primera vez, configura la pantalla de consentimiento OAuth:
   - Tipo de usuario: **External**
   - Nombre de la aplicación: `ePAMIES Voting System`
   - Email de soporte: tu email
   - Dominios autorizados: tu dominio o deja en blanco para desarrollo local
   - Información de desarrollador: tu email

### Paso 2: Configurar el OAuth Client ID

1. Tipo de aplicación: **Web application**
2. Nombre: `ePAMIES Supabase Auth`
3. **Authorized JavaScript origins**:
   - `http://localhost:3000` (para desarrollo)
   - Tu dominio de producción (cuando despliegues)
4. **Authorized redirect URIs**:
   - Ve a tu proyecto de Supabase
   - Navega a **Authentication** > **Providers**
   - Encuentra la sección de Google
   - Copia la URL de **Callback URL (for OAuth)** que aparece allí
   - Pégala en "Authorized redirect URIs" en Google Cloud
   - Ejemplo: `https://tu-proyecto.supabase.co/auth/v1/callback`

5. Click en **Create**
6. Guarda el **Client ID** y **Client Secret** que aparecen

### Paso 3: Configurar Google Provider en Supabase

1. Ve a tu proyecto de Supabase
2. Navega a **Authentication** > **Providers**
3. Busca **Google** en la lista
4. Click en **Enable**
5. Pega el **Client ID** y **Client Secret** de Google Cloud
6. Click en **Save**

## 2. Configurar Dominios Bloqueados

Por defecto, el sistema bloquea correos corporativos. Para configurar qué dominios bloquear:

1. Abre el archivo `components/AuthGuard.tsx`
2. Busca la constante `BLOCKED_DOMAINS`
3. Agrega los dominios que quieres bloquear:

```typescript
const BLOCKED_DOMAINS = [
  'tuempresa.com',      // Bloquea @tuempresa.com
  'corporativo.com',    // Bloquea @corporativo.com
  'company.net'         // Bloquea @company.net
]
```

**Nota**: Los dominios se comparan de forma case-insensitive y permiten coincidencias parciales. Por ejemplo, `empresa.com` bloqueará tanto `@empresa.com` como `@mail.empresa.com`.

## 3. Variables de Entorno

Asegúrate de tener las siguientes variables en tu archivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

## 4. Flujo de Autenticación

### Para Votantes (/vote)

1. El usuario intenta acceder a `/vote`
2. Si no está autenticado, ve una pantalla de login
3. Click en "Continuar con Google"
4. Se abre el popup de Google OAuth
5. El usuario selecciona su cuenta de Gmail
6. El sistema verifica que el dominio del email no esté bloqueado
7. Si está bloqueado, se cierra la sesión y se muestra un mensaje de error
8. Si está permitido, el usuario puede votar

### Para Admin (/admin)

- **No requiere autenticación** (puedes agregar autenticación adicional si lo deseas)
- Solo personas con acceso al panel pueden controlar lo que se muestra

### Para Display (/display)

- **No requiere autenticación**
- Cualquier persona puede ver la pantalla de ceremonia

## 5. Cerrar Sesión

Los usuarios pueden cerrar sesión desde:
- El menú de usuario (botón con su email) en la esquina superior derecha de `/vote`
- Se cierra automáticamente si el dominio está bloqueado

## 6. Desarrollo Local

Para probar localmente:

```bash
npm run dev
```

Luego visita `http://localhost:3000/vote` y prueba el flujo de login.

## 7. Producción

Cuando despliegues a producción:

1. Actualiza las **Authorized redirect URIs** en Google Cloud con tu dominio de producción
2. Actualiza las **Authorized JavaScript origins** con tu dominio de producción
3. Actualiza las variables de entorno en tu plataforma de hosting (Vercel, Netlify, etc.)

## Seguridad

- ✅ Solo usuarios autenticados pueden votar
- ✅ Los dominios corporativos están bloqueados
- ✅ Las sesiones se manejan de forma segura con Supabase Auth
- ✅ Los tokens se almacenan en HTTP-only cookies (manejado por Supabase)
- ⚠️ Admin no requiere autenticación por defecto (considera agregar protección adicional)

## Troubleshooting

### "Error: redirect_uri_mismatch"
- Verifica que la redirect URI en Google Cloud coincida exactamente con la de Supabase
- Asegúrate de incluir `https://` al inicio

### "Dominio bloqueado" aunque uso Gmail personal
- Verifica que tu email no contenga ninguno de los dominios en `BLOCKED_DOMAINS`
- Revisa la consola del navegador para ver qué dominio se detectó

### El usuario no se mantiene logueado
- Verifica que las variables de entorno estén correctamente configuradas
- Revisa que el navegador permita cookies de terceros

### No se puede hacer login en producción
- Asegúrate de agregar el dominio de producción a las Authorized Origins y Redirect URIs en Google Cloud
