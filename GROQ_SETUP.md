# Configuración de Groq AI

## ¿Qué es Groq?

Groq es una plataforma de IA ultra rápida que usamos para la funcionalidad de "Mejorar con IA" en las categorías de texto.

## Obtener tu API Key

1. Ve a [https://console.groq.com](https://console.groq.com)
2. Crea una cuenta gratuita (puedes usar Google, GitHub o email)
3. Una vez dentro, ve a **API Keys** en el menú lateral
4. Haz click en **Create API Key**
5. Dale un nombre (ej: "Epamies App")
6. Copia la API key generada

## Configurar en tu proyecto

1. Abre el archivo `.env.local` en la carpeta `awards-app`
2. Reemplaza `your_groq_api_key_here` con tu API key real:

```
GROQ_API_KEY=gsk_tu_api_key_aqui
```

3. Guarda el archivo
4. Reinicia el servidor de desarrollo (Ctrl+C y luego `npm run dev` de nuevo)

## Modelo usado

Estamos usando el modelo **llama-3.3-70b-versatile** que es:
- Ultra rápido (gracias a la infraestructura de Groq)
- Gratuito para uso moderado
- Excelente para reescribir texto en tono profesional

## Límites gratuitos

El tier gratuito de Groq incluye:
- 30 requests por minuto
- 6,000 tokens por minuto
- Más que suficiente para nuestra app de votación

## Funcionalidad

La IA se usa para:
- Reescribir respuestas de texto en tono corporativo y profesional
- Hacer el texto más amigable y apropiado para el trabajo
- Mejorar la claridad y profesionalismo sin cambiar el mensaje original
