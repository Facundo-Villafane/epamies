'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import {
  MdDashboard,
  MdCalendarToday,
  MdPeople,
  MdCategory,
  MdStar,
  MdHowToVote,
  MdMovie,
  MdScreenShare,
  MdCloudUpload
} from 'react-icons/md'
export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname()

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: MdDashboard, exact: true },
    { href: '/admin/editions', label: 'Ediciones', icon: MdCalendarToday },
    { href: '/admin/participants', label: 'Participantes', icon: MdPeople },
    { href: '/admin/categories', label: 'Categorías', icon: MdCategory },
    { href: '/admin/nominations', label: 'Nominaciones', icon: MdStar },
    { href: '/admin/import', label: 'Importar Datos', icon: MdCloudUpload },
    { href: '/admin/voting-phases', label: 'Fases de Votación', icon: MdHowToVote },
    { href: '/admin/ceremony', label: 'Ceremonia', icon: MdMovie },
  ]

  const isActive = (href: string, exact = false) => {
    if (exact) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-black text-white flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-800">
          <Link href="/">
            <h1 className="text-2xl font-black bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent cursor-pointer">
              EPAMIES Admin
            </h1>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.href}>
                  <Link href={item.href}>
                    <div
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all cursor-pointer ${
                        isActive(item.href, item.exact)
                          ? 'bg-gradient-to-r from-cyan-500 to-purple-600 text-white'
                          : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      <Icon className="text-xl" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <Link href="/display" target="_blank">
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 transition-all cursor-pointer">
              <MdScreenShare className="text-xl" />
              <span className="font-medium">Ver Display</span>
            </div>
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-black">
        {children}
      </main>
    </div>
  )
}
