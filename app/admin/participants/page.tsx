'use client'

import { useEffect, useState } from 'react'
import { supabase, type Participant, type Edition, type Category } from '@/lib/supabase'
import { MdPeople, MdAdd, MdEdit, MdDelete, MdContentCopy, MdSearch, MdUpload, MdImage, MdClose } from 'react-icons/md'

type ParticipantWithStats = Participant & {
  nomination_count: number
  categories: string[]
}

// Component to display duo participants with split images
function DuoImageAdmin({ participant1Id, participant2Id }: { participant1Id: string, participant2Id: string }) {
  const [images, setImages] = useState<{ img1: string | null, img2: string | null }>({ img1: null, img2: null })

  useEffect(() => {
    async function fetchImages() {
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

  return (
    <div className="relative w-full h-48">
      {/* Left half - Person 1 */}
      {images.img1 && (
        <img
          src={images.img1}
          alt="Participant 1"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath: 'inset(0 50% 0 0)' }}
        />
      )}

      {/* Right half - Person 2 */}
      {images.img2 && (
        <img
          src={images.img2}
          alt="Participant 2"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ clipPath: 'inset(0 0 0 50%)' }}
        />
      )}

      {/* Divider line in the middle */}
      <div className="absolute inset-y-0 left-1/2 w-0.5 bg-gradient-to-b from-cyan-400/50 via-purple-500/50 to-cyan-400/50 -translate-x-1/2 z-10"></div>
    </div>
  )
}

