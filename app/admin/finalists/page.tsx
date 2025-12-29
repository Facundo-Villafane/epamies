'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { FaTrophy, FaCheck } from 'react-icons/fa'
import { MdCheckCircle } from 'react-icons/md'

type Category = {
  id: string
  name: string
  category_type?: string
}

type NominationWithVotes = {
  id: string
  participant_name: string
  vote_count: number
  is_finalist: boolean
}

export default function FinalistsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [nominations, setNominations] = useState<NominationWithVotes[]>([])
  const [loading, setLoading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [selectedNominations, setSelectedNominations] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchCategories()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      fetchNominationsWithVotes()
      setSelectedNominations(new Set())
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
      .order('name')

    if (error) {
      console.error('Error fetching categories:', error)
      return
    }

    console.log('Categories loaded:', data)

    // Filter only participant_based and duo categories (exclude text_based)
    const filteredCategories = data?.filter(cat =>
      cat.category_type === 'participant_based' || cat.category_type === 'duo'
    ) || []

    console.log('Filtered categories:', filteredCategories)
    setCategories(filteredCategories)
  }

  async function fetchNominationsWithVotes() {
    setLoading(true)

    // Get all nominations for this category
    const { data: nominations } = await supabase
      .from('nominations')
      .select(`
        id,
        is_finalist,
        participant:participants!participant_id(name),
        duo_participant2:participants!duo_participant2_id(name)
      `)
      .eq('category_id', selectedCategory)

    if (!nominations) {
      setLoading(false)
      return
    }

    // Get vote counts for phase 1
    const { data: votes } = await supabase
      .from('votes')
      .select('nomination_id')
      .eq('category_id', selectedCategory)
      .eq('voting_phase', 1)

    // Count votes per nomination
    const voteCounts: Record<string, number> = {}
    votes?.forEach((vote: any) => {
      voteCounts[vote.nomination_id] = (voteCounts[vote.nomination_id] || 0) + 1
    })

    // Build nominations with vote counts
    const nominationsWithVotes = nominations.map((nom: any) => {
      const participantName = nom.duo_participant2
        ? `${nom.participant.name} & ${nom.duo_participant2.name}`
        : nom.participant.name

      return {
        id: nom.id,
        participant_name: participantName,
        vote_count: voteCounts[nom.id] || 0,
        is_finalist: nom.is_finalist
      }
    })

    // Sort by vote count descending, then alphabetically
    nominationsWithVotes.sort((a, b) => {
      if (b.vote_count !== a.vote_count) {
        return b.vote_count - a.vote_count
      }
      return a.participant_name.localeCompare(b.participant_name)
    })

    setNominations(nominationsWithVotes)
    setLoading(false)
  }

  async function markTop4AsFinalists() {
    if (!selectedCategory) return

    setProcessing(true)

    try {
      // Get top 4 nomination IDs
      const top4Ids = nominations.slice(0, 4).map(n => n.id)

      // First, unmark all nominations in this category
      await supabase
        .from('nominations')
        .update({ is_finalist: false })
        .eq('category_id', selectedCategory)

      // Then, mark top 4 as finalists
      await supabase
        .from('nominations')
        .update({ is_finalist: true })
        .in('id', top4Ids)

      alert('✅ Top 4 marcados como finalistas!')
      await fetchNominationsWithVotes()
    } catch (error) {
      console.error('Error marking finalists:', error)
      alert('❌ Error al marcar finalistas')
    } finally {
      setProcessing(false)
    }
  }

  async function markAllAsFinalists() {
    if (!selectedCategory) return

    setProcessing(true)

    try {
      // Mark ALL nominations in this category as finalists
      await supabase
        .from('nominations')
        .update({ is_finalist: true })
        .eq('category_id', selectedCategory)

      alert('✅ Todos los nominados marcados como finalistas!')
      await fetchNominationsWithVotes()
    } catch (error) {
      console.error('Error marking all finalists:', error)
      alert('❌ Error al marcar finalistas')
    } finally {
      setProcessing(false)
    }
  }

  async function markSelectedAsFinalists() {
    if (!selectedCategory || selectedNominations.size === 0) return

    setProcessing(true)

    try {
      // First, unmark all nominations in this category
      await supabase
        .from('nominations')
        .update({ is_finalist: false })
        .eq('category_id', selectedCategory)

      // Then, mark selected as finalists
      await supabase
        .from('nominations')
        .update({ is_finalist: true })
        .in('id', Array.from(selectedNominations))

      alert(`✅ ${selectedNominations.size} nominados marcados como finalistas!`)
      await fetchNominationsWithVotes()
      setSelectedNominations(new Set())
    } catch (error) {
      console.error('Error marking selected finalists:', error)
      alert('❌ Error al marcar finalistas')
    } finally {
      setProcessing(false)
    }
  }

  function toggleNomination(nominationId: string) {
    setSelectedNominations(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nominationId)) {
        newSet.delete(nominationId)
      } else {
        newSet.add(nominationId)
      }
      return newSet
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold text-white flex items-center gap-3">
            <FaTrophy className="text-yellow-400" />
            Gestión de Finalistas
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
            Seleccionar Categoría
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
            <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-4">Opciones de Selección</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <button
                  onClick={markTop4AsFinalists}
                  disabled={processing || nominations.length < 4}
                  className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all"
                >
                  {processing ? 'Procesando...' : '🏆 Top 4 Automático'}
                </button>
                <button
                  onClick={markSelectedAsFinalists}
                  disabled={processing || selectedNominations.size === 0}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all"
                >
                  {processing ? 'Procesando...' : `✓ Marcar ${selectedNominations.size} Seleccionados`}
                </button>
                <button
                  onClick={markAllAsFinalists}
                  disabled={processing}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-all"
                >
                  {processing ? 'Procesando...' : '✓ Marcar TODOS'}
                </button>
              </div>
              <div className="mt-4 text-sm text-gray-300 space-y-1">
                <p><strong>Top 4 Automático:</strong> Marca los 4 con más votos</p>
                <p><strong>Seleccionados:</strong> Marca los que elijas manualmente (haz click en las tarjetas)</p>
                <p><strong>Marcar TODOS:</strong> Marca todos los nominados como finalistas</p>
              </div>
            </div>

            {loading ? (
              <div className="text-white text-center py-12">Cargando...</div>
            ) : (
              <div className="bg-white/10 backdrop-blur-md rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">
                  Nominados ordenados por votos (Click para seleccionar)
                </h2>
                <div className="space-y-3">
                  {nominations.map((nom, index) => (
                    <div
                      key={nom.id}
                      onClick={() => toggleNomination(nom.id)}
                      className={`flex items-center justify-between p-4 rounded-lg transition-all cursor-pointer hover:scale-[1.01] ${
                        selectedNominations.has(nom.id)
                          ? 'bg-orange-500/30 border-2 border-orange-400'
                          : index < 4
                          ? 'bg-yellow-500/20 border-2 border-yellow-500'
                          : 'bg-gray-800/50 border border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="checkbox"
                          checked={selectedNominations.has(nom.id)}
                          onChange={() => toggleNomination(nom.id)}
                          className="w-6 h-6 rounded border-gray-600 text-orange-500 focus:ring-orange-500"
                        />
                        <span className="text-3xl font-bold text-white/50">
                          #{index + 1}
                        </span>
                        <div>
                          <p className="text-white font-bold text-lg">
                            {nom.participant_name}
                          </p>
                          <p className="text-gray-400 text-sm">
                            {nom.vote_count} votos
                          </p>
                        </div>
                      </div>
                      {nom.is_finalist && (
                        <div className="flex items-center gap-2 bg-green-500/20 border border-green-500 px-4 py-2 rounded-lg">
                          <MdCheckCircle className="text-green-400 text-xl" />
                          <span className="text-green-400 font-bold">FINALISTA</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
