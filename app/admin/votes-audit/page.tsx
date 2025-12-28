'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category } from '@/lib/supabase'
import { MdSearch, MdFilterList } from 'react-icons/md'

type VoteRecord = {
  id: string
  voter_identifier: string
  voting_phase: number
  created_at: string
  nomination: {
    id: string
    participant: {
      name: string
      image_url?: string
    }
    duo_participant2?: {
      name: string
      image_url?: string
    } | null
  }
  category: {
    name: string
  }
}

export default function VotesAuditPage() {
  const [votes, setVotes] = useState<VoteRecord[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPhase, setSelectedPhase] = useState<string>('all')
  const [searchEmail, setSearchEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [selectedCategory, selectedPhase])

  async function handleDeleteUser(email: string, voteCount: number) {
    const confirmed = confirm(
      `¿Estás seguro de que quieres eliminar todos los votos de ${email}?\n\n` +
      `Se eliminarán ${voteCount} voto${voteCount !== 1 ? 's' : ''} de forma permanente.\n\n` +
      `Esta acción NO se puede deshacer.`
    )

    if (!confirmed) return

    setDeletingUser(email)

    try {
      // Delete all votes from this user
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('voter_identifier', email)

      if (error) throw error

      // Also delete text submissions if any
      await supabase
        .from('text_submissions')
        .delete()
        .eq('user_id', email)

      alert(`✅ Se eliminaron todos los votos de ${email}`)

      // Refresh data
      await fetchData()
    } catch (error) {
      console.error('Error deleting user votes:', error)
      alert('❌ Error al eliminar los votos. Intenta de nuevo.')
    } finally {
      setDeletingUser(null)
    }
  }

  async function fetchData() {
    setLoading(true)

    // Get active edition
    const { data: activeEdition } = await supabase
      .from('editions')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!activeEdition) {
      setLoading(false)
      return
    }

    // Get categories
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('edition_id', activeEdition.id)
      .order('order')

    if (categoriesData) setCategories(categoriesData)

    // Build query for votes
    let query = supabase
      .from('votes')
      .select(`
        id,
        voter_identifier,
        voting_phase,
        created_at,
        nomination:nominations!inner(
          id,
          participant:participants!participant_id(name, image_url),
          duo_participant2:participants!duo_participant2_id(name, image_url),
          category:categories!category_id(name)
        )
      `)
      .order('created_at', { ascending: false })

    // Filter by category if selected
    if (selectedCategory !== 'all') {
      query = query.eq('category_id', selectedCategory)
    } else {
      // Only show votes from active edition
      const categoryIds = categoriesData?.map(c => c.id) || []
      if (categoryIds.length > 0) {
        query = query.in('category_id', categoryIds)
      }
    }

    // Filter by phase if selected
    if (selectedPhase !== 'all') {
      query = query.eq('voting_phase', parseInt(selectedPhase))
    }

    const { data: votesData } = await query

    if (votesData) {
      setVotes(votesData as any)
    }

    setLoading(false)
  }

  // Filter votes by email search
  const filteredVotes = votes.filter(vote =>
    searchEmail === '' || vote.voter_identifier.toLowerCase().includes(searchEmail.toLowerCase())
  )

  // Get unique voters count
  const uniqueVoters = new Set(votes.map(v => v.voter_identifier)).size

  // Group votes by user
  const votesByUser: Record<string, VoteRecord[]> = {}
  filteredVotes.forEach(vote => {
    if (!votesByUser[vote.voter_identifier]) {
      votesByUser[vote.voter_identifier] = []
    }
    votesByUser[vote.voter_identifier].push(vote)
  })

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
            <MdSearch className="text-cyan-400" />
            Auditoría de Votos
          </h1>
          <p className="text-gray-400">Revisa quién votó por quién y detecta posibles irregularidades</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/50 rounded-xl p-6">
            <p className="text-cyan-300 text-sm mb-1">Total de Votos</p>
            <p className="text-4xl font-black text-white">{filteredVotes.length}</p>
          </div>
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/50 rounded-xl p-6">
            <p className="text-purple-300 text-sm mb-1">Votantes Únicos</p>
            <p className="text-4xl font-black text-white">{uniqueVoters}</p>
          </div>
          <div className="bg-gradient-to-r from-pink-900/30 to-orange-900/30 border border-pink-500/50 rounded-xl p-6">
            <p className="text-pink-300 text-sm mb-1">Promedio votos/usuario</p>
            <p className="text-4xl font-black text-white">
              {uniqueVoters > 0 ? (filteredVotes.length / uniqueVoters).toFixed(1) : '0'}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <MdFilterList className="text-cyan-400 text-xl" />
            <h2 className="text-xl font-bold text-white">Filtros</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category filter */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Categoría</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>

            {/* Phase filter */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Fase</label>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
              >
                <option value="all">Todas las fases</option>
                <option value="1">Fase 1: Nominación</option>
                <option value="2">Fase 2: Final</option>
              </select>
            </div>

            {/* Email search */}
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Buscar por email</label>
              <input
                type="text"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="email@ejemplo.com"
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* Votes List - Grouped by user */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-xl">Cargando votos...</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(votesByUser).map(([email, userVotes]) => (
              <div key={email} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                {/* User header */}
                <div className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-b border-gray-800 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-white">{email}</h3>
                      <p className="text-sm text-gray-400">{userVotes.length} voto{userVotes.length !== 1 ? 's' : ''}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {userVotes.length > 10 && (
                        <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                          ⚠️ SOSPECHOSO ({userVotes.length} votos)
                        </div>
                      )}
                      <button
                        onClick={() => handleDeleteUser(email, userVotes.length)}
                        disabled={deletingUser === email}
                        className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                      >
                        {deletingUser === email ? 'Eliminando...' : '🗑️ Eliminar Usuario'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* User's votes */}
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {userVotes.map(vote => (
                      <div key={vote.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3">
                        <div className="flex items-start gap-3">
                          {vote.nomination.participant.image_url && (
                            <img
                              src={vote.nomination.participant.image_url}
                              alt={vote.nomination.participant.name}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">
                              {vote.nomination.participant.name}
                              {vote.nomination.duo_participant2 && (
                                <> & {vote.nomination.duo_participant2.name}</>
                              )}
                            </p>
                            <p className="text-xs text-gray-400 truncate">{vote.nomination.category.name}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                vote.voting_phase === 1
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-purple-600 text-white'
                              }`}>
                                Fase {vote.voting_phase}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(vote.created_at).toLocaleDateString('es-AR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {Object.keys(votesByUser).length === 0 && (
              <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
                <p className="text-gray-400">No se encontraron votos con los filtros seleccionados</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
