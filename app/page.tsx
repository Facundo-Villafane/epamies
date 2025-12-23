import Link from "next/link";
import { HiCheckCircle } from "react-icons/hi";
import { MdScreenShare, MdSettings } from "react-icons/md";
import { IoMdInformationCircle } from "react-icons/io";
import { FaArrowRight } from "react-icons/fa";

export default function Home() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <img
              src="/logo-epamies.svg"
              alt="LOS EPAMIES"
              className="h-24 md:h-32 w-auto brightness-0 invert"
            />
          </div>
          <p className="text-2xl text-gray-400">
            Sistema de gestión de ceremonia de premios
          </p>
        </div>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
          {/* Voting Card */}
          <Link href="/vote">
            <div className="bg-gradient-to-br from-cyan-500/10 to-purple-600/10 border-2 border-gray-800 hover:border-cyan-400 rounded-2xl p-8 hover:scale-105 transition-all cursor-pointer group">
              <div className="text-6xl mb-4 text-cyan-400 group-hover:scale-110 transition-transform">
                <HiCheckCircle />
              </div>
              <h2 className="text-3xl font-bold mb-3">Votar</h2>
              <p className="text-gray-400 mb-4">
                Vota por tus favoritos en cada categoría.
                Los votos se cuentan en tiempo real.
              </p>
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                Ir a votar <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Display Card */}
          <Link href="/display">
            <div className="bg-gradient-to-br from-purple-500/10 to-cyan-600/10 border-2 border-gray-800 hover:border-purple-400 rounded-2xl p-8 hover:scale-105 transition-all cursor-pointer group">
              <div className="text-6xl mb-4 text-purple-400 group-hover:scale-110 transition-transform">
                <MdScreenShare />
              </div>
              <h2 className="text-3xl font-bold mb-3">Pantalla de proyección</h2>
              <p className="text-gray-400 mb-4">
                Vista para proyectar en la sala durante la ceremonia.
                Se actualiza automáticamente.
              </p>
              <div className="flex items-center gap-2 text-purple-400 font-bold">
                Abrir pantalla <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>

          {/* Admin Card */}
          <Link href="/admin">
            <div className="bg-gradient-to-br from-cyan-600/10 to-purple-500/10 border-2 border-gray-800 hover:border-cyan-400 rounded-2xl p-8 hover:scale-105 transition-all cursor-pointer group">
              <div className="text-6xl mb-4 text-cyan-400 group-hover:scale-110 transition-transform">
                <MdSettings />
              </div>
              <h2 className="text-3xl font-bold mb-3">Panel de control</h2>
              <p className="text-gray-400 mb-4">
                Gestiona ediciones, categorías, nominados y ganadores.
              </p>
              <div className="flex items-center gap-2 text-cyan-400 font-bold">
                Administrar <FaArrowRight className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        </div>

        {/* Setup instructions */}
        <div className="max-w-4xl mx-auto mt-12 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 border border-cyan-400/30 rounded-xl p-6">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2 text-cyan-400">
            <IoMdInformationCircle className="text-2xl" />
            <span>Primera vez?</span>
          </h3>
          <p className="text-gray-400">
            Revisa el archivo <code className="bg-black border border-cyan-400/30 px-2 py-1 rounded text-cyan-300">SETUP.md</code> para
            configurar Supabase y cargar tus categorías y nominados.
          </p>
        </div>
      </div>
    </div>
  );
}
