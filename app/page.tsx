import Link from "next/link";
import { HiCheckCircle } from "react-icons/hi";
import { MdScreenShare } from "react-icons/md";
import { FaArrowRight } from "react-icons/fa";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <img
              src="/logo-epamies.svg"
              alt="LOS EPAMIES"
              className="h-32 md:h-40 w-auto brightness-0 invert"
            />
          </div>
          <p className="text-2xl text-gray-400 mb-4">
            Vota por tus favoritos
          </p>
          <p className="text-lg text-gray-500">
            Participa en la elección de los ganadores
          </p>
        </div>

        <div className="max-w-4xl mx-auto">
          {/* Main Voting Card - Large and prominent */}
          <Link href="/vote">
            <div className="bg-gradient-to-br from-cyan-500/20 to-purple-600/20 border-2 border-cyan-400 hover:border-cyan-300 rounded-2xl p-12 hover:scale-105 transition-all cursor-pointer group mb-8 shadow-2xl shadow-cyan-500/20">
              <div className="text-center">
                <div className="text-8xl mb-6 text-cyan-400 group-hover:scale-110 transition-transform inline-block">
                  <HiCheckCircle />
                </div>
                <h2 className="text-5xl font-black mb-4 bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                  COMENZAR A VOTAR
                </h2>
                <p className="text-gray-300 text-xl mb-6">
                  Inicia sesión con tu cuenta de Gmail personal y elige tus favoritos en cada categoría
                </p>
                <div className="inline-flex items-center gap-3 text-cyan-400 font-bold text-xl bg-cyan-400/10 px-8 py-4 rounded-lg group-hover:bg-cyan-400/20 transition-colors">
                  Ir a votar <FaArrowRight className="group-hover:translate-x-2 transition-transform" />
                </div>
              </div>
            </div>
          </Link>

          {/* Display Card - Smaller, secondary */}
          <Link href="/display">
            <div className="bg-gradient-to-br from-purple-500/10 to-cyan-600/10 border border-gray-800 hover:border-purple-400/50 rounded-xl p-6 hover:scale-102 transition-all cursor-pointer group">
              <div className="flex items-center gap-4">
                <div className="text-4xl text-purple-400 group-hover:scale-110 transition-transform">
                  <MdScreenShare />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">Pantalla de ceremonia</h3>
                  <p className="text-gray-400 text-sm">
                    Vista para proyectar durante el evento
                  </p>
                </div>
                <FaArrowRight className="text-purple-400 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
