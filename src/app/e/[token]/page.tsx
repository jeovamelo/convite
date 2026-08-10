"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, AlertCircle, XCircle, Loader2, Users } from "lucide-react";
import { motion } from "framer-motion";

type TicketInfo = {
  status: "AVAILABLE" | "USED" | "CANCELLED" | "INVALID";
  public_id?: string;
  quantidade_pessoas?: number;
  guest_name?: string;
  used_at?: string | null;
};

export default function ExibivelTokenPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketInfo | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/ticket/${encodeURIComponent(token)}`)
      .then(async (r) => {
        const data = await r.json();
        setTicket(r.ok ? data : { status: "INVALID" });
      })
      .catch(() => setTicket({ status: "INVALID" }))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-sonicYellow mb-4" />
        <p className="font-inter font-bold text-sonicYellow">Verificando Exibível...</p>
      </div>
    );
  }

  if (!ticket || ticket.status === "INVALID") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/20 p-6 rounded-full mb-6">
          <XCircle className="w-16 h-16 text-sonicRed" />
        </div>
        <h1 className="font-montserrat font-black text-2xl text-white mb-2">Exibível Inválido</h1>
        <p className="font-inter text-white/70">Este link não corresponde a nenhum exibível do evento.</p>
      </div>
    );
  }

  const isUsed = ticket.status === "USED";
  const isCancelled = ticket.status === "CANCELLED";

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="w-full max-w-[480px] flex flex-col items-center relative z-10">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center mb-8"
        >
          <p className="font-inter font-bold tracking-[0.2em] text-white/90 text-sm mb-1 uppercase">
            Aniversário do
          </p>
          <h1 className="font-montserrat font-black italic uppercase leading-none">
            <span className="text-3xl text-sonicYellow text-shadow-hero tracking-tight">
              LUIZ MAURÍCIO
            </span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="w-full bg-sonicBlueNavy border-4 border-sonicCyan rounded-[32px] p-8 shadow-solid-3d-cyan relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none checkerboard-bg"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-sonicGold text-sonicBlueNavy font-inter font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest mb-6">
              Exibível Oficial
            </div>

            <h2 className="font-montserrat font-black text-white text-4xl mb-2">{ticket.public_id}</h2>

            {ticket.guest_name && (
              <p className="font-inter text-white/80 font-bold text-lg mb-2">{ticket.guest_name}</p>
            )}

            <div className="flex items-center gap-2 text-sonicCyan font-inter font-bold mb-8">
              <Users size={18} />
              <span>
                Válido para {ticket.quantidade_pessoas}{" "}
                {ticket.quantidade_pessoas === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>

            {!isUsed && !isCancelled && (
              <div className="flex items-center justify-center gap-2 text-green-400 font-inter font-bold">
                <CheckCircle size={20} />
                <span>Válido — apresente o QR Code na portaria</span>
              </div>
            )}

            {isUsed && (
              <div className="flex flex-col items-center gap-2 text-sonicYellow font-inter font-bold text-center">
                <AlertCircle size={20} />
                <span>Entrada já registrada</span>
                {ticket.used_at && (
                  <span className="text-white/60 text-sm font-normal">
                    em {new Date(ticket.used_at).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            )}

            {isCancelled && (
              <div className="flex items-center justify-center gap-2 text-sonicRed font-inter font-bold">
                <XCircle size={20} />
                <span>Este exibível foi cancelado</span>
              </div>
            )}
          </div>
        </motion.div>

        <p className="mt-8 font-inter text-center text-white/50 text-xs px-8">
          Este exibível é único e pessoal. O QR Code impresso será validado digitalmente na entrada.
        </p>
      </div>
    </main>
  );
}
