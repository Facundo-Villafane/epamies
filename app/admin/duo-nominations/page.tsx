'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Edition, type Duo, type DuoWithParticipants, type DuoNomination, type DuoNominationWithDetails } from '@/lib/supabase'
import { MdAdd, MdSearch, MdDelete, MdCheckCircle } from 'react-icons/md'
import { FaHeart } from 'react-icons/fa'

export default function DuoNominationsPage() {
  const [editions, setEditions] = useState<Edition[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [duos, setDuos] = useState<DuoWithParticipants[]>([])
  const [duoNominations, setDuoNominations] = useState<DuoNominationWithDetails[]>([])
  const [selectedEdition, setSelectedEdition] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [selectedDuos, setSelectedDuos] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedEdition) fetchCategories()
  }, [selectedEdition])

  useEffect(() => {
    if (selectedCategory) fetchDuoNominations()
  }, [selectedCategory])

  async function fetchData() {
    const [editionsRes, duosRes] = await Promise.all([
      supabase.from('editions').select('*').order('year', { ascending: false }),
      supabase
        .from('duos')
        .select(`
          *,
          participant1:participants!duos_participant1_id_fkey(*),
          participant2:participants!duos_participant2_id_fkey(*)
        `)
        .order('created_at', { ascending: false })
    ])

    if (editionsRes.data) {
      setEditions(editionsRes.data)
      const active = editionsRes.data.find(e => e.is_active)
      if (active) setSelectedEdition(active.id)
    }
    if (duosRes.data) setDuos(duosRes.data as any)
  }

  async function fetchCategories() {
    const { data } = await supabase
      .from('categories')
      .select('*')
      .eq('edition_id', selectedEdition)
      .eq('category_type', 'duo')
      .order('order')

    if (data) {
      setCategories(data)
      if (data.length > 0) setSelectedCategory(data[0].id)
    }
  }

  async function fetchDuoNominations() {
    const { data } = await supabase
      .from('duo_nominations')
      .select(`
        *,
        duo:duos(
          *,
          participant1:participants!duos_participant1_id_fkey(*),
          participant2:participants!duos_participant2_id_fkey(*)
        )
      `)
      .eq('category_id', selectedCategory)

    if (data) setDuoNominations(data as any)
  }

  async function handleNominateDuos() {
    if (!selectedCategory || selectedDuos.length === 0) return
    setLoading(true)

    try {
      const nominationsToInsert = selectedDuos.map(duoId => ({
        duo_id: duoId,
        category_id: selectedCategory,
        is_winner: false,
        is_finalist: false
      }))

      await supabase.from('duo_nominations').insert(nominationsToInsert)
      await fetchDuoNominations()
      setSelectedDuos([])
      setShowForm(false)
    } catch (error: any) {
      if (error.code === '23505') {
        alert('Uno o más duos ya están nominados en esta categoría')
      } else {
        console.error('Error:', error)
        alert('Error al nominar duos: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleNominateAllDuos() {
    if (!selectedCategory) return
    if (availableDuos.length === 0) {
      alert('No hay duos disponibles para nominar')
      return
    }
    if (!confirm(`¿Nominar todos los ${availableDuos.length} duos disponibles a esta categoría?`)) return
    setLoading(true)

    try {
      const nominationsToInsert = availableDuos.map(duo => ({
        duo_id: duo.id,
        category_id: selectedCategory,
        is_winner: false,
        is_finalist: false
      }))

      await supabase.from('duo_nominations').insert(nominationsToInsert)
      await fetchDuoNominations()
      setSelectedDuos([])
      setShowForm(false)
      alert(`✅ ${nominationsToInsert.length} duos nominados exitosamente!`)
    } catch (error: any) {
      console.error('Error al nominar todos:', error)
      alert('Error al nominar duos: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveNomination(id: string) {
    if (!confirm('¿Eliminar esta nominación?')) return
    await supabase.from('duo_nominations').delete().eq('id', id)
    await fetchDuoNominations()
  }

  const toggleDuo = (id: string) => {
    setSelectedDuos(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    )
  }

  const alreadyNominatedIds = duoNominations.map(n => n.duo_id)
  const availableDuos = duos.filter(d =>
    !alreadyNominatedIds.includes(d.id)
  )

  const getDuoDisplayName = (duo: DuoWithParticipants) => {
    return duo.duo_name || `${duo.participant1.name} & ${duo.participant2.name}`
  }

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
              <FaHeart className="text-pink-400" />
              Nominaciones de Duos
            </h1>
            <p className="text-gray-400">Asigna duos a categorías tipo pareja</p>
          </div>
          {selectedCategory && (
            <div className="flex gap-3">
              <button
                onClick={handleNominateAllDuos}
                disabled={loading || availableDuos.length === 0}
                className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium flex items-center gap-2"
              >
                <MdAdd /> Nominar Todos ({availableDuos.length})
              </button>
              <button
                onClick={() => setShowForm(!showForm)}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2"
              >
                {showForm ? 'Cancelar' : <><MdAdd /> Agregar Nominados</>}
              </button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Edición</label>
            <select
              value={selectedEdition}
              onChange={(e) => setSelectedEdition(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-pink-500"
            >
              {editions.map(ed => <option key={ed.id} value={ed.id}>{ed.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Categoría (solo tipo duo)</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-pink-500"
            >
              {categories.length === 0 && <option value="">No hay categorías tipo duo</option>}
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>

        {selectedCategory && (
          <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-xl p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">Progreso de Nominación</h3>
                <p className="text-gray-400 text-sm">
                  {duoNominations.length} de {duos.length} duos nominados
                </p>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                  {duoNominations.length}/{duos.length}
                </div>
                <div className="text-sm text-gray-400 mt-1">
                  {duos.length > 0 ? Math.round((duoNominations.length / duos.length) * 100) : 0}% completado
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-gray-800 rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-purple-600 transition-all duration-500"
                style={{ width: `${duos.length > 0 ? (duoNominations.length / duos.length) * 100 : 0}%` }}
              />
            </div>
          </div>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Selecciona Duos</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto mb-4">
              {availableDuos.map(duo => (
                <div
                  key={duo.id}
                  onClick={() => toggleDuo(duo.id)}
                  className={`cursor-pointer rounded-lg p-4 border-2 transition-all relative ${
                    selectedDuos.includes(duo.id) ? 'border-pink-500 bg-pink-900/30' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {selectedDuos.includes(duo.id) && (
                    <div className="absolute top-2 right-2 bg-pink-500 rounded-full p-1">
                      <MdCheckCircle className="text-white" />
                    </div>
                  )}
                  <div className="flex items-center gap-2 mb-3">
                    <FaHeart className="text-pink-400" />
                    <p className="font-bold text-white">{getDuoDisplayName(duo)}</p>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {duo.participant1.image_url && (
                        <img src={duo.participant1.image_url} alt={duo.participant1.name} className="w-8 h-8 rounded-full object-cover" />
                      )}
                      <p className="text-sm text-gray-300">{duo.participant1.name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {duo.participant2.image_url && (
                        <img src={duo.participant2.image_url} alt={duo.participant2.name} className="w-8 h-8 rounded-full object-cover" />
                      )}
                      <p className="text-sm text-gray-300">{duo.participant2.name}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button
                onClick={handleNominateDuos}
                disabled={loading || selectedDuos.length === 0}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium"
              >
                {loading ? 'Guardando...' : `Nominar (${selectedDuos.length})`}
              </button>
              <button
                onClick={() => { setShowForm(false); setSelectedDuos([]); }}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {selectedCategory && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-white">Nominados ({duoNominations.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {duoNominations.map(nom => (
                <div key={nom.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-pink-500/50 transition-colors">
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <FaHeart className="text-pink-400" />
                      <h3 className="text-lg font-bold text-white">{getDuoDisplayName(nom.duo)}</h3>
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="flex items-center gap-3">
                        {nom.duo.participant1.image_url && (
                          <img src={nom.duo.participant1.image_url} alt={nom.duo.participant1.name} className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{nom.duo.participant1.name}</p>
                          {nom.duo.participant1.description && (
                            <p className="text-xs text-gray-400">{nom.duo.participant1.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {nom.duo.participant2.image_url && (
                          <img src={nom.duo.participant2.image_url} alt={nom.duo.participant2.name} className="w-12 h-12 rounded-full object-cover" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-white">{nom.duo.participant2.name}</p>
                          {nom.duo.participant2.description && (
                            <p className="text-xs text-gray-400">{nom.duo.participant2.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveNomination(nom.id)}
                      className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    >
                      <MdDelete /> Eliminar nominación
                    </button>
                  </div>
                </div>
              ))}
              {duoNominations.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
                  No hay duos nominados. Agrega algunos para esta categoría.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
