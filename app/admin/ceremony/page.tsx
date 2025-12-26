'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Nomination, type Participant } from '@/lib/supabase'
import { MdMovie, MdInfo } from 'react-icons/md'
import { FaTrophy, FaMedal } from 'react-icons/fa'

type NominationWithData = Nomination & {
  participant: Participant
  vote_count: number
}

export default function CeremonyPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [nominations, setNominations] = useState<NominationWithData[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [loading, setLoading] = useState<string | null>(null)
  const [editionId, setEditionId] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      fetchNominations()
      updateDisplayCategory()
    }
  }, [selectedCategory])

  async function fetchData() {
    const activeEdition = await supabase.from('editions').select('id, current_display_category_id').eq('is_active', true).single()

    if (activeEdition.data) {
      setEditionId(activeEdition.data.id)

      const { data } = await supabase
        .from('categories')
        .select('*')
        .eq('edition_id', activeEdition.data.id)
        .order('order')

      if (data && data.length > 0) {
        setCategories(data)
        // Set to current display category or first category
        setSelectedCategory(activeEdition.data.current_display_category_id || data[0].id)
      }
    }
  }

  async function updateDisplayCategory() {
    if (!editionId || !selectedCategory) return

    await supabase
      .from('editions')
      .update({ current_display_category_id: selectedCategory })
      .eq('id', editionId)
  }

  async function fetchNominations() {
    const currentCategory = categories.find(c => c.id === selectedCategory)
    if (!currentCategory) return

    const currentPhase = currentCategory.voting_phase || 1

    // Get nominations (only finalists if phase 2)
    let query = supabase
      .from('nominations')
      .select(`*, participant:participants(*)`)
      .eq('category_id', selectedCategory)

    if (currentPhase === 2) {
      query = query.eq('is_finalist', true)
    }

    const { data: nominationsData } = await query

    if (!nominationsData) return

    // Get vote counts
    const nominationIds = nominationsData.map((n: any) => n.id)
    const { data: votesData } = await supabase
      .from('votes')
      .select('nomination_id')
      .in('nomination_id', nominationIds)
      .eq('voting_phase', currentPhase)

    const voteCounts: Record<string, number> = {}
    votesData?.forEach((vote: any) => {
      voteCounts[vote.nomination_id] = (voteCounts[vote.nomination_id] || 0) + 1
    })

    const nominationsWithVotes = nominationsData.map((nom: any) => ({
      ...nom,
      vote_count: voteCounts[nom.id] || 0
    }))

    // Sort by vote count
    nominationsWithVotes.sort((a, b) => b.vote_count - a.vote_count)

    setNominations(nominationsWithVotes)
  }

  async function selectWinner(nominationId: string) {
    setLoading(nominationId)

    try {
      await supabase.from('nominations').update({ is_winner: false }).eq('category_id', selectedCategory)
      await supabase.from('nominations').update({ is_winner: true }).eq('id', nominationId)
      await fetchNominations()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(null)
    }
  }

  async function clearWinner() {
    setLoading('clear')
    try {
      await supabase.from('nominations').update({ is_winner: false }).eq('category_id', selectedCategory)
      await fetchNominations()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(null)
    }
  }

  const currentCategory = categories.find(c => c.id === selectedCategory)
  const currentWinner = nominations.find(n => n.is_winner)
  const currentPhase = currentCategory?.voting_phase || 1
  const maxVotes = Math.max(...nominations.map(n => n.vote_count), 0)

  const getPhaseLabel = () => {
    if (currentPhase === 1) return { text: 'Fase 1: Nominación Popular', color: 'bg-cyan-600' }
    if (currentPhase === 2) return { text: 'Fase 2: Votación Final (Top 4)', color: 'bg-purple-600' }
    return { text: '', color: 'bg-gray-600' }
  }

  const phaseInfo = getPhaseLabel()

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
            <MdMovie className="text-cyan-400" />
            Ceremonia en Vivo
          </h1>
          <p className="text-gray-400">Selecciona ganadores durante la ceremonia</p>
          <div className="mt-4 p-4 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-lg border border-cyan-500/50">
            <p className="text-sm flex items-center gap-2 text-gray-300">
              <MdInfo className="text-cyan-400" />
              Abre <a href="/display" target="_blank" className="underline text-cyan-300 hover:text-cyan-200">/display</a> en el proyector para ver los cambios en tiempo real
            </p>
          </div>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
            <p className="text-xl text-gray-400 mb-4">No hay categorías en la edición activa</p>
            <a href="/admin/categories" className="text-cyan-400 hover:text-cyan-300 underline">Crear categorías</a>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <label className="block text-sm font-medium mb-2 text-gray-300">Categoría actual:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 text-lg focus:outline-none focus:border-cyan-500"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>#{cat.order} - {cat.name}</option>
                ))}
              </select>

              {currentCategory && (
                <div className="mt-4 flex items-center gap-4">
                  <span className={`${phaseInfo.color} text-xs px-3 py-1 rounded-full font-bold text-white`}>
                    {phaseInfo.text}
                  </span>
                  <span className="text-sm text-gray-400">
                    {nominations.length} {currentPhase === 2 ? 'finalistas' : 'nominados'}
                  </span>
                </div>
              )}
            </div>

            {currentWinner && (
              <div className="mb-6 p-4 bg-gradient-to-r from-green-900/50 to-cyan-900/50 border border-green-500 rounded-lg flex justify-between items-center">
                <div>
                  <p className="text-sm text-green-300 flex items-center gap-2">
                    <FaTrophy className="text-yellow-400" />
                    Ganador actual:
                  </p>
                  <p className="text-xl font-bold text-white">{currentWinner.participant.name}</p>
                  <p className="text-sm text-gray-400">{currentWinner.vote_count} votos</p>
                </div>
                <button
                  onClick={clearWinner}
                  disabled={loading === 'clear'}
                  className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium"
                >
                  {loading === 'clear' ? 'Limpiando...' : 'Limpiar ganador'}
                </button>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="text-2xl font-bold mb-4 text-white">{currentCategory?.name || 'Selecciona una categoría'}</h2>

              {nominations.length === 0 ? (
                <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl text-gray-500">
                  No hay nominados en esta categoría.
                  <a href="/admin/nominations" className="block mt-2 text-purple-400 hover:text-purple-300 underline">Agregar nominados</a>
                </div>
              ) : (
                <div className="grid gap-4">
                  {nominations.map((nomination, index) => (
                    <div
                      key={nomination.id}
                      className={`bg-gray-900 rounded-xl p-6 border-2 transition-all ${
                        nomination.is_winner
                          ? 'border-yellow-400 bg-gradient-to-r from-yellow-900/20 to-cyan-900/20'
                          : 'border-gray-800 hover:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-6">
                        {/* Ranking badge */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-500 text-black' :
                          index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400 text-black' :
                          index === 2 ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          #{index + 1}
                        </div>

                        {nomination.participant.image_url && (
                          <div className="flex-shrink-0">
                            <img
                              src={nomination.participant.image_url}
                              alt={nomination.participant.name}
                              className="w-32 h-32 object-cover rounded-lg border-2 border-gray-700"
                            />
                          </div>
                        )}

                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-2xl font-bold text-white">{nomination.participant.name}</h3>
                            {nomination.is_finalist && currentPhase === 2 && (
                              <span className="bg-purple-600 text-xs px-2 py-1 rounded-full font-bold text-white flex items-center gap-1">
                                <FaMedal /> FINALISTA
                              </span>
                            )}
                          </div>
                          {nomination.participant.description && (
                            <p className="text-gray-400 mb-4">{nomination.participant.description}</p>
                          )}

                          {/* Vote count */}
                          <div className="mb-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-400">Votos recibidos</span>
                              <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">{nomination.vote_count}</span>
                            </div>
                            <div className="w-full bg-gray-800 rounded-full h-3">
                              <div
                                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-3 rounded-full transition-all"
                                style={{ width: `${maxVotes > 0 ? (nomination.vote_count / maxVotes) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {nomination.is_winner ? (
                            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-bold px-4 py-2 rounded-lg">
                              <FaTrophy />
                              <span>GANADOR ACTUAL</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => selectWinner(nomination.id)}
                              disabled={loading === nomination.id}
                              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium"
                            >
                              {loading === nomination.id ? 'Seleccionando...' : 'Seleccionar como ganador'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
