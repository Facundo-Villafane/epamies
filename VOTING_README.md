# 🗳️ Sistema de Votación

## ✅ Qué se agregó

### Nueva página: `/vote`
- Votación pública para que la gente elija sus favoritos
- Sistema de votos en tiempo real
- Un voto por categoría por usuario
- Los usuarios pueden cambiar su voto
- Barra de progreso visual mostrando votos

### Base de datos
- Nueva tabla `votes` para almacenar votos
- Constraint único: 1 voto por categoría por usuario
- Realtime habilitado para actualización automática

## 🚀 Cómo configurar

### 1. Ejecutar SQL
Ve a Supabase → SQL Editor y ejecuta el contenido de `VOTING_SCHEMA.sql`

### 2. Reiniciar servidor
```bash
# Detén el servidor actual (Ctrl+C)
npm run dev
```

### 3. Listo!
- **Usuarios**: Van a `/vote` para votar
- **Admin**: Los votos NO afectan la selección de ganadores (solo son informativos)

## 📖 Cómo funciona

### Para usuarios (votantes):

1. Abrir `/vote` en el navegador
2. Ver categoría actual con nominados
3. Click en "Votar" en su favorito
4. Puede cambiar el voto haciendo click en otro
5. Navegar entre categorías con ← →
6. Cada usuario tiene un ID único guardado en localStorage

### Para admins:

Los votos son **informativos** y **no determinan ganadores automáticamente**.

Los ganadores se seleccionan manualmente desde `/admin/ceremony`.

Si quieres ver los votos antes de decidir, puedes:
1. Mirar la página `/vote` en otra pestaña
2. O agregar un contador de votos en la página de ceremonia (próxima mejora)

## 🎨 Características

✅ **Sin registro**: Usa localStorage para identificar votantes
✅ **Cambiar voto**: Los usuarios pueden cambiar su voto las veces que quieran
✅ **Tiempo real**: Los contadores se actualizan automáticamente
✅ **Visual**: Barras de progreso mostrando popularidad
✅ **Responsive**: Funciona en móvil y desktop
✅ **Un voto por categoría**: Constraint en base de datos

## 🔒 Seguridad

### Nivel actual:
- **Identificación por localStorage**: Funciona para votación casual
- Un usuario puede votar múltiples veces si borra localStorage o usa otro navegador
- Para prevenir esto, puedes:
  - Guardar IP del votante (requiere backend)
  - Requerir login con email
  - Usar session cookies

### Nivel básico (implementado):
- Constraint en BD: 1 voto por `voter_identifier` por categoría
- El mismo ID no puede votar 2 veces en la misma categoría

### Nivel avanzado (no implementado):
Si necesitas más seguridad:
1. Agregar autenticación (Supabase Auth)
2. Guardar IP + user agent
3. Rate limiting
4. Verificación de email

## 🎯 Flujo completo

```
1. Usuario abre /vote
2. Sistema genera voter_id único (localStorage)
3. Usuario vota en categorías
4. Votos se guardan en tabla votes
5. Contadores se actualizan en tiempo real
6. Admin selecciona ganador manualmente en /admin/ceremony
   (independiente de los votos)
```

## 📊 Estructura de datos

```sql
votes
├── id (UUID)
├── nomination_id (ref nominations)
├── category_id (ref categories)
├── voter_identifier (string, único por categoría)
└── created_at (timestamp)
```

## 💡 Próximas mejoras posibles

- [ ] Mostrar votos en `/admin/ceremony` para guiar decisión
- [ ] Dashboard de estadísticas de votación
- [ ] Cerrar votación antes de anunciar ganador
- [ ] Export de resultados a CSV
- [ ] Gráficos de votación en tiempo real
- [ ] Modo "público" vs "ganador oficial"

---

¡Listo para que tu audiencia vote! 🎉
