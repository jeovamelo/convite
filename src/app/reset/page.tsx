"use client";

import { useState } from "react";
import { Trash2, RotateCcw, AlertTriangle, CheckCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ResetPage() {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [confirmingAction, setConfirmingAction] = useState<string | null>(null);

  const handleReset = async (action: "tickets" | "reception") => {
    setLoadingAction(action);
    setSuccessMessage(null);
    setErrorMessage(null);
    setConfirmingAction(null);

    try {
      const res = await fetch("/api/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Ocorreu um erro no servidor.");

      setSuccessMessage(data.message);
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setErrorMessage(err.message || "Erro ao processar requisição.");
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-lg bg-gray-900 border-2 border-red-500/20 rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
        
        {/* Decorative background */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500"></div>

        <div className="flex flex-col items-center text-center mb-8">
          <div className="bg-red-500/10 p-4 rounded-full border border-red-500/25 mb-4 text-red-500 animate-pulse">
            <AlertTriangle size={36} />
          </div>
          <h1 className="font-montserrat font-black italic text-2xl uppercase tracking-wider">
            Painel de Reset (Testes)
          </h1>
          <p className="font-inter text-gray-400 font-bold text-sm mt-2 leading-relaxed">
            Área exclusiva para limpar os dados ou liberar os exibíveis durante a fase de validação e testes da portaria.
          </p>
        </div>

        {successMessage && (
          <div className="bg-green-500/15 border border-green-500 text-green-300 px-4 py-3 rounded-2xl font-bold text-sm mb-6 flex items-center gap-2">
            <CheckCircle size={18} className="shrink-0 text-green-500" />
            <p>{successMessage}</p>
          </div>
        )}

        {errorMessage && (
          <div className="bg-red-500/15 border border-red-500 text-red-300 px-4 py-3 rounded-2xl font-bold text-sm mb-6 flex items-center gap-2">
            <AlertTriangle size={18} className="shrink-0 text-red-500" />
            <p>{errorMessage}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Card 1: Resetar Recepção (Liberar uso) */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <h3 className="font-black uppercase text-sm tracking-wider mb-2 text-yellow-500 flex items-center gap-2">
              <RotateCcw size={16} /> Resetar Recepção
            </h3>
            <p className="text-gray-400 font-bold text-xs leading-relaxed mb-4">
              Muda todos os convites já utilizados na portaria para o status de "Disponível" e remove o horário de entrada. Ideal para testar a leitura do QR Code várias vezes com o mesmo convite.
            </p>
            {confirmingAction === "reception" ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleReset("reception")}
                  className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-black text-xs py-3 rounded-xl transition-all"
                >
                  CONFIRMAR RESET
                </button>
                <button
                  onClick={() => setConfirmingAction(null)}
                  className="px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                disabled={loadingAction !== null}
                onClick={() => setConfirmingAction("reception")}
                className="w-full bg-yellow-500/10 hover:bg-yellow-500 text-yellow-500 hover:text-black border border-yellow-500/30 hover:border-yellow-500 font-black text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loadingAction === "reception" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    RESETANDO...
                  </>
                ) : (
                  "LIBERAR TODOS OS CONVITES"
                )}
              </button>
            )}
          </div>

          {/* Card 2: Deletar tudo */}
          <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
            <h3 className="font-black uppercase text-sm tracking-wider mb-2 text-red-500 flex items-center gap-2">
              <Trash2 size={16} /> Excluir Exibíveis
            </h3>
            <p className="text-gray-400 font-bold text-xs leading-relaxed mb-4">
              Exclui permanentemente todos os convites e registros cadastrados no banco de dados. Use isso antes de gerar a lista final oficial de convidados.
            </p>
            {confirmingAction === "tickets" ? (
              <div className="flex gap-2">
                <button
                  onClick={() => handleReset("tickets")}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-black text-xs py-3 rounded-xl transition-all"
                >
                  CONFIRMAR EXCLUSÃO TOTAL
                </button>
                <button
                  onClick={() => setConfirmingAction(null)}
                  className="px-4 bg-gray-700 hover:bg-gray-600 text-white font-bold text-xs rounded-xl transition-all"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <button
                disabled={loadingAction !== null}
                onClick={() => setConfirmingAction("tickets")}
                className="w-full bg-red-600/10 hover:bg-red-600 text-red-500 hover:text-white border border-red-600/30 hover:border-red-600 font-black text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                {loadingAction === "tickets" ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    DELETANDO...
                  </>
                ) : (
                  "EXCLUIR TODOS OS EXIBÍVEIS"
                )}
              </button>
            )}
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-800 text-center">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-white font-bold text-xs transition-colors">
            <ArrowLeft size={14} /> Voltar para o Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
