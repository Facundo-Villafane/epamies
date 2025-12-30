'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase, type Edition, type Category, type Participant } from '@/lib/supabase'
import { MdCalendarToday, MdPeople, MdStar, MdAdd, MdMovie, MdTextFields } from 'react-icons/md'
import { FaTrophy, FaArrowRight } from 'react-icons/fa'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    editions: 0,
    participants: 0,
    categories: 0,
    nominations: 0
  })
  const [activeEdition, setActiveEdition] = useState<Edition | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  async function fetchStats() {
    try {
      const [editionsRes, participantsRes, categoriesRes, nominationsRes] = await Promise.all([
        supabase.from('editions').select('*', { count: 'exact', head: true }),
        supabase.from('participants').select('*', { count: 'exact', head: true }),
        supabase.from('categories').select('*', { count: 'exact', head: true }),
        supabase.from('nominations').select('*', { count: 'exact', head: true })
      ])

      // Get active edition
      const activeEditionRes = await supabase
        .from('editions')
        .select('*')
        .eq('is_active', true)
        .limit(1)
        .single()

      setStats({
        editions: editionsRes.count || 0,
        participants: participantsRes.count || 0,
        categories: categoriesRes.count || 0,
        nominations: nominationsRes.count || 0
      })

      if (activeEditionRes.data) {
        setActiveEdition(activeEditionRes.data)
      }
    } catch (error) {
      console.error('Error fetching stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const cards = [
    { title: 'Ediciones', count: stats.editions, icon: MdCalendarToday, href: '/admin/editions', gradient: 'from-cyan-500 to-cyan-600' },
    { title: 'Participantes', count: stats.participants, icon: MdPeople, href: '/admin/participants', gradient: 'from-purple-500 to-purple-600' },
    { title: 'Categorías', count: stats.categories, icon: FaTrophy, href: '/admin/categories', gradient: 'from-cyan-400 to-purple-500' },
    { title: 'Nominaciones', count: stats.nominations, icon: MdStar, href: '/admin/nominations', gradient: 'from-purple-400 to-cyan-500' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="p-8 bg-black min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <img
              src="/logo-epamies.svg"
              alt="LOS EPAMIES"
              className="h-12 w-auto brightness-0 invert"
            />
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Dashboard</h1>
            </div>
          </div>
          <p className="text-gray-400">Panel de administración de premios EPAMIES</p>
        </div>

        {/* Active Edition Banner */}
        {activeEdition && (
          <div className="mb-8 p-6 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl border border-cyan-400/30">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-cyan-200 mb-1">Edición activa</p>
                <h2 className="text-3xl font-bold text-white">{activeEdition.name}</h2>
                {activeEdition.description && (
                  <p className="text-purple-100 mt-2">{activeEdition.description}</p>
                )}
              </div>
              <Link href="/admin/ceremony">
                <button className="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-cyan-50 transition-colors flex items-center gap-2">
                  Ir a Ceremonia
                  <FaArrowRight />
                </button>
              </Link>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {cards.map((card) => {
            const IconComponent = card.icon
            return (
              <Link key={card.href} href={card.href}>
                <div className={`bg-gradient-to-br ${card.gradient} rounded-xl p-6 cursor-pointer hover:scale-105 transition-transform border border-cyan-400/20`}>
                  <div className="flex items-center justify-between mb-4">
                    <IconComponent className="text-4xl text-white" />
                    <span className="text-4xl font-bold text-white">{card.count}</span>
                  </div>
                  <h3 className="text-xl font-semibold text-white">{card.title}</h3>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Quick Actions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h2 className="text-2xl font-bold mb-4 text-white">Acciones rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <Link href="/admin/editions">
              <button className="w-full bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 px-6 py-4 rounded-lg font-medium transition-colors text-left text-white">
                <div className="text-2xl mb-2"><MdAdd /></div>
                <div className="font-bold">Nueva Edición</div>
                <div className="text-sm text-cyan-100">Crear una nueva edición de premios</div>
              </button>
            </Link>
            <Link href="/admin/participants">
              <button className="w-full bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 px-6 py-4 rounded-lg font-medium transition-colors text-left text-white">
                <div className="text-2xl mb-2"><MdPeople /></div>
                <div className="font-bold">Agregar Participante</div>
                <div className="text-sm text-purple-100">Añadir nuevo participante</div>
              </button>
            </Link>
            <Link href="/admin/finalists">
              <button className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 px-6 py-4 rounded-lg font-medium transition-colors text-left text-white">
                <div className="text-2xl mb-2"><FaTrophy /></div>
                <div className="font-bold">Gestionar Finalistas</div>
                <div className="text-sm text-yellow-100">Marcar top 4 para Fase 2</div>
              </button>
            </Link>
            <Link href="/admin/text-finalists">
              <button className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-500 hover:to-blue-600 px-6 py-4 rounded-lg font-medium transition-colors text-left text-white">
                <div className="text-2xl mb-2"><MdTextFields /></div>
                <div className="font-bold">Finalistas de Texto</div>
                <div className="text-sm text-cyan-100">Generar top 4 con IA uwu</div>
              </button>
            </Link>
            <Link href="/admin/ceremony">
              <button className="w-full bg-gradient-to-r from-purple-400 to-pink-500 hover:from-purple-500 hover:to-pink-600 px-6 py-4 rounded-lg font-medium transition-colors text-left text-white">
                <div className="text-2xl mb-2"><MdMovie /></div>
                <div className="font-bold">Iniciar Ceremonia</div>
                <div className="text-sm text-purple-100">Seleccionar ganadores en vivo</div>
              </button>
            </Link>
            <Link href="/admin/epamie-oro">
              <button className="w-full bg-gradient-to-r from-yellow-400 to-yellow-600 hover:from-yellow-500 hover:to-yellow-700 px-6 py-4 rounded-lg font-medium transition-colors text-left text-white">
                <div className="text-2xl mb-2"><FaTrophy /></div>
                <div className="font-bold">Epamie de Oro</div>
                <div className="text-sm text-yellow-100">Top 3 más votados</div>
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
