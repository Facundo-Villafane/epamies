'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Edition } from '@/lib/supabase'
import { MdHowToVote, MdInfo } from 'react-icons/md'
import { FaStar, FaTrophy } from 'react-icons/fa'

export default function VotingPhasesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [editions, setEditions] = useState<Edition[]>([])
  const [selectedEdition, setSelectedEdition] = useState<string>('')
  const [loading, setLoading] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedEdition) fetchCategories()
  }, [selectedEdition])

  async function fetchData() {
    const { data: editionsData } = await supabase.from('editions').select('*').order('year', { ascending: false })
    if (editionsData) {
      setEditions(editionsData)
      const active = editionsData.find(e => e.is_active)
      if (active) setSelectedEdition(active.id)
    }
  }

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').eq('edition_id', selectedEdition).order('order')
    if (data) setCategories(data)
  }

  async function setPhase(categoryId: string, phase: number) {
    setLoading(categoryId)
    try {
      await supabase.from('categories').update({ voting_phase: phase }).eq('id', categoryId)
      await fetchCategories()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(null)
    }
  }

  async function markTop4AsFinalists(categoryId: string) {
    if (!confirm('Esto marcará los 4 más votados de Fase 1 como finalistas. ¿Continuar?')) return

    setLoading(categoryId)
    try {
      // Llamar a la función SQL que marca los top 4
      const { error } = await supabase.rpc('mark_top_4_as_finalists', {
        category_uuid: categoryId
      })

      if (error) {
        console.error('Error:', error)
        alert('Error al marcar finalistas: ' + error.message)
      } else {
        alert('✅ Top 4 marcados como finalistas correctamente!')
        await fetchCategories()
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + error)
    } finally {
      setLoading(null)
    }
  }

  async function setGlobalPhase(phase: number) {
    if (!selectedEdition) return

    const edition = editions.find(e => e.id === selectedEdition)
    if (!edition) return

    let confirmMessage = ''
    if (phase === 0) confirmMessage = '¿Cerrar Fase 1 y mostrar pantalla de espera? Los usuarios NO podrán votar hasta que actives la Fase 2.'
    else if (phase === 1) confirmMessage = '¿Activar Fase 1? Los usuarios podrán votar por 3 nominados.'
    else if (phase === 2) confirmMessage = '¿Activar Fase 2? Los usuarios podrán votar SOLO por los finalistas.'
    else if (phase === 3) confirmMessage = '¿Cerrar Fase 2 y mostrar pantalla de espera? Los usuarios esperarán la ceremonia.'
    else if (phase === 4) confirmMessage = '¿Activar Ceremonia? Los usuarios podrán ver los resultados finales.'

    if (!confirm(confirmMessage)) return

    setLoading('global')
    try {
      await supabase.from('editions').update({ voting_phase: phase }).eq('id', selectedEdition)
      await fetchData()
      alert('✅ Fase global actualizada correctamente!')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar fase global')
    } finally {
      setLoading(null)
    }
  }

  const getPhaseLabel = (phase: number) => {
    if (phase === 1) return { text: 'Fase 1: Nominación', color: 'bg-cyan-600' }
    if (phase === 2) return { text: 'Fase 2: Final (Top 4)', color: 'bg-purple-600' }
    return { text: 'Sin fase', color: 'bg-gray-600' }
  }

  const getGlobalPhaseLabel = (phase: number) => {
    if (phase === 0) return { text: '⏸️ Fase 1 Cerrada (Esperando Fase 2)', color: 'bg-orange-600', icon: '⏸️' }
    if (phase === 1) return { text: '▶️ Fase 1: Votación Activa', color: 'bg-cyan-600', icon: '▶️' }
    if (phase === 2) return { text: '▶️ Fase 2: Final Activa (Top 4)', color: 'bg-purple-600', icon: '▶️' }
    if (phase === 3) return { text: '⏸️ Fase 2 Cerrada (Esperando Ceremonia)', color: 'bg-orange-600', icon: '⏸️' }
    if (phase === 4) return { text: '🎉 Ceremonia / Resultados', color: 'bg-green-600', icon: '🎉' }
    return { text: 'Sin definir', color: 'bg-gray-600', icon: '❓' }
  }

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
            <MdHowToVote className="text-cyan-400" />
            Gestión de Fases de Votación
          </h1>
          <p className="text-gray-400">Controla las fases de votación por categoría</p>
        </div>

        <div className="mb-6 p-6 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/50 rounded-xl">
          <h3 className="text-lg font-bold mb-2 flex items-center gap-2 text-white">
            <MdInfo className="text-cyan-400" />
            Cómo funciona:
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li><strong className="text-cyan-400">Fase 1 - Nominación:</strong> Usuarios votan por 3 candidatos. Dura hasta que tú decidas cerrarla.</li>
            <li><strong className="text-purple-400">Marcar Top 4:</strong> Automáticamente selecciona los 4 más votados como finalistas.</li>
            <li><strong className="text-cyan-400">Fase 2 - Final:</strong> Solo el Top 4 está disponible, usuarios votan por 1 solo.</li>
            <li><strong className="text-purple-400">Ceremonia:</strong> Tú seleccionas el ganador del Top 4 en /admin/ceremony</li>
          </ul>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">Edición</label>
          <select
            value={selectedEdition}
            onChange={(e) => setSelectedEdition(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500"
          >
            {editions.map(ed => (
              <option key={ed.id} value={ed.id}>{ed.name} {ed.is_active && '(Activa)'}</option>
            ))}
          </select>
        </div>

        {/* Control de Fase Global */}
        {selectedEdition && (() => {
          const currentEdition = editions.find(e => e.id === selectedEdition)
          if (!currentEdition) return null
          const currentPhase = currentEdition.voting_phase || 1
          const phaseInfo = getGlobalPhaseLabel(currentPhase)

          return (
            <div className="mb-8 p-6 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-2 border-cyan-500/50 rounded-xl">
              <h2 className="text-2xl font-bold mb-4 text-white flex items-center gap-3">
                <MdHowToVote className="text-cyan-400" />
                Control de Fase Global
              </h2>

              <div className="mb-6">
                <p className="text-gray-300 mb-2">Estado actual:</p>
                <div className={`${phaseInfo.color} text-white px-6 py-3 rounded-lg inline-block text-lg font-bold`}>
                  {phaseInfo.text}
                </div>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <button
                  onClick={() => setGlobalPhase(1)}
                  disabled={loading === 'global' || currentPhase === 1}
                  className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-sm font-bold transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">▶️</span>
                  <span>Activar Fase 1</span>
                </button>

                <button
                  onClick={() => setGlobalPhase(0)}
                  disabled={loading === 'global' || currentPhase === 0}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-sm font-bold transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">⏸️</span>
                  <span>Cerrar Fase 1</span>
                </button>

                <button
                  onClick={() => setGlobalPhase(2)}
                  disabled={loading === 'global' || currentPhase === 2}
                  className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-sm font-bold transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">▶️</span>
                  <span>Activar Fase 2</span>
                </button>

                <button
                  onClick={() => setGlobalPhase(3)}
                  disabled={loading === 'global' || currentPhase === 3}
                  className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-sm font-bold transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">⏸️</span>
                  <span>Cerrar Fase 2</span>
                </button>

                <button
                  onClick={() => setGlobalPhase(4)}
                  disabled={loading === 'global' || currentPhase === 4}
                  className="bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-3 rounded-lg text-sm font-bold transition-all flex flex-col items-center gap-2"
                >
                  <span className="text-2xl">🎉</span>
                  <span>Ceremonia</span>
                </button>
              </div>

              <div className="mt-4 p-4 bg-cyan-500/10 border border-cyan-400/30 rounded-lg">
                <p className="text-sm text-cyan-200">
                  <strong>💡 Flujo recomendado:</strong> Fase 1 Activa → Cerrar Fase 1 → Activar Fase 2 → Cerrar Fase 2 → Ceremonia
                </p>
              </div>
            </div>
          )
        })()}

        <div className="grid gap-4">
          {categories.map((category) => {
            const phaseInfo = getPhaseLabel(category.voting_phase || 1)
            return (
              <div key={category.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-cyan-500/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-2xl font-bold text-white">{category.name}</h3>
                      <span className={`${phaseInfo.color} text-xs px-3 py-1 rounded-full font-bold text-white`}>
                        {phaseInfo.text}
                      </span>
                    </div>
                    {category.description && <p className="text-gray-400">{category.description}</p>}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPhase(category.id, 1)}
                    disabled={loading === category.id || category.voting_phase === 1}
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <FaStar /> Fase 1: Nominación
                  </button>

                  <button
                    onClick={() => markTop4AsFinalists(category.id)}
                    disabled={loading === category.id || category.voting_phase !== 1}
                    className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    {loading === category.id ? 'Procesando...' : <><FaTrophy /> Marcar Top 4</>}
                  </button>

                  <button
                    onClick={() => setPhase(category.id, 2)}
                    disabled={loading === category.id || category.voting_phase === 2}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                  >
                    <FaTrophy /> Fase 2: Final (Top 4)
                  </button>
                </div>
              </div>
            )
          })}

          {categories.length === 0 && (
            <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
              No hay categorías. Crea algunas en /admin/categories
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
