"use client";

import { useEffect, useState } from "react";
import { Calendar, Clock, Loader2, MapPin, XCircle } from "lucide-react";

type EventConfig = {
  configured?: boolean;
  event_token?: string;
  day: string;
  time: string;
  place_name: string;
  address_line1: string;
  address_line2: string;
};

export default function EventPage() {
  const [pathToken, setPathToken] = useState<string | undefined>();
  const [config, setConfig] = useState<EventConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (window.location.pathname.startsWith("/evento/")) {
      setPathToken(decodeURIComponent(window.location.pathname.split("/")[2] || ""));
    }
    fetch("/api/site-config")
      .then(async (response) => {
        const data = await response.json();
        setConfig(response.ok && data.configured && (!pathToken || data.event_token === pathToken) ? data : null);
      })
      .catch(() => setConfig(null))
      .finally(() => setLoading(false));
  }, [pathToken]);

  if (loading) {
    return <div className="min-h-screen bg-gray-900 flex items-center justify-center"><Loader2 className="animate-spin text-sonicYellow" size={48} /></div>;
  }

  if (!config) {
    return (
      <main className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-6 text-center text-white">
        <XCircle className="text-sonicRed mb-5" size={64} />
        <h1 className="font-montserrat font-black text-2xl uppercase">Página do evento não foi criada</h1>
        <p className="mt-3 text-white/70">As informações do evento ainda não foram configuradas.</p>
      </main>
    );
  }

  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${config.address_line1}, ${config.address_line2}`)}`;

  return (
    <main className="min-h-[100dvh] w-full bg-[#111827] flex justify-center overflow-hidden">
      <div className="relative min-h-[100dvh] w-full max-w-[700px] bg-cover bg-center bg-no-repeat" style={{ backgroundImage: "url('/api/bg')" }}>
        <div className="absolute inset-0 bg-black/5" />
        <section className="absolute left-1/2 bottom-[5vh] z-10 w-[86%] -translate-x-1/2 rounded-[22px] border-2 border-sonicCyan bg-sonicBlueNavy/90 px-4 py-3 shadow-solid-3d-cyan backdrop-blur-[2px] text-white">
          <div className="space-y-2">
            <div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sonicBlueMain text-sonicYellow"><Calendar size={17} /></span><div><p className="text-[9px] font-bold uppercase text-white/65">DIA</p><p className="font-montserrat text-sm font-black text-white">{config.day}</p></div></div>
            <div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sonicBlueMain text-sonicYellow"><Clock size={17} /></span><div><p className="text-[9px] font-bold uppercase text-white/65">HORA</p><p className="font-montserrat text-sm font-black text-white">{config.time}</p></div></div>
            <div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sonicBlueMain text-sonicYellow"><MapPin size={17} /></span><div><p className="text-[9px] font-bold uppercase text-white/65">LOCAL</p><p className="font-montserrat text-sm font-black text-white">{config.place_name}</p><p className="text-[8px] font-bold text-white/75">{config.address_line1}</p></div></div>
          </div>
          <a href={mapUrl} target="_blank" rel="noreferrer" className="mt-3 flex min-h-9 items-center justify-center gap-2 rounded-lg bg-white px-3 text-[10px] font-black text-sonicBlueMain"><MapPin size={14} /> ABRIR NO GOOGLE MAPS</a>
        </section>
      </div>
    </main>
  );
}
