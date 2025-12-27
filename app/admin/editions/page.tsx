'use client'

import { useEffect, useState } from 'react'
import { supabase, type Edition } from '@/lib/supabase'
import { MdCalendarToday, MdAdd, MdEdit, MdDelete, MdCheckCircle, MdCancel, MdHowToVote } from 'react-icons/md'

export default function EditionsPage() {
  const [editions, setEditions] = useState<Edition[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', year: new Date().getFullYear() })
  const [loading, setLoading] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(true)

  useEffect(() => {
    fetchEditions()
  }, [])

  async function fetchEditions() {
    setIsLoadingData(true)
    console.log('🔍 Fetching editions...')
    const { data, error } = await supabase.from('editions').select('*').order('year', { ascending: false })

    if (error) {
      console.error('❌ Error al cargar ediciones:', error)
      alert('Error al cargar ediciones. ¿Ejecutaste el SQL de DATABASE_UPDATE.sql en Supabase?')
      setIsLoadingData(false)
      return
    }

    console.log('✅ Ediciones cargadas:', data)
    console.log('📊 Total de ediciones:', data?.length)

    if (data) {
      setEditions(data)
    }
    setIsLoadingData(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      let result
      if (editingId) {
        result = await supabase.from('editions').update(formData).eq('id', editingId)
      } else {
        result = await supabase.from('editions').insert([formData])
      }

      // Mostrar error si hay
      if (result.error) {
        console.error('Error completo:', result.error)
        alert('Error al guardar: ' + result.error.message)
        return
      }

      await fetchEditions()
      resetForm()
      alert('Edición guardada correctamente!')
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar esta edición?')) return
    await supabase.from('editions').delete().eq('id', id)
    await fetchEditions()
  }

  async function handleSetActive(id: string) {
    // Primero desactivar TODAS las ediciones
    await supabase.from('editions').update({ is_active: false })
    // Luego activar solo la seleccionada
    await supabase.from('editions').update({ is_active: true }).eq('id', id)
    await fetchEditions()
  }

  async function handleDeactivate(id: string) {
    await supabase.from('editions').update({ is_active: false }).eq('id', id)
    await fetchEditions()
  }

  async function handleChangePhase(id: string, currentPhase: number) {
    const newPhase = currentPhase === 1 ? 2 : 1
    const confirmed = confirm(
      `¿Cambiar a Fase ${newPhase}?\n\n` +
      `Fase 1: Nominación Popular (hasta 3 votos por usuario)\n` +
      `Fase 2: Votación Final (1 voto por usuario, solo finalistas)\n\n` +
      `Esto afectará a TODAS las categorías de esta edición.`
    )

    if (confirmed) {
      await supabase.from('editions').update({ voting_phase: newPhase }).eq('id', id)
      await fetchEditions()
    }
  }

  function resetForm() {
    setFormData({ name: '', description: '', year: new Date().getFullYear() })
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(edition: Edition) {
    setFormData({ name: edition.name, description: edition.description || '', year: edition.year || new Date().getFullYear() })
    setEditingId(edition.id)
    setShowForm(true)
  }

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
              <MdCalendarToday className="text-cyan-400" />
              Ediciones
            </h1>
            <p className="text-gray-400">Gestiona las ediciones de premios</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            {showForm ? 'Cancelar' : <><MdAdd /> Nueva Edición</>}
          </button>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">{editingId ? 'Editar' : 'Nueva'} Edición</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  placeholder="Ej: Premios EPAMIES 2024"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  rows={3}
                  placeholder="Descripción de la edición"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Año</label>
                <input
                  type="number"
                  required
                  value={formData.year}
                  onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div className="flex gap-4">
                <button type="submit" disabled={loading} className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 disabled:opacity-50 px-6 py-2 rounded-lg font-medium">
                  {loading ? 'Guardando...' : 'Guardar'}
                </button>
                <button type="button" onClick={resetForm} className="bg-gray-700 hover:bg-gray-600 px-6 py-2 rounded-lg font-medium">
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        )}

        {isLoadingData ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-400">Cargando ediciones...</div>
          </div>
        ) : (
          <div className="grid gap-4">
            {editions.map((edition) => (
            <div key={edition.id} className={`bg-gray-900 rounded-xl p-6 border-2 ${edition.is_active ? 'border-green-500' : 'border-gray-800'} hover:border-cyan-500/50 transition-colors`}>
              <div className="flex justify-between items-start">
                <div className="flex-grow">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold text-white">{edition.name}</h3>
                    {edition.is_active ? (
                      <span className="bg-green-600 text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <MdCheckCircle /> ACTIVA
                      </span>
                    ) : (
                      <span className="bg-gray-700 text-gray-300 text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1">
                        <MdCancel /> INACTIVA
                      </span>
                    )}
                    <span className={`${
                      edition.voting_phase === 1
                        ? 'bg-cyan-600'
                        : 'bg-purple-600'
                    } text-white text-xs px-3 py-1 rounded-full font-bold flex items-center gap-1`}>
                      <MdHowToVote /> FASE {edition.voting_phase || 1}
                    </span>
                  </div>
                  {edition.description && <p className="text-gray-400 mb-2">{edition.description}</p>}
                  <p className="text-sm text-gray-500">Año: {edition.year}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    {edition.voting_phase === 1
                      ? '📊 Fase de Nominación Popular (hasta 3 votos/usuario)'
                      : '🏆 Fase de Votación Final (1 voto/usuario, solo finalistas)'}
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    {edition.is_active ? (
                      <button
                        onClick={() => handleDeactivate(edition.id)}
                        className="bg-orange-600 hover:bg-orange-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <MdCancel /> Desactivar
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSetActive(edition.id)}
                        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2"
                      >
                        <MdCheckCircle /> Activar
                      </button>
                    )}
                    <button onClick={() => startEdit(edition)} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                      <MdEdit /> Editar
                    </button>
                    <button onClick={() => handleDelete(edition.id)} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                      <MdDelete /> Eliminar
                    </button>
                  </div>
                  {edition.is_active && (
                    <button
                      onClick={() => handleChangePhase(edition.id, edition.voting_phase || 1)}
                      className={`${
                        edition.voting_phase === 1
                          ? 'bg-purple-600 hover:bg-purple-700'
                          : 'bg-cyan-600 hover:bg-cyan-700'
                      } px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 justify-center`}
                    >
                      <MdHowToVote /> Cambiar a Fase {edition.voting_phase === 1 ? '2' : '1'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
            {editions.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
                No hay ediciones. Crea una para empezar.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
