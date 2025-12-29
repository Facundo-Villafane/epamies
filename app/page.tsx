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

        <div className="flex justify-center">
          <Link href="/vote">
            <button className="inline-flex items-center gap-3 text-cyan-400 font-bold text-xl bg-cyan-400/10 px-8 py-4 rounded-lg hover:bg-cyan-400/20 transition-colors border border-cyan-400 hover:border-cyan-300">
              Ir a votar <FaArrowRight className="group-hover:translate-x-2 transition-transform" />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
