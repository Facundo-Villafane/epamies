'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Participant } from '@/lib/supabase'
import Link from 'next/link'
import { IoMdArrowBack, IoMdSearch, IoMdCheckmark, IoMdShare } from 'react-icons/io'
import { FaTrophy, FaStar } from 'react-icons/fa'
import { RiQuillPenAiLine } from 'react-icons/ri'
import { ToastContainer, toast } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Aurora from '@/components/Aurora'
import SpotlightCard from '@/components/SpotlightCard'
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md'
import AuthGuard from '@/components/AuthGuard'
import UserMenu from '@/components/UserMenu'
import { useAuth } from '@/lib/useAuth'
import WaitingScreen from '@/components/WaitingScreen'

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
  duo_participant2?: Participant | null
  category_id: string
  is_finalist: boolean
  vote_count: number
  user_voted: boolean
}

type DuoVoteSelection = {
  participant1_id: string
  participant2_id: string
}

// Component to display duo participants with split images
function DuoImage({ participant1Id, participant2Id, userVoted }: { participant1Id: string, participant2Id: string, userVoted: boolean }) {
  const [images, setImages] = useState<{ img1: string | null, img2: string | null }>({ img1: null, img2: null })

  useEffect(() => {
    async function fetchImages() {
      // Fetch both participants
      const { data: p1 } = await supabase
        .from('participants')
        .select('image_url')
        .eq('id', participant1Id)
        .single()

      const { data: p2 } = await supabase
        .from('participants')
        .select('image_url')
        .eq('id', participant2Id)
        .single()

      setImages({
        img1: p1?.image_url || null,
        img2: p2?.image_url || null
      })
    }

    fetchImages()
  }, [participant1Id, participant2Id])

  const grayscaleClass = userVoted ? 'grayscale-0' : 'grayscale group-hover:grayscale-0'

  return (
    <div className="absolute inset-0 w-full h-full">
      {/* Left half - Person 1 */}
      {images.img1 && (
        <img
          src={images.img1}
          alt="Participant 1"
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${grayscaleClass}`}
          style={{ clipPath: 'inset(0 50% 0 0)' }}
        />
      )}

      {/* Right half - Person 2 */}
      {images.img2 && (
        <img
          src={images.img2}
          alt="Participant 2"
          className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${grayscaleClass}`}
          style={{ clipPath: 'inset(0 0 0 50%)' }}
        />
      )}

      {/* Divider line in the middle */}
      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gradient-to-b from-cyan-400/50 via-purple-500/50 to-cyan-400/50 -translate-x-1/2 z-10"></div>
    </div>
  )
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
  const [aiOptions, setAiOptions] = useState<Array<{id: number, text: string}>>([])
  const [isRewriting, setIsRewriting] = useState(false)
  const [showAiSuggestion, setShowAiSuggestion] = useState(false)
  // Duo selection state
  const [duoParticipant1, setDuoParticipant1] = useState<string>('')
  const [duoParticipant2, setDuoParticipant2] = useState<string>('')
  const [hasVotedDuo, setHasVotedDuo] = useState(false)
  // Track which categories user has voted in
  const [votedCategoryIds, setVotedCategoryIds] = useState<Set<string>>(new Set())

  // Usar el email del usuario como identificador
  const voterId = user?.email || ''

  // Get current phase from edition (not category)
  // Use ?? instead of || to handle 0 correctly
  const currentPhase = activeEdition?.voting_phase ?? 1

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

      // Reset text submission state when category changes
      setTextSubmission('')
      setHasSubmittedText(false)
      setShowAiSuggestion(false)
      setAiOptions([])

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

      // DEBUG: Log the current voting phase
      console.log('🎯 DEBUG - Voting Phase Info:', {
        votingPhase: activeEditionRes.data.voting_phase,
        editionName: activeEditionRes.data.name,
        isActive: activeEditionRes.data.is_active
      })

      const categoriesRes = await supabase
        .from('categories')
        .select('*')
        .eq('edition_id', activeEditionRes.data.id)
        .order('order')

      if (categoriesRes.data) {
        // Filter out non-votable categories (like Epamie de Oro)
        const votableCategories = categoriesRes.data.filter(cat => cat.is_votable !== false)
        setCategories(votableCategories)
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

    const votedIds = new Set<string>()
    votesData?.forEach((v: any) => votedIds.add(v.category_id))

    // ONLY check text submissions in Phase 1
    // In Phase 2, text categories use regular nominations/votes
    if (currentPhase === 1) {
      // Check text submissions for text-based categories
      // RLS policies automatically filter by auth.email(), no need to add user_id filter
      const { data: textData } = await supabase
        .from('text_submissions')
        .select('category_id')
        .in('category_id', categoryIds)

      textData?.forEach((t: any) => votedIds.add(t.category_id))
    }

    setVotedCategoryIds(votedIds)
  }

  async function checkTextSubmission() {
    if (!selectedCategory || !voterId) return

    // RLS policies automatically filter by auth.email(), but we also add user_id for consistency
    const { data, error } = await supabase
      .from('text_submissions')
      .select('submission_text')
      .eq('category_id', selectedCategory.id)
      .eq('user_id', voterId)
      .maybeSingle()

    if (error) {
      console.error('Error loading text submission:', error)
      return
    }

    if (data) {
      setTextSubmission(data.submission_text)
      setHasSubmittedText(true)
    } else {
      setTextSubmission('')
      setHasSubmittedText(false)
    }
  }

  async function handleAiRewrite() {
    if (!textSubmission.trim() || isRewriting) return

    setIsRewriting(true)
    setShowAiSuggestion(false)

    try {
      const response = await fetch('/api/ai-rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: textSubmission,
          userEmail: voterId
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Error al reescribir con IA. Intenta de nuevo.'
        throw new Error(errorMessage)
      }

      const data = await response.json()
      setAiOptions(data.options)
      setShowAiSuggestion(true)
    } catch (error: any) {
      console.error('AI rewrite error:', error)
      toast.error(error.message || 'Error al reescribir con IA. Intenta de nuevo.', {
        ...toastConfig,
        autoClose: 6000,
        style: {
          background: 'linear-gradient(to right, rgb(220 38 38 / 0.9), rgb(239 68 68 / 0.9))',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgb(220 38 38 / 0.3)',
        }
      })
    } finally {
      setIsRewriting(false)
    }
  }

  function handleUseAiOption(text: string) {
    setTextSubmission(text)
    setShowAiSuggestion(false)
    setAiOptions([])
  }

  async function handleTextSubmission() {
    if (!selectedCategory || !voterId || !textSubmission.trim()) return

    // Prevent submission if already submitted (no updates allowed)
    if (hasSubmittedText) {
      toast.error('Ya enviaste tu respuesta para esta categoría. No se permiten modificaciones.', {
        ...toastConfig,
        autoClose: 4000,
        style: {
          background: 'linear-gradient(to right, rgb(220 38 38 / 0.9), rgb(239 68 68 / 0.9))',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          border: '1px solid rgb(220 38 38 / 0.3)',
        }
      })
      return
    }

    setLoading('text')

    // Save the current text before submission
    const submittedText = textSubmission

    try {
      // Insert new submission (no updates allowed)
      const { error: insertError } = await supabase
        .from('text_submissions')
        .insert({
          category_id: selectedCategory.id,
          user_id: voterId,
          submission_text: submittedText
        })

      if (insertError) {
        console.error('Insert error:', insertError)
        throw insertError
      }

      // Set states to reflect successful submission
      setHasSubmittedText(true)
      // Keep the text visible - don't clear it
      setTextSubmission(submittedText)

      toast.success('✅ Tu respuesta ha sido guardada!', toastConfig)

      // Update voted categories list
      await checkVotedCategories()
    } catch (error: any) {
      console.error('Error submitting text:', error)
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      })
      toast.error(`Error al guardar: ${error.message || 'Intenta de nuevo'}`, {
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

    // For duo categories, check if user has voted
    if (isDuoCategory) {
      // Get user's duo vote from votes table (only if user is logged in)
      let userVotedNominationId: string | null = null

      if (voterId) {
        const { data: userVoteData } = await supabase
          .from('votes')
          .select('nomination_id')
          .eq('category_id', selectedCategory.id)
          .eq('voter_identifier', voterId)
          .eq('voting_phase', currentPhase)
          .limit(1)
          .maybeSingle()

        if (userVoteData) {
          // User has voted - mark as voted and restore selection
          setHasVotedDuo(true)
          userVotedNominationId = userVoteData.nomination_id

          // Find which nomination contains the duo info
          const votedNom = nominationsData.find((n: any) => n.id === userVoteData.nomination_id)
          if (votedNom && votedNom.participant) {
            // Try to extract participant IDs from description (for duo participants)
            try {
              const participant = Array.isArray(votedNom.participant) ? votedNom.participant[0] : votedNom.participant
              const descriptionData = JSON.parse(participant?.description || '{}')
              if (descriptionData.type === 'duo') {
                setDuoParticipant1(descriptionData.participant1_id)
                setDuoParticipant2(descriptionData.participant2_id)
              }
            } catch (e) {
              // If description is not JSON or doesn't have duo info, ignore
              console.log('Could not parse duo participant data')
            }
          }
        } else {
          setHasVotedDuo(false)
        }
      } else {
        setHasVotedDuo(false)
      }

      // For duo categories, filter nominations based on phase
      let filteredNominations = nominationsData
      if (currentPhase === 1) {
        // PHASE 1: Only show individual participants, not duo combinations
        filteredNominations = nominationsData.filter((nom: any) => !nom.participant.name.includes(' & '))
      } else {
        // PHASE 2: Only show pre-formed duos (participants with "&" in name OR duo_participant2_id set)
        filteredNominations = nominationsData.filter((nom: any) =>
          nom.participant.name.includes(' & ') || nom.duo_participant2_id !== null
        )
      }

      const nominationsWithVotes = filteredNominations.map((nom: any) => ({
        id: nom.id,
        participant: nom.participant,
        duo_participant2: nom.duo_participant2,
        category_id: nom.category_id,
        is_finalist: nom.is_finalist,
        vote_count: 0,
        user_voted: userVotedNominationId === nom.id
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
        duo_participant2: nom.duo_participant2,
        category_id: nom.category_id,
        is_finalist: nom.is_finalist,
        vote_count: voteCounts[nom.id] || 0,
        user_voted: userVotes.has(nom.id)
      }))

      // Debug logging for text_based categories in phase 2
      if (selectedCategory.category_type === 'text_based' && currentPhase === 2) {
        console.log('🔍 Text-based Phase 2 Debug:', {
          categoryName: selectedCategory.name,
          voterId,
          currentPhase,
          nominationsCount: nominationsWithVotes.length,
          votesData: votesData?.map(v => ({ nom_id: v.nomination_id, voter: v.voter_identifier })),
          userVotes: Array.from(userVotes),
          nominations: nominationsWithVotes.map(n => ({
            id: n.id,
            name: n.participant.name,
            user_voted: n.user_voted
          }))
        })
      }

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

      // Get participant names to create duo name
      const { data: participant1Data } = await supabase
        .from('participants')
        .select('name, image_url')
        .eq('id', duoParticipant1)
        .single()

      const { data: participant2Data } = await supabase
        .from('participants')
        .select('name, image_url')
        .eq('id', duoParticipant2)
        .single()

      if (!participant1Data || !participant2Data) {
        throw new Error('No se encontraron los participantes')
      }

      // Create duo name (sorted alphabetically to ensure consistency)
      const names = [participant1Data.name, participant2Data.name].sort()
      const duoName = `${names[0]} & ${names[1]}`

      // Check if a duo participant already exists with this name
      const { data: existingDuoParticipant } = await supabase
        .from('participants')
        .select('id')
        .eq('name', duoName)
        .limit(1)
        .maybeSingle()

      let duoParticipantId: string

      if (existingDuoParticipant) {
        duoParticipantId = existingDuoParticipant.id
      } else {
        // Create new duo participant with IDs stored in description
        const { data: newDuoParticipant, error: duoError } = await supabase
          .from('participants')
          .insert([{
            name: duoName,
            image_url: participant1Data.image_url || participant2Data.image_url,
            description: JSON.stringify({
              type: 'duo',
              participant1_id: duoParticipant1,
              participant2_id: duoParticipant2
            })
          }])
          .select('id')
          .single()

        if (duoError) throw duoError
        duoParticipantId = newDuoParticipant.id
      }

      // Now find or create nomination with this duo participant
      const { data: existingNom } = await supabase
        .from('nominations')
        .select('id')
        .eq('category_id', selectedCategory.id)
        .eq('participant_id', duoParticipantId)
        .limit(1)
        .maybeSingle()

      let nominationId: string

      if (existingNom) {
        nominationId = existingNom.id
      } else {
        // Create new nomination for this duo
        const { data: newNom, error: nomError } = await supabase
          .from('nominations')
          .insert([{
            category_id: selectedCategory.id,
            participant_id: duoParticipantId,
            duo_participant2_id: null, // Not used for duo participants
            is_winner: false,
            is_finalist: false
          }])
          .select('id')
          .single()

        if (nomError) throw nomError
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

  // DEBUG: Log before checking waiting screen condition
  console.log('🔍 Checking waiting screen condition:', {
    currentPhase,
    shouldShowWaiting: currentPhase === 0 || currentPhase === 3
  })

  // Mostrar pantalla de espera si voting_phase es 0 o 3
  if (currentPhase === 0 || currentPhase === 3) {
    console.log('✅ Showing WaitingScreen with phase:', currentPhase === 0 ? 'phase1_closed' : 'phase2_closed')
    return (
      <AuthGuard>
        <WaitingScreen
          phase={currentPhase === 0 ? 'phase1_closed' : 'phase2_closed'}
          editionName={editionName}
        />
      </AuthGuard>
    )
  }

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
                className="flex-shrink-0 flex items-center gap-1 text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold uppercase"
              >
                <MdNavigateBefore className="text-lg" /> <span className="hidden sm:inline">PREVIOUS</span>
              </button>

              <div className="text-center flex-1 md:flex-initial min-w-0">
                <h1 className="text-sm md:text-base font-bold text-white uppercase leading-tight">
                  {selectedCategory.name}
                </h1>
                {selectedCategory.description && (
                  <p className="text-xs text-gray-400 mt-0.5 line-clamp-1 md:line-clamp-none">
                    {selectedCategory.description}
                  </p>
                )}
              </div>

              <button
                onClick={() => setSelectedCategory(null)}
                className="hidden md:inline flex-shrink-0 text-gray-400 hover:text-white transition-colors text-xs font-bold uppercase whitespace-nowrap"
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
                className="flex-shrink-0 flex items-center gap-1 text-white hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-xs font-bold uppercase"
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
            <div className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 border-2 border-cyan-500/50 rounded-2xl p-8">
              <div className="text-center mb-6">
                <FaStar className="text-cyan-400 text-5xl mx-auto mb-4" />
                <h2 className="text-3xl font-bold text-white mb-2">Escribe tu respuesta</h2>
                <p className="text-cyan-200">
                  En esta categoría, queremos que compartas tu opinión escribiendo texto libre.
                </p>
              </div>

              <div className="relative">
                <textarea
                  value={textSubmission}
                  onChange={(e) => {
                    setTextSubmission(e.target.value)
                    // Hide AI suggestion when user types
                    if (showAiSuggestion) {
                      setShowAiSuggestion(false)
                    }
                  }}
                  placeholder="Escribe aquí tu respuesta..."
                  disabled={hasSubmittedText}
                  className="w-full bg-gray-900/80 border-2 border-cyan-500/50 text-white rounded-xl px-4 py-3 focus:outline-none focus:border-cyan-400 resize-none transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  rows={8}
                  maxLength={500}
                />

                {/* AI Rewrite Button - appears when there's text and hasn't submitted yet */}
                {textSubmission.trim() && !showAiSuggestion && !hasSubmittedText && (
                  <button
                    onClick={handleAiRewrite}
                    disabled={isRewriting}
                    className="absolute bottom-3 right-3 bg-purple-600/80 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-bold text-sm transition-all flex items-center gap-2 backdrop-blur-sm"
                    title="Reescribir con IA"
                  >
                    <RiQuillPenAiLine className={`text-lg ${isRewriting ? 'animate-pulse' : ''}`} />
                    {isRewriting ? 'Reescribiendo...' : 'Mejorar 😏'}
                  </button>
                )}
              </div>

              {/* AI Options - Show 3 options */}
              {showAiSuggestion && aiOptions.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-2">
                    <RiQuillPenAiLine className="text-purple-400 text-xl" />
                    <h3 className="font-bold text-purple-300">Sugerencias de IA</h3>
                    <button
                      onClick={() => {
                        setShowAiSuggestion(false)
                        setAiOptions([])
                      }}
                      className="ml-auto text-gray-400 hover:text-white text-sm transition-colors"
                    >
                      Cerrar ✕
                    </button>
                  </div>

                  {aiOptions.map((option) => (
                    <div
                      key={option.id}
                      className="bg-purple-900/30 border-2 border-purple-500/50 rounded-xl p-4 hover:border-purple-400 transition-all animate-in fade-in duration-300"
                    >
                      <div className="mb-3">
                        <h4 className="font-bold text-purple-300 mb-2">Opción {option.id}</h4>
                        <p className="text-white text-sm leading-relaxed">{option.text}</p>
                      </div>
                      <button
                        onClick={() => handleUseAiOption(option.text)}
                        className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold px-4 py-2 rounded-lg transition-all"
                      >
                        ✨ Usar esta opción
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-cyan-300">
                  {textSubmission.length}/500 caracteres
                </span>
                <button
                  onClick={handleTextSubmission}
                  disabled={loading === 'text' || !textSubmission.trim() || hasSubmittedText}
                  className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold px-8 py-3 rounded-lg transition-all"
                >
                  {loading === 'text' ? 'Guardando...' : hasSubmittedText ? '✓ Respuesta enviada' : 'Enviar respuesta'}
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
          currentPhase === 1 ? (
            <div className="max-w-4xl mx-auto">
              {/* Duo Selection UI - PHASE 1 */}
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
                    disabled={hasVotedDuo}
                    className="w-full bg-gray-900 border-2 border-cyan-500/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
                    disabled={hasVotedDuo}
                    className="w-full bg-gray-900 border-2 border-cyan-500/50 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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

              {/* Vote Button or Confirmation */}
              {hasVotedDuo ? (
                <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-4 text-center">
                  <p className="text-green-300 font-bold">
                    ✅ Ya votaste por este duo
                  </p>
                  <p className="text-green-200 text-sm mt-2">
                    Tu voto ha sido registrado exitosamente
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleDuoVote}
                  disabled={loading === 'duo-vote' || !duoParticipant1 || !duoParticipant2}
                  className="w-full bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-lg px-8 py-4 rounded-lg transition-all transform hover:scale-105"
                >
                  {loading === 'duo-vote' ? 'Procesando...' : 'VOTAR POR ESTE DUO'}
                </button>
              )}

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
            // PHASE 2: Show only pre-formed duos with 50/50 split images
            <div className="max-w-5xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {nominations.map((nomination) => {
                  // Parse duo data from description if it's a virtual duo participant
                  let duoData = null
                  const isVirtualDuo = nomination.participant.name.includes(' & ')

                  if (isVirtualDuo) {
                    try {
                      duoData = JSON.parse(nomination.participant.description || '{}')
                    } catch (e) {
                      // Not JSON, ignore
                    }
                  }

                  // Determine duo names
                  let duoName1 = ''
                  let duoName2 = ''

                  if (nomination.duo_participant2) {
                    // Real duo - has duo_participant2
                    duoName1 = nomination.participant.name
                    duoName2 = nomination.duo_participant2.name
                  } else if (isVirtualDuo) {
                    // Virtual duo - parse from name
                    const parts = nomination.participant.name.split(' & ')
                    duoName1 = parts[0] || ''
                    duoName2 = parts[1] || ''
                  }

                  return (
                    <div key={nomination.id} className="group">
                      {/* Duo card with 50/50 split */}
                      <div className={`aspect-[3/4] rounded-t-xl overflow-hidden transition-all duration-500 relative ${
                        nomination.user_voted
                          ? 'ring-4 ring-cyan-400'
                          : 'border-2 border-b-0 border-gray-800'
                      }`}>
                        {/* 50/50 Split Images */}
                        {nomination.duo_participant2 ? (
                          // Real duo - render with direct image URLs
                          <div className="absolute inset-0 flex">
                            {/* Left half - Participant 1 */}
                            <div className="w-1/2 relative overflow-hidden">
                              {nomination.participant.image_url ? (
                                <img
                                  src={nomination.participant.image_url}
                                  alt={nomination.participant.name}
                                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                                    nomination.user_voted
                                      ? 'grayscale-0'
                                      : 'grayscale group-hover:grayscale-0'
                                  }`}
                                  style={{ objectPosition: 'center' }}
                                />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900"></div>
                              )}
                            </div>

                            {/* Right half - Participant 2 */}
                            <div className="w-1/2 relative overflow-hidden">
                              {nomination.duo_participant2.image_url ? (
                                <img
                                  src={nomination.duo_participant2.image_url}
                                  alt={nomination.duo_participant2.name}
                                  className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                                    nomination.user_voted
                                      ? 'grayscale-0'
                                      : 'grayscale group-hover:grayscale-0'
                                  }`}
                                  style={{ objectPosition: 'center' }}
                                />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-purple-700 to-purple-900"></div>
                              )}
                            </div>
                          </div>
                        ) : duoData?.participant1_id && duoData?.participant2_id ? (
                          // Virtual duo - use DuoImage component to fetch images
                          <DuoImage
                            participant1Id={duoData.participant1_id}
                            participant2Id={duoData.participant2_id}
                            userVoted={nomination.user_voted}
                          />
                        ) : (
                          // Fallback - no images available
                          <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-purple-900"></div>
                        )}

                        {/* Dark overlay - Reduces on hover */}
                        <div className={`absolute inset-0 bg-black transition-opacity duration-500 ${
                          nomination.user_voted
                            ? 'opacity-0'
                            : 'opacity-40 group-hover:opacity-0'
                        }`}></div>

                        {/* Center divider line */}
                        <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gradient-to-b from-transparent via-white/50 to-transparent"></div>
                      </div>

                      {/* Vote button */}
                      <button
                        onClick={() => handleVote(nomination.id)}
                        disabled={loading === nomination.id}
                        className={`w-full py-4 text-base font-bold uppercase tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                          nomination.user_voted
                            ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                            : 'bg-black/60 backdrop-blur-md text-white border-2 border-t-0 border-gray-800 group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-500 group-hover:border-cyan-400'
                        }`}
                      >
                        {loading === nomination.id
                          ? 'Procesando...'
                          : nomination.user_voted
                          ? '✓ VOTADO'
                          : 'VOTAR'}
                      </button>

                      {/* Duo names below button */}
                      <div className="mt-3">
                        <h3 className={`text-base font-medium text-center uppercase tracking-tight transition-colors ${
                          nomination.user_voted
                            ? 'text-white'
                            : 'text-gray-400 group-hover:text-white'
                        }`}>
                          {duoName1} & {duoName2}
                        </h3>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        ) : selectedCategory?.category_type === 'text_based' && currentPhase === 2 ? (
          // PHASE 2: Text-based categories - Show larger cards with full descriptions
          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nominations.map((nomination) => (
                <div
                  key={nomination.id}
                  className="group"
                >
                  {/* Text moment card */}
                  <div className={`rounded-t-xl overflow-hidden transition-all duration-500 relative min-h-[280px] flex flex-col ${
                    nomination.user_voted
                      ? 'ring-4 ring-cyan-400'
                      : 'border-2 border-b-0 border-gray-800'
                  }`}>
                    {/* Gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-900/30 via-purple-900/30 to-pink-900/30"></div>

                    {/* Content */}
                    <div className="relative z-10 p-6 flex flex-col h-full">
                      {/* Title */}
                      <h3 className="text-xl font-bold text-white mb-4 text-center">
                        {nomination.participant.name}
                      </h3>

                      {/* Description */}
                      <div className="flex-grow">
                        <p className="text-gray-200 text-sm leading-relaxed text-center">
                          {nomination.participant.description}
                        </p>
                      </div>
                    </div>

                    {/* Dark overlay - Reduces on hover */}
                    <div className={`absolute inset-0 bg-black transition-opacity duration-500 ${
                      nomination.user_voted
                        ? 'opacity-0'
                        : 'opacity-20 group-hover:opacity-0'
                    }`}></div>
                  </div>

                  {/* Vote button */}
                  <button
                    onClick={() => handleVote(nomination.id)}
                    disabled={loading === nomination.id}
                    className={`w-full py-4 text-base font-bold uppercase tracking-wide transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                      nomination.user_voted
                        ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                        : 'bg-black/60 backdrop-blur-md text-white border-2 border-t-0 border-gray-800 group-hover:bg-gradient-to-r group-hover:from-cyan-400 group-hover:to-purple-500 group-hover:border-cyan-400'
                    }`}
                  >
                    {loading === nomination.id
                      ? 'Procesando...'
                      : nomination.user_voted
                      ? '✓ VOTADO'
                      : 'VOTAR'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : (
          // Regular participant-based categories
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
                  (() => {
                    // Check if this is a duo participant
                    const isDuo = nomination.participant.name.includes(' & ')
                    let duoData = null

                    if (isDuo) {
                      try {
                        duoData = JSON.parse(nomination.participant.description || '{}')
                      } catch (e) {
                        // Not valid JSON, treat as regular participant
                      }
                    }

                    // If it's a duo with valid data, we need to fetch both images
                    // For now, we'll use the stored image_url as fallback
                    if (isDuo && duoData?.type === 'duo') {
                      // We need to get both participant images
                      // This will be handled via state/effect
                      return (
                        <div className="absolute inset-0">
                          {/* We'll render split images here */}
                          <DuoImage
                            participant1Id={duoData.participant1_id}
                            participant2Id={duoData.participant2_id}
                            userVoted={nomination.user_voted}
                          />
                        </div>
                      )
                    }

                    // Regular single participant
                    return (
                      <img
                        src={nomination.participant.image_url}
                        alt={nomination.participant.name}
                        className={`absolute inset-0 w-full h-full object-cover transition-all duration-500 ${
                          nomination.user_voted
                            ? 'grayscale-0'
                            : 'grayscale group-hover:grayscale-0'
                        }`}
                      />
                    )
                  })()
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
