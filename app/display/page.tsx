'use client'

import { useEffect, useState, memo } from 'react'
import { supabase, type Category, type Participant } from '@/lib/supabase'
import { FaTrophy } from 'react-icons/fa'
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md'
import PrismaticBurst from '@/components/PrismaticBurst'
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
  <div className="fixed inset-0 z-0 opacity-60">
    <PrismaticBurst
      intensity={2.5}
      speed={0.3}
      animationType="rotate3d"
      colors={['#06b6d4', '#a855f7', '#ec4899', '#3b82f6']}
      distort={5}
      rayCount={16}
      mixBlendMode="lighten"
    />
  </div>
))

BackgroundAnimation.displayName = 'BackgroundAnimation'

// Componente para cargar y mostrar imágenes de duos
function DuoImage({ participant1Id, participant2Id }: { participant1Id: string, participant2Id: string }) {
  const [images, setImages] = useState<{ img1: string | null, img2: string | null, name1: string, name2: string }>({
    img1: null,
    img2: null,
    name1: '',
    name2: ''
  })

  useEffect(() => {
    async function fetchImages() {
      const { data: p1 } = await supabase
        .from('participants')
        .select('image_url, name')
        .eq('id', participant1Id)
        .single()

      const { data: p2 } = await supabase
        .from('participants')
        .select('image_url, name')
        .eq('id', participant2Id)
        .single()

      setImages({
        img1: p1?.image_url || null,
        img2: p2?.image_url || null,
        name1: p1?.name || '',
        name2: p2?.name || ''
      })
    }

    if (participant1Id && participant2Id) {
      fetchImages()
    }
  }, [participant1Id, participant2Id])

  return { images }
}

