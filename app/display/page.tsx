'use client'

import { useEffect, useState, memo } from 'react'
import { supabase, type Category, type Participant } from '@/lib/supabase'
import { FaTrophy } from 'react-icons/fa'
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md'
import FloatingLines from '@/components/FloatingLines'

type NominationDisplay = {
  id: string
  participant: Participant
  is_winner: boolean
  category_id: string
}

// Componente memoizado para el fondo - no se re-renderiza entre cambios de categoría
const BackgroundAnimation = memo(() => (
  <div className="fixed inset-0 z-0 opacity-30">
    <FloatingLines
      linesGradient={['#2DD4BF', '#8B5CF6', '#EC4899']}
      enabledWaves={['top', 'middle', 'bottom']}
      lineCount={[8, 10, 6]}
      lineDistance={[8, 6, 10]}
      animationSpeed={0.5}
      interactive={false}
      parallax={false}
      mixBlendMode="screen"
    />
  </div>
))

BackgroundAnimation.displayName = 'BackgroundAnimation'

export default function DisplayPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [allNominations, setAllNominations] = useState<NominationDisplay[]>([])
  const [currentCategoryId, setCurrentCategoryId] = useState<string>('')
  const [editionName, setEditionName] = useState('')

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

      const categoriesRes = await supabase
        .from('categories')
        .select('*')
        .eq('edition_id', activeEdition.data.id)
        .order('order')

      if (categoriesRes.data && categoriesRes.data.length > 0) {
        setCategories(categoriesRes.data)

        // Set current category from edition or default to first
        setCurrentCategoryId(activeEdition.data.current_display_category_id || categoriesRes.data[0].id)

        const nominationsRes = await supabase
          .from('nominations')
          .select(`
            id,
            is_winner,
            category_id,
            participant_id,
            duo_participant2_id,
            participant:participants!participant_id(*),
            duo_participant2:participants!duo_participant2_id(*)
          `)
          .in('category_id', categoriesRes.data.map(c => c.id))

        if (nominationsRes.data) {
          setAllNominations(nominationsRes.data as any)
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {currentNominations.map((nomination) => (
            <div
              key={nomination.id}
              className={`relative group transition-all duration-500 ${
                winner?.id === nomination.id
                  ? 'scale-110 z-10'
                  : winner
                  ? 'opacity-40 scale-95'
                  : ''
              }`}
            >
              <div className="bg-gray-900/80 backdrop-blur-md rounded-xl overflow-hidden border-2 border-gray-800 hover:border-cyan-500 transition-all">
                {nomination.participant.image_url && (
                  <div className="relative h-64 overflow-hidden">
                    <img
                      src={nomination.participant.image_url}
                      alt={nomination.participant.name}
                      className="w-full h-full object-cover"
                    />
                    {winner?.id === nomination.id && (
                      <div className="absolute inset-0 bg-gradient-to-t from-yellow-500/80 via-cyan-500/40 to-transparent flex items-end justify-center pb-4">
                        <div className="text-6xl animate-bounce">
                          <FaTrophy className="text-yellow-400" />
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="p-6">
                  <h3 className="text-2xl font-bold mb-2 text-white">{nomination.participant.name}</h3>
                  {nomination.participant.description && (
                    <p className="text-gray-300">{nomination.participant.description}</p>
                  )}
                  {winner?.id === nomination.id && (
                    <div className="mt-4 bg-gradient-to-r from-cyan-400 to-purple-500 text-white font-bold py-2 px-4 rounded-lg text-center text-xl flex items-center justify-center gap-2">
                      <FaTrophy />
                      ¡GANADOR!
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  )
}
