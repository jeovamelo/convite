"use client";

import { useEffect, useState } from "react";
import { Save, Loader2, Image as ImageIcon, MapPin, Clock, Calendar, Globe, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function SiteConfigPage() {
  const [config, setConfig] = useState({
    day: "19/08/2026",
    time: "19 HORAS",
    place_name: "MAGIC BOOM",
    address_line1: "RUA CARLOS VASCONCELOS, 655",
    address_line2: "MEIRELES, FORTALEZA - CE",
    title_text: "",
    title_color: "#FFE800",
    title_size: 28,
  });

  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Image Upload State
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("/api/bg");
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    // Load config from API
    fetch("/api/site-config")
      .then((r) => r.json())
      .then((data) => {
        if (data.day) {
          setConfig(data);
        }
      })
      .catch(console.error);

    // Set background preview
    setImagePreview("/api/bg?t=" + new Date().getTime());
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSaveStatus(null);
    setError(null);

    try {
      // Save details config
      const res = await fetch("/api/site-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });

      if (!res.ok) throw new Error("Erro ao salvar as informações do site.");

      // Upload image if newly selected
      if (imageFile) {
        setUploadingImage(true);
        const formData = new FormData();
        formData.append("image", imageFile);

        const imgRes = await fetch("/api/site-config/bg", {
          method: "POST",
          body: formData,
        });

        setUploadingImage(false);
        if (!imgRes.ok) throw new Error("Erro ao enviar a imagem de fundo.");
        setImageFile(null);
      }

      setSaveStatus("Configurações salvas com sucesso!");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao salvar as configurações.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 pb-12 text-gray-800">
      <div>
        <h1 className="font-montserrat font-black italic text-sonicBlueNavy text-3xl uppercase flex items-center gap-3">
          Configuração do Site
        </h1>
        <p className="font-inter text-gray-500 font-bold">
          Ajuste as informações principais do convite e altere a imagem de fundo do site público.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Formulário de Edição */}
        <form onSubmit={handleSave} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 space-y-6">
          <h2 className="text-xl font-black italic text-gray-800 uppercase flex items-center gap-2">
            Informações do Evento
          </h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                <Calendar size={16} /> Dia do Aniversário
              </label>
              <input
                type="text"
                required
                className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                value={config.day}
                onChange={(e) => setConfig({ ...config, day: e.target.value })}
                placeholder="Ex: 19/08/2026"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                <Clock size={16} /> Horário do Evento
              </label>
              <input
                type="text"
                required
                className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                value={config.time}
                onChange={(e) => setConfig({ ...config, time: e.target.value })}
                placeholder="Ex: 19 HORAS"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                <MapPin size={16} /> Nome do Local (Buffet / Salão)
              </label>
              <input
                type="text"
                required
                className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                value={config.place_name}
                onChange={(e) => setConfig({ ...config, place_name: e.target.value })}
                placeholder="Ex: MAGIC BOOM"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                <MapPin size={16} /> Endereço - Linha 1 (Rua e Número)
              </label>
              <input
                type="text"
                required
                className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                value={config.address_line1}
                onChange={(e) => setConfig({ ...config, address_line1: e.target.value })}
                placeholder="Ex: RUA CARLOS VASCONCELOS, 655"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-500 uppercase mb-1 flex items-center gap-1.5">
                <MapPin size={16} /> Endereço - Linha 2 (Bairro, Cidade e Estado)
              </label>
              <input
                type="text"
                required
                className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                value={config.address_line2}
                onChange={(e) => setConfig({ ...config, address_line2: e.target.value })}
                placeholder="Ex: MEIRELES, FORTALEZA - CE"
              />
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-1.5">
              👑 Título do Convite (Opcional)
            </h3>
            
            <div className="grid grid-cols-1 gap-4 mb-4">
              <div>
                <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Texto do Título</label>
                <input 
                  type="text" 
                  className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                  value={config.title_text || ""}
                  onChange={(e) => setConfig({ ...config, title_text: e.target.value })}
                  placeholder="Deixe em branco para usar apenas a imagem de fundo"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Cor do Texto</label>
                  <div className="flex gap-2">
                    <input 
                      type="color" 
                      className="w-10 h-10 border rounded-xl cursor-pointer bg-gray-50 p-1"
                      value={config.title_color || "#FFE800"}
                      onChange={(e) => setConfig({ ...config, title_color: e.target.value })}
                    />
                    <input 
                      type="text" 
                      className="flex-1 border rounded-xl p-2 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                      value={config.title_color || "#FFE800"}
                      onChange={(e) => setConfig({ ...config, title_color: e.target.value })}
                      placeholder="#FFE800"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-1.5 block">Tamanho da Fonte (px)</label>
                  <input 
                    type="number" 
                    className="w-full border rounded-xl p-3 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                    value={config.title_size || 28}
                    onChange={(e) => setConfig({ ...config, title_size: parseInt(e.target.value, 10) || 28 })}
                    min="12"
                    max="80"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-1.5">
              <ImageIcon size={16} /> Imagem de Fundo do Site (Background)
            </h3>
            
            <div className="flex items-center gap-4">
              <label className="bg-sonicBlueMain/10 hover:bg-sonicBlueMain/20 text-sonicBlueMain font-bold px-4 py-3 rounded-xl cursor-pointer text-sm transition-colors border border-dashed border-sonicBlueMain/30 flex items-center gap-2">
                <UploadInput onChange={handleImageChange} />
                Selecionar Nova Imagem
              </label>
              {imageFile && (
                <span className="text-xs text-gray-500 font-bold truncate max-w-[200px]">
                  {imageFile.name}
                </span>
              )}
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-1.5">
              Tamanho recomendado: 1200x1600 (Retrato). Aceita JPG ou PNG.
            </p>
          </div>

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

          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-sonicBlueMain hover:bg-sonicBlueDark text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-60 text-sm shadow-md"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {uploadingImage ? "Enviando Imagem..." : "Salvando..."}
                </>
              ) : (
                <>
                  <Save size={18} />
                  SALVAR CONFIGURAÇÕES
                </>
              )}
            </button>

            <Link 
              href="/evento/demo" 
              target="_blank" 
              className="bg-sonicCyan hover:bg-[#1da5cf] text-white font-bold py-4 px-6 rounded-xl transition-all text-sm flex items-center gap-2 shadow-md"
            >
              <Globe size={18} />
              VER SITE
            </Link>
          </div>
        </form>

        {/* Visualização de Prévia */}
        <div className="bg-gray-900 rounded-3xl p-6 shadow-sm flex flex-col items-center justify-center min-h-[500px]">
          <h2 className="text-white/80 font-black text-sm uppercase mb-4 tracking-wider self-start flex items-center gap-1.5">
            Prévia do Background
          </h2>
          
          <div className="relative w-full max-w-[320px] aspect-[9/16] rounded-[40px] border-[12px] border-gray-800 shadow-2xl overflow-hidden bg-cover bg-center"
               style={{ backgroundImage: `url(${imagePreview})` }}>
            {/* Overlay simulation of the UI */}
            <div className="absolute inset-0 bg-black/35 flex flex-col items-center justify-between p-4 pt-8">
              <div className="text-center w-full">
                {config.title_text && (
                  <span 
                    className="font-montserrat font-black italic tracking-wide uppercase leading-tight block select-none"
                    style={{ 
                      color: config.title_color || "#FFE800",
                      fontSize: `${Math.min(22, (config.title_size || 28) * 0.7)}px`,
                      textShadow: `
                        -1px -1px 0 #000B29, 1px -1px 0 #000B29, -1px 1px 0 #000B29, 1px 1px 0 #000B29,
                        0px 2px 0px #000B29, 0px 2px 5px rgba(0,0,0,0.5)
                      `
                    }}
                  >
                    {config.title_text}
                  </span>
                )}
              </div>

              <div className="w-full space-y-2 mb-4">
                <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl p-2 text-left flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-sonicBlueMain flex items-center justify-center text-white text-[10px] font-bold">D</div>
                  <div>
                    <span className="text-white/60 text-[6px] uppercase font-bold block">Dia</span>
                    <span className="text-white text-xs font-bold font-montserrat">{config.day}</span>
                  </div>
                </div>

                <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl p-2 text-left flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-sonicBlueMain flex items-center justify-center text-white text-[10px] font-bold">H</div>
                  <div>
                    <span className="text-white/60 text-[6px] uppercase font-bold block">Hora</span>
                    <span className="text-white text-xs font-bold font-montserrat">{config.time}</span>
                  </div>
                </div>

                <div className="bg-black/50 backdrop-blur-sm border border-white/10 rounded-xl p-2 text-left flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-sonicBlueMain flex items-center justify-center text-white text-[10px] font-bold">L</div>
                    <div>
                      <span className="text-white/60 text-[6px] uppercase font-bold block">Local</span>
                      <span className="text-white text-[10px] font-bold font-montserrat leading-tight block">{config.place_name}</span>
                      <span className="text-white/70 text-[8px] leading-tight block">{config.address_line1}</span>
                    </div>
                  </div>
                  <div className="w-full bg-white text-sonicBlueMain rounded-lg p-1.5 flex items-center justify-center gap-1.5 font-inter font-black text-[8px] shadow-sm uppercase">
                    <MapPin size={10} />
                    ABRIR NO GOOGLE MAPS
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadInput({ onChange }: { onChange: (e: React.ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <input
      type="file"
      className="hidden"
      accept="image/png, image/jpeg, image/webp"
      onChange={onChange}
    />
  );
}