// Componente para renderizar card de duo
function DuoCard({
  participant1Id,
  participant2Id,
  duoName,
  showWinner,
  hasWinner,
  votingPhase,
  voteCount,
  maxVotes
}: {
  participant1Id: string
  participant2Id: string
  duoName: string
  showWinner: boolean
  hasWinner: boolean
  votingPhase: number
  voteCount?: number
  maxVotes: number
}) {
  const [images, setImages] = useState<{ img1: string | null, img2: string | null, name1: string, name2: string }>({
    img1: null,
    img2: null,
    name1: '',
    name2: ''
  })

  useEffect(() => {
    async function fetchImages() {
      const { data: p1 } = await supabase
        .from('participants')
        .select('image_url, name')
        .eq('id', participant1Id)
        .single()

      const { data: p2 } = await supabase
        .from('participants')
        .select('image_url, name')
        .eq('id', participant2Id)
        .single()

      setImages({
        img1: p1?.image_url || null,
        img2: p2?.image_url || null,
        name1: p1?.name || '',
        name2: p2?.name || ''
      })
    }

    if (participant1Id && participant2Id) {
      fetchImages()
    }
  }, [participant1Id, participant2Id])

  return (
    <div className="relative aspect-[2/3] overflow-hidden bg-gray-900">
      <div className="flex h-full">
        {/* Participante 1 - Lado izquierdo */}
        <div className="w-1/2 relative">
          {images.img1 ? (
            <img
              src={images.img1}
              alt={images.name1}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
              <span className="text-white font-bold text-center px-2">
                {images.name1 || 'Cargando...'}
              </span>
            </div>
          )}
        </div>

        {/* Línea divisoria */}
        <div className="w-0.5 bg-white/20"></div>

        {/* Participante 2 - Lado derecho */}
        <div className="w-1/2 relative">
          {images.img2 ? (
            <img
              src={images.img2}
              alt={images.name2}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
              <span className="text-white font-bold text-center px-2">
                {images.name2 || 'Cargando...'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Degradado oscuro en la parte inferior con los nombres */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/90 to-transparent pt-20 pb-16 px-6">
        <h3 className="text-2xl font-bold text-white drop-shadow-lg text-center">
          {duoName}
        </h3>
      </div>

      {/* Trofeo animado para ganadores */}
      <AnimatePresence>
        {showWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.5 }}
            className="absolute top-4 right-4"
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

      {/* Badge de ganador */}
      <AnimatePresence>
        {showWinner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-black py-2 px-4 rounded-lg text-sm flex items-center gap-2 shadow-lg"
          >
            <FaTrophy />
            ¡GANADOR!
          </motion.div>
        )}
      </AnimatePresence>

      {/* Barra de votos en la parte inferior (cuando hay ganador declarado en la categoría) */}
      <AnimatePresence>
        {voteCount !== undefined && hasWinner && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/90 to-transparent pt-8 pb-3 px-4"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-400">Votos</span>
              <span className="text-lg font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                {voteCount}
              </span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-1.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${maxVotes > 0 ? (voteCount / maxVotes) * 100 : 0}%` }}
                transition={{ duration: 1, delay: 0.5 }}
                className="bg-gradient-to-r from-cyan-500 to-purple-500 h-1.5 rounded-full"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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

        // Display is only for ceremony - always show finalists only (top 4)
        const nominationsRes = await supabase
          .from('nominations')
          .select(`
            id,
            is_winner,
            is_finalist,
            category_id,
            participant_id,
            participant:participants!participant_id(*)
          `)
          .in('category_id', categoriesRes.data.map(c => c.id))
          .eq('is_finalist', true)

        if (nominationsRes.data) {
          let nominationsWithVotes = nominationsRes.data as any

          // Always fetch vote counts for ceremony display (Phase 2 votes for finalists)
          if (nominationsRes.data.length > 0) {
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

          // Sort by vote count for transparency (highest to lowest)
          nominationsWithVotes.sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))

          setAllNominations(nominationsWithVotes)
        }
      }
    }
  }

  const currentCategory = categories.find(c => c.id === currentCategoryId)
  const currentNominations = allNominations.filter(n => n.category_id === currentCategoryId)
  const winner = currentNominations.find(n => n.is_winner)
  const currentCategoryIndex = categories.findIndex(c => c.id === currentCategoryId)

  // Show pre-ceremony screen if ceremony hasn't started (voting_phase !== 4)
  if (!currentCategory || votingPhase !== 4) {
    return (
      <div className="min-h-screen relative bg-black overflow-hidden">
        {/* Fondo animado */}
        <BackgroundAnimation />

        {/* Contenido */}
        <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
          <div className="max-w-4xl w-full text-center">
            {/* Logo EPAMIES */}
            <div className="mb-16 flex justify-center">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 blur-3xl opacity-50 animate-pulse"></div>
                <img
                  src="/logo-epamies.svg"
                  alt={editionName || 'LOS EPAMIES'}
                  className="relative h-32 md:h-40 w-auto brightness-0 invert drop-shadow-2xl"
                />
              </div>
            </div>

            {/* Título */}
            <h1 className="text-6xl md:text-8xl font-black mb-8 text-white drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]">
              Ceremonia de Premiación
            </h1>

            {/* Mensaje */}
            <div className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 border-2 border-cyan-500/50 backdrop-blur-md rounded-2xl p-12 mb-8">
              <p className="text-3xl md:text-4xl text-white font-bold mb-6">
                ¡Sentate y Esperá!
              </p>

              {/* Sillas Image - Dentro del recuadro */}
              <div className="mb-6 flex justify-center">
                <img
                  src="/sillas.png"
                  alt="Siéntate y espera"
                  className="w-48 md:w-64 h-auto drop-shadow-2xl"
                />
              </div>

              <p className="text-xl text-cyan-200">
                En un ratito empieza
              </p>
            </div>

            {/* Indicador de carga */}
            <div className="flex justify-center items-center gap-2">
              <div className="w-3 h-3 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-3 h-3 bg-pink-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
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
        <div className="mb-12 text-center">
          <h2 className="text-6xl md:text-7xl font-black text-white mb-4 drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]">
            {currentCategory.name}
          </h2>
          {currentCategory.description && (
            <p className="text-2xl text-cyan-200 drop-shadow-lg">{currentCategory.description}</p>
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
              const showWinner = isWinner // Siempre muestra el ganador si está marcado
              const maxVotes = Math.max(...currentNominations.map(n => n.vote_count || 0), 0)

              // Detectar si es un duo virtual (nombre contiene " & ")
              const isVirtualDuo = nomination.participant.name.includes(' & ')
              let duoData = null

              if (isVirtualDuo) {
                try {
                  duoData = JSON.parse(nomination.participant.description || '{}')
                } catch (e) {
                  // Not JSON, ignore
                }
              }

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
                      : winner
                      ? 'opacity-60'
                      : ''
                  }`}
                >
                  <motion.div
                    animate={{
                      scale: showWinner ? 1.05 : winner ? 0.95 : 1,
                    }}
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    className={`rounded-xl overflow-hidden border-4 transition-all ${
                      showWinner
                        ? 'border-yellow-400 shadow-2xl shadow-yellow-400/50'
                        : 'border-gray-800 hover:border-cyan-500'
                    }`}
                  >
                    {isVirtualDuo && duoData?.participant1_id && duoData?.participant2_id ? (
                      /* Card para categorías DUO VIRTUAL (dos participantes lado a lado) */
                      <DuoCard
                        participant1Id={duoData.participant1_id}
                        participant2Id={duoData.participant2_id}
                        duoName={nomination.participant.name}
                        showWinner={showWinner}
                        hasWinner={!!winner}
                        votingPhase={votingPhase}
                        voteCount={nomination.vote_count}
                        maxVotes={maxVotes}
                      />
                    ) : nomination.participant.image_url ? (
                      <div className="relative aspect-[2/3] overflow-hidden bg-gray-900">
                        <img
                          src={nomination.participant.image_url}
                          alt={nomination.participant.name}
                          className="w-full h-full object-cover"
                        />

                        {/* Degradado oscuro en la parte inferior con el nombre */}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent pt-16 pb-6 px-6">
                          <h3 className="text-2xl font-bold text-white drop-shadow-lg">{nomination.participant.name}</h3>
                        </div>

                        {/* Trofeo animado para ganadores */}
                        <AnimatePresence>
                          {showWinner && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.5 }}
                              className="absolute top-4 right-4"
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

                        {/* Badge de ganador */}
                        <AnimatePresence>
                          {showWinner && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8, y: -20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: -20 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-black py-2 px-4 rounded-lg text-sm flex items-center gap-2 shadow-lg"
                            >
                              <FaTrophy />
                              ¡GANADOR!
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Barra de votos en la parte inferior (cuando hay ganador declarado en la categoría) */}
                        <AnimatePresence>
                          {nomination.vote_count !== undefined && winner && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              transition={{ duration: 0.5, delay: 0.3 }}
                              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/90 to-transparent pt-8 pb-3 px-4"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-400">Votos</span>
                                <span className="text-lg font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                                  {nomination.vote_count}
                                </span>
                              </div>
                              <div className="w-full bg-gray-800 rounded-full h-1.5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${maxVotes > 0 ? (nomination.vote_count / maxVotes) * 100 : 0}%` }}
                                  transition={{ duration: 1, delay: 0.5 }}
                                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-1.5 rounded-full"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    ) : (
                      /* Card para categorías de texto (sin imagen) */
                      <div className="relative aspect-[2/3] overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-8">
                        {/* Texto del nominado */}
                        <div className="text-center px-4">
                          <h3 className="text-3xl font-bold text-white drop-shadow-lg leading-relaxed mb-4">
                            {nomination.participant.name}
                          </h3>
                          {nomination.participant.description && (
                            <p className="text-lg text-gray-300 leading-relaxed">
                              {nomination.participant.description}
                            </p>
                          )}
                        </div>

                        {/* Trofeo animado para ganadores */}
                        <AnimatePresence>
                          {showWinner && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.8 }}
                              transition={{ duration: 0.5 }}
                              className="absolute top-4 right-4"
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

                        {/* Badge de ganador */}
                        <AnimatePresence>
                          {showWinner && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.8, y: -20 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.8, y: -20 }}
                              transition={{ duration: 0.5, delay: 0.2 }}
                              className="absolute top-4 left-4 bg-gradient-to-r from-yellow-400 to-yellow-500 text-black font-black py-2 px-4 rounded-lg text-sm flex items-center gap-2 shadow-lg"
                            >
                              <FaTrophy />
                              ¡GANADOR!
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Barra de votos en la parte inferior (cuando hay ganador declarado en la categoría) */}
                        <AnimatePresence>
                          {nomination.vote_count !== undefined && winner && (
                            <motion.div
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              transition={{ duration: 0.5, delay: 0.3 }}
                              className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/95 via-black/90 to-transparent pt-8 pb-3 px-4"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-gray-400">Votos</span>
                                <span className="text-lg font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                                  {nomination.vote_count}
                                </span>
                              </div>
                              <div className="w-full bg-gray-800 rounded-full h-1.5">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${maxVotes > 0 ? (nomination.vote_count / maxVotes) * 100 : 0}%` }}
                                  transition={{ duration: 1, delay: 0.5 }}
                                  className="bg-gradient-to-r from-cyan-500 to-purple-500 h-1.5 rounded-full"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}
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
