# 🗳️ Guía Completa: Sistema de Votación en 2 Fases

## 📋 Resumen

Sistema de votación con 2 fases para premios tipo GOTY/Oscars:

**Fase 1 - Nominación Popular:**
- Usuarios votan por **hasta 3 candidatos** por categoría
- Tú decides cuándo cerrar la votación
- Los **Top 4 más votados** pasan automáticamente a la final

**Fase 2 - Votación Final:**
- Solo el **Top 4** está disponible
- Usuarios votan por **1 solo** candidato
- El día de la ceremonia, tú seleccionas el ganador basándote en los votos

---

## 🚀 Setup Inicial

### 1. Ejecutar SQL
Ve a Supabase → SQL Editor y ejecuta:
```bash
TWO_PHASE_VOTING.sql
```

Este SQL:
- ✅ Actualiza la tabla `categories` con campos de fase
- ✅ Actualiza `nominations` con campo `is_finalist`
- ✅ Recrea tabla `votes` con soporte para fases
- ✅ Crea funciones SQL para marcar Top 4 automáticamente

### 2. Reiniciar servidor
```bash
cd awards-app
npm run dev
```

### 3. Verificar
Abre `/admin` y deberías ver la nueva opción "Fases de Votación" en el sidebar.

---

## 📖 Flujo Completo Paso a Paso

### Antes del evento:

#### 1. Configurar básico
1. Crea una **Edición** en `/admin/editions` y márcala como activa
2. Agrega **Participantes** en `/admin/participants` (pool global)
3. Crea **Categorías** en `/admin/categories`
4. Asigna **Nominados** en `/admin/nominations` (todos los que quieras)

#### 2. Iniciar Fase 1 - Nominación Popular
1. Ve a `/admin/voting-phases`
2. Todas las categorías empiezan en "Fase 1" por defecto
3. Comparte el link `/vote` con tu audiencia
4. La gente vota por **hasta 3 candidatos** en cada categoría
5. Deja la votación abierta por X días (tú decides cuándo cerrar)

#### 3. Cerrar Fase 1 y marcar Top 4
1. Cuando decides cerrar la Fase 1, ve a `/admin/voting-phases`
2. Para cada categoría, click en **"✨ Marcar Top 4"**
3. Esto automáticamente:
   - Cuenta todos los votos de Fase 1
   - Marca los 4 más votados como `is_finalist = true`
   - Listo para Fase 2

#### 4. Activar Fase 2 - Votación Final
1. En `/admin/voting-phases`, click en **"Fase 2: Final (Top 4)"**
2. Ahora en `/vote` solo aparecen los 4 finalistas
3. Los usuarios votan por **1 solo**
4. Deja abierto hasta el día de la ceremonia

### Durante la ceremonia:

