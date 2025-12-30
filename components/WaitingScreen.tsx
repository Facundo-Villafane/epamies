'use client'

import Link from 'next/link'
import { IoMdArrowBack } from 'react-icons/io'
import { FaTrophy } from 'react-icons/fa'
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
        <div className="max-w-3xl w-full text-center">
          {/* Logo EPAMIES */}
          <div className="mb-12 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 blur-3xl opacity-40 animate-pulse"></div>
              <img
                src="/logo-epamies.svg"
                alt="LOS EPAMIES"
                className="relative h-24 md:h-32 w-auto brightness-0 invert drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Sillas Image - PROTAGONISTA */}
          <div className="mb-12 flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-purple-600 blur-2xl opacity-30"></div>
              <img
                src="/sillas.png"
                alt="Siéntate y espera"
                className="relative w-64 md:w-80 h-auto drop-shadow-2xl"
              />
            </div>
          </div>

          {/* Title */}
          <h1 className="text-5xl md:text-7xl font-black mb-8 text-white drop-shadow-[0_0_25px_rgba(6,182,212,0.8)]">
            {isPhase1Closed ? '¡Sentate y Esperá!' : '¡Sentate y Relajate!'}
          </h1>

          {/* Message */}
          <div className="bg-gradient-to-br from-cyan-900/30 to-purple-900/30 border-2 border-cyan-500/50 backdrop-blur-md rounded-2xl p-8 mb-8">
            {isPhase1Closed ? (
              <>
                <p className="text-3xl md:text-4xl text-white font-black mb-6">
                  ¡La nominación ha finalizado!
                </p>
                <p className="text-xl md:text-2xl text-cyan-300 mb-6 font-medium">
                  Estamos contando todos los votos...
                </p>
                <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                  Muy pronto habilitaremos la votación de los <span className="text-cyan-400 font-bold">posibles ganadores</span> en cada categoría.
                </p>
                <div className="flex items-center justify-center gap-3 text-purple-400">
                  <FaTrophy className="text-2xl" />
                  <span className="font-bold text-xl">Estate atento</span>
                  <FaTrophy className="text-2xl" />
                </div>
              </>
            ) : (
              <>
                <p className="text-3xl md:text-4xl text-white font-black mb-6">
                  ¡La votación ha finalizado!
                </p>
                <p className="text-xl md:text-2xl text-cyan-300 mb-6 font-medium">
                  Estamos contando los votos finales...
                </p>
                <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                  Gracias por participar en <span className="text-cyan-400 font-bold">{editionName}</span>. Los ganadores se revelarán muy pronto.
                </p>
                <div className="flex items-center justify-center gap-3 text-purple-400">
                  <FaTrophy className="text-2xl" />
                  <span className="font-bold text-xl">¡Preparate para la ceremonia!</span>
                  <FaTrophy className="text-2xl" />
                </div>
              </>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-cyan-500/20 border-2 border-cyan-400/50 rounded-xl p-6 mb-8 backdrop-blur-sm">
            <p className="text-cyan-100 text-lg font-medium">
              <span className="font-black text-xl">💡</span> Te avisaremos cuando {isPhase1Closed ? 'puedas votar por tus favoritos' : 'comience la ceremonia de premiación'}
            </p>
          </div>

          {/* Back Button */}
          <Link href="/">
            <button className="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-bold px-8 py-4 rounded-lg transition-all transform hover:scale-105 shadow-lg">
              <IoMdArrowBack /> Volver al inicio
            </button>
          </Link>
        </div>
      </div>
    </div>
  )
}
