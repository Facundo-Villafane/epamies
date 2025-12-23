'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Participant } from '@/lib/supabase'
import Link from 'next/link'
import { IoMdArrowBack, IoMdSearch, IoMdCheckmark, IoMdShare } from 'react-icons/io'
import { FaTrophy, FaStar } from 'react-icons/fa'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Aurora from '@/components/Aurora'
import SpotlightCard from '@/components/SpotlightCard'
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md'
import AuthGuard from '@/components/AuthGuard'
import UserMenu from '@/components/UserMenu'

// Configuración de toast personalizada
const toastConfig = {
  position: 'bottom-center' as const,
  autoClose: 2500,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  theme: 'dark' as const,
  style: {
    background: 'linear-gradient(to right, rgb(6 182 212 / 0.9), rgb(168 85 247 / 0.9))',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgb(6 182 212 / 0.3)',
  }
}

type NominationWithVotes = {
  id: string
  participant: Participant
  category_id: string
  is_finalist: boolean
  vote_count: number
  user_voted: boolean
}

type DuoVoteSelection = {
  participant1_id: string
  participant2_id: string
}

export default function VotePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [nominations, setNominations] = useState<NominationWithVotes[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [editionName, setEditionName] = useState('')
  const [editionYear, setEditionYear] = useState(0)
  const [loading, setLoading] = useState<string | null>(null)
  const [voterId, setVoterId] = useState('')
  const [textSubmission, setTextSubmission] = useState('')
  const [hasSubmittedText, setHasSubmittedText] = useState(false)
  // Duo selection state
  const [duoParticipant1, setDuoParticipant1] = useState<string>('')
  const [duoParticipant2, setDuoParticipant2] = useState<string>('')

  useEffect(() => {
    let id = localStorage.getItem('voter_id')
    if (!id) {
      id = `voter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      localStorage.setItem('voter_id', id)
    }
    setVoterId(id)

    fetchData()
  }, [])

  useEffect(() => {
    if (selectedCategory) {
      const isTextCategory = selectedCategory.category_type === 'text_based'
      const isPhase1 = (selectedCategory.voting_phase || 1) === 1

      if (isTextCategory && isPhase1) {
        checkTextSubmission()
      } else {
        fetchNominations()
      }

      // Reset duo selections when category changes
      setDuoParticipant1('')
      setDuoParticipant2('')
    }
  }, [selectedCategory, voterId])

  async function fetchData() {
    const activeEdition = await supabase.from('editions').select('*').eq('is_active', true).single()

    if (activeEdition.data) {
      setEditionName(activeEdition.data.name)
      setEditionYear(activeEdition.data.year)

      const categoriesRes = await supabase
        .from('categories')
        .select('*')
        .eq('edition_id', activeEdition.data.id)
        .order('order')

      if (categoriesRes.data) {
        setCategories(categoriesRes.data)
      }
    }
  }

  async function checkTextSubmission() {
    if (!selectedCategory || !voterId) return

    const { data } = await supabase
      .from('text_submissions')
      .select('submission_text')
      .eq('category_id', selectedCategory.id)
      .eq('user_id', voterId)
      .single()

    if (data) {
      setTextSubmission(data.submission_text)
      setHasSubmittedText(true)
    } else {
      setTextSubmission('')
      setHasSubmittedText(false)
    }
  }

  async function handleTextSubmission() {
    if (!selectedCategory || !voterId || !textSubmission.trim()) return

    setLoading('text')

    try {
      if (hasSubmittedText) {
        // Update existing submission
        await supabase
          .from('text_submissions')
          .update({ submission_text: textSubmission })
          .eq('category_id', selectedCategory.id)
          .eq('user_id', voterId)
      } else {
        // Insert new submission
        await supabase
          .from('text_submissions')
          .insert([{
            category_id: selectedCategory.id,
            user_id: voterId,
            submission_text: textSubmission
          }])
      }

      setHasSubmittedText(true)
      toast.success('✅ Tu respuesta ha sido guardada!', toastConfig)
    } catch (error) {
      console.error('Error submitting text:', error)
      toast.error('Error al guardar tu respuesta. Intenta de nuevo.', {
        ...toastConfig,
        autoClose: 4000,
        style: {
          background: 'linear-gradient(to right, rgb(220 38 38 / 0.9), rgb(239 68 68 / 0.9))',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgb(220 38 38 / 0.3)',
        }
      })
    } finally {
      setLoading(null)
    }
  }

  async function fetchNominations() {
    if (!selectedCategory || !voterId) return

    const currentPhase = selectedCategory.voting_phase || 1
    const isDuoCategory = selectedCategory.category_type === 'duo'

    // Get nominations
    let nominationsQuery = supabase
      .from('nominations')
      .select('id, is_finalist, category_id, participant_id, duo_participant2_id, participant:participants(*)')
      .eq('category_id', selectedCategory.id)

    if (currentPhase === 2) {
      nominationsQuery = nominationsQuery.eq('is_finalist', true)
    }

    const { data: nominationsData } = await nominationsQuery

    if (!nominationsData) return

    // For duo categories, check if user has voted (stored in duo_participant2_id)
    if (isDuoCategory) {
      // Get user's duo vote from votes table
      const { data: userVoteData } = await supabase
        .from('votes')
        .select('nomination_id')
        .eq('category_id', selectedCategory.id)
        .eq('voter_identifier', voterId)
        .eq('voting_phase', currentPhase)
        .limit(1)
        .single()

      if (userVoteData) {
        // User has voted - find which nomination contains the duo info
        const votedNom = nominationsData.find((n: any) => n.id === userVoteData.nomination_id)
        if (votedNom && votedNom.duo_participant2_id) {
          setDuoParticipant1(votedNom.participant_id)
          setDuoParticipant2(votedNom.duo_participant2_id)
        }
      }

      // For duo categories, just show participants (no vote counts displayed)
      const nominationsWithVotes = nominationsData.map((nom: any) => ({
        id: nom.id,
        participant: nom.participant,
        category_id: nom.category_id,
        is_finalist: nom.is_finalist,
        vote_count: 0,
        user_voted: false
      }))

      setNominations(nominationsWithVotes)
    } else {
      // Normal category logic
      const nominationIds = nominationsData.map((n: any) => n.id)
      const { data: votesData } = await supabase
        .from('votes')
        .select('nomination_id, voter_identifier')
        .in('nomination_id', nominationIds)
        .eq('voting_phase', currentPhase)

      // Count votes
      const voteCounts: Record<string, number> = {}
      const userVotes: Set<string> = new Set()

      votesData?.forEach((vote: any) => {
        voteCounts[vote.nomination_id] = (voteCounts[vote.nomination_id] || 0) + 1
        if (vote.voter_identifier === voterId) {
          userVotes.add(vote.nomination_id)
        }
      })

      const nominationsWithVotes = nominationsData.map((nom: any) => ({
        id: nom.id,
        participant: nom.participant,
        category_id: nom.category_id,
        is_finalist: nom.is_finalist,
        vote_count: voteCounts[nom.id] || 0,
        user_voted: userVotes.has(nom.id)
      }))

      setNominations(nominationsWithVotes)
    }
  }

  async function handleDuoVote() {
    if (!selectedCategory || !voterId) return
    if (!duoParticipant1 || !duoParticipant2) {
      toast.warning('Por favor selecciona 2 participantes diferentes para formar el duo', {
        ...toastConfig,
        position: 'top-center',
        autoClose: 3000,
        style: {
          background: 'linear-gradient(to right, rgb(245 158 11 / 0.9), rgb(251 191 36 / 0.9))',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgb(245 158 11 / 0.3)',
        }
      })
      return
    }

    if (duoParticipant1 === duoParticipant2) {
      toast.warning('Los dos participantes deben ser diferentes', {
        ...toastConfig,
        position: 'top-center',
        autoClose: 3000,
        style: {
          background: 'linear-gradient(to right, rgb(245 158 11 / 0.9), rgb(251 191 36 / 0.9))',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgb(245 158 11 / 0.3)',
        }
      })
      return
    }

    const currentPhase = selectedCategory.voting_phase || 1
    setLoading('duo-vote')

    try {
      // Check if user already voted
      const { data: existingVote } = await supabase
        .from('votes')
        .select('id, nomination_id')
        .eq('category_id', selectedCategory.id)
        .eq('voter_identifier', voterId)
        .eq('voting_phase', currentPhase)
        .limit(1)
        .single()

      if (existingVote) {
        // Remove previous vote
        await supabase
          .from('votes')
          .delete()
          .eq('id', existingVote.id)
      }

      // Find or create a nomination that matches this duo combination
      // First, try to find existing nomination with these exact participants
      const { data: existingNom } = await supabase
        .from('nominations')
        .select('id')
        .eq('category_id', selectedCategory.id)
        .eq('participant_id', duoParticipant1)
        .eq('duo_participant2_id', duoParticipant2)
        .limit(1)
        .single()

      let nominationId: string

      if (existingNom) {
        nominationId = existingNom.id
      } else {
        // Create new nomination for this duo combination
        const { data: newNom, error: insertError } = await supabase
          .from('nominations')
          .insert([{
            category_id: selectedCategory.id,
            participant_id: duoParticipant1,
            duo_participant2_id: duoParticipant2,
            is_winner: false,
            is_finalist: false
          }])
          .select('id')
          .single()

        if (insertError) throw insertError
        nominationId = newNom.id
      }

      // Insert new vote
      await supabase.from('votes').insert([{
        nomination_id: nominationId,
        category_id: selectedCategory.id,
        voter_identifier: voterId,
        voting_phase: currentPhase
      }])

      toast.success(currentPhase === 1 ? '¡Duo votado!' : '¡Voto final registrado! 🏆', {
        ...toastConfig,
        autoClose: 2500,
      })

      await fetchNominations()
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Error al votar. Intenta de nuevo.', {
        ...toastConfig,
        position: 'top-center',
        autoClose: 4000,
        style: {
          background: 'linear-gradient(to right, rgb(220 38 38 / 0.9), rgb(239 68 68 / 0.9))',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgb(220 38 38 / 0.3)',
        }
      })
    } finally {
      setLoading(null)
    }
  }

  async function handleVote(nominationId: string) {
    if (!selectedCategory) return

    const currentPhase = selectedCategory.voting_phase || 1
    setLoading(nominationId)

    try {
      if (currentPhase === 1) {
        // FASE 1: Permitir hasta 3 votos
        const userVotedNoms = nominations.filter(n => n.user_voted)

        if (userVotedNoms.some(n => n.id === nominationId)) {
          // Ya votó por este, remover voto
          await supabase
            .from('votes')
            .delete()
            .eq('nomination_id', nominationId)
            .eq('voter_identifier', voterId)
            .eq('voting_phase', currentPhase)

          toast.info('Voto removido', {
            ...toastConfig,
            autoClose: 2000,
            style: {
              background: 'linear-gradient(to right, rgb(148 163 184 / 0.9), rgb(100 116 139 / 0.9))',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              border: '1px solid rgb(148 163 184 / 0.3)',
            }
          })
        } else {
          // Verificar que no tenga ya 3 votos
          if (userVotedNoms.length >= 3) {
            toast.warning('Ya votaste por 3 candidatos. Desmarca uno para votar por otro.', {
              ...toastConfig,
              position: 'top-center',
              autoClose: 4000,
              style: {
                background: 'linear-gradient(to right, rgb(245 158 11 / 0.9), rgb(251 191 36 / 0.9))',
                backdropFilter: 'blur(10px)',
                borderRadius: '12px',
                border: '1px solid rgb(245 158 11 / 0.3)',
              }
            })
            setLoading(null)
            return
          }

          // Agregar voto
          await supabase.from('votes').insert([{
            nomination_id: nominationId,
            category_id: selectedCategory.id,
            voter_identifier: voterId,
            voting_phase: currentPhase
          }])

          toast.success('¡Voto registrado!', {
            ...toastConfig,
            autoClose: 2000,
          })
        }
      } else if (currentPhase === 2) {
        // FASE 2: Solo 1 voto, cambiar si ya votó
        const hasVoted = nominations.some(n => n.user_voted)

        if (hasVoted) {
          // Remover voto anterior
          await supabase
            .from('votes')
            .delete()
            .eq('category_id', selectedCategory.id)
            .eq('voter_identifier', voterId)
            .eq('voting_phase', currentPhase)
        }

        // Agregar nuevo voto
        await supabase.from('votes').insert([{
          nomination_id: nominationId,
          category_id: selectedCategory.id,
          voter_identifier: voterId,
          voting_phase: currentPhase
        }])

        toast.success('¡Voto final registrado! 🏆', {
          ...toastConfig,
          autoClose: 2500,
        })
      }

      await fetchNominations()
    } catch (error) {
      console.error('Error voting:', error)
      toast.error('Error al votar. Intenta de nuevo.', {
        ...toastConfig,
        position: 'top-center',
        autoClose: 4000,
        style: {
          background: 'linear-gradient(to right, rgb(220 38 38 / 0.9), rgb(239 68 68 / 0.9))',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgb(220 38 38 / 0.3)',
        }
      })
    } finally {
      setLoading(null)
    }
  }

  const currentPhase = selectedCategory?.voting_phase || 1
  const isDuoCategory = selectedCategory?.category_type === 'duo'
  const userVoteCount = isDuoCategory
    ? (duoParticipant1 && duoParticipant2 ? 1 : 0)
    : nominations.filter(n => n.user_voted).length
  // Duos siempre permiten solo 1 voto, categorías normales: 3 en fase 1, 1 en fase 2
  const maxVotes = isDuoCategory ? 1 : (currentPhase === 1 ? 3 : 1)

  // Vista: Listado de categorías
  if (!selectedCategory) {
    return (
      <AuthGuard>
      <div className="min-h-screen relative bg-black">
        {/* Fondo animado Aurora */}
        <div className="fixed inset-0 z-0">
          <Aurora
            colorStops={['#06B6D4', '#A855F7', '#EC4899']}
            amplitude={1.2}
            blend={0.6}
            speed={0.8}
          />
        </div>

        {/* Contenido por encima del fondo */}
        <div className="relative z-10">
        {/* Header - Compact */}
        <div className="relative border-b border-gray-800">
          <div className="container mx-auto px-6 py-8">
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-gray-300 transition-colors">
                <IoMdArrowBack /> Volver al inicio
              </Link>
              <UserMenu />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <img
                  src="/logo-epamies.svg"
                  alt="LOS EPAMIES"
                  className="h-16 md:h-20 w-auto mb-2 brightness-0 invert"
                />
                <p className="text-lg text-gray-400">Voting Stage</p>
              </div>
              {/* Search Bar - Right side */}
              <div className="max-w-md w-full">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar categoría..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 pl-10 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
                  />
                  <IoMdSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xl" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {categories.map((category) => (
              <SpotlightCard
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                spotlightColor="rgba(139, 92, 246, 0.4)"
                className="group cursor-pointer aspect-[3/4] rounded-xl border-2 border-gray-800 hover:border-cyan-400 transition-all duration-300 hover:scale-105"
              >
                {/* Background - Softer color with alpha */}
                <div className="absolute inset-0 bg-black/70 group-hover:bg-black/60 transition-colors -z-10"></div>

                {/* Content */}
                <div className="relative h-full flex flex-col items-center justify-center p-6 text-center">
                  <h3 className="text-2xl font-black text-white uppercase tracking-tight leading-tight">
                    {category.name}
                  </h3>
                  {category.description && (
                    <p className="mt-3 text-sm text-cyan-100 opacity-0 group-hover:opacity-100 transition-opacity">
                      {category.description}
                    </p>
                  )}
                </div>

                {/* Bottom badge */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-cyan-400/50">
                  <p className="text-xs font-bold whitespace-nowrap text-cyan-300">
                    VOTAR
                  </p>
                </div>
              </SpotlightCard>
            ))}
          </div>

          {categories.length === 0 && (
            <div className="text-center py-20">
              <p className="text-2xl text-slate-400">No hay categorías disponibles</p>
            </div>
          )}
        </div>
        <ToastContainer />
        </div>
      </div>
      </AuthGuard>
    )
  }

  // Check if text_based category in Phase 1
  const isTextCategory = selectedCategory?.category_type === 'text_based'
  const isPhase1 = (selectedCategory?.voting_phase || 1) === 1
  const showTextInput = isTextCategory && isPhase1

  // Vista: Nominados de la categoría seleccionada
  return (
    <AuthGuard>
    <div className="min-h-screen relative bg-black">
      {/* Fondo animado Aurora */}
      <div className="fixed inset-0 z-0">
        <Aurora
          colorStops={['#06B6D4', '#A855F7', '#EC4899']}
          amplitude={1.2}
          blend={0.6}
          speed={0.8}
        />
      </div>

      {/* Contenido por encima del fondo */}
      <div className="relative z-10">
      {/* Header */}
      <div className="relative border-b border-gray-800">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => setSelectedCategory(null)}
              className="inline-flex items-center gap-2 text-white hover:text-gray-300 transition-colors text-lg"
            >
              <IoMdArrowBack /> Ver todas
            </button>
            <UserMenu />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-black mb-2 text-white uppercase">
                {selectedCategory.name}
              </h1>
              {selectedCategory.description && (
                <p className="text-lg text-gray-400">{selectedCategory.description}</p>
              )}
              {isTextCategory && (
                <div className="mt-3 inline-block bg-orange-600 text-white text-xs px-3 py-1 rounded-full font-bold">
                  CATEGORÍA DE TEXTO LIBRE
                </div>
              )}
            </div>

            {!showTextInput && (
              <div className="text-right">
                <div className="inline-block bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400 rounded-lg px-6 py-3">
                  <p className="text-sm mb-1 text-cyan-300">
                    {currentPhase === 1 ? 'Votos emitidos' : 'Tu voto'}
                  </p>
                  <p className="text-3xl font-black text-white">
                    {userVoteCount}/{maxVotes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Text submission form OR Nominations */}
      <div className="container mx-auto px-6 py-12">
        {showTextInput ? (
          <div className="max-w-3xl mx-auto">
            <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border border-orange-500/50 rounded-xl p-8">
              <h2 className="text-3xl font-bold text-white mb-4">Escribe tu respuesta</h2>
              <p className="text-gray-300 mb-6">
                En esta categoría, queremos que compartas tu opinión escribiendo texto libre.
                {hasSubmittedText && ' Puedes editar tu respuesta en cualquier momento.'}
              </p>

              <textarea
                value={textSubmission}
                onChange={(e) => setTextSubmission(e.target.value)}
                placeholder="Escribe aquí tu respuesta..."
                className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 resize-none"
                rows={8}
                maxLength={500}
              />

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-gray-400">
                  {textSubmission.length}/500 caracteres
                </span>
                <button
                  onClick={handleTextSubmission}
                  disabled={loading === 'text' || !textSubmission.trim()}
                  className="bg-gradient-to-r from-orange-500 to-yellow-600 hover:from-orange-600 hover:to-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-lg transition-all"
                >
                  {loading === 'text' ? 'Guardando...' : hasSubmittedText ? 'Actualizar respuesta' : 'Enviar respuesta'}
                </button>
              </div>

              {hasSubmittedText && (
                <div className="mt-4 p-4 bg-green-900/30 border border-green-500/50 rounded-lg">
                  <p className="text-green-300 text-sm">
                    ✅ Tu respuesta ha sido guardada. Las mejores respuestas pasarán a la siguiente fase de votación.
                  </p>
                </div>
              )}
            </div>
          </div>
        ) : selectedCategory?.category_type === 'duo' ? (
          <div className="max-w-4xl mx-auto">
            {/* Duo Selection UI */}
            <div className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 border-2 border-cyan-500/50 rounded-2xl p-8 mb-8">
              <div className="text-center mb-6">
                <FaTrophy className="text-cyan-400 text-5xl mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Elige tu Duo Favorito</h2>
                <p className="text-cyan-200">Selecciona 2 participantes para formar el mejor duo</p>
              </div>

              <div className="grid md:grid-cols-2 gap-6 mb-6">
                {/* Participant 1 Selector */}
                <div>
                  <label className="block text-cyan-300 font-bold mb-2 text-sm uppercase">
                    Participante 1
                  </label>
                  <select
                    value={duoParticipant1}
                    onChange={(e) => setDuoParticipant1(e.target.value)}
                    className="w-full bg-gray-900 border-2 border-cyan-500/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition-colors"
                  >
                    <option value="">Selecciona...</option>
                    {nominations.map(nom => (
                      <option
                        key={nom.id}
                        value={nom.participant.id}
                        disabled={nom.participant.id === duoParticipant2}
                      >
                        {nom.participant.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Participant 2 Selector */}
                <div>
                  <label className="block text-cyan-300 font-bold mb-2 text-sm uppercase">
                    Participante 2
                  </label>
                  <select
                    value={duoParticipant2}
                    onChange={(e) => setDuoParticipant2(e.target.value)}
                    className="w-full bg-gray-900 border-2 border-cyan-500/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition-colors"
                  >
                    <option value="">Selecciona...</option>
                    {nominations.map(nom => (
                      <option
                        key={nom.id}
                        value={nom.participant.id}
                        disabled={nom.participant.id === duoParticipant1}
                      >
                        {nom.participant.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Vote Button */}
              <button
                onClick={handleDuoVote}
                disabled={loading === 'duo-vote' || !duoParticipant1 || !duoParticipant2}
                className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg px-8 py-4 rounded-lg transition-all transform hover:scale-105"
              >
                {loading === 'duo-vote' ? 'Procesando...' : 'VOTAR POR ESTE DUO'}
              </button>

              {/* Show current selection */}
              {duoParticipant1 && duoParticipant2 && (
                <div className="mt-6 p-4 bg-cyan-500/20 border border-cyan-400/50 rounded-lg text-center">
                  <p className="text-cyan-200 text-sm">
                    Tu duo seleccionado: <span className="font-bold text-white">
                      {nominations.find(n => n.participant.id === duoParticipant1)?.participant.name}
                      {' & '}
                      {nominations.find(n => n.participant.id === duoParticipant2)?.participant.name}
                    </span>
                  </p>
                </div>
              )}
            </div>

            {/* Participants Grid - For reference */}
            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-400 mb-4 text-center">Participantes Disponibles</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {nominations.map((nomination) => {
                const isSelected = nomination.participant.id === duoParticipant1 || nomination.participant.id === duoParticipant2
                return (
                  <div
                    key={nomination.id}
                    className={`relative aspect-[3/4] rounded-xl overflow-hidden transition-all ${
                      isSelected
                        ? 'ring-4 ring-cyan-400 scale-105'
                        : 'border-2 border-gray-700 opacity-60'
                    }`}
                  >
                    {/* Image */}
                    {nomination.participant.image_url ? (
                      <img
                        src={nomination.participant.image_url}
                        alt={nomination.participant.name}
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900"></div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

                    {/* Selected badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 bg-cyan-500 text-white px-2 py-1 rounded-full font-black text-xs flex items-center gap-1">
                        <IoMdCheckmark /> SELECCIONADO
                      </div>
                    )}

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-3">
                      <h4 className="text-lg font-black text-white text-center">
                        {nomination.participant.name}
                      </h4>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {nominations.map((nomination) => (
            <button
              key={nomination.id}
              onClick={() => handleVote(nomination.id)}
              disabled={loading === nomination.id || (currentPhase === 1 && !nomination.user_voted && userVoteCount >= 3)}
              className={`group relative aspect-[3/4] rounded-2xl overflow-hidden transition-all duration-300 ${
                nomination.user_voted
                  ? 'ring-4 ring-cyan-400 scale-105'
                  : 'border-4 border-slate-700 hover:border-cyan-400 hover:scale-105'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {/* Image */}
              {nomination.participant.image_url ? (
                <img
                  src={nomination.participant.image_url}
                  alt={nomination.participant.name}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900"></div>
              )}

              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

              {/* Winner badge (if finalist in phase 2) */}
              {nomination.is_finalist && currentPhase === 2 && (
                <div className="absolute top-4 left-4 bg-gradient-to-r from-cyan-400 to-purple-500 text-white px-3 py-1.5 rounded-full font-black text-sm flex items-center gap-1">
                  <FaTrophy /> FINALISTA
                </div>
              )}

              {/* Voted badge */}
              {nomination.user_voted && (
                <div className="absolute top-4 right-4 bg-cyan-500 text-black px-3 py-1.5 rounded-full font-black text-sm flex items-center gap-1">
                  <IoMdCheckmark /> VOTADO
                </div>
              )}

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h3 className="text-2xl font-black text-white mb-2">
                  {nomination.participant.name}
                </h3>
                {nomination.participant.description && (
                  <p className="text-sm text-slate-300 line-clamp-2">
                    {nomination.participant.description}
                  </p>
                )}

                {/* Vote button overlay */}
                <div className={`mt-4 py-2 px-4 rounded-lg text-sm font-bold text-center transition-all ${
                  nomination.user_voted
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : 'bg-white/20 backdrop-blur-sm text-white group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-500'
                }`}>
                  {loading === nomination.id
                    ? 'Procesando...'
                    : nomination.user_voted
                    ? currentPhase === 1 ? 'Click para desmarcar' : 'Click para cambiar voto'
                    : currentPhase === 1 && userVoteCount >= 3
                    ? 'Máximo alcanzado'
                    : 'VOTAR'}
                </div>
              </div>
            </button>
          ))}
          </div>
        )}

        {!showTextInput && nominations.length === 0 && (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-400">No hay nominados en esta categoría</p>
          </div>
        )}
      </div>

      {/* Fixed Category Navigation - Bottom Right */}
      <div className="fixed bottom-8 right-8 flex gap-4 z-20">
        <button
          onClick={() => {
            const currentIndex = categories.findIndex(c => c.id === selectedCategory.id)
            if (currentIndex > 0) {
              setSelectedCategory(categories[currentIndex - 1])
            }
          }}
          disabled={categories.findIndex(c => c.id === selectedCategory.id) === 0}
          className="bg-gray-900/80 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md px-6 py-3 rounded-lg font-bold transition-all border border-cyan-500/50 flex items-center gap-2 text-white"
        >
          <MdNavigateBefore className="text-xl" />
          Anterior
        </button>
        <button
          onClick={() => {
            const currentIndex = categories.findIndex(c => c.id === selectedCategory.id)
            if (currentIndex < categories.length - 1) {
              setSelectedCategory(categories[currentIndex + 1])
            }
          }}
          disabled={categories.findIndex(c => c.id === selectedCategory.id) === categories.length - 1}
          className="bg-gray-900/80 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md px-6 py-3 rounded-lg font-bold transition-all border border-cyan-500/50 flex items-center gap-2 text-white"
        >
          Siguiente
          <MdNavigateNext className="text-xl" />
        </button>
      </div>

      <ToastContainer />
      </div>
    </div>
    </AuthGuard>
  )
}
