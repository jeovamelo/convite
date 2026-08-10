"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { CheckCircle, AlertCircle, XCircle, Loader2, Users, Calendar, Clock, MapPin } from "lucide-react";
import { motion } from "framer-motion";

type TicketInfo = {
  status: "AVAILABLE" | "USED" | "CANCELLED" | "INVALID";
  public_id?: string;
  quantidade_pessoas?: number;
  guest_name?: string;
  used_at?: string | null;
};

type EventConfig = {
  day: string;
  time: string;
  place_name: string;
  address_line1: string;
  address_line2: string;
};

export default function DynamicTicketInvitationPage() {
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [ticket, setTicket] = useState<TicketInfo | null>(null);
  const [config, setConfig] = useState<EventConfig>({
    day: "19/08/2026",
    time: "19 HORAS",
    place_name: "MAGIC BOOM",
    address_line1: "RUA CARLOS VASCONCELOS, 655",
    address_line2: "MEIRELES, FORTALEZA - CE",
  });

  useEffect(() => {
    // Load event site config
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.day) setConfig(data);
      })
      .catch(console.error);

    // Load ticket info
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
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-12 h-12 animate-spin text-sonicYellow mb-4" />
        <p className="font-inter font-bold text-sonicYellow">Verificando Convite Especial...</p>
      </div>
    );
  }

  if (!ticket || ticket.status === "INVALID") {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/20 p-6 rounded-full mb-6">
          <XCircle className="w-16 h-16 text-sonicRed" />
        </div>
        <h1 className="font-montserrat font-black text-2xl text-white mb-2 uppercase">Convite Inválido</h1>
        <p className="font-inter text-white/70">Este link não corresponde a nenhum exibível ou convite ativo do evento.</p>
      </div>
    );
  }

  const isUsed = ticket.status === "USED";
  const isCancelled = ticket.status === "CANCELLED";

  return (
    <main 
      className="min-h-[100dvh] pt-[env(safe-area-inset-top)] pb-[calc(env(safe-area-inset-bottom)+2rem)] flex flex-col items-center justify-start overflow-x-hidden relative w-full bg-cover bg-center bg-fixed bg-no-repeat"
      style={{ backgroundImage: "url('/api/bg')" }}
    >
      {/* Container Principal Mobile */}
      <div className="w-full max-w-[500px] px-4 md:px-6 pt-10 flex flex-col items-center relative z-10 mx-auto">
        
        {/* SELO 4 ANOS (Flutuante) */}
        <motion.div 
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 10 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.5 }}
          className="absolute top-8 right-2 z-30 flex items-center justify-center w-20 h-20 bg-sonicBlueDark rounded-full border-[3px] border-sonicGold shadow-glow-gold"
        >
          <div className="text-center font-montserrat leading-none transform -rotate-6">
            <span className="block text-3xl font-black text-sonicYellow">4</span>
            <span className="block text-[10px] font-bold text-white tracking-widest bg-sonicRed px-1 rounded">ANOS</span>
          </div>
        </motion.div>

        {/* CABEÇALHO (LOGO TYPOGRAPHY) */}
        <motion.div 
          initial={{ y: -50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="text-center w-full z-20 flex flex-col items-center justify-center mt-6 px-2"
        >
          <div className="flex flex-col items-center transform -skew-x-6 w-full">
            <span 
              className="text-white font-montserrat font-black italic tracking-wider leading-none text-[clamp(1.1rem,5vw,1.5rem)]"
              style={{ 
                textShadow: `
                  -2px -2px 0 #000B29, 2px -2px 0 #000B29, -2px 2px 0 #000B29, 2px 2px 0 #000B29,
                  0px 4px 0px #000B29, 0px 4px 10px rgba(0,0,0,0.5)
                `
              }}
            >
              ANIVERSÁRIO DO
            </span>
            <span 
              className="text-[#FFE800] font-montserrat font-black italic tracking-tight leading-[0.85] -mt-1 text-[clamp(3.8rem,18vw,6rem)]"
              style={{ 
                textShadow: `
                  -3px -3px 0 #000B29, 3px -3px 0 #000B29, -3px 3px 0 #000B29, 3px 3px 0 #000B29,
                  -3px 0px 0 #000B29, 3px 0px 0 #000B29, 0px -3px 0 #000B29, 0px 3px 0 #000B29,
                  0px 6px 0px #000B29, 0px 6px 15px rgba(0,0,0,0.6)
                `
              }}
            >
              LUIZ
            </span>
            <span 
              className="text-white font-montserrat font-black italic tracking-tighter leading-[0.8] -mt-1 text-[clamp(2.6rem,12vw,4.5rem)]"
              style={{ 
                textShadow: `
                  -3px -3px 0 #000B29, 3px -3px 0 #000B29, -3px 3px 0 #000B29, 3px 3px 0 #000B29,
                  -3px 0px 0 #000B29, 3px 0px 0 #000B29, 0px -3px 0 #000B29, 0px 3px 0 #000B29,
                  0px 5px 0px #000B29, 0px 5px 12px rgba(0,0,0,0.5)
                `
              }}
            >
              MAURÍCIO
            </span>
          </div>
        </motion.div>

        {/* TICKET DIGITAL DO CONVIDADO */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 150, delay: 0.3 }}
          className="w-full bg-sonicBlueNavy/95 border-4 border-sonicCyan rounded-[32px] p-6 shadow-solid-3d-cyan relative overflow-hidden mt-6 z-20"
        >
          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-sonicGold text-sonicBlueNavy font-inter font-black px-4 py-1 rounded-full text-[10px] uppercase tracking-widest mb-4">
              Exibível Oficial
            </div>

            <h2 className="font-montserrat font-black text-white text-3xl mb-1">{ticket.public_id}</h2>

            {ticket.guest_name && (
              <p className="font-inter text-white font-black text-xl mb-1 text-center">{ticket.guest_name}</p>
            )}

            <div className="flex items-center gap-2 text-sonicCyan font-inter font-bold text-sm mb-4">
              <Users size={16} />
              <span>
                Válido para {ticket.quantidade_pessoas}{" "}
                {ticket.quantidade_pessoas === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>

            {!isUsed && !isCancelled && (
              <div className="flex items-center justify-center gap-2 bg-green-500/20 text-green-400 font-inter font-bold py-2 px-4 rounded-xl border border-green-500/30 text-sm">
                <CheckCircle size={18} />
                <span>Válido — apresente o QR Code</span>
              </div>
            )}

            {isUsed && (
              <div className="flex flex-col items-center gap-1 bg-yellow-500/20 text-sonicYellow font-inter font-bold py-2 px-4 rounded-xl border border-sonicYellow/30 text-sm text-center">
                <div className="flex items-center gap-1.5 justify-center">
                  <AlertCircle size={18} />
                  <span>Entrada já registrada</span>
                </div>
                {ticket.used_at && (
                  <span className="text-white/60 text-xs font-normal">
                    em {new Date(ticket.used_at).toLocaleString("pt-BR")}
                  </span>
                )}
              </div>
            )}

            {isCancelled && (
              <div className="flex items-center justify-center gap-2 bg-red-500/20 text-sonicRed font-inter font-bold py-2 px-4 rounded-xl border border-sonicRed/30 text-sm">
                <XCircle size={18} />
                <span>Este exibível foi cancelado</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* FAIXA VERMELHA */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-sonicRed px-6 py-2 mt-6 transform -skew-x-12 shadow-solid-3d-cyan border-2 border-white z-20"
        >
          <p className="font-inter font-black italic text-white tracking-wide text-lg transform skew-x-12">
            VEM COMEMORAR COMIGO!
          </p>
        </motion.div>

        {/* ESPAÇO PARA O ROSTO DO SONIC NO FUNDO */}
        <div className="h-[12vh] min-h-[100px] w-full shrink-0"></div>

        {/* CARDS DE INFORMAÇÃO */}
        <div className="w-full space-y-4 z-20">
          
          {/* Data */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-sonicBlueNavy/90 backdrop-blur-sm border-2 border-sonicCyan rounded-3xl p-4 flex items-center shadow-solid-3d"
          >
            <div className="bg-sonicBlueMain text-sonicYellow w-12 h-12 rounded-full flex items-center justify-center mr-4 border-2 border-sonicGold shrink-0">
              <Calendar size={24} />
            </div>
            <div>
              <p className="font-inter font-bold text-white/70 text-xs uppercase tracking-wider">DIA</p>
              <p className="font-montserrat font-black text-sonicYellow text-xl">{config.day}</p>
            </div>
          </motion.div>

          {/* Hora */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-sonicBlueNavy/90 backdrop-blur-sm border-2 border-sonicCyan rounded-3xl p-4 flex items-center shadow-solid-3d"
          >
            <div className="bg-sonicBlueMain text-sonicYellow w-12 h-12 rounded-full flex items-center justify-center mr-4 border-2 border-sonicGold shrink-0">
              <Clock size={24} />
            </div>
            <div>
              <p className="font-inter font-bold text-white/70 text-xs uppercase tracking-wider">ÀS</p>
              <p className="font-montserrat font-black text-sonicYellow text-xl">{config.time}</p>
            </div>
          </motion.div>

          {/* Local */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-sonicBlueNavy/90 backdrop-blur-sm border-2 border-sonicCyan rounded-3xl p-4 flex items-center shadow-solid-3d"
          >
            <div className="bg-sonicBlueMain text-sonicYellow w-12 h-12 rounded-full flex items-center justify-center mr-4 border-2 border-sonicGold shrink-0">
              <MapPin size={24} />
            </div>
            <div>
              <p className="font-inter font-bold text-white/70 text-xs uppercase tracking-wider">NO BUFFET</p>
              <p className="font-montserrat font-black text-white text-xl">{config.place_name}</p>
            </div>
          </motion.div>

          {/* Endereço e Google Maps */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col w-full"
          >
            {/* Card de Endereço */}
            <div className="bg-sonicBlueNavy/90 backdrop-blur-sm border-2 border-b-0 border-sonicCyan rounded-t-3xl p-5 text-center shadow-solid-3d w-full">
              <p className="font-inter font-bold text-white text-[clamp(0.8rem,4vw,1rem)] mb-1 leading-snug">
                {config.address_line1}
              </p>
              <p className="font-montserrat font-black text-sonicYellow text-[clamp(1rem,5vw,1.125rem)] leading-snug">
                {config.address_line2}
              </p>
            </div>
            
            {/* Botão Google Maps colado no Endereço */}
            <a 
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${config.address_line1}, ${config.address_line2}`)}`} 
              target="_blank" 
              rel="noreferrer" 
              className="block w-full"
              aria-label="Abrir endereço no Google Maps"
            >
              <div className="w-full bg-white text-sonicBlueMain border-b-[4px] border-gray-300 rounded-b-3xl p-4 flex items-center justify-center gap-3 font-inter font-black text-[clamp(1rem,5vw,1.125rem)] min-h-[56px] active:translate-y-1 active:border-b-0 transition-all">
                <MapPin size={24} />
                ABRIR NO GOOGLE MAPS
              </div>
            </a>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
