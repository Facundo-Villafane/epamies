'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/useAuth'
import { FcGoogle } from 'react-icons/fc'
import { IoMdArrowBack } from 'react-icons/io'
import Link from 'next/link'

// Dominios bloqueados (correos corporativos)
const BLOCKED_DOMAINS: string[] = [
  'epam.com',
  'xa.epicgames.com'
]

interface AuthGuardProps {
  children: React.ReactNode
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading, signInWithGoogle, signOut } = useAuth()
  const [isDomainBlocked, setIsDomainBlocked] = useState(false)
  const [isCheckingDomain, setIsCheckingDomain] = useState(true)

  useEffect(() => {
    if (user?.email) {
      const emailDomain = user.email.split('@')[1]
      const blocked = BLOCKED_DOMAINS.some(domain =>
        emailDomain.toLowerCase().includes(domain.toLowerCase())
      )

      if (blocked) {
        setIsDomainBlocked(true)
        // Cerrar sesión automáticamente si el dominio está bloqueado
        signOut()
      } else {
        setIsDomainBlocked(false)
      }
      setIsCheckingDomain(false)
    } else {
      setIsCheckingDomain(false)
    }
  }, [user])

  if (loading || isCheckingDomain) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-400 mx-auto mb-4"></div>
          <p className="text-gray-400">Verificando sesión...</p>
        </div>
      </div>
    )
  }

  if (isDomainBlocked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-gradient-to-br from-red-900/30 to-orange-900/30 border-2 border-red-500/50 rounded-2xl p-8 text-center">
            <div className="text-6xl mb-4">🚫</div>
            <h1 className="text-3xl font-bold text-white mb-4">Acceso Denegado</h1>
            <p className="text-gray-300 mb-6">
              No puedes ingresar con una cuenta de correo corporativa. Por favor, usa tu correo personal de Gmail.
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

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="text-center mb-8">
            <img
              src="/logo-epamies.svg"
              alt="LOS EPAMIES"
              className="h-20 w-auto mx-auto mb-6 brightness-0 invert"
            />
            <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
              Inicia Sesión para Votar
            </h1>
            <p className="text-gray-400 mb-8">
              Necesitas autenticarte con tu cuenta de Gmail personal para poder emitir tu voto.
            </p>
          </div>

          <div className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 border-2 border-cyan-500/50 rounded-2xl p-8">
            <button
              onClick={signInWithGoogle}
              className="w-full bg-white hover:bg-gray-100 text-gray-800 font-bold py-4 px-6 rounded-lg transition-all flex items-center justify-center gap-3 shadow-lg hover:shadow-xl"
            >
              <FcGoogle className="text-2xl" />
              <span>Continuar con Google</span>
            </button>
          </div>

          <div className="mt-6 text-center">
            <Link href="/">
              <button className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
                <IoMdArrowBack /> Volver al inicio
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Usuario autenticado y dominio permitido
  return <>{children}</>
}
