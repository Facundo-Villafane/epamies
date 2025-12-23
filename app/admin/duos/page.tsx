'use client'

import { useEffect, useState } from 'react'
import { supabase, type Participant, type Duo, type DuoWithParticipants } from '@/lib/supabase'
import { MdAdd, MdDelete, MdSearch, MdPeople } from 'react-icons/md'
import { FaHeart } from 'react-icons/fa'

export default function DuosPage() {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [duos, setDuos] = useState<DuoWithParticipants[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedParticipant1, setSelectedParticipant1] = useState<string>('')
  const [selectedParticipant2, setSelectedParticipant2] = useState<string>('')
  const [duoName, setDuoName] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const [participantsRes, duosRes] = await Promise.all([
      supabase.from('participants').select('*').order('name'),
      supabase
        .from('duos')
        .select(`
          *,
          participant1:participants!duos_participant1_id_fkey(*),
          participant2:participants!duos_participant2_id_fkey(*)
        `)
        .order('created_at', { ascending: false })
    ])

    if (participantsRes.data) setParticipants(participantsRes.data)
    if (duosRes.data) setDuos(duosRes.data as any)
  }

  async function handleCreateDuo() {
    if (!selectedParticipant1 || !selectedParticipant2) {
      alert('Debes seleccionar ambos participantes')
      return
    }

    if (selectedParticipant1 === selectedParticipant2) {
      alert('Debes seleccionar dos participantes diferentes')
      return
    }

    setLoading(true)

    try {
      const { error } = await supabase.from('duos').insert([{
        participant1_id: selectedParticipant1,
        participant2_id: selectedParticipant2,
        duo_name: duoName.trim() || null
      }])

      if (error) throw error

      await fetchData()
      setSelectedParticipant1('')
      setSelectedParticipant2('')
      setDuoName('')
      setShowForm(false)
    } catch (error: any) {
      if (error.code === '23505') {
        alert('Este duo ya existe')
      } else {
        console.error('Error:', error)
        alert('Error al crear el duo: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteDuo(id: string) {
    if (!confirm('¿Eliminar este duo?')) return

    setLoading(true)
    try {
      await supabase.from('duos').delete().eq('id', id)
      await fetchData()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al eliminar el duo')
    } finally {
      setLoading(false)
    }
  }

  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getParticipantName = (id: string) => {
    return participants.find(p => p.id === id)?.name || ''
  }

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
              <FaHeart className="text-pink-400" />
              Duos / Parejas
            </h1>
            <p className="text-gray-400">Gestiona parejas de participantes para categorías de duo</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            {showForm ? 'Cancelar' : <><MdAdd /> Crear Duo</>}
          </button>
        </div>

        {showForm && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">Crear Nuevo Duo</h2>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2 text-gray-300">
                Nombre del Duo (opcional)
              </label>
              <input
                type="text"
                placeholder="Ej: Facundo & Lucía"
                value={duoName}
                onChange={(e) => setDuoName(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-pink-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Si no especificas un nombre, se usará "Participante1 & Participante2"
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Participante 1
                </label>
                <select
                  value={selectedParticipant1}
                  onChange={(e) => setSelectedParticipant1(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-pink-500"
                >
                  <option value="">Selecciona un participante</option>
                  {participants.map(p => (
                    <option key={p.id} value={p.id} disabled={p.id === selectedParticipant2}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">
                  Participante 2
                </label>
                <select
                  value={selectedParticipant2}
                  onChange={(e) => setSelectedParticipant2(e.target.value)}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-pink-500"
                >
                  <option value="">Selecciona un participante</option>
                  {participants.map(p => (
                    <option key={p.id} value={p.id} disabled={p.id === selectedParticipant1}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {selectedParticipant1 && selectedParticipant2 && (
              <div className="mb-4 p-4 bg-pink-900/20 border border-pink-500/30 rounded-lg">
                <p className="text-pink-300 text-sm flex items-center gap-2">
                  <MdPeople />
                  Vista previa: <strong>{duoName || `${getParticipantName(selectedParticipant1)} & ${getParticipantName(selectedParticipant2)}`}</strong>
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={handleCreateDuo}
                disabled={loading || !selectedParticipant1 || !selectedParticipant2}
                className="bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2 rounded-lg font-medium"
              >
                {loading ? 'Creando...' : 'Crear Duo'}
              </button>
              <button
                onClick={() => {
                  setShowForm(false)
                  setSelectedParticipant1('')
                  setSelectedParticipant2('')
                  setDuoName('')
                }}
                className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="bg-gradient-to-r from-pink-900/30 to-purple-900/30 border border-pink-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">Duos Creados</h3>
              <p className="text-gray-400 text-sm">
                Total de {duos.length} duo{duos.length !== 1 ? 's' : ''} registrado{duos.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="text-right">
              <div className="text-4xl font-bold bg-gradient-to-r from-pink-400 to-purple-500 bg-clip-text text-transparent">
                {duos.length}
              </div>
              <div className="text-sm text-gray-400 mt-1">
                duos
              </div>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold mb-4 text-white">Lista de Duos ({duos.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {duos.map(duo => (
              <div
                key={duo.id}
                className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-pink-500/50 transition-colors"
              >
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-4">
                    <FaHeart className="text-pink-400" />
                    <h3 className="text-lg font-bold text-white">
                      {duo.duo_name || `${duo.participant1.name} & ${duo.participant2.name}`}
                    </h3>
                  </div>

                  <div className="space-y-3 mb-4">
                    <div className="flex items-center gap-3">
                      {duo.participant1.image_url && (
                        <img
                          src={duo.participant1.image_url}
                          alt={duo.participant1.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{duo.participant1.name}</p>
                        {duo.participant1.description && (
                          <p className="text-xs text-gray-400">{duo.participant1.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {duo.participant2.image_url && (
                        <img
                          src={duo.participant2.image_url}
                          alt={duo.participant2.name}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <p className="text-sm font-medium text-white">{duo.participant2.name}</p>
                        {duo.participant2.description && (
                          <p className="text-xs text-gray-400">{duo.participant2.description}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDuo(duo.id)}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                  >
                    <MdDelete /> Eliminar duo
                  </button>
                </div>
              </div>
            ))}
            {duos.length === 0 && (
              <div className="col-span-3 text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
                No hay duos creados. Crea el primero para comenzar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
