"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { CheckCircle, AlertCircle, QrCode } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { motion } from "framer-motion";

export default function ExibivelPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const code = params.code as string;
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [isValid, setIsValid] = useState<boolean | null>(null);

  useEffect(() => {
    // In a real application, we would hit the Supabase backend here
    // to verify if `code` and `token` match and are VALID (not used).
    const validateToken = async () => {
      setIsLoading(true);
      await new Promise(r => setTimeout(r, 1000)); // Simulate API call
      
      if (token) {
        setIsValid(true);
      } else {
        setIsValid(false);
      }
      setIsLoading(false);
    };

    validateToken();
  }, [code, token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-sonicYellow border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-inter font-bold text-sonicYellow">Carregando Exibível...</p>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/20 p-6 rounded-full mb-6">
          <AlertCircle className="w-16 h-16 text-sonicRed" />
        </div>
        <h1 className="font-montserrat font-black text-2xl text-white mb-2">Exibível Inválido</h1>
        <p className="font-inter text-white/70">O link acessado não é válido ou já foi utilizado.</p>
      </div>
    );
  }

  // A URL que a portaria vai escanear para validar
  const validationUrl = `https://festa.exemplo.com/admin/portaria?code=${code}&token=${token}`;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Container Principal Mobile (max 480px) */}
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

        {/* Card do Ingresso VIP */}
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 150 }}
          className="w-full bg-sonicBlueNavy border-4 border-sonicCyan rounded-[32px] p-8 shadow-solid-3d-cyan relative overflow-hidden"
        >
          {/* Decoração interna do card */}
          <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none checkerboard-bg"></div>

          <div className="relative z-10 flex flex-col items-center">
            <div className="bg-sonicGold text-sonicBlueNavy font-inter font-black px-4 py-1 rounded-full text-xs uppercase tracking-widest mb-6">
              Exibível Oficial
            </div>
            
            <h2 className="font-montserrat font-black text-white text-3xl mb-1">{code}</h2>
            <p className="font-inter text-sonicCyan font-bold text-sm mb-8">Apresente na portaria</p>
            
            {/* O QR Code com borda branca para alto contraste */}
            <div className="bg-white p-4 rounded-2xl shadow-xl">
              <QRCodeSVG 
                value={validationUrl} 
                size={220} 
                level={"H"}
                includeMargin={false}
              />
            </div>
            
            <div className="mt-8 flex items-center justify-center gap-2 text-green-400 font-inter font-bold">
              <CheckCircle size={20} />
              <span>Válido e Autenticado</span>
            </div>
          </div>
        </motion.div>

        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 font-inter text-center text-white/50 text-xs px-8"
        >
          Este exibível é único e pessoal. O QR Code será validado digitalmente na entrada.
        </motion.p>
      </div>

    </main>
  );
}
