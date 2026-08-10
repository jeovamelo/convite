"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, CalendarDays, Clock, MapPin, Building2, CheckCircle2, AlertCircle } from "lucide-react";

type EventData = {
  day: string;
  time: string;
  place_name: string;
  address_line1: string;
  address_line2: string;
  title_text: string;
  title_color: string;
  title_size: number;
  event_token?: string;
  configured?: boolean;
};

const REQUIRED_FIELDS: { key: keyof EventData; label: string }[] = [
  { key: "day", label: "Data do Evento" },
  { key: "time", label: "Horário" },
  { key: "place_name", label: "Nome do Local" },
  { key: "address_line1", label: "Endereço (Rua)" },
  { key: "address_line2", label: "Endereço (Bairro/Cidade)" },
];

export default function EventoPage() {
  const [data, setData] = useState<EventData>({
    day: "",
    time: "",
    place_name: "",
    address_line1: "",
    address_line2: "",
    title_text: "",
    title_color: "#FFE800",
    title_size: 28,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((d) => {
        if (d.day) setData(d);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus(null);
    setError(null);

    try {
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Erro ao salvar as informações do evento.");
      setSaveStatus("Informações do evento salvas com sucesso!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const completedCount = REQUIRED_FIELDS.filter(
    (f) => (data[f.key] as string)?.trim?.()?.length > 0
  ).length;
  const allComplete = completedCount === REQUIRED_FIELDS.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-sonicCyan" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 text-gray-800 max-w-3xl">
      <div>
        <h1 className="font-montserrat font-black italic text-sonicBlueNavy text-3xl uppercase flex items-center gap-3">
          <CalendarDays size={32} /> Evento
        </h1>
        <p className="font-inter text-gray-500 font-bold mt-1">
          Cadastre as informações centrais do evento. Quando tudo estiver preenchido, o ícone de check verde aparecerá no menu.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
        <h2 className="text-xl font-black italic text-gray-800 uppercase flex items-center gap-2">
          Informações do Evento
        </h2>

        <div className="space-y-4">
          {/* Título do Convite */}
          <div>
            <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
              👑 Título do Convite (exibido no hotsite)
            </label>
            <input
              type="text"
              className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
              value={data.title_text || ""}
              onChange={(e) => setData({ ...data, title_text: e.target.value })}
              placeholder="Ex: ANIVERSÁRIO DO LUIZ MAURÍCIO"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Cor do Título</label>
              <div className="flex gap-2">
                <input
                  type="color"
                  className="w-10 h-10 border rounded-xl cursor-pointer bg-gray-50 p-1"
                  value={data.title_color || "#FFE800"}
                  onChange={(e) => setData({ ...data, title_color: e.target.value })}
                />
                <input
                  type="text"
                  className="flex-1 border rounded-xl p-2 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                  value={data.title_color || "#FFE800"}
                  onChange={(e) => setData({ ...data, title_color: e.target.value })}
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Tamanho (px)</label>
              <input
                type="number"
                className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                value={data.title_size || 28}
                onChange={(e) => setData({ ...data, title_size: parseInt(e.target.value, 10) || 28 })}
                min="12"
                max="80"
              />
            </div>
          </div>

          <hr className="border-gray-100" />

          {/* Data */}
          <div>
            <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
              <CalendarDays size={16} /> Data do Evento
            </label>
            <input
              type="text"
              required
              className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
              value={data.day}
              onChange={(e) => setData({ ...data, day: e.target.value })}
              placeholder="Ex: 19/08/2026"
            />
          </div>

          {/* Horário */}
          <div>
            <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
              <Clock size={16} /> Horário
            </label>
            <input
              type="text"
              required
              className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
              value={data.time}
              onChange={(e) => setData({ ...data, time: e.target.value })}
              placeholder="Ex: 19 HORAS"
            />
          </div>

          {/* Local */}
          <div>
            <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
              <Building2 size={16} /> Nome do Local (Buffet / Salão)
            </label>
            <input
              type="text"
              required
              className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
              value={data.place_name}
              onChange={(e) => setData({ ...data, place_name: e.target.value })}
              placeholder="Ex: BUFFET MAGIC BOOM"
            />
          </div>

          {/* Endereço Linha 1 */}
          <div>
            <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
              <MapPin size={16} /> Endereço — Rua e Número
            </label>
            <input
              type="text"
              required
              className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
              value={data.address_line1}
              onChange={(e) => setData({ ...data, address_line1: e.target.value })}
              placeholder="Ex: RUA CARLOS VASCONCELOS, 655"
            />
          </div>

          {/* Endereço Linha 2 */}
          <div>
            <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
              <MapPin size={16} /> Endereço — Bairro, Cidade e Estado
            </label>
            <input
              type="text"
              required
              className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
              value={data.address_line2}
              onChange={(e) => setData({ ...data, address_line2: e.target.value })}
              placeholder="Ex: MEIRELES, FORTALEZA - CE"
            />
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl font-bold text-sm">
            {error}
          </div>
        )}
        {saveStatus && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl font-bold text-sm flex items-center gap-2">
            <CheckCircle2 size={16} />
            {saveStatus}
          </div>
        )}

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-sonicBlueMain hover:bg-sonicBlueDark text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 text-sm shadow-md"
        >
          {saving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Save size={18} /> SALVAR
            </>
          )}
        </button>
      </div>

      {/* Checklist de Conclusão */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 text-sm uppercase mb-4 flex items-center gap-2">
          {allComplete ? (
            <CheckCircle2 size={18} className="text-green-500" />
          ) : (
            <AlertCircle size={18} className="text-amber-500" />
          )}
          Checklist de Configuração ({completedCount}/{REQUIRED_FIELDS.length})
        </h3>
        <div className="space-y-2">
          {REQUIRED_FIELDS.map((f) => {
            const filled = (data[f.key] as string)?.trim?.()?.length > 0;
            return (
              <div key={f.key} className="flex items-center gap-3">
                {filled ? (
                  <CheckCircle2 size={16} className="text-green-500 shrink-0" />
                ) : (
                  <div className="w-4 h-4 rounded-full border-2 border-gray-300 shrink-0" />
                )}
                <span className={`text-sm font-bold ${filled ? "text-gray-700" : "text-gray-400"}`}>
                  {f.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
