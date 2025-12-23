'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { MdUpload, MdCheckCircle, MdError, MdCloudUpload, MdContentCopy } from 'react-icons/md'

type ImportResult = {
  success: number
  errors: string[]
  items: any[]
}

export default function ImportPage() {
  const [categoriesFile, setCategoriesFile] = useState<File | null>(null)
  const [participantsFile, setParticipantsFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ categories?: ImportResult, participants?: ImportResult } | null>(null)
  const [activeEdition, setActiveEdition] = useState<{ id: string, name: string } | null>(null)

  useEffect(() => {
    fetchActiveEdition()
  }, [])

  async function fetchActiveEdition() {
    const { data } = await supabase
      .from('editions')
      .select('id, name')
      .eq('is_active', true)
      .single()

    if (data) setActiveEdition(data)
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text)
    alert('✅ UUID copiado al portapapeles')
  }

  async function handleImportCategories() {
    if (!categoriesFile) return
    setLoading(true)
    setResult(null)

    try {
      const text = await categoriesFile.text()
      const data = JSON.parse(text)

      // Validar que sea un array
      if (!Array.isArray(data)) {
        throw new Error('El JSON debe ser un array de categorías')
      }

      const errors: string[] = []
      const successItems: any[] = []

      // Procesar cada categoría
      for (const [index, category] of data.entries()) {
        try {
          // Validar campos requeridos
          if (!category.name || !category.edition_id) {
            errors.push(`Categoría ${index + 1}: Faltan campos requeridos (name, edition_id)`)
            continue
          }

          const categoryData = {
            name: category.name,
            description: category.description || null,
            order: category.order || 0,
            edition_id: category.edition_id,
            category_type: category.category_type || 'participant_based',
            voting_phase: category.voting_phase || 1,
            phase1_end_date: category.phase1_end_date || null,
            phase2_end_date: category.phase2_end_date || null
          }

          const { data: inserted, error } = await supabase
            .from('categories')
            .insert([categoryData])
            .select()
            .single()

          if (error) throw error
          successItems.push(inserted)
        } catch (error: any) {
          errors.push(`Categoría ${index + 1} (${category.name}): ${error.message}`)
        }
      }

      setResult({
        categories: {
          success: successItems.length,
          errors,
          items: successItems
        }
      })
    } catch (error: any) {
      setResult({
        categories: {
          success: 0,
          errors: [error.message],
          items: []
        }
      })
    } finally {
      setLoading(false)
    }
  }

  async function handleImportParticipants() {
    if (!participantsFile) return
    setLoading(true)
    setResult(null)

    try {
      const text = await participantsFile.text()
      const data = JSON.parse(text)

      // Validar que sea un array
      if (!Array.isArray(data)) {
        throw new Error('El JSON debe ser un array de participantes')
      }

      const errors: string[] = []
      const successItems: any[] = []

      // Procesar cada participante
      for (const [index, participant] of data.entries()) {
        try {
          // Validar campos requeridos
          if (!participant.name) {
            errors.push(`Participante ${index + 1}: Falta el campo name`)
            continue
          }

          const participantData = {
            name: participant.name,
            description: participant.description || null,
            image_url: participant.image_url || null
          }

          const { data: inserted, error } = await supabase
            .from('participants')
            .insert([participantData])
            .select()
            .single()

          if (error) throw error
          successItems.push(inserted)
        } catch (error: any) {
          errors.push(`Participante ${index + 1} (${participant.name}): ${error.message}`)
        }
      }

      setResult({
        participants: {
          success: successItems.length,
          errors,
          items: successItems
        }
      })
    } catch (error: any) {
      setResult({
        participants: {
          success: 0,
          errors: [error.message],
          items: []
        }
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
            <MdCloudUpload className="text-cyan-400" />
            Importación Masiva
          </h1>
          <p className="text-gray-400">Importa categorías y participantes desde archivos JSON</p>
        </div>

        {/* Edition UUID Helper */}
        {activeEdition && (
          <div className="mb-6 p-4 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/50 rounded-xl">
            <h3 className="text-yellow-300 font-bold mb-2 flex items-center gap-2">
              ⚠️ IMPORTANTE: UUID de la Edición Activa
            </h3>
            <p className="text-yellow-200 text-sm mb-3">
              Para importar categorías, debes usar este UUID en el campo <code className="bg-black/50 px-2 py-1 rounded">edition_id</code> de tu JSON:
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-black/50 px-4 py-3 rounded-lg font-mono text-white border border-yellow-500/30">
                {activeEdition.id}
              </div>
              <button
                onClick={() => copyToClipboard(activeEdition.id)}
                className="bg-yellow-600 hover:bg-yellow-700 px-4 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                <MdContentCopy /> Copiar
              </button>
            </div>
            <p className="text-yellow-200/70 text-xs mt-2">
              Edición activa: <strong>{activeEdition.name}</strong>
            </p>
          </div>
        )}

        {/* Categorías */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Importar Categorías</h2>

          <div className="mb-4 p-4 bg-cyan-900/20 border border-cyan-500/30 rounded-lg">
            <p className="text-cyan-300 text-sm mb-2"><strong>Formato JSON esperado:</strong></p>
            <pre className="text-xs text-gray-400 bg-black/50 p-3 rounded overflow-x-auto">
{`[
  {
    "name": "Mejor Personaje",
    "description": "El personaje más memorable",
    "order": 1,
    "edition_id": "uuid-de-la-edicion",
    "category_type": "participant_based",
    "voting_phase": 1
  }
]`}
            </pre>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Selecciona archivo JSON de categorías
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setCategoriesFile(e.target.files?.[0] || null)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-cyan-600 file:text-white hover:file:bg-cyan-700"
            />
          </div>

          <button
            onClick={handleImportCategories}
            disabled={!categoriesFile || loading}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            <MdUpload /> {loading ? 'Importando...' : 'Importar Categorías'}
          </button>
        </div>

        {/* Participantes */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4">Importar Participantes</h2>

          <div className="mb-4 p-4 bg-purple-900/20 border border-purple-500/30 rounded-lg">
            <p className="text-purple-300 text-sm mb-2"><strong>Formato JSON esperado:</strong></p>
            <pre className="text-xs text-gray-400 bg-black/50 p-3 rounded overflow-x-auto">
{`[
  {
    "name": "Facundo",
    "description": "Descripción opcional",
    "image_url": null
  },
  {
    "name": "Lucía",
    "description": "Otra descripción",
    "image_url": null
  }
]`}
            </pre>
            <p className="text-purple-300 text-xs mt-2">
              💡 <strong>Tip:</strong> Deja image_url como null, luego sube las imágenes manualmente desde la página de Participantes.
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2 text-gray-300">
              Selecciona archivo JSON de participantes
            </label>
            <input
              type="file"
              accept=".json"
              onChange={(e) => setParticipantsFile(e.target.files?.[0] || null)}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white hover:file:bg-purple-700"
            />
          </div>

          <button
            onClick={handleImportParticipants}
            disabled={!participantsFile || loading}
            className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            <MdUpload /> {loading ? 'Importando...' : 'Importar Participantes'}
          </button>
        </div>

        {/* Resultados */}
        {result && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-2xl font-bold text-white mb-4">Resultados de Importación</h2>

            {result.categories && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-cyan-400 mb-2 flex items-center gap-2">
                  <MdCheckCircle /> Categorías
                </h3>
                <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-lg p-4">
                  <p className="text-white mb-2">
                    ✅ <strong>{result.categories.success}</strong> categorías importadas exitosamente
                  </p>
                  {result.categories.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-red-400 font-semibold mb-2">
                        ❌ {result.categories.errors.length} errores:
                      </p>
                      <ul className="text-sm text-red-300 space-y-1">
                        {result.categories.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.participants && (
              <div>
                <h3 className="text-lg font-semibold text-purple-400 mb-2 flex items-center gap-2">
                  <MdCheckCircle /> Participantes
                </h3>
                <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
                  <p className="text-white mb-2">
                    ✅ <strong>{result.participants.success}</strong> participantes importados exitosamente
                  </p>
                  {result.participants.errors.length > 0 && (
                    <div className="mt-3">
                      <p className="text-red-400 font-semibold mb-2">
                        ❌ {result.participants.errors.length} errores:
                      </p>
                      <ul className="text-sm text-red-300 space-y-1">
                        {result.participants.errors.map((error, i) => (
                          <li key={i}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