#### 5. Seleccionar Ganadores en Vivo
1. Abre `/display` en el proyector (pantalla completa)
2. Abre `/admin/ceremony` en tu dispositivo de control
3. En `/admin/ceremony` verás:
   - **Rankings** (#1, #2, #3, #4) ordenados por votos
   - **Cantidad de votos** de cada finalista
   - **Barras de progreso** visuales
4. Selecciona el ganador (normalmente el #1) haciendo click
5. Se muestra automáticamente en `/display` con animación 🏆

---

## 🎮 Páginas y Funcionalidades

### `/vote` - Votación Pública
**Fase 1:**
- Muestra TODOS los nominados
- Usuario puede votar por hasta 3
- Puede desmarcar y cambiar votos
- Contador: "Votos: X/3"

**Fase 2:**
- Muestra solo el Top 4 (finalistas)
- Badge "FINALISTA" en cada uno
- Usuario vota por 1 solo
- Puede cambiar voto

### `/admin/voting-phases` - Gestión de Fases
- Ver en qué fase está cada categoría
- Botones para cambiar de fase
- Botón **"✨ Marcar Top 4"** que ejecuta la función SQL automática
- Indicadores visuales de fase actual

### `/admin/ceremony` - Ceremonia en Vivo
- Muestra nominados ordenados por votos (ranking)
- Badge #1 🥇, #2 🥈, #3 🥉
- Contador de votos en tiempo real
- Barras de progreso visuales
- Muestra solo finalistas si está en Fase 2
- Botón para seleccionar ganador oficial

### `/display` - Pantalla de Proyección
- Se actualiza automáticamente cuando seleccionas ganador
- Animación de trofeo 🏆
- No muestra contadores de votos (solo el ganador)

---

## 🗄️ Estructura de Datos

### Tabla `categories`
```sql
voting_phase INTEGER     -- 1 = Nominación, 2 = Final
phase1_end_date TIMESTAMP -- Opcional, para recordar cuándo cerraste
phase2_end_date TIMESTAMP -- Opcional
```

### Tabla `nominations`
```sql
is_finalist BOOLEAN -- true si está en el Top 4
is_winner BOOLEAN   -- true si es el ganador oficial
```

### Tabla `votes`
```sql
voting_phase INTEGER -- 1 o 2, separa votos por fase
voter_identifier TEXT -- ID único del votante
nomination_id UUID
category_id UUID
```

---

## 💡 Tips y Mejores Prácticas

### Timing recomendado:
- **Fase 1:** 1-2 semanas para que la gente vote
- **Marcar Top 4:** Hazlo 2-3 días antes del evento
- **Fase 2:** 2-3 días hasta el día de la ceremonia
- **Ceremonia:** Selecciona ganadores en vivo

### Durante la ceremonia:
1. Mantén `/admin/ceremony` abierto pero oculto
2. Proyecta `/display` en pantalla completa
3. Ve el conteo de votos en ceremony para decidir
4. Selecciona el ganador → se muestra automáticamente

### Seguridad:
- Los votos están separados por fase (no se mezclan)
- Un usuario puede votar hasta 3 veces en Fase 1
- Un usuario solo puede votar 1 vez en Fase 2
- Identificación por localStorage (casual, sin login)

---

## 🔧 Funciones SQL Disponibles

### `mark_top_4_as_finalists(category_uuid)`
```sql
SELECT mark_top_4_as_finalists('uuid-de-categoria');
```
Marca automáticamente los 4 más votados de Fase 1 como finalistas.

### `get_top_voted_nominations(category_uuid, phase, limit)`
```sql
SELECT * FROM get_top_voted_nominations('uuid-categoria', 1, 4);
```
Retorna los N nominados más votados de una fase.

### `get_user_vote_count_phase1(category_uuid, voter_id)`
```sql
SELECT get_user_vote_count_phase1('uuid-categoria', 'voter_123');
```
Cuenta cuántos votos tiene un usuario en Fase 1 para una categoría.

---

## ❓ FAQ

**¿Puedo cambiar de Fase 2 de vuelta a Fase 1?**
Sí, pero perderás los votos de Fase 2. Los votos de Fase 1 se mantienen.

**¿Los votos de Fase 1 cuentan para el ganador final?**
No, son solo para determinar el Top 4. El ganador se decide con votos de Fase 2.

**¿Puedo tener algunas categorías en Fase 1 y otras en Fase 2?**
Sí! Cada categoría tiene su propia fase independiente.

**¿El ganador se selecciona automáticamente por votos?**
No, TÚ seleccionas manualmente desde `/admin/ceremony`. Los votos son solo orientativos.

**¿Qué pasa si hay empate en el Top 4?**
La función SQL usa el orden de la base de datos. Puedes ajustar manualmente los finalistas si lo necesitas.

---

## 🎯 Ejemplo de Timeline Real

```
Día 1-14: Fase 1 abierta
  └─> Usuarios votan por hasta 3 en cada categoría

Día 15: Cerrar Fase 1
  └─> Ir a /admin/voting-phases
  └─> Click "Marcar Top 4" en cada categoría

Día 16: Activar Fase 2
  └─> Click "Fase 2: Final" en cada categoría
  └─> Anunciar en redes: "¡Top 4 revelado! Vota por tu favorito"

Día 16-18: Fase 2 abierta
  └─> Usuarios votan por 1 finalista

Día 19: CEREMONIA EN VIVO
  └─> Proyectar /display
  └─> Abrir /admin/ceremony
  └─> Seleccionar ganadores uno por uno
  └─> 🏆 ¡Celebrar!
```

---

¡Listo para hacer una ceremonia épica! 🎉
