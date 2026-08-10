"use client";

import { motion } from "framer-motion";
import { Calendar, Clock, MapPin, Navigation } from "lucide-react";
import Image from "next/image";

import { useEffect, useState } from "react";

export default function Home() {
  const [config, setConfig] = useState({
    day: "19/08/2026",
    time: "19 HORAS",
    place_name: "MAGIC BOOM",
    address_line1: "RUA CARLOS VASCONCELOS, 655",
    address_line2: "MEIRELES, FORTALEZA - CE"
  });

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.day) setConfig(data);
      })
      .catch(console.error);
  }, []);
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

        {/* FAIXA VERMELHA */}
        <motion.div 
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.2 }}
          className="bg-sonicRed px-6 py-2 mt-4 transform -skew-x-12 shadow-solid-3d-cyan border-2 border-white z-20"
        >
          <p className="font-inter font-black italic text-white tracking-wide text-lg transform skew-x-12">
            VEM COMEMORAR COMIGO!
          </p>
        </motion.div>

        {/* ESPAÇO PARA O ROSTO DO SONIC NO FUNDO */}
        <div className="h-[28vh] min-h-[220px] w-full shrink-0"></div>

        {/* CARDS DE INFORMAÇÃO */}
        <div className="w-full space-y-4 z-20">
          
          {/* Data */}
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
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
            transition={{ delay: 0.5 }}
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
            transition={{ delay: 0.6 }}
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
            transition={{ delay: 0.7 }}
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
      
      {/* Decorativos de Fundo (Anéis/Estrelas) */}
      {/* ... SVGs ou Imagens Absolutas Flutuantes podem vir aqui ... */}
    </main>
  );
}
