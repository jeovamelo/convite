"use client";

import { useCallback, useEffect, useState } from "react";
import { Users, Ticket, CheckCircle, XCircle, QrCode, Globe, Copy, ExternalLink, Activity, Loader2 } from "lucide-react";
import Link from "next/link";

type UltimaEntrada = {
  public_id: string;
  guest_name: string | null;
  quantidade_pessoas: number;
  used_at: string;
};

type Stats = {
  convidadosPrevistos: number;
  pessoasPresentes: number;
  exibiveisUtilizados: number;
  exibiveisDisponiveis: number;
  exibiveisCancelados: number;
  totalGerados: number;
  ultimasEntradas: UltimaEntrada[];
};

const emptyStats: Stats = {
  convidadosPrevistos: 0,
  pessoasPresentes: 0,
  exibiveisUtilizados: 0,
  exibiveisDisponiveis: 0,
  exibiveisCancelados: 0,
  totalGerados: 0,
  ultimasEntradas: [],
};

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await fetch("/api/recepcao/stats");
      if (!res.ok) throw new Error("Falha ao carregar estatísticas.");
      const data = await res.json();
      setStats({ ...emptyStats, ...data });
      setErro(null);
    } catch (e: any) {
      setErro(e.message || "Erro ao carregar estatísticas.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const ultimoCheckIn = stats.ultimasEntradas[0]?.used_at
    ? new Date(stats.ultimasEntradas[0].used_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
    : "—";

  const copiarLink = () => {
    navigator.clipboard?.writeText(window.location.origin).catch(() => {});
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const StatCard = ({ title, value, icon, color }: { title: string, value: number, icon: any, color: string }) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shrink-0 ${color}`}>
        {icon}
      </div>
      <div>
        <p className="font-inter text-gray-500 font-bold text-xs uppercase tracking-wide">{title}</p>
        <p className="font-montserrat font-black text-3xl text-gray-800">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-12 text-gray-800">

      {/* Header */}
      <div>
        <h1 className="font-montserrat font-black italic text-sonicBlueNavy text-3xl uppercase">
          Painel de Controle
        </h1>
        <p className="font-inter text-gray-500 font-semibold flex items-center gap-2">
          <Activity size={16} className="text-green-500" />
          {loading ? "Carregando dados..." : "Dados em tempo real (atualiza a cada 30s)"}
        </p>
      </div>

      {erro && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg font-bold text-sm">
          {erro}
        </div>
      )}

      {/* Visão Geral (Stats) */}
      <div>
        <h2 className="font-inter font-bold text-gray-800 mb-4 uppercase tracking-wider text-sm">Visão Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard title="Pessoas Presentes" value={stats.pessoasPresentes} icon={<Users size={24} />} color="bg-sonicGold" />
          <StatCard title="Exibíveis Utilizados" value={stats.exibiveisUtilizados} icon={<CheckCircle size={24} />} color="bg-green-500" />
          <StatCard title="Exibíveis Disponíveis" value={stats.exibiveisDisponiveis} icon={<Ticket size={24} />} color="bg-sonicCyan" />
          <StatCard title="Total Gerados" value={stats.totalGerados} icon={<Ticket size={24} />} color="bg-sonicBlueMain" />
          <StatCard title="Cancelados" value={stats.exibiveisCancelados} icon={<XCircle size={24} />} color="bg-sonicRed" />
        </div>
      </div>

      {/* Acesso aos Módulos Principais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recepção */}
        <div className="bg-sonicBlueNavy text-white p-8 rounded-3xl shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 opacity-10 transform group-hover:scale-110 transition-transform">
            <QrCode size={160} />
          </div>
          <div className="relative z-10">
            <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <QrCode size={24} />
            </div>
            <h3 className="font-montserrat font-black text-2xl mb-2">RECEPÇÃO</h3>
            <p className="font-inter text-white/70 text-sm mb-6">
              Leia os QR Codes dos convidados e registre as entradas.
            </p>
            <div className="flex flex-col gap-2 mb-8">
              <div className="flex justify-between text-sm font-bold bg-white/10 px-3 py-2 rounded-lg">
                <span className="text-white/60">Status:</span>
                <span className="text-green-400">Em Funcionamento</span>
              </div>
              <div className="flex justify-between text-sm font-bold bg-white/10 px-3 py-2 rounded-lg">
                <span className="text-white/60">Último Check-in:</span>
                <span>{ultimoCheckIn}</span>
              </div>
            </div>
            <Link href="/admin/recepcao" className="block w-full text-center bg-sonicYellow hover:bg-sonicGold text-sonicBlueNavy font-bold py-3 rounded-xl transition-colors">
              ABRIR RECEPÇÃO
            </Link>
          </div>
        </div>

        {/* Motor de Exibíveis */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="bg-sonicBlueMain/10 text-sonicBlueMain w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Ticket size={24} />
            </div>
            <h3 className="font-montserrat font-black text-2xl mb-2">MOTOR DE EXIBÍVEIS</h3>
            <p className="font-inter text-gray-500 text-sm mb-6">
              Gere e gerencie os exibíveis individuais da festa em lote.
            </p>
            <div className="flex flex-col gap-2 mb-8">
              <div className="flex justify-between text-sm font-bold bg-gray-50 px-3 py-2 rounded-lg border">
                <span className="text-gray-500">Gerados:</span>
                <span className="text-sonicBlueMain">{stats.totalGerados}</span>
              </div>
              <div className="flex justify-between text-sm font-bold bg-gray-50 px-3 py-2 rounded-lg border">
                <span className="text-gray-500">Disponíveis:</span>
                <span className="text-sonicCyan">{stats.exibiveisDisponiveis}</span>
              </div>
            </div>
          </div>
          <Link href="/admin/gerador" className="block w-full text-center bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors">
            ABRIR GERADOR
          </Link>
        </div>

        {/* Site do Aniversário */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div>
            <div className="bg-sonicCyan/10 text-sonicCyan w-12 h-12 rounded-xl flex items-center justify-center mb-6">
              <Globe size={24} />
            </div>
            <h3 className="font-montserrat font-black text-2xl mb-2">SITE DO ANIVERSÁRIO</h3>
            <p className="font-inter text-gray-500 text-sm mb-6">
              Veja a página que os convidados acessam com as informações da festa.
            </p>
          </div>
          <div className="space-y-3">
            <Link href="/" target="_blank" className="flex items-center justify-center gap-2 w-full text-center bg-sonicCyan hover:bg-[#1da5cf] text-white font-bold py-3 rounded-xl transition-colors">
              <ExternalLink size={18} />
              VISUALIZAR SITE
            </Link>
            <button
              onClick={copiarLink}
              className="flex items-center justify-center gap-2 w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
            >
              <Copy size={18} />
              {copiado ? "LINK COPIADO!" : "COPIAR LINK"}
            </button>
          </div>
        </div>

      </div>

      {/* Últimas Entradas */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-inter font-bold text-gray-800 uppercase tracking-wider text-sm">Últimas Entradas</h2>
          {loading && <Loader2 size={18} className="animate-spin text-gray-400" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider">
                <th className="p-4 border-b">Horário</th>
                <th className="p-4 border-b">Exibível</th>
                <th className="p-4 border-b">Convidado</th>
                <th className="p-4 border-b">Pessoas</th>
                <th className="p-4 border-b">Status</th>
              </tr>
            </thead>
            <tbody className="font-inter text-sm">
              {stats.ultimasEntradas.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400 font-bold">
                    Nenhuma entrada registrada ainda.
                  </td>
                </tr>
              )}
              {stats.ultimasEntradas.map((entry) => (
                <tr key={entry.public_id} className="hover:bg-gray-50 transition-colors border-b last:border-0">
                  <td className="p-4 font-bold text-gray-700">
                    {new Date(entry.used_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </td>
                  <td className="p-4 font-mono font-bold text-sonicBlueMain">{entry.public_id}</td>
                  <td className="p-4 text-gray-600">{entry.guest_name || "Não informado"}</td>
                  <td className="p-4 font-bold text-gray-700">{entry.quantidade_pessoas}</td>
                  <td className="p-4">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">
                      ENTROU
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
