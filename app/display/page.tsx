'use client'

import { useEffect, useState, memo } from 'react'
import { supabase, type Category, type Participant } from '@/lib/supabase'
import { FaTrophy } from 'react-icons/fa'
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md'
import Prism from '@/components/Prism'
import { motion, AnimatePresence } from 'framer-motion'

type NominationDisplay = {
  id: string
  participant: Participant
  is_winner: boolean
  category_id: string
  vote_count?: number
}

// Componente memoizado para el fondo - no se re-renderiza entre cambios de categoría
const BackgroundAnimation = memo(() => (
  <div className="fixed inset-0 z-0 opacity-40">
    <Prism
      height={3.5}
      baseWidth={5.5}
      animationType="3drotate"
      glow={0.5}
      noise={0}
      scale={3.6}
      hueShift={0}
      colorFrequency={1}
      timeScale={0.5}
      transparent={true}
    />
  </div>
))

BackgroundAnimation.displayName = 'BackgroundAnimation'

export default function DisplayPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [allNominations, setAllNominations] = useState<NominationDisplay[]>([])
  const [currentCategoryId, setCurrentCategoryId] = useState<string>('')
  const [editionName, setEditionName] = useState('')
  const [votingPhase, setVotingPhase] = useState<number>(1)

  useEffect(() => {
    fetchData()

    const nominationsSub = supabase
      .channel('nominations-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'nominations' }, () => fetchData())
      .subscribe()

    const categoriesSub = supabase
      .channel('categories-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'categories' }, () => fetchData())
      .subscribe()

    // Subscribe to editions changes to get real-time category updates from admin
    const editionsSub = supabase
      .channel('editions-changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'editions' }, () => fetchData())
      .subscribe()

    return () => {
      nominationsSub.unsubscribe()
      categoriesSub.unsubscribe()
      editionsSub.unsubscribe()
    }
  }, [])

  async function fetchData() {
    const activeEdition = await supabase.from('editions').select('*').eq('is_active', true).single()

    if (activeEdition.data) {
      setEditionName(activeEdition.data.name)
      setVotingPhase(activeEdition.data.voting_phase || 1)

      const categoriesRes = await supabase
        .from('categories')
        .select('*')
        .eq('edition_id', activeEdition.data.id)
        .order('order')

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        setCategories(categoriesRes.data)

        // Set current category from edition or default to first
        setCurrentCategoryId(activeEdition.data.current_display_category_id || categoriesRes.data[0].id)

        // In Phase 2-3, only show finalists. In Phase 4, show all nominations
        let nominationsQuery = supabase
          .from('nominations')
          .select(`
            id,
            is_winner,
            is_finalist,
            category_id,
            participant_id,
            duo_participant2_id,
            participant:participants!participant_id(*),
            duo_participant2:participants!duo_participant2_id(*)
          `)
          .in('category_id', categoriesRes.data.map(c => c.id))

        // Only show finalists in Phase 2 and 3
        if (activeEdition.data.voting_phase === 2 || activeEdition.data.voting_phase === 3) {
          nominationsQuery = nominationsQuery.eq('is_finalist', true)
        }

        const nominationsRes = await nominationsQuery

        if (nominationsRes.data) {
          let nominationsWithVotes = nominationsRes.data as any

          // In Phase 4, fetch vote counts
          if (activeEdition.data.voting_phase === 4 && nominationsRes.data.length > 0) {
            const nominationIds = nominationsRes.data.map((n: any) => n.id)
            const { data: votesData } = await supabase
              .from('votes')
              .select('nomination_id')
              .in('nomination_id', nominationIds)
              .eq('voting_phase', 2) // Phase 2 votes for finalists

            const voteCounts: Record<string, number> = {}
            votesData?.forEach((vote: any) => {
              voteCounts[vote.nomination_id] = (voteCounts[vote.nomination_id] || 0) + 1
            })

            nominationsWithVotes = nominationsRes.data.map((nom: any) => ({
              ...nom,
              vote_count: voteCounts[nom.id] || 0
            }))
          }

          setAllNominations(nominationsWithVotes)
        }
      }
    }
  }

  const currentCategory = categories.find(c => c.id === currentCategoryId)
  const currentNominations = allNominations.filter(n => n.category_id === currentCategoryId)
  const winner = currentNominations.find(n => n.is_winner)
  const currentCategoryIndex = categories.findIndex(c => c.id === currentCategoryId)

  if (!currentCategory) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-900 via-purple-900 to-black flex items-center justify-center">
        <div className="text-center text-white">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Configurando ceremonia...</h1>
          <p className="text-gray-300">Crea una edición activa y agrega categorías desde /admin</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen relative text-white p-8">
      {/* Fondo animado memoizado - no se reinicia entre cambios de categoría */}
      <BackgroundAnimation />

      {/* Contenido por encima del fondo */}
      <div className="relative z-10">
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <img
            src="/logo-epamies.svg"
            alt={editionName || 'LOS EPAMIES'}
            className="h-20 md:h-24 w-auto brightness-0 invert"
          />
        </div>
        <p className="text-xl text-gray-400">
          Categoría {currentCategoryIndex + 1} de {categories.length}
        </p>
      </div>

      <div className="max-w-6xl mx-auto mb-12">
        <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border-2 border-cyan-500/50 backdrop-blur-md rounded-2xl p-8 mb-8">
          <h2 className="text-5xl font-bold text-center mb-4 text-white">{currentCategory.name}</h2>
          {currentCategory.description && (
            <p className="text-xl text-center text-gray-300">{currentCategory.description}</p>
          )}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentCategoryId}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {currentNominations.map((nomination, index) => {
              const isWinner = winner?.id === nomination.id
              const showWinner = votingPhase === 4 && isWinner
              const maxVotes = Math.max(...currentNominations.map(n => n.vote_count || 0), 0)

              return (
                <motion.div
                  key={nomination.id}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.5,
                    delay: index * 0.15,
                    ease: "easeOut"
                  }}
                  className={`relative group ${
                    showWinner
                      ? 'z-10'
                      : winner && votingPhase === 4
                      ? 'opacity-60'
                      : ''
                  }`}
                >
                  <motion.div
                    animate={{
                      scale: showWinner ? 1.05 : winner && votingPhase === 4 ? 0.95 : 1,
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className={`bg-gray-900/80 backdrop-blur-md rounded-xl overflow-hidden border-4 transition-all ${
                      showWinner
                        ? 'border-yellow-400 shadow-2xl shadow-yellow-400/50'
                        : 'border-gray-800 hover:border-cyan-500'
                    }`}
                  >
                    {nomination.participant.image_url && (
                      <div className="relative h-64 overflow-hidden">
                        <img
                          src={nomination.participant.image_url}
                          alt={nomination.participant.name}
                          className="w-full h-full object-cover"
                        />
                        <AnimatePresence>
                          {showWinner && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.5 }}
                              className="absolute inset-0 bg-gradient-to-t from-yellow-500/80 via-yellow-500/40 to-transparent flex items-end justify-center pb-4"
                            >
                              <motion.div
                                animate={{
                                  y: [0, -10, 0],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut"
                                }}
                                className="text-6xl"
                              >
                                <FaTrophy className="text-yellow-400 drop-shadow-2xl" />
                              </motion.div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}

                    <div className="p-6">
                      <h3 className="text-2xl font-bold mb-2 text-white">{nomination.participant.name}</h3>
                      {nomination.participant.description && (
                        <p className="text-gray-300">{nomination.participant.description}</p>
                      )}

                      {/* Show vote count in Phase 4 */}
                      <AnimatePresence>
                        {votingPhase === 4 && nomination.vote_count !== undefined && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="mt-4 overflow-hidden"
                          >
                            <div className="bg-gray-800/50 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm text-gray-400">Votos</span>
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  transition={{ duration: 0.5, delay: 0.5 }}
                                  className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent"
                                >
                                  {nomination.vote_count}
                                </motion.span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${maxVotes > 0 ? (nomination.vote_count / maxVotes) * 100 : 0}%` }}
                                  transition={{ duration: 1, delay: 0.7, ease: "easeOut" }}
                                  className="bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 h-2 rounded-full"
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Show winner badge only in Phase 4 */}
                      <AnimatePresence>
                        {showWinner && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 20 }}
                            transition={{ duration: 0.5, delay: 0.3 }}
                            className="mt-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-black py-3 px-4 rounded-lg text-center text-xl flex items-center justify-center gap-2 shadow-lg"
                          >
                            <FaTrophy />
                            ¡GANADOR!
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
      </div>
    </div>
  )
}
