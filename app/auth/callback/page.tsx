'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    // Manejar el callback de OAuth
    const handleCallback = async () => {
      try {
        // Supabase maneja automáticamente el hash fragment
        const { data, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
          alert('Error al iniciar sesión. Por favor intenta de nuevo.')
          router.push('/')
          return
        }

        if (data.session) {
          // Sesión establecida correctamente
          console.log('Sesión establecida:', data.session.user.email)
          router.push('/vote')
        } else {
          console.error('No se encontró sesión')
          router.push('/')
        }
      } catch (error) {
        console.error('Error en callback:', error)
        router.push('/')
      }
    }

    handleCallback()
  }, [router])

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-cyan-400 mb-4"></div>
        <p className="text-xl text-gray-400">Iniciando sesión...</p>
      </div>
    </div>
  )
}
