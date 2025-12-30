'use client'

import { useEffect, useState } from 'react'
import { supabase, type Category, type Edition } from '@/lib/supabase'
import { MdAdd, MdEdit, MdDelete } from 'react-icons/md'
import { FaTrophy } from 'react-icons/fa'

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [editions, setEditions] = useState<Edition[]>([])
  const [selectedEdition, setSelectedEdition] = useState<string>('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({ name: '', description: '', order: 0, category_type: 'participant_based' as 'participant_based' | 'text_based' | 'duo', is_votable: true })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (selectedEdition) fetchCategories()
  }, [selectedEdition])

  async function fetchData() {
    const { data: editionsData } = await supabase.from('editions').select('*').order('year', { ascending: false })
    if (editionsData) {
      setEditions(editionsData)
      const activeEdition = editionsData.find(e => e.is_active)
      if (activeEdition) setSelectedEdition(activeEdition.id)
    }
  }

  async function fetchCategories() {
    console.log('🔍 Cargando categorías para edición:', selectedEdition)
    const { data, error } = await supabase.from('categories').select('*').eq('edition_id', selectedEdition).order('order')

    if (error) {
      console.error('❌ Error al cargar categorías:', error)
      alert('Error al cargar categorías: ' + error.message)
      return
    }

    console.log('✅ Categorías cargadas:', data)
    console.log('📊 Total categorías:', data?.length)
    if (data) setCategories(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedEdition) return alert('Selecciona una edición')
    setLoading(true)

    try {
      const dataToSave = { ...formData, edition_id: selectedEdition }
      console.log('💾 Guardando categoría:', dataToSave)

      let result
      if (editingId) {
        result = await supabase.from('categories').update(dataToSave).eq('id', editingId)
      } else {
        result = await supabase.from('categories').insert([dataToSave])
      }

      // Verificar errores
      if (result.error) {
        console.error('❌ Error al guardar:', result.error)
        alert('Error al guardar categoría: ' + result.error.message + '\n\n¿Ejecutaste el SQL de DATABASE_TEXT_CATEGORIES.sql en Supabase?')
        setLoading(false)
        return
      }

      console.log('✅ Categoría guardada exitosamente')
      await fetchCategories()
      resetForm()
      alert('Categoría guardada correctamente!')
    } catch (error) {
      console.error('Error:', error)
      alert('Error: ' + error)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar categoría? Se eliminarán todas sus nominaciones.')) return
    await supabase.from('categories').delete().eq('id', id)
    await fetchCategories()
  }

  function resetForm() {
    setFormData({ name: '', description: '', order: categories.length, category_type: 'participant_based', is_votable: true })
    setEditingId(null)
    setShowForm(false)
  }

  function startEdit(category: Category) {
    setFormData({
      name: category.name,
      description: category.description || '',
      order: category.order,
      category_type: category.category_type || 'participant_based',
      is_votable: category.is_votable !== false
    })
    setEditingId(category.id)
    setShowForm(true)
  }

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
              <FaTrophy className="text-cyan-400" />
              Categorías
            </h1>
            <p className="text-gray-400">Gestiona las categorías de cada edición</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 px-6 py-3 rounded-lg font-medium flex items-center gap-2"
          >
            {showForm ? 'Cancelar' : <><MdAdd /> Nueva Categoría</>}
          </button>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium mb-2 text-gray-300">Edición</label>
          <select
            value={selectedEdition}
            onChange={(e) => setSelectedEdition(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-cyan-500"
          >
            <option value="">Selecciona una edición</option>
            {editions.map((ed) => (
              <option key={ed.id} value={ed.id}>{ed.name} {ed.is_active && '(Activa)'}</option>
            ))}
          </select>
        </div>

        {showForm && selectedEdition && (
          <form onSubmit={handleSubmit} className="bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
            <h2 className="text-2xl font-bold mb-4 text-white">{editingId ? 'Editar' : 'Nueva'} Categoría</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Nombre</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  placeholder="Ej: Mejor Juego del Año"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Descripción</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Orden</label>
                <input
                  type="number"
                  required
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-300">Tipo de Categoría</label>
                <select
                  value={formData.category_type}
                  onChange={(e) => setFormData({ ...formData, category_type: e.target.value as 'participant_based' | 'text_based' | 'duo' })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-cyan-500"
                >
                  <option value="participant_based">Basada en Participantes (normal)</option>
                  <option value="text_based">Basada en Texto (ej: Momento Memorable)</option>
                  <option value="duo">Mejor Duo/Pareja (2 personas)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  {formData.category_type === 'text_based'
                    ? 'Fase 1: Los usuarios escriben texto libre. Fase 2: Votan entre 4 opciones que tú prepares.'
                    : formData.category_type === 'duo'
                    ? 'Fase 1: Voto por 1 duo. Fase 2: Voto por 1 duo entre Top 4. No cuenta para Epamie de Oro.'
                    : 'Fase 1: Voto por 3 participantes. Fase 2: Voto por 1 entre Top 4.'}
                </p>
              </div>
              <div className="flex items-center gap-3 p-4 bg-yellow-900/20 border border-yellow-600/50 rounded-lg">
                <input
                  type="checkbox"
                  id="is_votable"
                  checked={formData.is_votable}
                  onChange={(e) => setFormData({ ...formData, is_votable: e.target.checked })}
                  className="w-5 h-5 bg-gray-800 border-gray-700 rounded focus:ring-cyan-500"
                />
                <div className="flex-grow">
                  <label htmlFor="is_votable" className="text-sm font-medium text-yellow-200 cursor-pointer">
                    Permitir votar en /vote
                  </label>
                  <p className="text-xs text-yellow-300/80 mt-1">
                    Desactivá esto para categorías especiales como "Epamie de Oro" que se calculan automáticamente y no deben aparecer en la página de votación.
                  </p>
                </div>
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

        {selectedEdition && (
          <div className="grid gap-4">
            {categories.map((category) => (
              <div key={category.id} className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-cyan-500/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-gradient-to-r from-cyan-500 to-purple-600 text-white px-3 py-1 rounded-full text-sm font-bold">#{category.order}</span>
                      <h3 className="text-2xl font-bold text-white">{category.name}</h3>
                      {category.category_type === 'text_based' && (
                        <span className="bg-orange-600 text-white text-xs px-2 py-1 rounded font-bold">TEXTO</span>
                      )}
                      {category.category_type === 'duo' && (
                        <span className="bg-pink-600 text-white text-xs px-2 py-1 rounded font-bold">DUO</span>
                      )}
                      {category.is_votable === false && (
                        <span className="bg-yellow-600 text-black text-xs px-2 py-1 rounded font-bold">🏆 NO VOTABLE</span>
                      )}
                    </div>
                    {category.description && <p className="text-gray-400">{category.description}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(category)} className="bg-cyan-600 hover:bg-cyan-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                      <MdEdit /> Editar
                    </button>
                    <button onClick={() => handleDelete(category.id)} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2">
                      <MdDelete /> Eliminar
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {categories.length === 0 && (
              <div className="text-center py-12 text-gray-500 bg-gray-900 border border-gray-800 rounded-xl">
                No hay categorías. Crea una para empezar.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
