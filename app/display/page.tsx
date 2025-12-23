'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Participant } from '@/lib/supabase'
import { FaTrophy } from 'react-icons/fa'
import { MdNavigateBefore, MdNavigateNext } from 'react-icons/md'

type NominationDisplay = {
  id: string
  participant: Participant
  is_winner: boolean
  category_id: string
}

export default function DisplayPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [allNominations, setAllNominations] = useState<NominationDisplay[]>([])
  const [currentCategoryIndex, setCurrentCategoryIndex] = useState(0)
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

    return () => {
      nominationsSub.unsubscribe()
      categoriesSub.unsubscribe()
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

        const nominationsRes = await supabase
          .from('nominations')
          .select(`
            id,
            is_winner,
            category_id,
            participant:participants(*)
          `)
          .in('category_id', categoriesRes.data.map(c => c.id))

        if (nominationsRes.data) {
          setAllNominations(nominationsRes.data as any)
        }
      }
    }
  }

  const currentCategory = categories[currentCategoryIndex]
  const currentNominations = allNominations.filter(n => n.category_id === currentCategory?.id)
  const winner = currentNominations.find(n => n.is_winner)

  const nextCategory = () => {
    setCurrentCategoryIndex((prev) => prev < categories.length - 1 ? prev + 1 : prev)
  }

  const prevCategory = () => {
    setCurrentCategoryIndex((prev) => prev > 0 ? prev - 1 : prev)
  }

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
    <div className="min-h-screen bg-black text-white p-8">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
          {editionName || 'LOS EPAMIES'}
        </h1>
        <p className="text-xl text-gray-400">
          Categoría {currentCategoryIndex + 1} de {categories.length}
        </p>
      </div>

      <div className="max-w-6xl mx-auto mb-12">
        <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border-2 border-cyan-500/50 backdrop-blur-md rounded-2xl p-8 mb-8">
          <h2 className="text-5xl font-bold text-center mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">{currentCategory.name}</h2>
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

      <div className="fixed bottom-8 right-8 flex gap-4">
        <button
          onClick={prevCategory}
          disabled={currentCategoryIndex === 0}
          className="bg-gray-900/80 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md px-6 py-3 rounded-lg font-bold transition-all border border-cyan-500/50 flex items-center gap-2"
        >
          <MdNavigateBefore className="text-xl" />
          Anterior
        </button>
        <button
          onClick={nextCategory}
          disabled={currentCategoryIndex === categories.length - 1}
          className="bg-gray-900/80 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed backdrop-blur-md px-6 py-3 rounded-lg font-bold transition-all border border-cyan-500/50 flex items-center gap-2"
        >
          Siguiente
          <MdNavigateNext className="text-xl" />
        </button>
      </div>
    </div>
  )
}
