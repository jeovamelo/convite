"use client";

import { motion } from "framer-motion";
import { Users, Ticket, CheckCircle, XCircle, QrCode, Globe, Copy, ExternalLink, Activity } from "lucide-react";
import Link from "next/link";

// Dados Simulados (Mock) para o Dashboard
const mockStats = {
  gerados: 105,
  utilizados: 52,
  presentes: 68,
  disponiveis: 53,
  invalidos: 0,
};

const mockLastEntries = [
  { time: "19:37", code: "LM-0042", name: "Lucas Almeida", people: 1 },
  { time: "19:32", code: "LM-0078", name: "Maria Fernanda", people: 2 },
  { time: "19:31", code: "LM-0031", name: "João Pedro", people: 1 },
  { time: "19:30", code: "LM-0092", name: "Não informado", people: 3 },
  { time: "19:25", code: "LM-0015", name: "Tio Marcos", people: 4 },
];

export default function DashboardPage() {
  
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
          <Activity size={16} className="text-green-500" /> Sistema online e operando
        </p>
      </div>

      {/* Visão Geral (Stats) */}
      <div>
        <h2 className="font-inter font-bold text-gray-800 mb-4 uppercase tracking-wider text-sm">Visão Geral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <StatCard title="Pessoas Presentes" value={mockStats.presentes} icon={<Users size={24} />} color="bg-sonicGold" />
          <StatCard title="Exibíveis Utilizados" value={mockStats.utilizados} icon={<CheckCircle size={24} />} color="bg-green-500" />
          <StatCard title="Exibíveis Disponíveis" value={mockStats.disponiveis} icon={<Ticket size={24} />} color="bg-sonicCyan" />
          <StatCard title="Total Gerados" value={mockStats.gerados} icon={<Ticket size={24} />} color="bg-sonicBlueMain" />
          <StatCard title="Inválidos/Problema" value={mockStats.invalidos} icon={<XCircle size={24} />} color="bg-sonicRed" />
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
                <span>19:37</span>
              </div>
            </div>
            <Link href="/recepcao" className="block w-full text-center bg-sonicYellow hover:bg-sonicGold text-sonicBlueNavy font-bold py-3 rounded-xl transition-colors">
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
                <span className="text-sonicBlueMain">105</span>
              </div>
              <div className="flex justify-between text-sm font-bold bg-gray-50 px-3 py-2 rounded-lg border">
                <span className="text-gray-500">Disponíveis:</span>
                <span className="text-sonicCyan">53</span>
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
              onClick={() => alert("Link copiado: https://festa.exemplo.com/")}
              className="flex items-center justify-center gap-2 w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-xl transition-colors"
            >
              <Copy size={18} />
              COPIAR LINK
            </button>
          </div>
        </div>

      </div>

      {/* Últimas Entradas */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-inter font-bold text-gray-800 uppercase tracking-wider text-sm">Últimas Entradas</h2>
          <button className="text-sonicBlueMain text-sm font-bold hover:underline">Ver todas</button>
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
              {mockLastEntries.map((entry, idx) => (
                <tr key={idx} className="hover:bg-gray-50 transition-colors border-b last:border-0">
                  <td className="p-4 font-bold text-gray-700">{entry.time}</td>
                  <td className="p-4 font-mono font-bold text-sonicBlueMain">{entry.code}</td>
                  <td className="p-4 text-gray-600">{entry.name}</td>
                  <td className="p-4 font-bold text-gray-700">{entry.people}</td>
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
