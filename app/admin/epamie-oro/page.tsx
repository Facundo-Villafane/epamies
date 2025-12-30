'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Participant } from '@/lib/supabase'
import { FaTrophy, FaMedal, FaStar } from 'react-icons/fa'
import { MdRefresh, MdAdd, MdDelete } from 'react-icons/md'

type ParticipantWithVotes = {
  participant: Participant
  total_votes: number
  categories_count: number
}

type NominationWithParticipant = {
  id: string
  participant: Participant
  is_winner: boolean
}

export default function EpamieOroPage() {
  const [editionId, setEditionId] = useState<string>('')
  const [epamieCategory, setEpamieCategory] = useState<Category | null>(null)
  const [topParticipants, setTopParticipants] = useState<ParticipantWithVotes[]>([])
  const [currentNominations, setCurrentNominations] = useState<NominationWithParticipant[]>([])
  const [loading, setLoading] = useState<string | null>(null)
  const [allParticipants, setAllParticipants] = useState<Participant[]>([])
  const [selectedParticipant, setSelectedParticipant] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    console.log('🚀 Starting fetchData...')

    // Get active edition
    const { data: activeEdition } = await supabase
      .from('editions')
      .select('id')
      .eq('is_active', true)
      .single()

    console.log('📅 Active edition:', activeEdition)

    if (!activeEdition) {
      console.log('⚠️ No active edition found')
      return
    }

    setEditionId(activeEdition.id)

    // Get or find Epamie de Oro category
    const { data: categories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('edition_id', activeEdition.id)
      .eq('is_votable', false)
      .order('order')

    console.log('🏆 Non-votable categories:', categories)
    console.log('❌ Categories error (if any):', categoriesError)

    if (categories && categories.length > 0) {
      console.log('✅ Setting epamieCategory to:', categories[0])
      setEpamieCategory(categories[0])
      console.log('🔄 Calling fetchCurrentNominations with category ID:', categories[0].id)
      await fetchCurrentNominations(categories[0].id)
    } else {
      console.log('⚠️ No non-votable categories found')
    }

    // Calculate Top 3
    await calculateTop3(activeEdition.id)

    // Get all participants for manual selection
    const { data: participants } = await supabase
      .from('participants')
      .select('*')
      .order('name')

    if (participants) {
      setAllParticipants(participants)
    }
  }

  async function fetchCurrentNominations(categoryId: string) {
    console.log('🔍 Fetching nominations for category:', categoryId)

    const { data: nominations, error } = await supabase
      .from('nominations')
      .select('id, is_winner, participant:participants!participant_id(*)')
      .eq('category_id', categoryId)

    console.log('📊 Nominations data:', nominations)
    console.log('❌ Error (if any):', error)

    if (nominations) {
      console.log('✅ Setting currentNominations with', nominations.length, 'items')
      setCurrentNominations(nominations as any)
    } else {
      console.log('⚠️ No nominations data returned')
    }
  }

  async function calculateTop3(editionIdParam: string) {
    setLoading('calculating')

    try {
      // Get all individual categories (excluding duos, text_based, and non-votable)
      const { data: individualCategories } = await supabase
        .from('categories')
        .select('id')
        .eq('edition_id', editionIdParam)
        .eq('category_type', 'participant_based')
        .or('is_votable.eq.true,is_votable.is.null')

      if (!individualCategories || individualCategories.length === 0) {
        setTopParticipants([])
        return
      }

      const categoryIds = individualCategories.map(c => c.id)

      // Get all nominations from these categories
      const { data: nominations } = await supabase
        .from('nominations')
        .select('id, participant_id, participant:participants(*)')
        .in('category_id', categoryIds)

      if (!nominations) {
        setTopParticipants([])
        return
      }

      const nominationIds = nominations.map((n: any) => n.id)

      // Get all votes for these nominations (ONLY Phase 2 votes for finalists)
      const { data: votes } = await supabase
        .from('votes')
        .select('nomination_id')
        .in('nomination_id', nominationIds)
        .eq('voting_phase', 2) // Only count Phase 2 votes

      // Count votes per participant
      const votesByParticipant: Record<string, { votes: number; categories: Set<string> }> = {}

      nominations.forEach((nom: any) => {
        const participantId = nom.participant_id
        if (!votesByParticipant[participantId]) {
          votesByParticipant[participantId] = { votes: 0, categories: new Set() }
        }
      })

      votes?.forEach((vote: any) => {
        const nomination = nominations.find((n: any) => n.id === vote.nomination_id)
        if (nomination) {
          const participantId = (nomination as any).participant_id
          votesByParticipant[participantId].votes += 1
        }
      })

      // Convert to array and get participant details
      const participantsWithVotes: ParticipantWithVotes[] = []

      for (const participantId in votesByParticipant) {
        const nomination = nominations.find((n: any) => n.participant_id === participantId)
        if (nomination) {
          participantsWithVotes.push({
            participant: (nomination as any).participant,
            total_votes: votesByParticipant[participantId].votes,
            categories_count: votesByParticipant[participantId].categories.size
          })
        }
      }

      // Sort by votes descending and get top 3
      participantsWithVotes.sort((a, b) => b.total_votes - a.total_votes)
      setTopParticipants(participantsWithVotes.slice(0, 3))
    } catch (error) {
      console.error('Error calculating Top 3:', error)
    } finally {
      setLoading(null)
    }
  }

  async function autoPopulateTop3() {
    if (!epamieCategory || topParticipants.length === 0) return

    setLoading('auto-populate')

    try {
      // Get existing nominations to preserve manual ones
      const { data: existingNominations } = await supabase
        .from('nominations')
        .select('participant_id')
        .eq('category_id', epamieCategory.id)

      const existingParticipantIds = new Set(existingNominations?.map(n => n.participant_id) || [])

      // Only add top 3 participants that aren't already nominated
      const nominationsToInsert = topParticipants
        .filter(p => !existingParticipantIds.has(p.participant.id))
        .map(p => ({
          category_id: epamieCategory.id,
          participant_id: p.participant.id,
          is_winner: false,
          is_finalist: true
        }))

      if (nominationsToInsert.length > 0) {
        await supabase
          .from('nominations')
          .insert(nominationsToInsert)
      }

      await fetchCurrentNominations(epamieCategory.id)
    } catch (error) {
      console.error('Error auto-populating:', error)
    } finally {
      setLoading(null)
    }
  }

  async function addManualNomination() {
    if (!epamieCategory || !selectedParticipant) return

    console.log('➕ Adding manual nomination...')
    console.log('Category ID:', epamieCategory.id)
    console.log('Participant ID:', selectedParticipant)

    setLoading('add-manual')

    try {
      // Check if already nominated
      const { data: existing, error: checkError } = await supabase
        .from('nominations')
        .select('id, participant:participants!participant_id(name)')
        .eq('category_id', epamieCategory.id)
        .eq('participant_id', selectedParticipant)
        .maybeSingle()

      console.log('🔍 Duplicate check result:', existing)
      console.log('❌ Check error (if any):', checkError)

      if (existing) {
        const participantName = (existing as any).participant?.name || 'Este participante'
        console.log('⚠️ Participant already nominated:', participantName)
        alert(`⚠️ ${participantName} ya está nominado en "${epamieCategory.name}"`)
        console.log('🔄 Refreshing nominations list...')
        await fetchCurrentNominations(epamieCategory.id) // Refresh list
        setLoading(null)
        return
      }

      const { error: insertError } = await supabase
        .from('nominations')
        .insert({
          category_id: epamieCategory.id,
          participant_id: selectedParticipant,
          is_winner: false,
          is_finalist: true
        })

      if (insertError) {
        throw insertError
      }

      setSelectedParticipant('')
      await fetchCurrentNominations(epamieCategory.id)
      alert('✅ Participante agregado exitosamente!')
    } catch (error) {
      console.error('Error adding manual nomination:', error)
      alert('❌ Error al agregar participante: ' + (error as any).message)
    } finally {
      setLoading(null)
    }
  }

  async function removeNomination(nominationId: string) {
    if (!epamieCategory) return

    setLoading(nominationId)

    try {
      await supabase
        .from('nominations')
        .delete()
        .eq('id', nominationId)

      await fetchCurrentNominations(epamieCategory.id)
    } catch (error) {
      console.error('Error removing nomination:', error)
    } finally {
      setLoading(null)
    }
  }

  async function markAsWinner(nominationId: string) {
    if (!epamieCategory) return

    setLoading(nominationId)

    try {
      // Clear all winners first
      await supabase
        .from('nominations')
        .update({ is_winner: false })
        .eq('category_id', epamieCategory.id)

      // Mark this one as winner
      await supabase
        .from('nominations')
        .update({ is_winner: true })
        .eq('id', nominationId)

      await fetchCurrentNominations(epamieCategory.id)
    } catch (error) {
      console.error('Error marking winner:', error)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-5xl font-black mb-2 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent flex items-center gap-3">
            <FaTrophy className="text-yellow-400" />
            Epamie de Oro
          </h1>
          <p className="text-gray-400 text-lg">
            Gestiona el premio especial al participante más votado en categorías individuales
          </p>
        </div>

        {!epamieCategory ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
            <p className="text-xl text-gray-400 mb-4">
              No se encontró la categoría "Epamie de Oro"
            </p>
            <p className="text-gray-500">
              Crea una categoría con is_votable = false desde /admin/categories
            </p>
          </div>
        ) : (
          <>
            {/* Top 3 Calculation Section */}
            <div className="mb-8 bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border-2 border-yellow-500/50 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-2">
                  <FaMedal className="text-yellow-400" />
                  Top 3 Participantes
                </h2>
                <button
                  onClick={() => calculateTop3(editionId)}
                  disabled={loading === 'calculating'}
                  className="flex items-center gap-2 bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-bold px-6 py-3 rounded-lg transition-all"
                >
                  <MdRefresh className={loading === 'calculating' ? 'animate-spin' : ''} />
                  {loading === 'calculating' ? 'Calculando...' : 'Recalcular'}
                </button>
              </div>

              <p className="text-gray-300 mb-6">
                Calculado automáticamente sumando todos los votos de categorías individuales (excluye duos y categorías de texto)
              </p>

              {topParticipants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay datos de votación disponibles todavía
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {topParticipants.map((p, index) => (
                    <div
                      key={p.participant.id}
                      className={`relative rounded-xl p-6 border-2 ${
                        index === 0
                          ? 'bg-gradient-to-br from-yellow-400/20 to-yellow-600/20 border-yellow-400'
                          : index === 1
                          ? 'bg-gradient-to-br from-gray-300/20 to-gray-500/20 border-gray-400'
                          : 'bg-gradient-to-br from-orange-500/20 to-orange-700/20 border-orange-500'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Ranking badge */}
                        <div
                          className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-xl shadow-lg ${
                            index === 0
                              ? 'bg-gradient-to-br from-yellow-400 to-yellow-600 text-black'
                              : index === 1
                              ? 'bg-gradient-to-br from-gray-300 to-gray-500 text-black'
                              : 'bg-gradient-to-br from-orange-500 to-orange-700 text-white'
                          }`}
                        >
                          {index + 1}
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-1">
                            {p.participant.name}
                          </h3>
                          <p className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                            {p.total_votes} votos
                          </p>
                        </div>

                        {/* Image */}
                        {p.participant.image_url && (
                          <img
                            src={p.participant.image_url}
                            alt={p.participant.name}
                            className="w-20 h-20 rounded-lg object-cover border-2 border-white/20"
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={autoPopulateTop3}
                disabled={loading === 'auto-populate' || topParticipants.length === 0}
                className="w-full bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-lg px-8 py-4 rounded-lg transition-all"
              >
                {loading === 'auto-populate'
                  ? 'Agregando Top 3...'
                  : '✨ Agregar Top 3 (preserva nominados manuales)'}
              </button>
              <p className="text-sm text-gray-400 mt-2 text-center">
                Los participantes manuales no se eliminarán. Solo se agregan los Top 3 que no estén ya nominados.
              </p>
            </div>

            {/* Current Nominations Section */}
            <div className="mb-8 bg-gray-900/50 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white">
                  Nominados Actuales en "{epamieCategory.name}"
                </h2>
                <button
                  onClick={() => fetchCurrentNominations(epamieCategory.id)}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                >
                  🔄 Recargar Lista
                </button>
              </div>

              {currentNominations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay nominados en esta categoría todavía
                </div>
              ) : (
                <div className="space-y-4 mb-6">
                  {currentNominations.map((nom) => (
                    <div
                      key={nom.id}
                      className={`bg-gray-800/50 rounded-lg p-4 flex items-center justify-between border-2 ${
                        nom.is_winner ? 'border-yellow-400' : 'border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {nom.participant.image_url && (
                          <img
                            src={nom.participant.image_url}
                            alt={nom.participant.name}
                            className="w-16 h-16 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <h3 className="text-xl font-bold text-white">
                            {nom.participant.name}
                          </h3>
                          {nom.is_winner && (
                            <span className="text-sm bg-yellow-400 text-black px-2 py-1 rounded font-bold">
                              GANADOR
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {!nom.is_winner && (
                          <button
                            onClick={() => markAsWinner(nom.id)}
                            disabled={loading === nom.id}
                            className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition-all"
                          >
                            Marcar Ganador
                          </button>
                        )}
                        <button
                          onClick={() => removeNomination(nom.id)}
                          disabled={loading === nom.id}
                          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-2"
                        >
                          <MdDelete />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Manual Add Section */}
              <div className="mt-6 p-4 bg-gray-800/30 border border-gray-700 rounded-lg">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <MdAdd />
                  Agregar Nominado Manualmente
                </h3>
                <div className="flex gap-4">
                  <select
                    value={selectedParticipant}
                    onChange={(e) => setSelectedParticipant(e.target.value)}
                    className="flex-1 bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Selecciona un participante...</option>
                    {allParticipants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addManualNomination}
                    disabled={loading === 'add-manual' || !selectedParticipant}
                    className="bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-6 py-3 rounded-lg transition-all"
                  >
                    {loading === 'add-manual' ? 'Agregando...' : 'Agregar'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
