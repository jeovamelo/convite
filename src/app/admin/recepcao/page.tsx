"use client";

import { useEffect, useState } from "react";
import { Users, Ticket, CheckCircle, Camera, Clock } from "lucide-react";
import Link from "next/link";

type Stats = {
  convidadosPrevistos: number;
  pessoasPresentes: number;
  exibiveisUtilizados: number;
  exibiveisDisponiveis: number;
  ultimasEntradas: any[];
};

export default function RecepcaoPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/recepcao/stats");
      const data = await res.json();
      setStats(data);
    } catch(e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto refresh every 5 seconds
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  if (!stats) return <div className="p-10 flex justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sonicBlueNavy"></div></div>;

  const progresso = stats.convidadosPrevistos > 0 
    ? Math.min(100, Math.round((stats.pessoasPresentes / stats.convidadosPrevistos) * 100)) 
    : 0;

  return (
    <div className="max-w-4xl mx-auto pb-20">
      
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black font-montserrat italic text-sonicBlueNavy uppercase tracking-wider">Recepção</h1>
        <p className="text-gray-500 font-inter font-bold text-lg mt-1">Aniversário do Luiz Maurício</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-blue-100 text-sonicBlueMain p-3 rounded-full mb-3"><Users size={24} /></div>
          <h3 className="text-gray-400 font-bold text-xs uppercase mb-1">Pessoas Presentes</h3>
          <p className="text-4xl font-black text-gray-800">{stats.pessoasPresentes}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-gray-100 text-gray-500 p-3 rounded-full mb-3"><Users size={24} /></div>
          <h3 className="text-gray-400 font-bold text-xs uppercase mb-1">Convidados Previstos</h3>
          <p className="text-3xl font-bold text-gray-700">{stats.convidadosPrevistos}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-green-100 text-green-600 p-3 rounded-full mb-3"><CheckCircle size={24} /></div>
          <h3 className="text-gray-400 font-bold text-xs uppercase mb-1">Exibíveis Utilizados</h3>
          <p className="text-3xl font-bold text-gray-700">{stats.exibiveisUtilizados}</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-yellow-100 text-yellow-600 p-3 rounded-full mb-3"><Ticket size={24} /></div>
          <h3 className="text-gray-400 font-bold text-xs uppercase mb-1">Exibíveis Disponíveis</h3>
          <p className="text-3xl font-bold text-gray-700">{stats.exibiveisDisponiveis}</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-8 shadow-md border border-gray-100 text-center mb-10">
        <h3 className="text-gray-500 font-bold uppercase mb-3">Progresso de Presença</h3>
        <div className="flex items-center justify-between mb-2 text-sonicBlueNavy font-black text-xl">
          <span>{stats.pessoasPresentes} / {stats.convidadosPrevistos} pessoas</span>
          <span>{progresso}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div className="bg-sonicBlueMain h-6 rounded-full transition-all duration-500" style={{ width: `${progresso}%` }}></div>
        </div>
      </div>

      <Link href="/admin/recepcao/scanner" className="block">
        <button className="w-full bg-green-500 hover:bg-green-600 text-white font-black text-2xl py-6 px-4 rounded-3xl shadow-[0_10px_25px_-5px_rgba(34,197,94,0.5)] transition-all flex items-center justify-center gap-4 uppercase tracking-widest active:scale-95">
          <Camera size={36} />
          INICIAR RECEPÇÃO
        </button>
      </Link>

      <div className="mt-12">
        <h3 className="text-gray-400 font-bold uppercase mb-4 flex items-center gap-2">
          <Clock size={18} /> Últimas Entradas
        </h3>
        {stats.ultimasEntradas.length === 0 ? (
          <p className="text-gray-400 font-bold text-center bg-white p-6 rounded-2xl border border-dashed">Ninguém entrou ainda.</p>
        ) : (
          <div className="space-y-3">
            {stats.ultimasEntradas.map((r, i) => (
              <div key={i} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className="bg-green-100 text-green-700 text-xs font-black px-2 py-1 rounded">
                      {new Date(r.used_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="font-black text-gray-800 text-lg">{r.public_id}</span>
                  </div>
                  <p className="text-gray-500 font-bold text-sm">
                    {r.guest_name ? r.guest_name : "Sem Nome"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-sonicBlueMain">{r.quantidade_pessoas}</p>
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
