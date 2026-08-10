"use client";

import { Suspense, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { QrCode, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

type InviteStatus = "IDLE" | "VALIDATING" | "VALID" | "USED" | "INVALID";

function PortariaContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";
  const initialToken = searchParams.get("token") || "";

  const [code, setCode] = useState(initialCode);
  const [token, setToken] = useState(initialToken);
  const [status, setStatus] = useState<InviteStatus>("IDLE");
  const [usedAt, setUsedAt] = useState<string | null>(null);

  // Auto-validate if params are present
  useEffect(() => {
    if (initialCode && initialToken) {
      handleValidate();
    }
  }, [initialCode, initialToken]);

  const handleValidate = async () => {
    setStatus("VALIDATING");
    // TODO: Connect to Supabase
    // setTimeout simulates network request
    setTimeout(() => {
      // Mock validation logic
      if (code === "LM-001") {
        setStatus("VALID");
      } else if (code === "LM-002") {
        setStatus("USED");
        setUsedAt("2026-08-19 18:45:00");
      } else {
        setStatus("INVALID");
      }
    }, 800);
  };

  const handleCheckIn = async () => {
    // TODO: Update in Supabase
    setStatus("USED");
    setUsedAt(new Date().toLocaleString('pt-BR'));
    alert(`Entrada liberada para ${code}!`);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 flex flex-col items-center">
      <div className="text-center space-y-2 mb-4">
        <h2 className="text-2xl font-bold text-gray-800">Portaria / Check-in</h2>
        <p className="text-gray-500 text-sm">Escaneie o QR Code ou insira o código manualmente</p>
      </div>

      {/* Manual Input (fallback) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 w-full flex flex-col sm:flex-row gap-4 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-semibold text-gray-700 mb-1">Código do Exibível</label>
          <input
            type="text"
            placeholder="Ex: LM-001"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sonicBlue text-gray-900"
          />
        </div>
        <button
          onClick={handleValidate}
          disabled={!code || status === "VALIDATING"}
          className="w-full sm:w-auto bg-blue-900 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-800 transition-colors disabled:opacity-50"
        >
          {status === "VALIDATING" ? "Validando..." : "Validar"}
        </button>
      </div>

      {/* Result Card */}
      {status !== "IDLE" && status !== "VALIDATING" && (
        <div className="w-full">
          {status === "VALID" && (
            <div className="bg-green-50 border-2 border-green-500 rounded-2xl p-8 text-center space-y-6 shadow-lg transform transition-all scale-100">
              <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="text-green-600 w-12 h-12" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-green-800 mb-1">EXIBÍVEL Nº {code.replace('LM-', '')}</h3>
                <p className="text-green-700 font-semibold text-lg uppercase tracking-wider">Status: Válido</p>
              </div>
              <button
                onClick={handleCheckIn}
                className="w-full bg-green-600 text-white font-black py-5 px-6 rounded-xl hover:bg-green-700 transition-colors shadow-md text-xl"
              >
                LIBERAR ENTRADA
              </button>
            </div>
          )}

          {status === "USED" && (
            <div className="bg-red-50 border-2 border-red-500 rounded-2xl p-8 text-center space-y-4 shadow-lg">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
                <XCircle className="text-red-600 w-12 h-12" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-red-800 mb-2">EXIBÍVEL JÁ UTILIZADO</h3>
                <p className="text-red-700 font-medium">Este QR Code não pode ser utilizado novamente.</p>
              </div>
              <div className="bg-red-100 p-4 rounded-lg inline-block w-full">
                <p className="text-sm font-semibold text-red-900 uppercase">Horário do primeiro acesso</p>
                <p className="text-lg font-bold text-red-800">{usedAt}</p>
              </div>
            </div>
          )}

          {status === "INVALID" && (
            <div className="bg-orange-50 border-2 border-orange-400 rounded-2xl p-8 text-center space-y-4 shadow-lg">
              <div className="mx-auto w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="text-orange-600 w-12 h-12" />
              </div>
              <div>
                <h3 className="text-xl font-black text-orange-800 mb-1">CÓDIGO INVÁLIDO</h3>
                <p className="text-orange-700">Este QR Code não foi reconhecido pelo sistema.</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PortariaPage() {
  return (
    <Suspense fallback={<div>Carregando...</div>}>
      <PortariaContent />
    </Suspense>
  );
}
