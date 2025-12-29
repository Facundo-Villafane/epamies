'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { IoMdArrowBack } from 'react-icons/io'
import Link from 'next/link'

// Lista de emails de administradores - debe coincidir con las políticas RLS
// Se lee desde variable de entorno NEXT_PUBLIC_ADMIN_EMAILS
// Formato: email1@domain.com,email2@domain.com,email3@domain.com
const ADMIN_EMAILS = process.env.NEXT_PUBLIC_ADMIN_EMAILS
  ? process.env.NEXT_PUBLIC_ADMIN_EMAILS.split(',').map(email => email.trim().toLowerCase())
  : []

interface AdminGuardProps {
  children: React.ReactNode
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { user, loading } = useAuth()
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    function checkAdminStatus() {
      if (!user?.email) {
        setIsAdmin(false)
        setCheckingAdmin(false)
        return
      }

      // Verificar si el email está en la lista de admins
      const adminStatus = ADMIN_EMAILS.includes(user.email.toLowerCase())
      setIsAdmin(adminStatus)
      setCheckingAdmin(false)
    }

    checkAdminStatus()
  }, [user])

  // Mostrar loading mientras verifica
  if (loading || checkingAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando permisos...</p>
        </div>
      </div>
    )
  }

  // Si no está logueado
  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-gradient-to-br from-green-900/30 to-lime-900/30 border-2 border-green-500/50 rounded-2xl p-8 text-center">
            {/* Imagen de Ruby */}
            <div className="mb-6 flex justify-center">
              <img
                src="/fe19d97d-38eb-429c-9930-90b6c55dc9f4.webp"
                alt="Acceso Bloqueado"
                className="w-64 h-64 object-cover rounded-lg shadow-2xl"
              />
            </div>
            <h1 className="text-4xl font-black text-white mb-4 bg-gradient-to-r from-green-400 to-lime-500 bg-clip-text text-transparent">
              Ruby bloqueó el locker... otra vez.
            </h1>
            <p className="text-gray-300 mb-6">
              (Debes iniciar sesión para acceder)
            </p>
            <Link href="/">
              <button className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-lg transition-all">
                <IoMdArrowBack /> Volver al inicio
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Si está logueado pero no es admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-lg w-full">
          <div className="bg-gradient-to-br from-green-900/30 to-lime-900/30 border-2 border-green-500/50 rounded-2xl p-8 text-center">
            {/* Imagen de Vegan */}
            <div className="mb-6 flex justify-center">
              <img
                src="/fe19d97d-38eb-429c-9930-90b6c55dc9f4.webp"
                alt="Acceso Veganado"
                className="w-64 h-64 object-cover rounded-lg shadow-2xl"
              />
            </div>
            <h1 className="text-4xl font-black text-white mb-4 bg-gradient-to-r from-green-400 to-lime-500 bg-clip-text text-transparent">
              Ruby bloqueó el locker... otra vez.
            </h1>
            <p className="text-gray-300 mb-2">
              (No tienes permisos de administrador)
            </p>
            <p className="text-gray-400 text-sm mb-6">
              Usuario: {user.email}
            </p>
            <Link href="/">
              <button className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold px-6 py-3 rounded-lg transition-all">
                <IoMdArrowBack /> Volver al inicio
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Usuario es admin
  return <>{children}</>
}
