'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Participant, type Nomination, type Edition } from '@/lib/supabase'
import { MdAdd, MdSearch, MdDelete, MdCheckCircle } from 'react-icons/md'
import { FaStar } from 'react-icons/fa'

type NominationWithDetails = Nomination & {
  participant: Participant
  duo_participant2?: Participant | null
  category: Category
}

export default function NominationsPage() {
  const [editions, setEditions] = useState<Edition[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [nominations, setNominations] = useState<NominationWithDetails[]>([])
  const [selectedEdition, setSelectedEdition] = useState<string>('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  // Para categorías tipo "duo"
  const [duoParticipant1, setDuoParticipant1] = useState<string>('')
  const [duoParticipant2, setDuoParticipant2] = useState<string>('')

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedEdition) fetchCategories()
  }, [selectedEdition])

  useEffect(() => {
    if (selectedCategory) fetchNominations()
  }, [selectedCategory])

  async function fetchData() {
    const [editionsRes, participantsRes] = await Promise.all([
      supabase.from('editions').select('*').order('year', { ascending: false }),
      supabase.from('participants').select('*').order('name')
    ])

    if (editionsRes.data) {
      setEditions(editionsRes.data)
      const active = editionsRes.data.find(e => e.is_active)
      if (active) setSelectedEdition(active.id)
    }
    if (participantsRes.data) setParticipants(participantsRes.data)
  }

  async function fetchCategories() {
    const { data } = await supabase.from('categories').select('*').eq('edition_id', selectedEdition).order('order')
    if (data) {
      setCategories(data)
      if (data.length > 0) setSelectedCategory(data[0].id)
    }
  }

  async function fetchNominations() {
    const { data, error } = await supabase
      .from('nominations')
      .select(`
        id,
        participant_id,
        category_id,
        is_winner,
        is_finalist,
        duo_participant2_id,
        created_at,
        participant:participants!participant_id(*),
        duo_participant2:participants!duo_participant2_id(*),
        category:categories!category_id(*)
      `)
      .eq('category_id', selectedCategory)

    if (error) {
      console.error('Error fetching nominations:', error)
      return
    }

    if (data) setNominations(data as any)
  }

  async function handleNominate() {
    if (!selectedCategory || selectedParticipants.length === 0) return
    setLoading(true)

    try {
      const nominationsToInsert = selectedParticipants.map(participantId => ({
        participant_id: participantId,
        category_id: selectedCategory,
        is_winner: false,
        is_finalist: false
      }))

      await supabase.from('nominations').insert(nominationsToInsert)
      await fetchNominations()
      setSelectedParticipants([])
      setShowForm(false)
    } catch (error: any) {
      if (error.code === '23505') {
        alert('Uno o más participantes ya están nominados en esta categoría')
      } else {
        console.error('Error:', error)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleNominateAll() {
    if (!selectedCategory) return
    if (availableParticipants.length === 0) {
      alert('No hay participantes disponibles para nominar')
      return
    }
    if (!confirm(`¿Nominar todos los ${availableParticipants.length} participantes disponibles a esta categoría?`)) return
    setLoading(true)

    try {
      const nominationsToInsert = availableParticipants.map(participant => ({
        participant_id: participant.id,
        category_id: selectedCategory,
        is_winner: false,
        is_finalist: false
      }))

      await supabase.from('nominations').insert(nominationsToInsert)
      await fetchNominations()
      setSelectedParticipants([])
      setShowForm(false)
      alert(`✅ ${nominationsToInsert.length} participantes nominados exitosamente!`)
    } catch (error: any) {
      console.error('Error al nominar todos:', error)
      alert('Error al nominar participantes: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleNominateTop3() {
    if (!selectedCategory) return
    if (!confirm('¿Calcular y nominar automáticamente el TOP 3 global (los 3 participantes con más victorias)?')) return
    setLoading(true)

    try {
      // Obtener todas las nominaciones ganadoras de TODAS las categorías de esta edición
      // excluyendo la categoría actual (para evitar contar esta categoría final)
      // IMPORTANTE: Solo categorías participant_based (NO text_based NI duo)
      const { data: allNominations } = await supabase
        .from('nominations')
        .select(`
          participant_id,
          participant:participants(id, name, description, image_url),
          category:categories!inner(edition_id, category_type)
        `)
        .eq('is_winner', true)
        .eq('category.edition_id', selectedEdition)
        .eq('category.category_type', 'participant_based')
        .neq('category_id', selectedCategory)

      if (!allNominations || allNominations.length === 0) {
        alert('No hay ganadores aún en otras categorías. Primero debes marcar ganadores en las categorías.')
        setLoading(false)
        return
      }

      // Contar victorias por participante
      const winCounts: Record<string, { count: number, participant: any }> = {}
      allNominations.forEach((nom: any) => {
        const pid = nom.participant_id
        if (!winCounts[pid]) {
          winCounts[pid] = { count: 0, participant: nom.participant }
        }
        winCounts[pid].count++
      })

      // Ordenar por cantidad de victorias y tomar top 3
      const sorted = Object.entries(winCounts)
        .sort(([, a], [, b]) => b.count - a.count)
        .slice(0, 3)

      if (sorted.length === 0) {
        alert('No se encontraron participantes ganadores')
        setLoading(false)
        return
      }

      // Insertar nominaciones para el top 3
      const nominationsToInsert = sorted.map(([participantId]) => ({
        participant_id: participantId,
        category_id: selectedCategory,
        is_winner: false,
        is_finalist: false
      }))

      await supabase.from('nominations').insert(nominationsToInsert)
      await fetchNominations()

      const top3Names = sorted.map(([, data]) => `${data.participant.name} (${data.count} victoria${data.count > 1 ? 's' : ''})`).join(', ')
      alert(`✅ TOP 3 nominados exitosamente:\n\n${top3Names}`)
    } catch (error: any) {
      if (error.code === '23505') {
        alert('Uno o más participantes del top 3 ya están nominados en esta categoría')
      } else {
        console.error('Error al nominar top 3:', error)
        alert('Error al calcular top 3: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleRemoveNomination(id: string) {
    if (!confirm('¿Eliminar esta nominación?')) return
    await supabase.from('nominations').delete().eq('id', id)
    await fetchNominations()
  }

  const toggleParticipant = (id: string) => {
    setSelectedParticipants(prev =>
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    )
  }

  // Para calcular participantes ya nominados, debemos incluir tanto participant_id como duo_participant2_id
  const alreadyNominatedIds = new Set<string>()
  nominations.forEach(n => {
    alreadyNominatedIds.add(n.participant_id)
    if (n.duo_participant2_id) {
      alreadyNominatedIds.add(n.duo_participant2_id)
    }
  })

  const availableParticipants = participants.filter(p =>
    !alreadyNominatedIds.has(p.id) &&
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
              <FaStar className="text-cyan-400" />
              Nominaciones
            </h1>
            <p className="text-gray-400">Asigna participantes a categorías</p>
          </div>
          {selectedCategory && (() => {
            const category = categories.find(c => c.id === selectedCategory)
            const isTextCategory = category?.category_type === 'text_based'
            const isDuoCategory = category?.category_type === 'duo'
            const isPhase1 = (category?.voting_phase || 1) === 1
            const canNominate = !isTextCategory || !isPhase1

            return canNominate ? (
              <div className="flex gap-3">
                {!isDuoCategory && !isTextCategory && (
                  <button
                    onClick={handleNominateTop3}
                    disabled={loading}
                    className="bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium flex items-center gap-2 shadow-lg"
                    title="Auto-nominar el TOP 3 global (participantes con más victorias)"
                  >
                    <FaStar className="text-yellow-200" /> TOP 3 Global
                  </button>
                )}
                <button
                  onClick={handleNominateAll}
                  disabled={loading || availableParticipants.length === 0}
                  className={`${isDuoCategory ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700' : 'bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'} disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-medium flex items-center gap-2`}
                >
                  <MdAdd /> Nominar Todos ({availableParticipants.length})
                </button>
                <button onClick={() => setShowForm(!showForm)} className={`${isDuoCategory ? 'bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700' : 'bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700'} px-6 py-3 rounded-lg font-medium flex items-center gap-2`}>
                  {showForm ? 'Cancelar' : <><MdAdd /> Agregar Nominados</>}
                </button>
              </div>
            ) : null
          })()}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Edición</label>
            <select value={selectedEdition} onChange={(e) => setSelectedEdition(e.target.value)} className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500">
              {editions.map(ed => <option key={ed.id} value={ed.id}>{ed.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2 text-gray-300">Categoría</label>
            <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500">
              {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>
        </div>

        {selectedCategory && (
          <>
            {/* TOP 3 Global Info Banner */}
            <div className="bg-gradient-to-r from-yellow-900/30 to-orange-900/30 border border-yellow-500/50 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <FaStar className="text-yellow-400" />
                <span className="bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                  Auto-Nominación TOP 3 Global
                </span>
              </h3>
              <p className="text-gray-300 text-sm mb-3">
                Usa el botón <strong className="text-yellow-400">"TOP 3 Global"</strong> para calcular y nominar automáticamente los 3 participantes con más victorias en todas las categorías de esta edición.
              </p>
              <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside mb-3">
                <li>El sistema cuenta las victorias (<code className="text-yellow-400">is_winner = true</code>) de cada participante</li>
                <li>Ordena por cantidad de victorias y selecciona el top 3</li>
                <li>Los nomina automáticamente a esta categoría</li>
                <li>Perfecto para categorías finales como "Epamie de Oro"</li>
              </ul>
              <div className="p-3 bg-yellow-600/20 rounded-lg border border-yellow-500/30">
                <p className="text-sm text-yellow-300">
                  <strong>💡 Tip:</strong> Después de nominar el top 3, puedes agregar manualmente un 4to participante especial (como un easter egg) usando el botón "Agregar Nominados".
                </p>
              </div>
            </div>

            {/* Check if category is text_based */}
            {categories.find(c => c.id === selectedCategory)?.category_type === 'text_based' ? (
              <div className="bg-gradient-to-r from-orange-900/30 to-yellow-900/30 border border-orange-500/50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                  <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded font-bold">TEXTO</span>
                  Categoría de Texto Libre
                </h3>
                <p className="text-gray-300 text-sm mb-3">
                  Esta categoría funciona diferente:
                </p>
                <ul className="text-sm text-gray-400 space-y-1 list-disc list-inside">
                  <li><strong className="text-orange-400">Fase 1:</strong> Los usuarios escriben texto libre desde la página de votación (no se usan participantes).</li>
                  <li><strong className="text-orange-400">Fase 2:</strong> Tú revisas las respuestas, creas 4 participantes con las mejores, los nominas aquí, y los usuarios votan entre esos 4.</li>
                </ul>
                <div className="mt-4 p-3 bg-orange-600/20 rounded-lg border border-orange-500/30">
                  <p className="text-sm text-orange-300">
                    <strong>💡 Importante:</strong> Solo podrás nominar participantes cuando la categoría esté en Fase 2. En Fase 1, los usuarios escriben respuestas de texto.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/30 rounded-xl p-6 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-1">Progreso de Nominación</h3>
                    <p className="text-gray-400 text-sm">
                      {nominations.length} de {participants.length} participantes nominados
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                      {nominations.length}/{participants.length}
                    </div>
                    <div className="text-sm text-gray-400 mt-1">
                      {participants.length > 0 ? Math.round((nominations.length / participants.length) * 100) : 0}% completado
                    </div>
                  </div>
                </div>
                <div className="mt-4 w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-500 to-purple-600 transition-all duration-500"
                    style={{ width: `${participants.length > 0 ? (nominations.length / participants.length) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}
          </>
        )}

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Selecciona Participantes</h2>
            {categories.find(c => c.id === selectedCategory)?.category_type === 'duo' && (
              <div className="mb-4 p-4 bg-pink-900/20 border border-pink-500/30 rounded-lg">
                <p className="text-pink-300 text-sm">
                  <strong>💡 Categoría DUO:</strong> Los usuarios podrán armar libremente las parejas votando por 2 personas de esta lista.
                </p>
              </div>
            )}
            <div className="relative mb-4">
              <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg pl-12 pr-4 py-2 focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto mb-4">
              {availableParticipants.map(p => (
                <div
                  key={p.id}
                  onClick={() => toggleParticipant(p.id)}
                  className={`cursor-pointer rounded-lg p-3 border-2 transition-all relative ${
                    selectedParticipants.includes(p.id) ? 'border-cyan-500 bg-cyan-900/30' : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  {selectedParticipants.includes(p.id) && (
                    <div className="absolute top-2 right-2 bg-cyan-500 rounded-full p-1">
                      <MdCheckCircle className="text-white" />
                    </div>
                  )}
                  {p.image_url && <img src={p.image_url} alt={p.name} className="w-full h-24 object-cover rounded mb-2" />}
                  <p className="font-bold text-sm text-white">{p.name}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-4">
              <button onClick={handleNominate} disabled={loading || selectedParticipants.length === 0} className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium">
                {loading ? 'Guardando...' : `Nominar (${selectedParticipants.length})`}
              </button>
              <button onClick={() => { setShowForm(false); setSelectedParticipants([]); }} className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-medium">
                Cancelar
              </button>
            </div>
          </div>
        )}

        {selectedCategory && (
          <div>
            <h2 className="text-2xl font-bold mb-4 text-white">Nominados ({nominations.length})</h2>

            {/* Info banner for duo categories */}
            {categories.find(c => c.id === selectedCategory)?.category_type === 'duo' && (
              <div className="mb-4 p-4 bg-pink-900/20 border border-pink-500/30 rounded-lg">
                <p className="text-pink-300 text-sm">
                  <strong>💡 Categoría DUO:</strong> Aquí ves los participantes nominados individualmente. Los duos se formarán automáticamente cuando los usuarios voten eligiendo 2 personas.
                </p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {nominations.map(nom => {
                const isDuoNomination = nom.duo_participant2_id && nom.duo_participant2
                const isDuoCategory = categories.find(c => c.id === selectedCategory)?.category_type === 'duo'

                return (
                  <div key={nom.id} className={`bg-gray-900 rounded-xl overflow-hidden border transition-colors ${
                    isDuoNomination ? 'border-pink-800 hover:border-pink-500/50' :
                    isDuoCategory ? 'border-pink-800/50 hover:border-pink-500/30' :
                    'border-gray-800 hover:border-purple-500/50'
                  }`}>
                    {isDuoNomination ? (
                      // Vista para DUO VOTADO (cuando un usuario ya votó y se creó el duo)
                      <>
                        <div className="relative h-40">
                          <div className="absolute inset-0 flex">
                            <div className="flex-1 relative">
                              {nom.participant.image_url ? (
                                <img src={nom.participant.image_url} alt={nom.participant.name} className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-700 to-slate-900"></div>
                              )}
                            </div>
                            <div className="flex-1 relative">
                              {nom.duo_participant2.image_url ? (
                                <img src={nom.duo_participant2.image_url} alt={nom.duo_participant2.name} className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900"></div>
                              )}
                            </div>
                          </div>
                          <div className="absolute top-2 left-2 bg-pink-600 text-white text-xs px-2 py-1 rounded font-bold">DUO VOTADO</div>
                        </div>
                        <div className="p-4">
                          <h3 className="text-lg font-bold mb-2 text-white">{nom.participant.name} & {nom.duo_participant2.name}</h3>
                          <p className="text-xs text-pink-300 mb-3">Este duo fue creado por votos de usuarios</p>
                          <button onClick={() => handleRemoveNomination(nom.id)} className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                            <MdDelete /> Eliminar nominación
                          </button>
                        </div>
                      </>
                    ) : (
                      // Vista para PARTICIPANTE INDIVIDUAL
                      <>
                        {nom.participant.image_url && <img src={nom.participant.image_url} alt={nom.participant.name} className="w-full h-40 object-cover" />}
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-bold text-white">{nom.participant.name}</h3>
                            {isDuoCategory && (
                              <span className="bg-pink-600 text-white text-xs px-2 py-0.5 rounded font-bold">DUO</span>
                            )}
                          </div>
                          {nom.participant.description && <p className="text-sm text-gray-400 mb-3">{nom.participant.description}</p>}
                          <button onClick={() => handleRemoveNomination(nom.id)} className="w-full bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2">
                            <MdDelete /> Eliminar nominación
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
              {nominations.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
                  No hay nominados. Agrega algunos para esta categoría.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
