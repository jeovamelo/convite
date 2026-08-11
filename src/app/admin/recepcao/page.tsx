"use client";

import { useEffect, useState } from "react";
import { Users, Ticket, CheckCircle, Camera, Clock, AlertTriangle, Link as LinkIcon, Check, Copy } from "lucide-react";
import Link from "next/link";

type Stats = {
  convidadosPrevistos: number;
  pessoasPresentes: number;
  exibiveisUtilizados: number;
  exibiveisDisponiveis: number;
  ultimasEntradas: any[];
};

const EMPTY_STATS: Stats = {
  convidadosPrevistos: 0,
  pessoasPresentes: 0,
  exibiveisUtilizados: 0,
  exibiveisDisponiveis: 0,
  ultimasEntradas: [],
};

export default function RecepcaoPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [receptionToken, setReceptionToken] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/recepcao/stats?t=" + Date.now());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setStats({
        convidadosPrevistos: data?.convidadosPrevistos ?? 0,
        pessoasPresentes: data?.pessoasPresentes ?? 0,
        exibiveisUtilizados: data?.exibiveisUtilizados ?? 0,
        exibiveisDisponiveis: data?.exibiveisDisponiveis ?? 0,
        ultimasEntradas: Array.isArray(data?.ultimasEntradas) ? data.ultimasEntradas : [],
      });
      setLoadError(null);
    } catch(e: any) {
      console.error("[RECEPCAO] Erro ao carregar stats:", e);
      setLoadError(e?.message || "Erro ao carregar dados");
      setStats((prev) => prev ?? EMPTY_STATS);
    }
  };

  useEffect(() => {
    loadStats();
    
    // Fetch site config to get reception_token
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((data) => {
        if (data?.reception_token) {
          setReceptionToken(data.reception_token);
        }
      })
      .catch(console.error);

    // Auto refresh every 5 seconds
    const interval = setInterval(loadStats, 5000);

    let channel: any = null;
    try {
      const { supabase } = require("@/lib/supabase");
      if (supabase && typeof supabase.channel === "function") {
        channel = supabase
          .channel('tickets_reception')
          .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
            console.log('[RECEPCAO] Realtime update received');
            loadStats();
          })
          .subscribe();
      }
    } catch (err) {
      console.warn("[RECEPCAO] Supabase Realtime não disponível:", err);
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
  }, []);

  const handleCopyPortariaLink = () => {
    const token = receptionToken || "sec_scan_portaria";
    const fullUrl = `${window.location.origin}/scanner/${token}`;
    navigator.clipboard?.writeText(fullUrl).catch(() => {});
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 4000);
  };

  // Loading state
  if (!stats) {
    return (
      <div className="p-10 flex flex-col items-center justify-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sonicBlueNavy"></div>
        <p className="text-gray-400 font-bold text-sm">Carregando dados da recepção...</p>
      </div>
    );
  }

  const s = stats;
  const progresso = s.convidadosPrevistos > 0 
    ? Math.min(100, Math.round((s.pessoasPresentes / s.convidadosPrevistos) * 100)) 
    : 0;

  const entradas = Array.isArray(s.ultimasEntradas) ? s.ultimasEntradas : [];

  return (
    <div className="max-w-4xl mx-auto pb-20 relative">

      {/* Toast Notification */}
      {copiedToast && (
        <div className="fixed top-6 right-6 z-50 bg-gray-900 text-white px-5 py-4 rounded-2xl shadow-2xl border border-green-500/50 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 max-w-sm">
          <div className="bg-green-500/20 p-2 rounded-xl text-green-400">
            <Check size={20} />
          </div>
          <div>
            <p className="font-bold text-sm text-green-400">Link da Portaria copiado!</p>
            <p className="text-xs text-gray-300 mt-0.5">Envie este link para o recepcionista/porteiro via WhatsApp.</p>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2 mb-6">
          <AlertTriangle size={18} />
          <span>Erro ao atualizar: {loadError}</span>
          <button onClick={loadStats} className="ml-auto bg-red-100 hover:bg-red-200 px-3 py-1 rounded-lg text-xs font-black transition-colors">
            Tentar Novamente
          </button>
        </div>
      )}
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black font-montserrat italic text-sonicBlueNavy uppercase tracking-wider">Recepção</h1>
        <p className="text-gray-500 font-inter font-bold text-lg mt-1">Aniversário do Luiz Maurício</p>
        
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-xl mx-auto">
          <Link href="/admin/recepcao/scanner" className="w-full sm:flex-1">
            <button className="w-full bg-green-500 hover:bg-green-600 text-white font-black text-lg py-4 px-4 rounded-2xl shadow-[0_6px_20px_-5px_rgba(34,197,94,0.4)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95">
              <Camera size={22} />
              INICIAR RECEPÇÃO
            </button>
          </Link>

          <button
            type="button"
            onClick={handleCopyPortariaLink}
            className="w-full sm:flex-1 bg-sonicBlueMain hover:bg-sonicBlueDark text-white font-black text-lg py-4 px-4 rounded-2xl shadow-[0_6px_20px_-5px_rgba(0,11,41,0.3)] transition-all flex items-center justify-center gap-2 uppercase tracking-wider active:scale-95"
          >
            {copiedToast ? <Check size={22} className="text-green-300" /> : <LinkIcon size={22} />}
            COPIAR LINK DA PORTARIA
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-100 text-sonicBlueMain p-3 rounded-full mb-3"><Users size={24} /></div>
          <h3 className="text-gray-400 font-bold text-xs uppercase mb-1">Pessoas Presentes</h3>
          <p className="text-4xl font-black text-gray-800">{s.pessoasPresentes ?? 0}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-gray-100 text-gray-500 p-3 rounded-full mb-3"><Users size={24} /></div>
          <h3 className="text-gray-400 font-bold text-xs uppercase mb-1">Convidados Previstos</h3>
          <p className="text-3xl font-bold text-gray-700">{s.convidadosPrevistos ?? 0}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-green-100 text-green-600 p-3 rounded-full mb-3"><CheckCircle size={24} /></div>
          <h3 className="text-gray-400 font-bold text-xs uppercase mb-1">Exibíveis Utilizados</h3>
          <p className="text-3xl font-bold text-gray-700">{s.exibiveisUtilizados ?? 0}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full mb-3"><Ticket size={24} /></div>
          <h3 className="text-gray-400 font-bold text-xs uppercase mb-1">Exibíveis Disponíveis</h3>
          <p className="text-3xl font-bold text-gray-700">{s.exibiveisDisponiveis ?? 0}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-100 text-center mb-10">
        <h3 className="text-gray-500 font-bold uppercase mb-3">Progresso de Presença</h3>
        <div className="flex items-center justify-between mb-2 text-sonicBlueNavy font-black text-xl">
          <span>{s.pessoasPresentes ?? 0} / {s.convidadosPrevistos ?? 0} pessoas</span>
          <span>{progresso}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div className="bg-sonicBlueMain h-6 rounded-full transition-all duration-500" style={{ width: `${progresso}%` }}></div>
        </div>
      </div>

      <div className="mt-12">
        <h3 className="text-gray-400 font-bold uppercase mb-4 flex items-center gap-2">
          <Clock size={18} /> Últimas Entradas
        </h3>
        {entradas.length === 0 ? (
          <p className="text-gray-400 font-bold text-center bg-white p-6 rounded-2xl border border-dashed">Ninguém entrou ainda.</p>
        ) : (
          <div className="space-y-3">
            {entradas.map((r: any, i: number) => (
              <div key={r?.id ?? i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="bg-green-100 text-green-700 text-xs font-black px-2 py-1 rounded">
                      {r?.used_at ? new Date(r.used_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                    <span className="font-black text-gray-800 text-lg">{r?.public_id ?? '---'}</span>
                  </div>
                  <p className="text-gray-500 font-bold text-sm">
                    {r?.guest_name || "Sem Nome"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-sonicBlueMain">{r?.quantidade_pessoas ?? 1}</p>
                  <p className="text-xs font-bold text-gray-400 uppercase">Pessoas</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
