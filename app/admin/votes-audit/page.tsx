'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category } from '@/lib/supabase'
import { MdSearch, MdFilterList, MdExpandMore, MdExpandLess, MdDelete, MdTextFields } from 'react-icons/md'
import Link from 'next/link'

type VoteRecord = {
  id: string
  voter_identifier: string
  voting_phase: number
  created_at: string
  category_id: string
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

type TextSubmission = {
  id: string
  user_id: string
  submission_text: string
  created_at: string
  category_id: string
  category: {
    name: string
  }
}

export default function VotesAuditPage() {
  const [votes, setVotes] = useState<VoteRecord[]>([])
  const [textSubmissions, setTextSubmissions] = useState<TextSubmission[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedPhase, setSelectedPhase] = useState<string>('all')
  const [searchEmail, setSearchEmail] = useState('')
  const [loading, setLoading] = useState(true)
  const [deletingUser, setDeletingUser] = useState<string | null>(null)
  const [deletingItem, setDeletingItem] = useState<string | null>(null)
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetchData()
  }, [selectedCategory, selectedPhase])

  function toggleUserExpanded(email: string) {
    const newExpanded = new Set(expandedUsers)
    if (newExpanded.has(email)) {
      newExpanded.delete(email)
    } else {
      newExpanded.add(email)
    }
    setExpandedUsers(newExpanded)
  }

  async function handleDeleteUser(email: string, itemCount: number) {
    const confirmed = confirm(
      `¿Estás seguro de que quieres eliminar todos los votos y respuestas de ${email}?\n\n` +
      `Se eliminarán ${itemCount} elemento${itemCount !== 1 ? 's' : ''} de forma permanente.\n\n` +
      `Esta acción NO se puede deshacer.`
    )

    if (!confirmed) return

    setDeletingUser(email)

    try {
      // Delete all votes from this user
      await supabase
        .from('votes')
        .delete()
        .eq('voter_identifier', email)

      // Delete all text submissions from this user
      await supabase
        .from('text_submissions')
        .delete()
        .eq('user_id', email)

      alert(`✅ Se eliminaron todos los votos de ${email}`)
      await fetchData()
    } catch (error) {
      console.error('Error deleting user data:', error)
      alert('❌ Error al eliminar los datos. Intenta de nuevo.')
    } finally {
      setDeletingUser(null)
    }
  }

  async function handleDeleteVote(voteId: string, email: string, categoryName: string) {
    const confirmed = confirm(
      `¿Eliminar el voto de ${email} en "${categoryName}"?\n\n` +
      `Esta acción NO se puede deshacer.`
    )

    if (!confirmed) return

    setDeletingItem(voteId)

    try {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('id', voteId)

      if (error) throw error

      alert(`✅ Voto eliminado de "${categoryName}"`)
      await fetchData()
    } catch (error) {
      console.error('Error deleting vote:', error)
      alert('❌ Error al eliminar el voto. Intenta de nuevo.')
    } finally {
      setDeletingItem(null)
    }
  }

  async function handleDeleteTextSubmission(submissionId: string, email: string, categoryName: string) {
    const confirmed = confirm(
      `¿Eliminar la respuesta de texto de ${email} en "${categoryName}"?\n\n` +
      `Esta acción NO se puede deshacer.`
    )

    if (!confirmed) return

    setDeletingItem(submissionId)

    try {
      const { error } = await supabase
        .from('text_submissions')
        .delete()
        .eq('id', submissionId)

      if (error) throw error

      alert(`✅ Respuesta eliminada de "${categoryName}"`)
      await fetchData()
    } catch (error) {
      console.error('Error deleting text submission:', error)
      alert('❌ Error al eliminar la respuesta. Intenta de nuevo.')
    } finally {
      setDeletingItem(null)
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
      .order('order_index')

    if (categoriesData) setCategories(categoriesData)

    // Build query for votes
    let votesQuery = supabase
      .from('votes')
      .select(`
        id,
        voter_identifier,
        voting_phase,
        created_at,
        category_id,
        nomination:nominations!inner(
          id,
          participant:participants!participant_id(name, image_url),
          duo_participant2:participants!duo_participant2_id(name, image_url)
        ),
        category:categories!category_id(name)
      `)
      .order('created_at', { ascending: false })

    // Build query for text submissions
    let textQuery = supabase
      .from('text_submissions')
      .select(`
        id,
        user_id,
        submission_text,
        created_at,
        category_id,
        category:categories!category_id(name)
      `)
      .order('created_at', { ascending: false })

    // Apply category filter if selected
    if (selectedCategory !== 'all') {
      votesQuery = votesQuery.eq('category_id', selectedCategory)
      textQuery = textQuery.eq('category_id', selectedCategory)
    }

    // Apply phase filter if selected
    if (selectedPhase !== 'all') {
      votesQuery = votesQuery.eq('voting_phase', parseInt(selectedPhase))
    }

    const [{ data: votesData }, { data: textData }] = await Promise.all([
      votesQuery,
      textQuery
    ])

    setVotes(votesData || [])
    setTextSubmissions(textData || [])
    setLoading(false)
  }

  // Combine votes and text submissions, filter by search email, and group by user
  const allUserEmails = new Set<string>()
  votes.forEach(vote => allUserEmails.add(vote.voter_identifier))
  textSubmissions.forEach(sub => allUserEmails.add(sub.user_id))

  const filteredEmails = Array.from(allUserEmails).filter(email =>
    searchEmail === '' || email.toLowerCase().includes(searchEmail.toLowerCase())
  )

  const userDataMap: Record<string, { votes: VoteRecord[], textSubmissions: TextSubmission[] }> = {}
  filteredEmails.forEach(email => {
    userDataMap[email] = {
      votes: votes.filter(v => v.voter_identifier === email),
      textSubmissions: textSubmissions.filter(t => t.user_id === email)
    }
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-purple-950 to-gray-950 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 text-cyan-400 hover:text-cyan-300 mb-4"
          >
            ← Volver al Admin
          </Link>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Auditoría de Votos
          </h1>
          <p className="text-gray-400 mt-2">
            Todos los votos y respuestas de texto por usuario
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Category Filter */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <MdFilterList className="text-lg" />
                Filtrar por categoría
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
              >
                <option value="all">Todas las categorías</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name} ({category.type === 'text' ? 'Texto' : 'Votación'})
                  </option>
                ))}
              </select>
            </div>

            {/* Phase Filter */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <MdFilterList className="text-lg" />
                Filtrar por fase
              </label>
              <select
                value={selectedPhase}
                onChange={(e) => setSelectedPhase(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2"
              >
                <option value="all">Todas las fases</option>
                <option value="1">Fase 1</option>
                <option value="2">Fase 2</option>
              </select>
            </div>

            {/* Email Search */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <MdSearch className="text-lg" />
                Buscar por email
              </label>
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

        {/* Data List - Grouped by user */}
        {loading ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-xl">Cargando datos...</p>
          </div>
        ) : (
          <div className="space-y-3">
            {Object.entries(userDataMap).map(([email, userData], index) => {
              const totalItems = userData.votes.length + userData.textSubmissions.length
              const isExpanded = expandedUsers.has(email)

              // Group votes by category
              const votesByCategory: Record<string, VoteRecord[]> = {}
              userData.votes.forEach(vote => {
                const categoryName = vote.category.name
                if (!votesByCategory[categoryName]) {
                  votesByCategory[categoryName] = []
                }
                votesByCategory[categoryName].push(vote)
              })

              return (
                <div key={email} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                  {/* User header - clickable to expand/collapse */}
                  <div
                    className="bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border-b border-gray-800 p-4 cursor-pointer hover:from-cyan-900/30 hover:to-purple-900/30 transition-colors"
                    onClick={() => toggleUserExpanded(email)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-500 font-mono text-sm">#{index + 1}</span>
                        <div>
                          <h3 className="text-lg font-bold text-white">{email}</h3>
                          <p className="text-sm text-gray-400">
                            {userData.votes.length} voto{userData.votes.length !== 1 ? 's' : ''}, {userData.textSubmissions.length} respuesta{userData.textSubmissions.length !== 1 ? 's' : ''} de texto
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {totalItems > 15 && (
                          <div className="bg-orange-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                            ⚠️ SOSPECHOSO
                          </div>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteUser(email, totalItems)
                          }}
                          disabled={deletingUser === email}
                          className="bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors"
                        >
                          {deletingUser === email ? 'Eliminando...' : '🗑️ Eliminar Todo'}
                        </button>
                        {isExpanded ? (
                          <MdExpandLess className="text-2xl text-cyan-400" />
                        ) : (
                          <MdExpandMore className="text-2xl text-cyan-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expandable content */}
                  {isExpanded && (
                    <div className="p-4 space-y-4">
                      {/* Regular votes grouped by category */}
                      {Object.keys(votesByCategory).length > 0 && (
                        <div className="space-y-4">
                          <h4 className="font-bold text-cyan-300 flex items-center gap-2">
                            <FaTrophy className="text-lg" /> Votos Normales
                          </h4>
                          {Object.entries(votesByCategory).map(([categoryName, categoryVotes]) => (
                            <div key={categoryName} className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
                              <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 border-b border-gray-700 p-3">
                                <h5 className="font-bold text-white">{categoryName}</h5>
                                <p className="text-xs text-gray-400">{categoryVotes.length} voto{categoryVotes.length !== 1 ? 's' : ''}</p>
                              </div>
                              <div className="p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {categoryVotes.map(vote => (
                                  <div key={vote.id} className="bg-gray-900 border border-gray-700 rounded-lg p-2 relative group">
                                    <button
                                      onClick={() => handleDeleteVote(vote.id, email, categoryName)}
                                      disabled={deletingItem === vote.id}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white p-1 rounded text-xs"
                                      title="Eliminar este voto"
                                    >
                                      <MdDelete />
                                    </button>
                                    <div className="flex items-start gap-2">
                                      {vote.nomination.participant.image_url && (
                                        <img
                                          src={vote.nomination.participant.image_url}
                                          alt={vote.nomination.participant.name}
                                          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
                                        />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-white truncate">
                                          {vote.nomination.participant.name}
                                          {vote.nomination.duo_participant2 && (
                                            <> & {vote.nomination.duo_participant2.name}</>
                                          )}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                                            vote.voting_phase === 1
                                              ? 'bg-cyan-600 text-white'
                                              : 'bg-purple-600 text-white'
                                          }`}>
                                            F{vote.voting_phase}
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
                          ))}
                        </div>
                      )}

                      {/* Text submissions */}
                      {userData.textSubmissions.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="font-bold text-green-300 flex items-center gap-2">
                            <MdTextFields className="text-lg" /> Respuestas de Texto
                          </h4>
                          {userData.textSubmissions.map((submission) => {
                            const isDeletingThis = deletingItem === submission.id

                            return (
                              <div key={submission.id} className="bg-gray-800 border border-green-700/50 rounded-lg p-4">
                                <div className="flex items-start justify-between gap-4 mb-3">
                                  <div>
                                    <h5 className="font-bold text-white mb-1">{submission.category.name}</h5>
                                    <p className="text-xs text-gray-400">
                                      {new Date(submission.created_at).toLocaleDateString('es-AR', {
                                        day: '2-digit',
                                        month: '2-digit',
                                        year: 'numeric',
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </p>
                                  </div>
                                  <button
                                    onClick={() => handleDeleteTextSubmission(submission.id, email, submission.category.name)}
                                    disabled={isDeletingThis}
                                    className="bg-red-600/80 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                  >
                                    <MdDelete className="text-sm" />
                                    {isDeletingThis ? 'Eliminando...' : 'Eliminar'}
                                  </button>
                                </div>
                                <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                                  <p className="text-white text-sm leading-relaxed whitespace-pre-wrap">
                                    {submission.submission_text}
                                  </p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}

            {Object.keys(userDataMap).length === 0 && (
              <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-xl">
                <p className="text-gray-400">No se encontraron datos con los filtros seleccionados</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// Import missing icon
import { FaTrophy } from 'react-icons/fa'
