"use client";

import { AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function ScannerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center gap-6">
      <div className="bg-red-500/20 p-6 rounded-full">
        <AlertTriangle className="w-16 h-16 text-red-500" />
      </div>
      <h2 className="font-montserrat font-black text-2xl text-white uppercase">
        Erro no Scanner
      </h2>
      <p className="text-white/70 font-bold text-sm max-w-sm">
        Ocorreu um erro ao inicializar o scanner. Verifique a conexão e tente novamente.
      </p>
      {error?.message && (
        <pre className="bg-black/30 border border-white/10 text-white/60 px-4 py-2 rounded-xl text-xs font-mono max-w-full overflow-x-auto">
          {error.message}
        </pre>
      )}
      <div className="flex gap-4">
        <button
          onClick={reset}
          className="bg-green-500 hover:bg-green-600 text-white font-black text-lg py-4 px-8 rounded-2xl shadow-md transition-all active:scale-95 uppercase"
        >
          Tentar Novamente
        </button>
        <Link href="/admin/recepcao">
          <button className="bg-white/10 hover:bg-white/20 text-white font-bold py-4 px-6 rounded-2xl transition-all">
            Voltar
          </button>
        </Link>
      </div>
    </div>
  );
}
