'use client'

import Link from 'next/link'
import { IoMdArrowBack } from 'react-icons/io'
import { FaClock, FaTrophy } from 'react-icons/fa'
import Ballpit from './Ballpit'

type WaitingScreenProps = {
  phase: 'phase1_closed' | 'phase2_closed'
  editionName: string
}

export default function WaitingScreen({ phase, editionName }: WaitingScreenProps) {
  const isPhase1Closed = phase === 'phase1_closed'

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Ballpit Background */}
      <div className="fixed inset-0 z-0 opacity-60">
        <Ballpit
          colors={[0x06b6d4, 0xa855f7, 0xec4899]}
          count={150}
          gravity={0.3}
          followCursor={true}
        />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-2xl w-full text-center">
          {/* Animated Clock Icon */}
          <div className="mb-8 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-full blur-2xl opacity-50 animate-pulse"></div>
              <div className="relative bg-gradient-to-br from-gray-900 to-black border-4 border-cyan-400/30 rounded-full p-8">
                <FaClock className="text-6xl text-cyan-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-6xl font-black mb-6 bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            {isPhase1Closed ? '¡Fase 1 Finalizada!' : '¡Fase 2 Finalizada!'}
          </h1>

          {/* Message */}
          <div className="bg-gradient-to-br from-cyan-900/20 to-purple-900/20 border-2 border-cyan-500/30 rounded-2xl p-8 mb-8">
            {isPhase1Closed ? (
              <>
                <p className="text-3xl text-white font-bold mb-4">
                  ¡Estamos contando los votos!
                </p>
                <p className="text-xl text-gray-300 mb-4">
                  La Fase 1 ha finalizado
                </p>
                <p className="text-lg text-gray-400 mb-6">
                  Siéntate y espera a que habilitemos la siguiente etapa de votación con los <span className="text-cyan-400 font-bold">finalistas</span>.
                </p>
                <div className="flex items-center justify-center gap-2 text-purple-400">
                  <FaTrophy className="text-xl" />
                  <span className="font-medium">Muy pronto podrás votar en la Fase 2</span>
                  <FaTrophy className="text-xl" />
                </div>
              </>
            ) : (
              <>
                <p className="text-3xl text-white font-bold mb-4">
                  ¡Estamos contando los votos finales!
                </p>
                <p className="text-xl text-gray-300 mb-4">
                  La Fase 2 ha finalizado
                </p>
                <p className="text-lg text-gray-400 mb-6">
                  Gracias por participar en <span className="text-cyan-400 font-bold">{editionName}</span>. Siéntate y espera a que revelemos los ganadores.
                </p>
                <div className="flex items-center justify-center gap-2 text-purple-400">
                  <FaTrophy className="text-xl" />
                  <span className="font-medium">Los ganadores se anunciarán en la ceremonia</span>
                  <FaTrophy className="text-xl" />
                </div>
              </>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-6 mb-8">
            <p className="text-cyan-200">
              <span className="font-bold">💡 Relájate:</span> Te avisaremos cuando {isPhase1Closed ? 'esté lista la Fase 2 con los finalistas' : 'comience la ceremonia de premiación'}
            </p>
          </div>

          {/* Back Button */}
          <Link href="/">
            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-lg transition-all transform hover:scale-105">
              <IoMdArrowBack /> Volver al inicio
            </button>
          </Link>

          {/* Sillas Image */}
          <div className="mt-12 flex justify-center opacity-70">
            <img
              src="/sillas.png"
              alt="Siéntate y espera"
              className="w-32 md:w-40 h-auto"
            />
          </div>
        </div>
      </div>
    </div>
  )
}
