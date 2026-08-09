"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { X, CheckCircle, AlertTriangle, XCircle, Volume2, VolumeX, ArrowLeft, Camera } from "lucide-react";
import Link from "next/link";

type ScanResult = {
  status: 'SUCCESS' | 'ALREADY_USED' | 'INVALID';
  public_id?: string;
  quantidade_pessoas?: number;
  guest_name?: string;
  used_at?: string;
  message?: string;
};

export default function ScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  
  // Stats overlay
  const [stats, setStats] = useState({ presentes: 0, utilizados: 0, total: 0 });

  const scannerEnabled = useRef(true);
  const requestRef = useRef<number>();

  const loadStats = async () => {
    try {
      const res = await fetch("/api/recepcao/stats");
      const data = await res.json();
      setStats({
        presentes: data.pessoasPresentes,
        utilizados: data.exibiveisUtilizados,
        total: data.exibiveisUtilizados + data.exibiveisDisponiveis
      });
    } catch(e) {}
  };

  useEffect(() => {
    loadStats();
  }, [scanResult]); // reload stats when a scan completes

  const playSound = (type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      // Usar AudioContext para sons curtos e confiáveis em mobile (ou Audio simples)
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
    } catch(e) { console.error("Audio error", e) }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("API de câmera não suportada ou bloqueada por falta de HTTPS.");
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
      setCameraError(err.message || "Erro desconhecido ao acessar a câmera.");
    }
  };

  const processQrCode = async (url: string) => {
    try {
      // Extract token from URL
      // URL Format: https://festa.exemplo.com/e/TOKEN
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');
      const token = parts[parts.length - 1];

      if (!token) throw new Error("Invalid URL");

      setScanResult({ status: 'INVALID', message: 'Validando...' });

      const res = await fetch("/api/recepcao/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token })
      });
      const data = await res.json();
      
      setScanResult(data);
      
      if (data.status === 'SUCCESS') {
        playSound('success');
      } else {
        playSound('error');
      }

    } catch(e) {
      setScanResult({ status: 'INVALID', message: 'QR Code não pertence a este sistema.' });
      playSound('error');
    }
  }

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
          
          if (code) {
            scannerEnabled.current = false;
            processQrCode(code.data);
          }
        }
      }
    }
    requestRef.current = requestAnimationFrame(tick);
  };

  useEffect(() => {
    // Only ask on explicit start or just try immediately?
    // Modern browsers require interaction, but we can try.
  }, []);

  useEffect(() => {
    if (hasPermission && streamRef.current && videoRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.setAttribute("playsinline", "true");
      videoRef.current.play().catch(e => console.error("Play error:", e));
      requestAnimationFrame(tick);
    }
  }, [hasPermission]);

  const handleStart = () => {
    startCamera();
  };

  const handleNext = () => {
    setScanResult(null);
    // Add a tiny delay before re-enabling to avoid double scan immediately
    setTimeout(() => {
      scannerEnabled.current = true;
    }, 500);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  if (hasPermission === null || hasPermission === false) {
    return (
      <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center">
        <Camera size={64} className="text-gray-400 mb-6" />
        <h2 className="text-2xl font-black text-white mb-4">Acesso à Câmera</h2>
        <p className="text-gray-400 mb-6 max-w-sm">
          Precisamos acessar a câmera do seu dispositivo para ler os exibíveis dos convidados.
        </p>

        {cameraError && (
          <div className="bg-red-500/20 border border-red-500 text-red-200 px-4 py-3 rounded-lg mb-6 max-w-sm w-full text-sm font-bold">
            <AlertTriangle size={20} className="mx-auto mb-2 text-red-500" />
            <p>{cameraError}</p>
            {cameraError.includes("HTTPS") && (
              <p className="mt-2 text-xs text-red-300 font-normal">
                Para testar no celular Android via Wi-Fi sem HTTPS, digite no navegador: 
                <br/> <code className="bg-black/50 px-1 py-0.5 rounded text-white block mt-1 break-all">chrome://flags/#unsafely-treat-insecure-origin-as-secure</code>
                <br/> adicione seu IP lá e reinicie o navegador.
              </p>
            )}
          </div>
        )}

        <button onClick={handleStart} className="w-full max-w-sm bg-green-500 hover:bg-green-600 text-white font-black text-xl py-5 px-6 rounded-2xl shadow-lg transition-all active:scale-95">
          PERMITIR CÂMERA
        </button>
        <Link href="/admin/recepcao">
          <button className="mt-6 text-gray-500 font-bold hover:text-white transition-colors">Voltar</button>
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      
      {/* HEADER OVERLAY */}
      <div className="absolute top-0 left-0 right-0 p-4 z-20 flex justify-between items-start bg-gradient-to-b from-black/80 to-transparent">
        <div>
          <h1 className="text-white font-black text-xl italic uppercase font-montserrat">Recepção</h1>
          <div className="flex gap-4 mt-2">
            <div className="bg-black/50 backdrop-blur rounded-lg px-3 py-1 border border-white/10">
              <span className="text-gray-400 text-[10px] font-bold block uppercase">Presentes</span>
              <span className="text-white font-black text-lg">{stats.presentes}</span>
            </div>
            <div className="bg-black/50 backdrop-blur rounded-lg px-3 py-1 border border-white/10">
              <span className="text-gray-400 text-[10px] font-bold block uppercase">Exibíveis</span>
              <span className="text-white font-black text-lg">{stats.utilizados} / {stats.total}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setSoundEnabled(!soundEnabled)} className="bg-black/50 backdrop-blur p-3 rounded-full text-white border border-white/10">
            {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
          </button>
          <Link href="/admin/recepcao" onClick={stopCamera}>
            <button className="bg-red-500/80 backdrop-blur p-3 rounded-full text-white border border-red-500">
              <X size={20} />
            </button>
          </Link>
        </div>
      </div>

      {/* CAMERA VIEWPORT */}
      <div className="relative flex-1 bg-black overflow-hidden flex items-center justify-center">
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className="absolute inset-0 w-full h-full object-cover z-0" 
        />
        <canvas ref={canvasRef} className="hidden" />
        
        {/* SCANNER GUIDES */}
        {!scanResult && (
          <div className="relative z-10 w-64 h-64 sm:w-80 sm:h-80">
            <div className="absolute inset-0 border-2 border-white/30 rounded-3xl"></div>
            
            {/* Corners */}
            <div className="absolute top-0 left-0 w-12 h-12 border-t-4 border-l-4 border-sonicCyan rounded-tl-3xl"></div>
            <div className="absolute top-0 right-0 w-12 h-12 border-t-4 border-r-4 border-sonicCyan rounded-tr-3xl"></div>
            <div className="absolute bottom-0 left-0 w-12 h-12 border-b-4 border-l-4 border-sonicCyan rounded-bl-3xl"></div>
            <div className="absolute bottom-0 right-0 w-12 h-12 border-b-4 border-r-4 border-sonicCyan rounded-br-3xl"></div>
            
            {/* Scan animation line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-sonicCyan shadow-[0_0_15px_5px_rgba(29,165,207,0.5)] animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>
        )}
        
        {!scanResult && (
          <div className="absolute bottom-16 left-0 right-0 text-center z-10">
            <p className="bg-black/60 text-white px-6 py-2 rounded-full inline-block font-bold text-sm tracking-widest backdrop-blur border border-white/10">
              APONTE A CÂMERA PARA O QR CODE
            </p>
          </div>
        )}
      </div>

      {/* RESULTS MODAL (FULLSCREEN) */}
      {scanResult && (
        <div className={`absolute inset-0 z-30 flex flex-col justify-between p-6
          ${scanResult.status === 'SUCCESS' ? 'bg-green-600' : 
            scanResult.status === 'ALREADY_USED' ? 'bg-red-600' : 
            scanResult.status === 'INVALID' && scanResult.message === 'Validando...' ? 'bg-blue-600' : 'bg-red-600'}`}>
          
          <div className="flex-1 flex flex-col items-center justify-center text-center mt-10">
            
            {scanResult.message === 'Validando...' && (
              <>
                <div className="animate-spin rounded-full h-20 w-20 border-t-4 border-b-4 border-white mb-6"></div>
                <h2 className="text-3xl font-black text-white italic">VALIDANDO...</h2>
              </>
            )}

            {scanResult.status === 'SUCCESS' && (
              <>
                <CheckCircle size={80} className="text-white mb-6" />
                <h2 className="text-4xl font-black text-white uppercase tracking-wider mb-8">Entrada Registrada</h2>
                
                <div className="bg-black/20 w-full rounded-3xl p-6 backdrop-blur">
                  <p className="text-white/80 font-bold text-sm uppercase mb-1">Exibível</p>
                  <p className="text-5xl font-black text-white mb-6 font-montserrat">{scanResult.public_id}</p>
                  
                  <div className="inline-block bg-white text-green-700 px-6 py-2 rounded-full font-black text-3xl mb-6 shadow-lg">
                    {scanResult.quantidade_pessoas} {scanResult.quantidade_pessoas === 1 ? 'PESSOA' : 'PESSOAS'}
                  </div>
                  
                  {scanResult.guest_name && (
                    <p className="text-2xl font-bold text-white mb-2">{scanResult.guest_name}</p>
                  )}
                  <p className="text-white/60 font-bold text-sm">
                    Entrada às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </>
            )}

            {scanResult.status === 'ALREADY_USED' && (
              <>
                <AlertTriangle size={80} className="text-white mb-6" />
                <h2 className="text-4xl font-black text-white uppercase tracking-wider mb-8">Exibível Já Utilizado</h2>
                
                <div className="bg-black/20 w-full rounded-3xl p-6 backdrop-blur">
                  <p className="text-white/80 font-bold text-sm uppercase mb-1">Exibível</p>
                  <p className="text-5xl font-black text-white mb-6 font-montserrat">{scanResult.public_id}</p>
                  
                  {scanResult.guest_name && (
                    <p className="text-2xl font-bold text-white mb-4">{scanResult.guest_name}</p>
                  )}
                  
                  <div className="bg-red-900/50 p-4 rounded-xl border border-red-500/30">
                    <p className="text-red-200 font-bold text-sm uppercase mb-1">Utilizado Anteriormente Em</p>
                    <p className="text-white font-black text-xl">
                      {scanResult.used_at 
                        ? new Date(scanResult.used_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).replace(',', ' às') 
                        : 'Data desconhecida'}
                    </p>
                  </div>
                </div>
              </>
            )}

            {scanResult.status === 'INVALID' && scanResult.message !== 'Validando...' && (
              <>
                <XCircle size={80} className="text-white mb-6" />
                <h2 className="text-4xl font-black text-white uppercase tracking-wider mb-4">QR Code Inválido</h2>
                <p className="text-xl text-white/80 font-bold mb-8 max-w-xs mx-auto">
                  {scanResult.message || "Este exibível não foi encontrado no sistema."}
                </p>
              </>
            )}

          </div>

          {scanResult.message !== 'Validando...' && (
            <button 
              onClick={handleNext}
              className="w-full bg-white text-black font-black text-3xl py-8 rounded-3xl shadow-2xl active:scale-95 transition-transform"
            >
              OK — LER PRÓXIMO
            </button>
          )}

        </div>
      )}

      {/* Global CSS for scanning animation */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan {
          0% { transform: translateY(0); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(320px); opacity: 0; }
        }
      `}} />
    </div>
  );
}
