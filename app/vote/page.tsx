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
import { useAuth } from '@/lib/useAuth'

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
  const { user } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [nominations, setNominations] = useState<NominationWithVotes[]>([])
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [activeEdition, setActiveEdition] = useState<any>(null)
  const [editionName, setEditionName] = useState('')
  const [editionYear, setEditionYear] = useState(0)
  const [loading, setLoading] = useState<string | null>(null)
  const [textSubmission, setTextSubmission] = useState('')
  const [hasSubmittedText, setHasSubmittedText] = useState(false)
  // Duo selection state
  const [duoParticipant1, setDuoParticipant1] = useState<string>('')
  const [duoParticipant2, setDuoParticipant2] = useState<string>('')
  // Track which categories user has voted in
  const [votedCategoryIds, setVotedCategoryIds] = useState<Set<string>>(new Set())

  // Usar el email del usuario como identificador
  const voterId = user?.email || ''

  // Get current phase from edition (not category)
  const currentPhase = activeEdition?.voting_phase || 1

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (voterId && categories.length > 0 && activeEdition) {
      checkVotedCategories()
    }
  }, [voterId, categories, currentPhase])

  useEffect(() => {
    if (selectedCategory && activeEdition) {
      const isTextCategory = selectedCategory.category_type === 'text_based'
      const isPhase1 = currentPhase === 1

      if (isTextCategory && isPhase1) {
        checkTextSubmission()
      } else {
        fetchNominations()
      }

      // Reset duo selections when category changes
      setDuoParticipant1('')
      setDuoParticipant2('')
    }
  }, [selectedCategory, voterId, currentPhase])

  async function fetchData() {
    const activeEditionRes = await supabase.from('editions').select('*').eq('is_active', true).single()

    if (activeEditionRes.data) {
      setActiveEdition(activeEditionRes.data)
      setEditionName(activeEditionRes.data.name)
      setEditionYear(activeEditionRes.data.year)

      const categoriesRes = await supabase
        .from('categories')
        .select('*')
        .eq('edition_id', activeEditionRes.data.id)
        .order('order')

      if (categoriesRes.data) {
        setCategories(categoriesRes.data)
      }
    }
  }

  async function checkVotedCategories() {
    if (!voterId || categories.length === 0) return

    const categoryIds = categories.map(c => c.id)

    // Check votes table for this user in current phase
    const { data: votesData } = await supabase
      .from('votes')
      .select('category_id')
      .eq('voter_identifier', voterId)
      .eq('voting_phase', currentPhase)
      .in('category_id', categoryIds)

    // Check text submissions for text-based categories
    const { data: textData } = await supabase
      .from('text_submissions')
      .select('category_id')
      .eq('user_id', voterId)
      .in('category_id', categoryIds)

    const votedIds = new Set<string>()
    votesData?.forEach((v: any) => votedIds.add(v.category_id))
    textData?.forEach((t: any) => votedIds.add(t.category_id))

    setVotedCategoryIds(votedIds)
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
      // Update voted categories list
      await checkVotedCategories()
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
    if (!selectedCategory) return

    const isDuoCategory = selectedCategory.category_type === 'duo'

    // Get nominations
    let nominationsQuery = supabase
      .from('nominations')
      .select('id, is_finalist, category_id, participant_id, duo_participant2_id, participant:participants!participant_id(*), duo_participant2:participants!duo_participant2_id(*)')
      .eq('category_id', selectedCategory.id)

    if (currentPhase === 2) {
      nominationsQuery = nominationsQuery.eq('is_finalist', true)
    }

    const { data: nominationsData } = await nominationsQuery

    if (!nominationsData) return

    // For duo categories, check if user has voted (stored in duo_participant2_id)
    if (isDuoCategory) {
      // Get user's duo vote from votes table (only if user is logged in)
      if (voterId) {
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

      // Preload images
      nominationsWithVotes.forEach((nom: any) => {
        if (nom.participant.image_url) {
          const img = new Image()
          img.src = nom.participant.image_url
        }
      })
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
        // Only mark as user_voted if user is logged in
        if (voterId && vote.voter_identifier === voterId) {
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

      // Preload images
      nominationsWithVotes.forEach((nom: any) => {
        if (nom.participant.image_url) {
          const img = new Image()
          img.src = nom.participant.image_url
        }
      })
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

    setLoading('duo-vote')

    try {
      // Check if user already voted
      const { data: existingVotes } = await supabase
        .from('votes')
        .select('id, nomination_id')
        .eq('category_id', selectedCategory.id)
        .eq('voter_identifier', voterId)
        .eq('voting_phase', currentPhase)

      if (existingVotes && existingVotes.length > 0) {
        // Remove previous vote(s)
        await supabase
          .from('votes')
          .delete()
          .eq('category_id', selectedCategory.id)
          .eq('voter_identifier', voterId)
          .eq('voting_phase', currentPhase)
      }

      // Find or create a nomination that matches this duo combination
      // First, try to find existing nomination with these exact participants
      const { data: existingNoms } = await supabase
        .from('nominations')
        .select('id')
        .eq('category_id', selectedCategory.id)
        .eq('participant_id', duoParticipant1)
        .eq('duo_participant2_id', duoParticipant2)

      let nominationId: string

      if (existingNoms && existingNoms.length > 0) {
        nominationId = existingNoms[0].id
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
      // Update voted categories list
      await checkVotedCategories()
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
      // Update voted categories list
      await checkVotedCategories()
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
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
            {categories.map((category) => {
              const hasVoted = votedCategoryIds.has(category.id)
              return (
              <SpotlightCard
                key={category.id}
                onClick={() => setSelectedCategory(category)}
                spotlightColor="rgba(139, 92, 246, 0.4)"
                className={`group cursor-pointer aspect-[4/1] md:aspect-square rounded-xl border-2 transition-all duration-300 ${
                  hasVoted
                    ? 'border-cyan-400 hover:border-cyan-300'
                    : 'border-gray-800 opacity-50 hover:opacity-100 hover:border-gray-600'
                } hover:scale-105`}
              >
                {/* Background - Dimmed if not voted */}
                <div className={`absolute inset-0 transition-colors -z-10 ${
                  hasVoted
                    ? 'bg-black/70 group-hover:bg-black/60'
                    : 'bg-black/80 group-hover:bg-black/70'
                }`}></div>

                {/* Content */}
                <div className="relative h-full flex flex-col items-center justify-center p-3 md:p-4 text-center">
                  <h3 className={`text-base md:text-sm lg:text-base font-black uppercase tracking-tight leading-tight transition-colors ${
                    hasVoted ? 'text-cyan-300' : 'text-gray-400 group-hover:text-gray-300'
                  }`}>
                    {category.name}
                  </h3>
                </div>

                {/* Checkmark for voted categories */}
                {hasVoted && (
                  <div className="absolute top-2 right-2 bg-cyan-400 rounded-full p-1">
                    <IoMdCheckmark className="text-black text-xs" />
                  </div>
                )}
              </SpotlightCard>
            )})}

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
  const isPhase1 = currentPhase === 1
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
      {/* Sticky Top Navigation Bar */}
      <div className="sticky top-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/20">
        <div className="container mx-auto px-4 md:px-6 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* EXIT button - Desktop only */}
            <button
              onClick={() => setSelectedCategory(null)}
              className="hidden md:flex items-center gap-1 text-white hover:text-gray-300 transition-colors text-xs font-bold uppercase"
            >
              <IoMdArrowBack className="text-base" /> EXIT
            </button>

            {/* Category info and navigation */}
            <div className="flex items-center gap-3 md:gap-6 flex-1 md:absolute md:left-1/2 md:-translate-x-1/2">
              <button
                onClick={() => {
                  const currentIndex = categories.findIndex(c => c.id === selectedCategory.id)
                  if (currentIndex > 0) {
                    setSelectedCategory(categories[currentIndex - 1])
                  }
                }}
                disabled={categories.findIndex(c => c.id === selectedCategory.id) === 0}
                className="flex items-center gap-1 text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold uppercase"
              >
                <MdNavigateBefore className="text-lg" /> <span className="hidden sm:inline">PREVIOUS</span>
              </button>

              <div className="text-center flex-1 md:flex-initial">
                <h1 className="text-sm md:text-base font-bold text-white uppercase truncate max-w-[200px] md:max-w-none">
                  {selectedCategory.name}
                </h1>
              </div>

              <button
                onClick={() => setSelectedCategory(null)}
                className="hidden md:inline text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase whitespace-nowrap"
              >
                VIEW ALL
              </button>

              <button
                onClick={() => {
                  const currentIndex = categories.findIndex(c => c.id === selectedCategory.id)
                  if (currentIndex < categories.length - 1) {
                    setSelectedCategory(categories[currentIndex + 1])
                  }
                }}
                disabled={categories.findIndex(c => c.id === selectedCategory.id) === categories.length - 1}
                className="flex items-center gap-1 text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold uppercase"
              >
                <span className="hidden sm:inline">NEXT</span> <MdNavigateNext className="text-lg" />
              </button>
            </div>

            {/* Vote counter and user menu */}
            <div className="flex items-center gap-3">
              {!showTextInput && (
                <div className="bg-white/5 border border-white/10 rounded px-2 py-1 md:px-3 md:py-1.5">
                  <p className="text-xs text-gray-400 hidden md:block">
                    {currentPhase === 1 ? 'Votos emitidos' : 'Tu voto'}
                  </p>
                  <p className="text-sm md:text-lg font-bold text-white">
                    {userVoteCount}/{maxVotes}
                  </p>
                </div>
              )}
              <div className="hidden md:block">
                <UserMenu />
              </div>
            </div>
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
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
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
          <div className="grid grid-cols-2 md:grid-cols-6 gap-6 md:gap-8">
            {nominations.map((nomination) => (
            <div
              key={nomination.id}
              className="group"
            >
              {/* Image card */}
              <div className={`aspect-[3/4] rounded-t-xl overflow-hidden transition-all duration-500 relative ${
                nomination.user_voted
                  ? 'ring-4 ring-cyan-400 ring-b-0'
                  : 'border-2 border-b-0 border-gray-800'
              }`}>
                {/* Image - Grayscale by default, color on hover */}
                {nomination.participant.image_url ? (
                  <img
                    src={nomination.participant.image_url}
                    alt={nomination.participant.name}
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                      nomination.user_voted
                        ? 'grayscale-0'
                        : 'grayscale group-hover:grayscale-0'
                    }`}
                  />
                ) : (
                  <div className={`absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900 transition-all duration-500 ${
                    nomination.user_voted
                      ? 'grayscale-0'
                      : 'grayscale group-hover:grayscale-0'
                  }`}></div>
                )}

                {/* Dark overlay - Reduces on hover */}
                <div className={`absolute inset-0 bg-black transition-opacity duration-500 ${
                  nomination.user_voted
                    ? 'opacity-0'
                    : 'opacity-40 group-hover:opacity-0'
                }`}></div>
              </div>

              {/* Vote button */}
              <button
                onClick={() => handleVote(nomination.id)}
                disabled={loading === nomination.id || (currentPhase === 1 && !nomination.user_voted && userVoteCount >= 3)}
                className={`w-full py-3 md:py-4 text-sm md:text-base font-bold uppercase tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                  nomination.user_voted
                    ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                    : 'bg-black/60 backdrop-blur-md text-white border-2 border-t-0 border-gray-800 group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-500 group-hover:border-cyan-400'
                }`}
              >
                {loading === nomination.id
                  ? 'Procesando...'
                  : nomination.user_voted
                  ? '✓ VOTADO'
                  : currentPhase === 1 && userVoteCount >= 3
                  ? 'Máximo alcanzado'
                  : 'VOTAR'}
              </button>

              {/* Participant name below button */}
              <div className="mt-3">
                <h3 className={`text-sm md:text-base font-medium text-center uppercase tracking-tight transition-colors ${
                  nomination.user_voted
                    ? 'text-white'
                    : 'text-gray-400 group-hover:text-white'
                }`}>
                  {nomination.participant.name}
                </h3>
              </div>
            </div>
          ))}
          </div>
        )}

        {!showTextInput && nominations.length === 0 && (
          <div className="text-center py-20">
            <p className="text-2xl text-gray-400">No hay nominados en esta categoría</p>
          </div>
        )}
      </div>

      <ToastContainer />
      </div>
    </div>
    </AuthGuard>
  )
}