export default function ParticipantsPage() {
  const [participants, setParticipants] = useState<ParticipantWithStats[]>([])
  const [editions, setEditions] = useState<Edition[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedEdition, setSelectedEdition] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [showCloneModal, setShowCloneModal] = useState(false)
  const [cloneFromEdition, setCloneFromEdition] = useState<string>('')
  const [cloneToEdition, setCloneToEdition] = useState<string>('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', image_url: '' })
  const [loading, setLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchEditions()
    fetchParticipants()
  }, [])

  useEffect(() => {
    if (selectedEdition && selectedEdition !== 'all') {
      fetchCategories()
    }
    fetchParticipants()
  }, [selectedEdition])

  async function fetchEditions() {
    const { data } = await supabase.from('editions').select('*').order('year', { ascending: false })
    if (data) {
      setEditions(data)
      const active = data.find(e => e.is_active)
      if (active) setSelectedEdition(active.id)
    }
  }

  async function fetchCategories() {
    if (selectedEdition === 'all') return
    const { data } = await supabase.from('categories').select('*').eq('edition_id', selectedEdition)
    if (data) setCategories(data)
  }

  async function fetchParticipants() {
    const { data: participantsData } = await supabase.from('participants').select('*').order('name')
    if (!participantsData) return

    // Get nominations for all participants
    const { data: nominationsData } = await supabase
      .from('nominations')
      .select('participant_id, category_id, categories(name, edition_id)')

    // Build stats
    const participantsWithStats = participantsData.map((p: Participant) => {
      const nominations = nominationsData?.filter((n: any) => n.participant_id === p.id) || []

      // Filter by selected edition if needed
      const filteredNominations = selectedEdition === 'all'
        ? nominations
        : nominations.filter((n: any) => n.categories?.edition_id === selectedEdition)

      return {
        ...p,
        nomination_count: filteredNominations.length,
        categories: filteredNominations.map((n: any) => n.categories?.name).filter(Boolean)
      }
    })

    setParticipants(participantsWithStats)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    try {
      if (editingId) {
        await supabase.from('participants').update(formData).eq('id', editingId)
      } else {
        await supabase.from('participants').insert([formData])
      }
      await fetchParticipants()
      resetForm()
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este participante? Se eliminarán todas sus nominaciones.')) return
    await supabase.from('participants').delete().eq('id', id)
    await fetchParticipants()
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Solo se permiten archivos de imagen')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen no debe superar 5MB')
      return
    }

    setUploading(true)

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`
      const filePath = `participants/${fileName}`

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        console.error('Upload error:', error)
        alert('Error al subir imagen: ' + error.message)
        return
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('images')
        .getPublicUrl(filePath)

      setFormData({ ...formData, image_url: urlData.publicUrl })
      alert('✅ Imagen subida correctamente')
    } catch (error) {
      console.error('Error:', error)
      alert('Error al subir imagen')
    } finally {
      setUploading(false)
    }
  }

  async function handleCloneNominations() {
    if (!cloneFromEdition || !cloneToEdition) {
      alert('Selecciona ambas ediciones')
      return
    }

    if (cloneFromEdition === cloneToEdition) {
      alert('Las ediciones deben ser diferentes')
      return
    }

    if (!confirm('Esto copiará TODAS las categorías y nominaciones de una edición a otra. ¿Continuar?')) return

    setLoading(true)

    try {
      // Get categories from source edition
      const { data: sourceCategories } = await supabase
        .from('categories')
        .select('*')
        .eq('edition_id', cloneFromEdition)

      if (!sourceCategories || sourceCategories.length === 0) {
        alert('La edición de origen no tiene categorías')
        setLoading(false)
        return
      }

      // Get categories from destination edition (to map by name)
      const { data: destCategories } = await supabase
        .from('categories')
        .select('*')
        .eq('edition_id', cloneToEdition)

      // Create missing categories in destination
      const categoryMapping: Record<string, string> = {}

      for (const sourceCat of sourceCategories) {
        const existingDestCat = destCategories?.find(c => c.name === sourceCat.name)

        if (existingDestCat) {
          categoryMapping[sourceCat.id] = existingDestCat.id
        } else {
          // Create new category in destination
          const { data: newCat } = await supabase
            .from('categories')
            .insert([{
              name: sourceCat.name,
              description: sourceCat.description,
              order: sourceCat.order,
              edition_id: cloneToEdition,
              voting_phase: 1
            }])
            .select()
            .single()

          if (newCat) {
            categoryMapping[sourceCat.id] = newCat.id
          }
        }
      }

      // Get all nominations from source categories
      const sourceCategoryIds = sourceCategories.map(c => c.id)
      const { data: sourceNominations } = await supabase
        .from('nominations')
        .select('*')
        .in('category_id', sourceCategoryIds)

      if (sourceNominations && sourceNominations.length > 0) {
        // Clone nominations to destination categories
        const newNominations = sourceNominations.map(nom => ({
          participant_id: nom.participant_id,
          category_id: categoryMapping[nom.category_id],
          is_finalist: false,
          is_winner: false
        }))

        await supabase.from('nominations').insert(newNominations)
      }

      alert('✅ Nominaciones clonadas correctamente!')
      setShowCloneModal(false)
      setCloneFromEdition('')
      setCloneToEdition('')
      await fetchParticipants()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al clonar: ' + error)
    } finally {
      setLoading(false)
    }
  }

  function resetForm() {
    setFormData({ name: '', description: '', image_url: '' })
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(participant: Participant) {
    setFormData({
      name: participant.name,
      description: participant.description || '',
      image_url: participant.image_url || ''
    })
    setEditingId(participant.id)
    setShowForm(true)
  }
  const filteredParticipants = participants.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const currentEditionName = selectedEdition === 'all'
    ? 'Todas las ediciones'
    : editions.find(e => e.id === selectedEdition)?.name || ''

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
              <MdPeople className="text-cyan-400" />
              Participantes
            </h1>
            <p className="text-gray-400">Pool global de participantes que pueden ser nominados</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCloneModal(true)}
              className="bg-purple-600 hover:bg-purple-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <MdContentCopy /> Clonar edición
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {showForm ? 'Cancelar' : <><MdAdd /> Nuevo Participante</>}
            </button>
          </div>
        </div>

        {/* Clone Modal */}
        {showCloneModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold mb-4 text-white">Clonar Edición</h2>
              <p className="text-gray-400 mb-6">
                Copia todas las categorías y nominaciones de una edición a otra.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Desde edición:</label>
                  <select
                    value={cloneFromEdition}
                    onChange={(e) => setCloneFromEdition(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Seleccionar...</option>
                    {editions.map(ed => (
                      <option key={ed.id} value={ed.id}>{ed.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-300">Hacia edición:</label>
                  <select
                    value={cloneToEdition}
                    onChange={(e) => setCloneToEdition(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Seleccionar...</option>
                    {editions.map(ed => (
                      <option key={ed.id} value={ed.id}>{ed.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    onClick={handleCloneNominations}
                    disabled={loading}
                    className="flex-1 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium"
                  >
                    {loading ? 'Clonando...' : 'Clonar'}
                  </button>
                  <button
                    onClick={() => setShowCloneModal(false)}
                    disabled={loading}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded-lg font-medium"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Edition Filter */}
        <div className="mb-6 flex gap-4 items-center">
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2 text-gray-300">Filtrar por edición:</label>
            <select
              value={selectedEdition}
              onChange={(e) => setSelectedEdition(e.target.value)}
              className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">Todas las ediciones</option>
              {editions.map(ed => (
                <option key={ed.id} value={ed.id}>
                  {ed.name} {ed.is_active && '(Activa)'}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium mb-2 text-gray-300">Buscar:</label>
            <div className="relative">
              <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl" />
              <input
                type="text"
                placeholder="Buscar participantes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg pl-12 pr-4 py-3 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <div className="flex gap-6 text-sm">
            <div>
              <span className="text-gray-400">Edición actual:</span>{' '}
              <span className="font-bold text-white">{currentEditionName}</span>
            </div>
            <div>
              <span className="text-gray-400">Participantes totales:</span>{' '}
              <span className="font-bold text-cyan-400">{participants.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Con nominaciones:</span>{' '}
              <span className="font-bold text-purple-400">{participants.filter(p => p.nomination_count > 0).length}</span>
            </div>
          </div>
        </div>

        {showForm && (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">{editingId ? 'Editar' : 'Nuevo'} Participante</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  placeholder="Nombre del participante o juego"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  rows={3}
                  placeholder="Descripción breve"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Imagen</label>

                {/* File upload */}
                <div className="mb-3">
                  <label className="block w-full">
                    <div className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      uploading ? 'border-gray-700 bg-gray-800' : 'border-gray-700 hover:border-cyan-500 hover:bg-gray-800'
                    }`}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={uploading}
                        className="hidden"
                      />
                      {uploading ? (
                        <div className="text-gray-400 flex items-center justify-center gap-2">
                          <MdUpload className="text-2xl animate-bounce" />
                          <span>Subiendo imagen...</span>
                        </div>
                      ) : (
                        <div>
                          <MdImage className="text-5xl text-cyan-400 mx-auto mb-2" />
                          <div className="text-sm text-gray-300 font-medium">Click para subir imagen</div>
                          <div className="text-xs text-gray-500 mt-1">PNG, JPG, GIF (máx. 5MB)</div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>

                {/* URL input as alternative */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-700"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-gray-900 px-2 text-gray-500">o pega una URL</span>
                  </div>
                </div>

                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 mt-3 focus:outline-none focus:border-cyan-500"
                  placeholder="https://ejemplo.com/imagen.jpg"
                />
              </div>

              {/* Enhanced Preview */}
              {formData.image_url && (
                <div className="bg-gradient-to-r from-cyan-900/30 to-purple-900/30 border border-cyan-500/50 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <label className="block text-sm font-medium text-cyan-300 flex items-center gap-2">
                      <MdImage className="text-lg" />
                      Vista previa
                    </label>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, image_url: '' })}
                      className="text-gray-400 hover:text-red-400 transition-colors"
                      title="Eliminar imagen"
                    >
                      <MdClose className="text-xl" />
                    </button>
                  </div>
                  <div className="flex justify-center">
                    <img
                      src={formData.image_url}
                      alt="Preview"
                      className="max-w-full h-64 object-contain rounded-lg border-2 border-cyan-500/30"
                    />
                  </div>
                </div>
              )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredParticipants.map((participant) => {
            // Check if this is a duo participant
            const isDuo = participant.name.includes(' & ')
            let duoData = null

            if (isDuo) {
              try {
                duoData = JSON.parse(participant.description || '{}')
              } catch (e) {
                // Not valid JSON
              }
            }

            return (
            <div key={participant.id} className="bg-gray-900 rounded-xl overflow-hidden border border-gray-800 hover:border-cyan-500/50 transition-all">
              {isDuo && duoData?.type === 'duo' ? (
                <DuoImageAdmin
                  participant1Id={duoData.participant1_id}
                  participant2Id={duoData.participant2_id}
                />
              ) : participant.image_url ? (
                <img src={participant.image_url} alt={participant.name} className="w-full h-48 object-cover" />
              ) : null}
              <div className="p-4">
                <h3 className="text-xl font-bold mb-2 text-white">{participant.name}</h3>
                {participant.description && <p className="text-gray-400 text-sm mb-2">{participant.description}</p>}

                {/* Nomination stats */}
                <div className="mb-4 p-2 bg-gray-800 rounded-lg border border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">
                    {participant.nomination_count > 0 ? (
                      <>
                        <span className="font-bold text-cyan-400">{participant.nomination_count}</span> nominación{participant.nomination_count !== 1 && 'es'}
                      </>
                    ) : (
                      <span className="text-gray-500">Sin nominaciones</span>
                    )}
                  </div>
                  {participant.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {participant.categories.map((cat, idx) => (
                        <span key={idx} className="text-xs bg-gradient-to-r from-purple-600/50 to-cyan-600/50 px-2 py-0.5 rounded">
                          {cat}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <button onClick={() => startEdit(participant)} className="flex-1 bg-cyan-600 hover:bg-cyan-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                    <MdEdit /> Editar
                  </button>
                  <button onClick={() => handleDelete(participant.id)} className="flex-1 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-1">
                    <MdDelete /> Eliminar
                  </button>
                </div>
              </div>
            </div>
            )
          })}
          {filteredParticipants.length === 0 && (
            <div className="col-span-3 text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
              {searchTerm ? 'No se encontraron participantes' : 'No hay participantes. Crea uno para empezar.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
