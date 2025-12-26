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
        // Obtener el hash de la URL que contiene los tokens
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const refreshToken = hashParams.get('refresh_token')

        if (accessToken && refreshToken) {
          // Establecer la sesión con los tokens
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          })

          if (error) {
            console.error('Error setting session:', error)
            alert('Error al iniciar sesión. Por favor intenta de nuevo.')
            router.push('/')
            return
          }

          // Redirigir a la página de votación
          router.push('/vote')
        } else {
          console.error('No se encontraron tokens en la URL')
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
