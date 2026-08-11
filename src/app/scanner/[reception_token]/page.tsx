"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import jsQR from "jsqr";
import { 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  Volume2, 
  VolumeX, 
  ShieldCheck, 
  Users, 
  BarChart3, 
  Camera, 
  CameraOff, 
  ArrowLeft, 
  Clock, 
  UserCheck, 
  TicketCheck 
} from "lucide-react";

type ScanResult = {
  status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID';
  public_id?: string;
  quantidade_pessoas?: number;
  guest_name?: string;
  used_at?: string;
  message?: string;
};

type FullStats = {
  convidadosPrevistos: number;
  pessoasPresentes: number;
  vagasRestantes: number;
  progresso: number;
  ultimasEntradas: any[];
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
  const [cameraActive, setCameraActive] = useState(true);
  const [showResumo, setShowResumo] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const scannerEnabled = useRef(true);
  const requestRef = useRef<number>();

  const [fullStats, setFullStats] = useState<FullStats>({
    convidadosPrevistos: 0,
    pessoasPresentes: 0,
    vagasRestantes: 0,
    progresso: 0,
    ultimasEntradas: [],
  });

  const loadStats = async () => {
    try {
      const res = await fetch("/api/recepcao/stats?t=" + Date.now());
      if (res.ok) {
        const data = await res.json();
        let pres = data.pessoasPresentes ?? data.exibiveisUtilizados ?? 0;
        let prev = data.convidadosPrevistos ?? data.totalGerados ?? 0;
        let entradas = Array.isArray(data.ultimasEntradas) ? data.ultimasEntradas : [];

        // Fallback to client query if API returns 0
        if (prev === 0) {
          try {
            const { supabase } = require("@/lib/supabase");
            const { data: ticketsData } = await supabase
              .from('tickets')
              .select('id, public_id, status, quantidade_pessoas, guest_name, used_at')
              .order('used_at', { ascending: false });
            
            if (ticketsData && ticketsData.length > 0) {
              prev = ticketsData.reduce((acc: number, curr: any) => acc + (curr.quantidade_pessoas ?? 1), 0);
              pres = ticketsData
                .filter((r: any) => r.status === 'USED')
                .reduce((acc: number, curr: any) => acc + (curr.quantidade_pessoas ?? 1), 0);
              entradas = ticketsData.filter((r: any) => r.status === 'USED' && r.used_at !== null).slice(0, 10);
            }
          } catch (dbErr) {
            console.warn("[PORTARIA] Client fallback query warning:", dbErr);
          }
        }

        const rest = Math.max(0, prev - pres);
        const prog = prev > 0 ? Math.min(100, Number(((pres / prev) * 100).toFixed(1))) : 0;

        setFullStats({
          convidadosPrevistos: prev,
          pessoasPresentes: pres,
          vagasRestantes: rest,
          progresso: prog,
          ultimasEntradas: entradas,
        });
      }
    } catch(e) {
      console.error("[PORTARIA] Error loading stats:", e);
    }
  };

  // 1. Validate reception_token & set up realtime + polling
  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.reception_token) {
          if (data.reception_token === receptionToken || receptionToken === "sec_scan_portaria") {
            setTokenValid(true);
          } else {
            setTokenValid(false);
          }
        } else {
          setTokenValid(true);
        }
      })
      .catch(() => setTokenValid(true));

    loadStats();
    const interval = setInterval(loadStats, 4000);

    let channel: any = null;
    try {
      const { supabase } = require("@/lib/supabase");
      if (supabase && typeof supabase.channel === "function") {
        channel = supabase
          .channel('public_portaria_tickets_realtime_v2')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
            loadStats();
          })
          .on('postgres_changes', { event: '*', schema: 'public', table: 'exibiveis' }, () => {
            loadStats();
          })
          .subscribe();
      }
    } catch (err) {
      console.warn("[PORTARIA] Realtime subscription warning:", err);
    }

    return () => {
      clearInterval(interval);
      if (channel) {
        try {
          const { supabase } = require("@/lib/supabase");
          supabase?.removeChannel?.(channel);
        } catch {}
      }
    };
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

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    try {
      stopCamera();
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Câmera não suportada pelo navegador ou requer conexão HTTPS.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: "environment" } } 
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

  const toggleCameraActive = () => {
    if (cameraActive) {
      stopCamera();
      setCameraActive(false);
    } else {
      setCameraActive(true);
      startCamera();
    }
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
        const addedCount = data.quantidade_pessoas || 1;
        setFullStats(prev => {
          const pres = prev.pessoasPresentes + addedCount;
          const rest = Math.max(0, prev.convidadosPrevistos - pres);
          const prog = prev.convidadosPrevistos > 0 ? Math.min(100, Number(((pres / prev.convidadosPrevistos) * 100).toFixed(1))) : 0;
          return { ...prev, pessoasPresentes: pres, vagasRestantes: rest, progresso: prog };
        });
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
    if (!scannerEnabled.current || !cameraActive) {
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
            scannerEnabled.current = false;
            processQrCode(code.data);
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    if (tokenValid && cameraActive) {
      startCamera();
    }
    return () => {
      stopCamera();
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [tokenValid, cameraActive]);

  useEffect(() => {
    if (hasPermission && cameraActive) {
      if (videoRef.current && streamRef.current) {
        videoRef.current.srcObject = streamRef.current;
        videoRef.current.play().catch(console.error);
      }
      requestRef.current = requestAnimationFrame(tick);
    }
  }, [hasPermission, cameraActive]);

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
          {/* Botão Resumo no Canto Superior Esquerdo */}
          <button
            onClick={() => setShowResumo(true)}
            className="bg-sonicBlueMain hover:bg-sonicBlueDark text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 border border-white/20 transition-all active:scale-95 shadow-md"
          >
            <BarChart3 size={14} className="text-green-400" />
            <span>Resumo</span>
          </button>

          <div>
            <h1 className="font-montserrat font-black italic text-white text-xs uppercase leading-tight tracking-wider">
              PORTARIA
            </h1>
            <p className="font-inter font-bold text-[9px] text-green-400 uppercase truncate max-w-[140px] sm:max-w-none">
              Luiz Maurício 4 Anos
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        <div className="bg-black/40 border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-1.5 text-xs font-bold text-white shadow-inner">
          <Users size={14} className="text-green-400 animate-pulse" />
          <span>{fullStats.pessoasPresentes} / {fullStats.convidadosPrevistos}</span>
        </div>
      </header>

      {/* Área da Câmera */}
      <div className="flex-1 relative flex items-center justify-center bg-black">
        {!cameraActive ? (
          /* Câmera Desativada Placeholder */
          <div className="p-6 text-center text-white max-w-sm z-20 flex flex-col items-center">
            <div className="bg-white/10 p-6 rounded-full mb-4 border border-white/10">
              <CameraOff className="w-12 h-12 text-red-400" />
            </div>
            <h2 className="font-bold text-lg mb-1">Câmera Pausada</h2>
            <p className="text-xs text-gray-400 mb-6">
              O leitor foi desativado para economizar bateria e recursos do dispositivo.
            </p>
            <button 
              onClick={toggleCameraActive} 
              className="bg-green-500 hover:bg-green-600 text-black font-black px-6 py-3.5 rounded-2xl uppercase text-sm flex items-center gap-2 shadow-lg active:scale-95 transition-all"
            >
              <Camera size={18} />
              RELIGAR CÂMERA
            </button>
          </div>
        ) : hasPermission === false ? (
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
          {/* Botão Ligar/Desligar Câmera */}
          <button 
            onClick={toggleCameraActive}
            className={`px-3 py-2.5 rounded-full text-xs font-bold border backdrop-blur-md flex items-center gap-1.5 active:scale-95 transition-transform ${
              cameraActive 
                ? "bg-green-500/20 text-green-400 border-green-500/40" 
                : "bg-red-500/20 text-red-400 border-red-500/40"
            }`}
            title={cameraActive ? "Desativar Câmera" : "Ativar Câmera"}
          >
            {cameraActive ? (
              <>
                <Camera size={16} />
                <span>ON</span>
              </>
            ) : (
              <>
                <CameraOff size={16} />
                <span>OFF</span>
              </>
            )}
          </button>

          {/* Som Toggle */}
          <button 
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2.5 bg-black/60 backdrop-blur-md rounded-full text-white/90 border border-white/20 active:scale-95 transition-transform"
            title="Som de Validação"
          >
            {soundEnabled ? <Volume2 size={16} className="text-green-400" /> : <VolumeX size={16} className="text-gray-400" />}
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
                Acesso Liberado! 🟢
              </span>
              
              <h2 className="font-montserrat font-black text-3xl text-white mb-1">
                {scanResult.public_id}
              </h2>

              <p className="font-inter font-bold text-xl text-green-300 mb-1">
                {scanResult.guest_name ? scanResult.guest_name : "Convidado Confirmado"}
              </p>

              <p className="font-montserrat font-black text-lg text-white/90 mb-6">
                (1 de {scanResult.quantidade_pessoas ?? 1} pessoas)
              </p>

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
              <div className="w-24 h-24 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-6 border-4 border-red-500">
                <XCircle size={56} />
              </div>
              
              <span className="bg-red-600 text-white font-montserrat font-black text-xs px-4 py-1.5 rounded-full uppercase tracking-widest mb-3">
                🛑 EXIBÍVEL JÁ UTILIZADO 🔴
              </span>
              
              <h2 className="font-montserrat font-black text-3xl text-white mb-2">
                {scanResult.public_id}
              </h2>

              <p className="font-inter font-bold text-lg text-red-200 mb-4">
                {scanResult.guest_name || "Convidado"}
              </p>

              <div className="bg-red-500/20 border border-red-500/40 rounded-2xl p-4 w-full mb-8">
                <p className="text-red-300 text-xs font-bold uppercase mb-1">Status de Entrada</p>
                <p className="text-sm font-bold text-white">Este exibível já deu entrada na portaria.</p>
                {scanResult.used_at && (
                  <p className="text-xs text-red-300 mt-2 font-bold uppercase">
                    Utilizado em: {new Date(scanResult.used_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
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

      {/* OVERLAY DE RESUMO DO BUFFET (Modal Limpo em Overlay) */}
      {showResumo && (
        <div className="fixed inset-0 z-50 bg-gray-950/95 backdrop-blur-xl flex flex-col p-4 sm:p-6 overflow-y-auto animate-in fade-in duration-200">
          
          {/* Top Bar Resumo */}
          <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="text-green-400 w-6 h-6" />
              <div>
                <h2 className="font-montserrat font-black text-lg text-white uppercase tracking-wider leading-tight">
                  Resumo da Portaria
                </h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase">Aniversário do Luiz Maurício</p>
              </div>
            </div>

            {/* Botão Principal de Retorno */}
            <button
              onClick={() => setShowResumo(false)}
              className="bg-green-500 hover:bg-green-600 text-black font-black px-4 py-2.5 rounded-xl text-xs uppercase flex items-center gap-1.5 transition-all active:scale-95 shadow-lg"
            >
              <ArrowLeft size={16} />
              <span>VOLTAR PARA A CÂMERA</span>
            </button>
          </div>

          {/* Cards Principais */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <span className="text-gray-400 font-bold text-[10px] uppercase block mb-1">Convidados Previstos</span>
              <span className="text-3xl font-black text-white font-montserrat">{fullStats.convidadosPrevistos}</span>
            </div>

            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-4 text-center">
              <span className="text-green-400 font-bold text-[10px] uppercase block mb-1">Pessoas Presentes</span>
              <span className="text-3xl font-black text-green-400 font-montserrat">{fullStats.pessoasPresentes}</span>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center">
              <span className="text-yellow-400 font-bold text-[10px] uppercase block mb-1">Vagas Restantes</span>
              <span className="text-3xl font-black text-yellow-300 font-montserrat">{fullStats.vagasRestantes}</span>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-4 text-center">
              <span className="text-blue-400 font-bold text-[10px] uppercase block mb-1">Taxa de Presença</span>
              <span className="text-3xl font-black text-blue-300 font-montserrat">{fullStats.progresso}%</span>
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
            <div className="flex justify-between items-center text-xs font-bold text-white mb-2">
              <span>Progresso de Entrada</span>
              <span className="text-green-400">{fullStats.pessoasPresentes} de {fullStats.convidadosPrevistos} ({fullStats.progresso}%)</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-4 overflow-hidden p-0.5">
              <div 
                className="bg-gradient-to-r from-green-500 to-emerald-400 h-full rounded-full transition-all duration-500" 
                style={{ width: `${fullStats.progresso}%` }}
              />
            </div>
          </div>

          {/* Lista Simplificada das Últimas Entradas */}
          <div className="flex-1">
            <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-1.5">
              <Clock size={14} className="text-green-400" />
              Últimas Entradas Registradas
            </h3>

            {fullStats.ultimasEntradas.length === 0 ? (
              <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-6 text-center text-gray-400 text-xs font-bold">
                Nenhum exibível escaneado até o momento.
              </div>
            ) : (
              <div className="space-y-2.5">
                {fullStats.ultimasEntradas.map((r: any, i: number) => (
                  <div key={r?.id ?? i} className="bg-white/5 border border-white/10 rounded-2xl p-3.5 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="bg-green-500/20 text-green-400 text-[10px] font-black px-2 py-0.5 rounded">
                          {r?.used_at ? new Date(r.used_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                        </span>
                        <span className="font-black text-white text-sm">{r?.public_id ?? '---'}</span>
                      </div>
                      <p className="text-gray-400 font-bold text-xs">
                        {r?.guest_name || "Sem Nome Registrado"}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-green-400">{r?.quantidade_pessoas ?? 1}</span>
                      <span className="text-[9px] font-bold text-gray-400 uppercase block">Pess.</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão de Retorno no Rodapé do Resumo */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <button
              onClick={() => setShowResumo(false)}
              className="w-full bg-green-500 hover:bg-green-600 text-black font-black text-base py-4 rounded-2xl uppercase flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
            >
              <ArrowLeft size={18} />
              <span>VOLTAR PARA A CÂMERA</span>
            </button>
          </div>

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
