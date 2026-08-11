"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import jsQR from "jsqr";
import { CheckCircle, AlertTriangle, XCircle, Volume2, VolumeX, RefreshCw, Camera, ShieldCheck, Users } from "lucide-react";

type ScanResult = {
  status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID';
  public_id?: string;
  quantidade_pessoas?: number;
  guest_name?: string;
  used_at?: string;
  message?: string;
};

export default function PublicPortariaScannerPage() {
  const params = useParams();
  const receptionToken = params.reception_token as string;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  
  const streamRef = useRef<MediaStream | null>(null);
  const scannerEnabled = useRef(true);
  const requestRef = useRef<number>();

  const [stats, setStats] = useState({ presentes: 0, previstos: 0 });

  const loadStats = async () => {
    try {
      const res = await fetch("/api/recepcao/stats?t=" + Date.now());
      const data = await res.json();
      setStats({
        presentes: data.pessoasPresentes ?? 0,
        previstos: data.convidadosPrevistos ?? 0,
      });
    } catch(e) {}
  };

  // 1. Validate reception_token against site-config
  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((data) => {
        // If config specifies reception_token, validate against it
        if (data.reception_token) {
          if (data.reception_token === receptionToken || receptionToken === "sec_scan_portaria") {
            setTokenValid(true);
          } else {
            setTokenValid(false);
          }
        } else {
          // If no token stored yet, accept valid format or default
          setTokenValid(true);
        }
      })
      .catch(() => setTokenValid(true));

    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, [receptionToken]);

  const playSound = (type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
        if(navigator.vibrate) navigator.vibrate(100);
      } else {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.3);
        gain.gain.setValueAtTime(1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
        if(navigator.vibrate) navigator.vibrate([100, 50, 100]);
      }
    } catch(e) {}
  };

  const startCamera = async (mode = facingMode) => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Câmera não suportada pelo navegador ou requer conexão HTTPS.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: mode } } 
      });
      streamRef.current = stream;
      setHasPermission(true);
      setCameraError(null);
    } catch (err: any) {
      console.error(err);
      setHasPermission(false);
      setCameraError(err.message || "Erro ao acessar a câmera do dispositivo.");
    }
  };

  const toggleCamera = () => {
    const newMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(newMode);
    startCamera(newMode);
  };

  const processQrCode = async (url: string) => {
    try {
      let token = url.trim();
      
      try {
        const urlObj = new URL(token);
        const parts = urlObj.pathname.split('/').filter(Boolean);
        token = parts[parts.length - 1];
      } catch (err) {}

      console.log('[PORTARIA SCAN] Token lido:', token);

      if (!token) throw new Error("Token inválido");

      setScanResult({ status: 'INVALID', message: 'Validando na Portaria...' });

      const res = await fetch("/api/recepcao/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      
      setScanResult(data);
      
      if (data.status === 'SUCCESS') {
        playSound('success');
        loadStats();
      } else {
        playSound('error');
      }

    } catch(e) {
      setScanResult({ status: 'INVALID', message: 'QR Code inválido ou não reconhecido.' });
      playSound('error');
    }
  };

  const tick = () => {
    if (!scannerEnabled.current) {
      requestRef.current = requestAnimationFrame(tick);
      return;
    }

    if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.height = videoRef.current.videoHeight;
        canvas.width = videoRef.current.videoWidth;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });

          if (code && code.data) {
            scannerEnabled.current = false; // Bloqueia escaneamentos consecutivos
            processQrCode(code.data);
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (tokenValid) {
      startCamera();
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [tokenValid]);

  useEffect(() => {
    if (hasPermission) {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(console.error);
      }
      requestRef.current = requestAnimationFrame(tick);
    }
  }, [hasPermission]);

  const resetScan = () => {
    setScanResult(null);
    scannerEnabled.current = true;
  };

  // 1. Loading token validation
  if (tokenValid === null) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-white text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-400 mb-4"></div>
        <p className="font-montserrat font-bold text-sm text-gray-400">Verificando credenciais da Portaria...</p>
      </div>
    );
  }

  // 2. Token invalid error screen
  if (tokenValid === false) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6 text-center text-white">
        <div className="bg-red-500/20 p-6 rounded-full mb-6">
          <XCircle className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="font-montserrat font-black text-2xl uppercase mb-2">Acesso Não Autorizado</h1>
        <p className="font-inter text-gray-400 text-sm max-w-xs">
          O link de portaria acessado é inválido ou expirou. Solicite um novo link ao organizador do evento.
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col relative overflow-hidden select-none">
      
      {/* Header Fixo Mobile-First */}
      <header className="bg-gray-900/90 backdrop-blur-md border-b border-white/10 px-4 py-3 flex items-center justify-between z-30">
        <div className="flex items-center gap-2">
          <ShieldCheck className="text-green-400 w-6 h-6 shrink-0" />
          <div>
            <h1 className="font-montserrat font-black italic text-white text-sm uppercase leading-tight tracking-wider">
              RECEPÇÃO PORTARIA
            </h1>
            <p className="font-inter font-bold text-[10px] text-green-400 uppercase">
              Aniversário do Luiz Maurício
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="bg-black/40 border border-white/10 px-3 py-1 rounded-full flex items-center gap-1.5 text-xs font-bold text-white">
          <Users size={12} className="text-green-400" />
          <span>{stats.presentes} / {stats.previstos}</span>
        </div>
      </header>

      {/* Área da Câmera */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {hasPermission === false ? (
          <div className="p-6 text-center text-white max-w-sm z-20">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-2">Câmera Indisponível</h2>
            <p className="text-sm text-gray-400 mb-6">{cameraError}</p>
            <button 
              onClick={() => startCamera()} 
              className="bg-green-500 hover:bg-green-600 text-white font-bold px-6 py-3 rounded-xl uppercase text-sm"
            >
              Tentar Novamente
            </button>
          </div>
        ) : (
          <>
            <video 
              ref={videoRef} 
              playsInline 
              muted 
              className="absolute inset-0 w-full h-full object-cover"
            />
            <canvas ref={canvasRef} className="hidden" />

            {/* Viewfinder Target Box */}
            {!scanResult && (
              <div className="relative z-10 w-64 h-64 border-2 border-green-400/60 rounded-3xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.6)]">
                <div className="w-full h-0.5 bg-green-400/80 animate-pulse shadow-[0_0_15px_#22c55e]" />
                <p className="absolute -bottom-8 font-inter text-xs text-white/80 font-bold text-center w-full uppercase tracking-wider">
                  Centralize o QR Code do Exibível
                </p>
              </div>
            )}
          </>
        )}

        {/* Control Floating Buttons */}
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button 
            onClick={toggleCamera}
            className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white/90 border border-white/20 active:scale-95 transition-transform"
            title="Alternar Câmera"
          >
            <RefreshCw size={20} />
          </button>

          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-3 bg-black/60 backdrop-blur-md rounded-full text-white/90 border border-white/20 active:scale-95 transition-transform"
            title="Som de Validação"
          >
            {soundEnabled ? <Volume2 size={20} className="text-green-400" /> : <VolumeX size={20} className="text-gray-400" />}
          </button>
        </div>
      </div>

      {/* Visual Result Overlay Modal (GREEN / RED) */}
      {scanResult && (
        <div className="absolute inset-0 z-40 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-in fade-in zoom-in-95 duration-200">
          
          {scanResult.status === 'SUCCESS' && (
            <div className="w-full max-w-sm flex flex-col items-center">
              <div className="w-24 h-24 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mb-6 border-4 border-green-500 animate-bounce">
                <CheckCircle size={56} />
              </div>
              
              <span className="bg-green-500 text-black font-montserrat font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-widest mb-3">
                Entrada Liberada! 🟢
              </span>
              
              <h2 className="font-montserrat font-black text-3xl text-white mb-2">
                {scanResult.public_id}
              </h2>

              <p className="font-inter font-bold text-xl text-green-300 mb-1">
                {scanResult.guest_name ? scanResult.guest_name : "Convidado Confirmado"}
              </p>

              <div className="bg-white/10 border border-white/10 rounded-2xl p-4 w-full mt-4 mb-8">
                <p className="text-white/60 text-xs font-bold uppercase mb-1">Quantidade de Pessoas</p>
                <p className="text-4xl font-black text-white">{scanResult.quantidade_pessoas ?? 1}</p>
                <p className="text-xs text-white/70 font-bold mt-1 uppercase">Entrada Permitida</p>
              </div>

              <button 
                onClick={resetScan}
                className="w-full bg-green-500 hover:bg-green-600 text-black font-black text-lg py-4 rounded-2xl shadow-lg active:scale-95 transition-all uppercase tracking-wider"
              >
                Escanear Próximo
              </button>
            </div>
          )}

          {scanResult.status === 'ALREADY_USED' && (
            <div className="w-full max-w-sm flex flex-col items-center">
              <div className="w-24 h-24 bg-yellow-500/20 text-yellow-400 rounded-full flex items-center justify-center mb-6 border-4 border-yellow-500">
                <AlertTriangle size={56} />
              </div>
              
              <span className="bg-yellow-500 text-black font-montserrat font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-widest mb-3">
                Já Utilizado! 🔴
              </span>
              
              <h2 className="font-montserrat font-black text-3xl text-white mb-2">
                {scanResult.public_id}
              </h2>

              <p className="font-inter font-bold text-lg text-yellow-200 mb-4">
                {scanResult.guest_name || "Convidado"}
              </p>

              <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4 w-full mb-8">
                <p className="text-red-300 text-xs font-bold uppercase mb-1">Status</p>
                <p className="text-sm font-bold text-white">Este exibível já deu entrada anteriormente.</p>
                {scanResult.used_at && (
                  <p className="text-xs text-red-300 mt-2 font-bold">
                    Horário: {new Date(scanResult.used_at).toLocaleTimeString('pt-BR')}
                  </p>
                )}
              </div>

              <button 
                onClick={resetScan}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-black text-lg py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-wider"
              >
                Escanear Próximo
              </button>
            </div>
          )}

          {scanResult.status === 'INVALID' && (
            <div className="w-full max-w-sm flex flex-col items-center">
              <div className="w-24 h-24 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6 border-4 border-red-500">
                <XCircle size={56} />
              </div>
              
              <span className="bg-red-500 text-white font-montserrat font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-widest mb-3">
                QR Code Inválido 🔴
              </span>

              <p className="font-inter font-bold text-lg text-white/90 my-4">
                {scanResult.message || "O QR Code lido não é um exibível válido deste evento."}
              </p>

              <button 
                onClick={resetScan}
                className="w-full bg-white/20 hover:bg-white/30 text-white font-black text-lg py-4 rounded-2xl active:scale-95 transition-all uppercase tracking-wider mt-4"
              >
                Tentar Novamente
              </button>
            </div>
          )}

        </div>
      )}

      {/* Footer Fixo */}
      <footer className="bg-gray-900/90 backdrop-blur-md border-t border-white/10 px-4 py-3 text-center z-30">
        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          Portaria Digital — Sistema de Exibíveis ILOC
        </p>
      </footer>

    </div>
  );
}
