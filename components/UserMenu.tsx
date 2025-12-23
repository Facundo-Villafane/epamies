'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { IoMdExit, IoMdPerson } from 'react-icons/io'

export default function UserMenu() {
  const { user, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  if (!user) return null

  const handleSignOut = async () => {
    setIsLoading(true)
    try {
      await signOut()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-gray-900/80 hover:bg-gray-800 backdrop-blur-md px-4 py-2 rounded-lg border border-cyan-500/50 transition-colors"
      >
        <IoMdPerson className="text-cyan-400 text-xl" />
        <span className="text-white text-sm max-w-[150px] truncate">
          {user.email}
        </span>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 top-full mt-2 w-64 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-20">
            <div className="p-4 border-b border-gray-700">
              <p className="text-xs text-gray-400 mb-1">Conectado como:</p>
              <p className="text-white text-sm font-medium truncate">{user.email}</p>
            </div>
            <button
              onClick={handleSignOut}
              disabled={isLoading}
              className="w-full px-4 py-3 text-left text-red-400 hover:bg-gray-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <IoMdExit className="text-xl" />
              <span>{isLoading ? 'Cerrando sesión...' : 'Cerrar sesión'}</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
