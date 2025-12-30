'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Nomination, type Participant } from '@/lib/supabase'
import { MdMovie, MdInfo, MdNavigateBefore, MdNavigateNext, MdScreenShare } from 'react-icons/md'
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
  const [currentPhase, setCurrentPhase] = useState<number>(1)

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
    const activeEdition = await supabase.from('editions').select('id, current_display_category_id, voting_phase').eq('is_active', true).single()

    if (activeEdition.data) {
      setEditionId(activeEdition.data.id)
      setCurrentPhase(activeEdition.data.voting_phase || 1)

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

    // Get nominations (only show finalists for ceremony)
    const { data: nominationsData } = await supabase
      .from('nominations')
      .select(`*, participant:participants!participant_id(*)`)
      .eq('category_id', selectedCategory)
      .eq('is_finalist', true)

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

  async function startCeremony() {
    setLoading('start-ceremony')
    try {
      await supabase
        .from('editions')
        .update({ voting_phase: 4 })
        .eq('id', editionId)
      setCurrentPhase(4)
      alert('✅ Ceremonia iniciada! La pantalla /display ahora mostrará las categorías.')
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al iniciar la ceremonia')
    } finally {
      setLoading(null)
    }
  }

  async function endCeremony() {
    if (!confirm('¿Terminar la ceremonia? Volverá a la pantalla de pre-ceremonia.')) return
    setLoading('end-ceremony')
    try {
      await supabase
        .from('editions')
        .update({ voting_phase: 3 })
        .eq('id', editionId)
      setCurrentPhase(3)
      alert('✅ Ceremonia terminada.')
    } catch (error) {
      console.error('Error:', error)
      alert('❌ Error al terminar la ceremonia')
    } finally {
      setLoading(null)
    }
  }

  function goToPreviousCategory() {
    const currentIndex = categories.findIndex(c => c.id === selectedCategory)
    if (currentIndex > 0) {
      setSelectedCategory(categories[currentIndex - 1].id)
    }
  }

  function goToNextCategory() {
    const currentIndex = categories.findIndex(c => c.id === selectedCategory)
    if (currentIndex < categories.length - 1) {
      setSelectedCategory(categories[currentIndex + 1].id)
    }
  }

  const currentCategory = categories.find(c => c.id === selectedCategory)
  const currentWinner = nominations.find(n => n.is_winner)
  const maxVotes = Math.max(...nominations.map(n => n.vote_count), 0)
  const currentIndex = categories.findIndex(c => c.id === selectedCategory)
  const isFirstCategory = currentIndex === 0
  const isLastCategory = currentIndex === categories.length - 1

  const getPhaseLabel = () => {
    if (currentPhase === 1) return { text: 'Nominación Popular (Top 4 pasan a Fase 2)', color: 'bg-cyan-600' }
    if (currentPhase === 2) return { text: 'Votación Final - Top 4 Finalistas', color: 'bg-purple-600' }
    return { text: '', color: 'bg-gray-600' }
  }

  const phaseInfo = getPhaseLabel()

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
              <MdMovie className="text-cyan-400" />
              Control de Ceremonia
            </h1>
            <p className="text-gray-400">Controla la ceremonia en tiempo real</p>
          </div>
          <div className="flex gap-3">
            {currentPhase !== 4 ? (
              <button
                onClick={startCeremony}
                disabled={loading === 'start-ceremony'}
                className="flex items-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition-all"
              >
                ▶️ {loading === 'start-ceremony' ? 'Iniciando...' : 'Iniciar Ceremonia'}
              </button>
            ) : (
              <button
                onClick={endCeremony}
                disabled={loading === 'end-ceremony'}
                className="flex items-center gap-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition-all"
              >
                ⏹️ {loading === 'end-ceremony' ? 'Terminando...' : 'Terminar Ceremonia'}
              </button>
            )}
            <a
              href="/display"
              target="_blank"
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-lg transition-all"
            >
              <MdScreenShare className="text-xl" />
              Abrir Display
            </a>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mb-6 p-4 bg-gradient-to-r from-cyan-900/30 to-purple-900/30 rounded-lg border border-cyan-500/50">
          <p className="text-sm flex items-center gap-2 text-gray-300">
            <MdInfo className="text-cyan-400" />
            Los cambios se reflejan automáticamente en /display. Usa los botones de navegación para cambiar de categoría.
          </p>
        </div>

        {categories.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
            <p className="text-xl text-gray-400 mb-4">No hay categorías en la edición activa</p>
            <a href="/admin/categories" className="text-cyan-400 hover:text-cyan-300 underline">Crear categorías</a>
          </div>
        ) : (
          <>
            {/* Category Navigation */}
            <div className="mb-8 bg-gradient-to-r from-gray-900 to-gray-800 border-2 border-cyan-500/50 rounded-xl p-6">
              <div className="flex items-center gap-4 mb-4">
                <button
                  onClick={goToPreviousCategory}
                  disabled={isFirstCategory}
                  className="flex-shrink-0 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white p-4 rounded-lg transition-all"
                >
                  <MdNavigateBefore className="text-3xl" />
                </button>

                <div className="flex-1 text-center">
                  <div className="mb-2">
                    <span className="text-sm text-gray-400">Mostrando en pantalla</span>
                  </div>
                  <div className="text-5xl font-black mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                    {currentCategory?.name || 'Selecciona una categoría'}
                  </div>
                  <div className="flex items-center justify-center gap-4 flex-wrap">
                    <span className="text-xl text-gray-300">
                      Categoría {currentIndex + 1} de {categories.length}
                    </span>
                    <span className={`${phaseInfo.color} text-sm px-4 py-2 rounded-full font-bold text-white`}>
                      {phaseInfo.text}
                    </span>
                    <span className="text-sm text-gray-400 bg-gray-800 px-4 py-2 rounded-full">
                      {nominations.length} {currentPhase === 2 ? 'finalistas' : 'nominados'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={goToNextCategory}
                  disabled={isLastCategory}
                  className="flex-shrink-0 bg-gray-800 hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed text-white p-4 rounded-lg transition-all"
                >
                  <MdNavigateNext className="text-3xl" />
                </button>
              </div>

              {/* Category selector dropdown for quick access */}
              <div className="mt-4">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:border-cyan-500"
                >
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      Categoría {cat.order}: {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Current Winner Display */}
            {currentWinner && (
              <div className="mb-8 p-6 bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border-2 border-yellow-400 rounded-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6">
                    {currentWinner.participant.image_url && (
                      <img
                        src={currentWinner.participant.image_url}
                        alt={currentWinner.participant.name}
                        className="w-24 h-24 object-cover rounded-lg border-2 border-yellow-400"
                      />
                    )}
                    <div>
                      <p className="text-sm text-yellow-300 flex items-center gap-2 mb-2">
                        <FaTrophy className="text-yellow-400 text-xl" />
                        GANADOR SELECCIONADO - Visible en /display
                      </p>
                      <p className="text-3xl font-bold text-white mb-1">{currentWinner.participant.name}</p>
                      <p className="text-lg text-gray-300">{currentWinner.vote_count} votos recibidos</p>
                    </div>
                  </div>
                  <button
                    onClick={clearWinner}
                    disabled={loading === 'clear'}
                    className="bg-red-600 hover:bg-red-700 disabled:opacity-50 px-6 py-3 rounded-lg font-bold transition-all"
                  >
                    {loading === 'clear' ? 'Limpiando...' : 'Quitar ganador'}
                  </button>
                </div>
              </div>
            )}

            {/* Nominations Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl font-bold text-white">
                  {currentPhase === 2 ? 'Finalistas' : 'Nominados'}
                </h2>
                <span className="text-gray-400">
                  Ordenados por cantidad de votos
                </span>
              </div>

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
                      className={`bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 border-2 transition-all ${
                        nomination.is_winner
                          ? 'border-yellow-400 shadow-xl shadow-yellow-400/20'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-6">
                        {/* Ranking badge */}
                        <div className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg ${
                          index === 0 ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black' :
                          index === 1 ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black' :
                          index === 2 ? 'bg-gradient-to-br from-orange-500 to-orange-700 text-white' :
                          'bg-gray-800 text-gray-400'
                        }`}>
                          #{index + 1}
                        </div>

                        {nomination.participant.image_url && (
                          <div className="flex-shrink-0">
                            <img
                              src={nomination.participant.image_url}
                              alt={nomination.participant.name}
                              className="w-40 h-40 object-cover rounded-lg border-2 border-gray-600 shadow-lg"
                            />
                          </div>
                        )}

                        <div className="flex-grow">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-3xl font-bold text-white">{nomination.participant.name}</h3>
                            {nomination.is_finalist && currentPhase === 2 && (
                              <span className="bg-purple-600 text-xs px-3 py-1 rounded-full font-bold text-white flex items-center gap-1">
                                <FaMedal /> FINALISTA
                              </span>
                            )}
                            {nomination.is_winner && (
                              <span className="bg-gradient-to-r from-yellow-400 to-yellow-500 text-xs px-3 py-1 rounded-full font-bold text-black flex items-center gap-1">
                                <FaTrophy /> GANADOR
                              </span>
                            )}
                          </div>
                          {nomination.participant.description && (
                            <p className="text-gray-300 mb-4 text-lg">{nomination.participant.description}</p>
                          )}

                          {/* Vote count with prominent display */}
                          <div className="mb-4 bg-gray-800/50 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-base font-medium text-gray-300">Votos recibidos</span>
                              <span className="text-4xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                                {nomination.vote_count}
                              </span>
                            </div>
                            <div className="w-full bg-gray-700 rounded-full h-4">
                              <div
                                className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-4 rounded-full transition-all duration-500"
                                style={{ width: `${maxVotes > 0 ? (nomination.vote_count / maxVotes) * 100 : 0}%` }}
                              />
                            </div>
                          </div>

                          {/* Winner selection button */}
                          {!nomination.is_winner ? (
                            <button
                              onClick={() => selectWinner(nomination.id)}
                              disabled={loading === nomination.id}
                              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-8 py-3 rounded-lg font-bold text-lg transition-all transform hover:scale-105"
                            >
                              {loading === nomination.id ? 'Seleccionando...' : '🏆 Marcar como Ganador'}
                            </button>
                          ) : null}
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
