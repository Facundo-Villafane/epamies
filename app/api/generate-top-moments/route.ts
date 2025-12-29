import { NextRequest, NextResponse } from 'next/server'
import Groq from 'groq-sdk'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

export async function POST(request: NextRequest) {
  try {
    const { categoryId, submissions } = await request.json()

    if (!submissions || submissions.trim().length === 0) {
      return NextResponse.json(
        { error: 'No hay respuestas para procesar' },
        { status: 400 }
      )
    }

    const systemPrompt = `Eres un asistente que analiza respuestas de usuarios sobre momentos memorables en el trabajo.

Tu tarea depende de CUÁNTAS respuestas hay:

**SI HAY 4 O MÁS RESPUESTAS:**
1. Leer todas las respuestas proporcionadas
2. Identificar los 4 momentos MÁS MENCIONADOS o MÁS SIMILARES
3. Agrupar respuestas similares (ej: si varios mencionan "la fiesta de navidad", agrúpalas en un solo momento)
4. Generar exactamente 4 momentos

**SI HAY MENOS DE 4 RESPUESTAS:**
1. NO agrupes, NO reduzcas
2. Parafrasea CADA respuesta individualmente
3. Cada respuesta se convierte en un momento separado
4. Genera tantos momentos como respuestas haya (1, 2 o 3)

Para cada momento, genera:
- Un título corto y descriptivo (máximo 50 caracteres)
- Una descripción neutra y profesional del momento (150-200 caracteres)
- Añadir al FINAL de la descripción un toque otaku/cringe sutil (ej: "uwu", "desu", algún emoji kawaii ✨)

IMPORTANTE - REGLAS ESTRICTAS:
- Mantén un tono mayormente neutro y profesional
- El toque otaku debe ser SOLO al final, como un pequeño detalle divertido
- NO inventes momentos que no aparezcan en las respuestas
- NO fuerces 4 momentos si hay menos de 4 respuestas diferentes
- **CRÍTICO**: Si los relatos mencionan nombres de personas (ej: "Juan", "María", "el jefe Carlos"), DEBES incluir esos nombres en tu descripción generada
- NUNCA reemplaces nombres de personas por términos genéricos
- Preserva los nombres exactamente como aparecen en los relatos originales

Responde ÚNICAMENTE con un JSON válido con este formato:
{
  "moments": [
    {
      "title": "Título corto del momento",
      "description": "Descripción neutral y profesional del momento... uwu ✨"
    }
  ]
}

NO incluyas texto adicional, SOLO el JSON.`

    const userPrompt = `Analiza estas respuestas y genera los momentos más relevantes (máximo 4, o menos si hay pocas respuestas):

${submissions}

Recuerda:
- Si hay 4+ respuestas: agrupa similares y genera top 4
- Si hay menos de 4: parafrasea cada una individualmente
- JSON válido únicamente, sin texto adicional.`

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1000,
      response_format: { type: 'json_object' }
    })

    const responseText = completion.choices[0]?.message?.content?.trim()

    if (!responseText) {
      throw new Error('No se recibió respuesta de la IA')
    }

    const parsedResponse = JSON.parse(responseText)

    // Ensure we have the moments array
    if (!parsedResponse.moments || !Array.isArray(parsedResponse.moments)) {
      throw new Error('Formato de respuesta inválido')
    }

    // Return the moments (max 4, but could be less if there are fewer submissions)
    const moments = parsedResponse.moments.slice(0, 4)

    return NextResponse.json({ moments })

  } catch (error: any) {
    console.error('Error generating moments:', error)
    return NextResponse.json(
      { error: error.message || 'Error al generar momentos' },
      { status: 500 }
    )
  }
}
