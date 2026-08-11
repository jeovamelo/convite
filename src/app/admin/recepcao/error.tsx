"use client";

import { AlertTriangle } from "lucide-react";

export default function RecepcaoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="max-w-lg mx-auto p-10 flex flex-col items-center justify-center gap-6 text-center">
      <div className="bg-red-100 p-6 rounded-full">
        <AlertTriangle className="w-16 h-16 text-red-500" />
      </div>
      <h2 className="font-montserrat font-black text-2xl text-gray-800 uppercase">
        Erro na Recepção
      </h2>
      <p className="text-gray-500 font-bold text-sm max-w-sm">
        Ocorreu um erro ao carregar a página da recepção. Isso pode ser um problema temporário de conexão.
      </p>
      {error?.message && (
        <pre className="bg-gray-100 border border-gray-200 text-gray-600 px-4 py-2 rounded-xl text-xs font-mono max-w-full overflow-x-auto">
          {error.message}
        </pre>
      )}
      <button
        onClick={reset}
        className="bg-sonicBlueMain hover:bg-sonicBlueDark text-white font-black text-lg py-4 px-8 rounded-2xl shadow-md transition-all active:scale-95 uppercase"
      >
        Tentar Novamente
      </button>
    </div>
  );
}
