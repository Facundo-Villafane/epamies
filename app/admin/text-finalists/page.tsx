'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FaTrophy, FaMagic } from 'react-icons/fa'
import { MdTextFields, MdCheckCircle } from 'react-icons/md'

type Category = {
  id: string
  name: string
  category_type?: string
}

type TextSubmission = {
  id: string
  user_id: string
  submission_text: string
  created_at: string
}

type GeneratedMoment = {
  title: string
  description: string
}

export default function TextFinalistsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [submissions, setSubmissions] = useState<TextSubmission[]>([])
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [generatedMoments, setGeneratedMoments] = useState<GeneratedMoment[]>([])
  const [creating, setCreating] = useState(false)
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      fetchTextSubmissions()
      setGeneratedMoments([])
    }
  }, [selectedCategory])

  async function fetchCategories() {
    const { data: editionData, error: editionError } = await supabase
      .from('editions')
      .select('id')
      .eq('is_active', true)
      .single()

    if (editionError) {
      console.error('Error fetching edition:', editionError)
      return
    }

    if (!editionData) {
      console.warn('No active edition found')
      return
    }

    const { data, error } = await supabase
      .from('categories')
      .select('id, name, category_type')
      .eq('edition_id', editionData.id)
      .eq('category_type', 'text_based')
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return
    }

    setCategories(data || [])
  }

  async function fetchTextSubmissions() {
    setLoading(true)

    const { data, error } = await supabase
      .from('text_submissions')
      .select('*')
      .eq('category_id', selectedCategory)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching submissions:', error)
    } else {
      setSubmissions(data || [])
    }

    setLoading(false)
  }

  async function generateTop4Moments() {
    if (submissions.length === 0) {
      alert('No hay respuestas para esta categoría')
      return
    }

    setGenerating(true)

    try {
      const allTexts = submissions.map(s => s.submission_text).join('\n---\n')

      const response = await fetch('/api/generate-top-moments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          categoryId: selectedCategory,
          submissions: allTexts
        })
      })

      if (!response.ok) {
        throw new Error('Error generando momentos')
      }

      const data = await response.json()
      setGeneratedMoments(data.moments)
    } catch (error) {
      console.error('Error:', error)
      alert('Error al generar momentos con IA')
    } finally {
      setGenerating(false)
    }
  }

  function updateMoment(index: number, field: 'title' | 'description', value: string) {
    setGeneratedMoments(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  function deleteMoment(index: number) {
    setGeneratedMoments(prev => prev.filter((_, i) => i !== index))
  }

  function addEmptyMoment() {
    setGeneratedMoments(prev => [...prev, { title: '', description: '' }])
    setEditingIndex(generatedMoments.length)
  }

  async function createNominationsFromMoments() {
    if (generatedMoments.length === 0) return

    // Validate all moments have title and description
    const invalidMoment = generatedMoments.find(m => !m.title.trim() || !m.description.trim())
    if (invalidMoment) {
      alert('⚠️ Todos los momentos deben tener título y descripción')
      return
    }

    setCreating(true)

    try {
      // First, delete existing nominations for this category (if any)
      await supabase
        .from('nominations')
        .delete()
        .eq('category_id', selectedCategory)

      // Create a "virtual participant" for each moment
      const nominationsToCreate = []

      for (const moment of generatedMoments) {
        // Create a participant with the moment description
        const { data: participant, error: participantError } = await supabase
          .from('participants')
          .insert({
            name: moment.title,
            description: moment.description
          })
          .select()
          .single()

        if (participantError) {
          console.error('Error creating participant:', participantError)
          continue
        }

        // Create nomination linking to this participant
        nominationsToCreate.push({
          category_id: selectedCategory,
          participant_id: participant.id,
          is_finalist: true // Mark as finalist for Phase 2
        })
      }

      const { error: nomError } = await supabase
        .from('nominations')
        .insert(nominationsToCreate)

      if (nomError) {
        throw nomError
      }

      alert(`✅ ${generatedMoments.length} momentos creados como nominaciones para Fase 2!`)
      setGeneratedMoments([])
    } catch (error) {
      console.error('Error creating nominations:', error)
      alert('❌ Error al crear nominaciones')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <MdTextFields className="text-cyan-400" />
            Finalistas de Categorías de Texto
          </h1>
          <a
            href="/admin"
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            ← Volver
          </a>
        </div>

        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
          <label className="block text-white font-bold mb-2">
            Seleccionar Categoría de Texto
          </label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2"
          >
            <option value="">-- Selecciona una categoría --</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>
        </div>

        {selectedCategory && (
          <>
            <div className="bg-cyan-500/10 border-2 border-cyan-500 backdrop-blur-md rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-cyan-300 mb-3">
                🤖 Generación con IA
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                La IA leerá todas las respuestas, identificará los momentos más mencionados/similares y generará un Top 4 con tono neutro + toque otaku cringe.
              </p>
              <button
                onClick={generateTop4Moments}
                disabled={generating || submissions.length === 0}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
              >
                <FaMagic className={generating ? 'animate-spin' : ''} />
                {generating ? 'Generando con IA...' : `🎭 Generar Top 4 Momentos (${submissions.length} respuestas)`}
              </button>
            </div>

            {loading ? (
              <div className="text-white text-center py-12">Cargando respuestas...</div>
            ) : (
              <>
                {generatedMoments.length > 0 && (
                  <div className="bg-green-500/10 border-2 border-green-500 backdrop-blur-md rounded-xl p-6 mb-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-2xl font-bold text-green-300 flex items-center gap-2">
                        <MdCheckCircle /> Momentos Generados ({generatedMoments.length})
                      </h3>
                      <button
                        onClick={addEmptyMoment}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                      >
                        + Agregar Momento Manual
                      </button>
                    </div>
                    <p className="text-gray-300 text-sm mb-4">
                      Puedes editar los títulos y descripciones haciendo click en ellos, o agregar momentos manualmente.
                    </p>
                    <div className="space-y-4 mb-6">
                      {generatedMoments.map((moment, index) => (
                        <div key={index} className="bg-gray-900/50 rounded-lg p-4 border border-gray-700 relative group">
                          <button
                            onClick={() => deleteMoment(index)}
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 text-white p-2 rounded text-xs"
                            title="Eliminar momento"
                          >
                            🗑️
                          </button>
                          <div className="mb-3">
                            <label className="text-xs text-gray-400 mb-1 block">Título #{index + 1}</label>
                            <input
                              type="text"
                              value={moment.title}
                              onChange={(e) => updateMoment(index, 'title', e.target.value)}
                              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-green-400"
                              placeholder="Título del momento..."
                              maxLength={50}
                            />
                            <span className="text-xs text-gray-500">{moment.title.length}/50</span>
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Descripción</label>
                            <textarea
                              value={moment.description}
                              onChange={(e) => updateMoment(index, 'description', e.target.value)}
                              className="w-full bg-gray-800 text-white border border-gray-600 rounded px-3 py-2 focus:outline-none focus:border-green-400 resize-none"
                              placeholder="Descripción del momento..."
                              rows={3}
                              maxLength={250}
                            />
                            <span className="text-xs text-gray-500">{moment.description.length}/250</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={createNominationsFromMoments}
                      disabled={creating || generatedMoments.length === 0}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all"
                    >
                      {creating ? 'Creando...' : `✅ Crear ${generatedMoments.length} Nominaciones para Fase 2`}
                    </button>
                  </div>
                )}

                <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                  <h2 className="text-2xl font-bold text-white mb-4">
                    Respuestas de Usuarios ({submissions.length})
                  </h2>
                  <div className="space-y-3 max-h-[600px] overflow-y-auto">
                    {submissions.map((sub, index) => (
                      <div key={sub.id} className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-400 text-sm">#{index + 1}</span>
                          <span className="text-gray-500 text-xs">
                            {new Date(sub.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-white">{sub.submission_text}</p>
                        <p className="text-gray-500 text-xs mt-2">Usuario: {sub.user_id}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
