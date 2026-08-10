"use client";

import { useState, useRef, useEffect } from "react";
import { Upload, Download, Loader2, Image as ImageIcon, Settings2, QrCode, Type, CheckCircle, Eye, Save, XCircle } from "lucide-react";
import { Rnd } from "react-rnd";
import { QRCodeSVG } from "qrcode.react";
import JSZip from "jszip";

const generateSecureToken = (length = 16) => {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let token = '';
  for(let i = 0; i < length; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
};

export default function GeradorPage() {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [naturalWidth, setNaturalWidth] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1);
  const [scale, setScale] = useState(1);

  // Editor State
  const [activeTab, setActiveTab] = useState<"editor" | "lista">("editor");
  const [selectedElement, setSelectedElement] = useState<"qr" | "id" | null>(null);

  const [qrConfig, setQrConfig] = useState({ x: 50, y: 50, size: 150 });
  const [idConfig, setIdConfig] = useState({
    x: 50, y: 220, width: 200, height: 40,
    color: "#FFD500",
    fontSize: 24,
    fontWeight: "bold",
    align: "center"
  });

  // Batch Generation State
  const [quantity, setQuantity] = useState<number>(120);
  const [peoplePerInvite, setPeoplePerInvite] = useState<number>(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto Save & Load state
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Preview Modal
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Layout Management State
  const [layouts, setLayouts] = useState<{id: string, name: string}[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>("00000000-0000-0000-0000-000000000000");
  const [isCreatingLayout, setIsCreatingLayout] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");

  // Load Layouts list
  const loadLayouts = async () => {
    try {
      const res = await fetch("/api/settings/list");
      const data = await res.json();
      if (data.layouts) setLayouts(data.layouts);
    } catch (e) {
      console.error("Erro ao carregar layouts", e);
    }
  };

  useEffect(() => {
    loadLayouts();
  }, []);

  // Load Settings and Image for selected layout
  useEffect(() => {
    if (!selectedLayoutId) return;
    
    // Reset image preview when changing layout
    setImageFile(null);
    setImagePreview(null);
    
    fetch(`/api/settings?layout_id=${selectedLayoutId}`)
      .then(r => r.json())
      .then(data => {
        if (data.qr_size) {
          setQrConfig({ x: data.qr_x || 50, y: data.qr_y || 50, size: data.qr_size || 150 });
          setIdConfig({
            x: data.id_x || 50, y: data.id_y || 220, width: data.id_width || 200, height: data.id_height || 40,
            color: data.id_color || "#FFD500", fontSize: data.id_fontSize || 24, fontWeight: data.id_fontWeight || "bold", align: "center"
          });
          if (data.quantity) setQuantity(data.quantity);
          if (data.peoplePerInvite) setPeoplePerInvite(data.peoplePerInvite);
        } else {
          // If no data, reset to defaults
          setQrConfig({ x: 50, y: 50, size: 150 });
        }
      }).catch(console.error);

    fetch(`/api/settings/image?layout_id=${selectedLayoutId}`)
      .then(r => r.json())
      .then(data => {
        if (data.image) {
          setImagePreview(data.image);
        }
      }).catch(console.error);
  }, [selectedLayoutId]);


  // Auto-save debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSaveConfig(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [qrConfig, idConfig, quantity, peoplePerInvite]);

  const handleSaveConfig = async (isAuto = false) => {
    if (!isAuto) setIsSaving(true);
    try {
      const settingsRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedLayoutId,
          name: layouts.find(l => l.id === selectedLayoutId)?.name || "Padrão",
          qr_x: qrConfig.x, qr_y: qrConfig.y, qr_size: qrConfig.size,
          id_x: idConfig.x, id_y: idConfig.y, id_width: idConfig.width, id_height: idConfig.height,
          id_color: idConfig.color, id_fontSize: idConfig.fontSize, id_fontWeight: idConfig.fontWeight,
          quantity, peoplePerInvite
        })
      });
      if (!settingsRes.ok) {
        const errData = await settingsRes.json().catch(() => null);
        throw new Error(errData?.error || "Falha ao salvar configurações.");
      }

      // Upload image if newly selected
      if (imageFile) {
        const formData = new FormData();
        formData.append("image", imageFile);
        formData.append("layout_id", selectedLayoutId);
        const imageRes = await fetch("/api/settings/image", {
          method: "POST",
          body: formData
        });
        if (!imageRes.ok) {
          const errData = await imageRes.json().catch(() => null);
          throw new Error(errData?.error || "Falha ao salvar imagem-base.");
        }
      }

      setSaveStatus(isAuto ? "Salvo" : "✓ CONFIGURAÇÃO SALVA");
      if (!isAuto) setTimeout(() => setSaveStatus(null), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao salvar.");
      console.error(e);
    }
    if (!isAuto) setIsSaving(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setError(null);
      setSuccess(null);
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    setNaturalWidth(img.naturalWidth);
    setNaturalHeight(img.naturalHeight);
    
    if (containerRef.current) {
      const cw = containerRef.current.clientWidth;
      setContainerWidth(cw);
      setScale(img.naturalWidth / cw);
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current && naturalWidth > 1) {
        const cw = containerRef.current.clientWidth;
        setContainerWidth(cw);
        setScale(naturalWidth / cw);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [naturalWidth]);

  const buildFormData = (publicId: string, token: string, isPreview: boolean) => {
    const formData = new FormData();
    if (imageFile) {
      formData.append("image", imageFile);
    } else if (imagePreview) {
      formData.append("image_data_url", imagePreview);
    }
    
    formData.append("qr_x", Math.round(qrConfig.x * scale).toString());
    formData.append("qr_y", Math.round(qrConfig.y * scale).toString());
    formData.append("qr_size", Math.round(qrConfig.size * scale).toString());

    formData.append("id_x", Math.round(idConfig.x * scale).toString());
    formData.append("id_y", Math.round(idConfig.y * scale).toString());
    formData.append("id_width", Math.round(idConfig.width * scale).toString());
    formData.append("id_height", Math.round(idConfig.height * scale).toString());
    formData.append("id_color", idConfig.color);
    formData.append("id_fontSize", Math.round(idConfig.fontSize * scale).toString());
    formData.append("id_fontWeight", idConfig.fontWeight);
    
    formData.append("public_id", publicId);
    formData.append("token", token);
    formData.append("is_preview", isPreview.toString());
    formData.append("peoplePerInvite", peoplePerInvite.toString());
    formData.append("layout_id", selectedLayoutId);
    return formData;
  }

  const validateBeforeGenerate = () => {
    if (!imageFile && !imagePreview) return "Carregue uma imagem-base primeiro.";
    if (quantity <= 0) return "A quantidade deve ser maior que 0.";
    if (peoplePerInvite <= 0) return "A quantidade de pessoas deve ser maior que 0.";
    return null;
  }

  const handlePreview = async () => {
    const err = validateBeforeGenerate();
    if (err) { setError(err); return; }

    setPreviewModalOpen(true);
    setIsPreviewLoading(true);
    setPreviewError(null);
    setPreviewImage(null);

    try {
      const formData = buildFormData("LM-0001", "TOKEN_TEST_PREVIEW", true);
      const res = await fetch("/api/generate/single", { method: "POST", body: formData });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Erro ao gerar prévia.");
      }
      const blob = await res.blob();
      setPreviewImage(URL.createObjectURL(blob));
    } catch (e: any) {
      setPreviewError(e.message);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  const handleBatchGenerate = async () => {
    const err = validateBeforeGenerate();
    if (err) { setError(err); return; }

    setError(null);
    setSuccess(null);
    setProgress(0);
    setIsGenerating(true);

    let directoryHandle = null;
    let zip = null;
    let useZip = false;

    // Check directory picker support
    if ('showDirectoryPicker' in window) {
      try {
        directoryHandle = await (window as any).showDirectoryPicker({ mode: 'readwrite' });
      } catch (e: any) {
        if (e.name === 'AbortError') {
          setIsGenerating(false);
          return;
        }
        useZip = true;
      }
    } else {
      useZip = true;
    }

    if (useZip) {
      zip = new JSZip();
    }

    let errorCount = 0;
    
    for (let i = 1; i <= quantity; i++) {
      const publicId = `LM-${i.toString().padStart(4, "0")}`;
      const token = generateSecureToken();
      
      try {
        const formData = buildFormData(publicId, token, false);
        const res = await fetch("/api/generate/single", { method: "POST", body: formData });
        
        if (!res.ok) throw new Error(`Falha no item ${publicId}`);
        
        const blob = await res.blob();
        const fileName = `exibivel_${publicId}.png`;

        if (useZip && zip) {
          zip.file(fileName, blob);
        } else if (directoryHandle) {
          const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        }
      } catch (e) {
        console.error(e);
        errorCount++;
      }
      setProgress(i);
    }

    if (useZip && zip) {
      try {
        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const a = document.createElement("a");
        a.href = url;
        a.download = `exibiveis_lm_4anos.zip`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
      } catch(e) {
        console.error("Erro ao gerar ZIP", e);
      }
    }

    setIsGenerating(false);
    if (errorCount === 0) {
      setSuccess(`Geração concluída! ${quantity} arquivos salvos.`);
    } else {
      setError(`Geração concluída, mas com ${errorCount} erros.`);
    }
  };

  return (
    <div className="max-w-[1600px] mx-auto min-h-[calc(100vh-80px)] flex flex-col relative">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-montserrat font-black italic text-sonicBlueNavy uppercase flex items-center gap-3">
            Editor Visual de Exibíveis 
            {saveStatus === 'Salvo' && <span className="text-sm font-normal text-gray-400 normal-case not-italic tracking-normal">({saveStatus})</span>}
          </h2>
          <p className="text-gray-500 font-inter font-bold">Posicione os elementos diretamente sobre a imagem.</p>
          
          {saveStatus && saveStatus !== 'Salvo' && (
            <p className="text-green-600 font-bold text-sm mt-1 animate-pulse">{saveStatus}</p>
          )}
        </div>
        
        {/* LAYOUT SELECTOR */}
        <div className="flex items-center gap-3 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
          <span className="text-sm font-bold text-gray-500 uppercase ml-2">Evento:</span>
          {isCreatingLayout ? (
            <div className="flex items-center gap-2">
              <input 
                type="text" 
                autoFocus
                placeholder="Nome do novo evento" 
                className="border p-2 rounded-lg text-sm font-bold"
                value={newLayoutName}
                onChange={e => setNewLayoutName(e.target.value)}
              />
              <button 
                onClick={async () => {
                  if (!newLayoutName.trim()) { setIsCreatingLayout(false); return; }
                  // Criar novo layout temporário e salvar para gerar ID (fake UUID para frontend, backend resolveria num POST real, mas faremos simples)
                  const newId = crypto.randomUUID();
                  const newLayout = { id: newId, name: newLayoutName.trim() };
                  setLayouts([...layouts, newLayout]);
                  setSelectedLayoutId(newId);
                  setIsCreatingLayout(false);
                  setNewLayoutName("");
                  // Força um save inicial para registrar no BD
                  setTimeout(() => {
                    fetch("/api/settings", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ id: newId, name: newLayoutName.trim() })
                    }).then(() => loadLayouts());
                  }, 500);
                }}
                className="bg-green-500 text-white p-2 rounded-lg font-bold text-sm"
              >
                Criar
              </button>
              <button onClick={() => setIsCreatingLayout(false)} className="text-gray-500 hover:text-red-500">
                <XCircle size={20} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select 
                value={selectedLayoutId} 
                onChange={e => setSelectedLayoutId(e.target.value)}
                className="bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-sonicCyan focus:border-sonicCyan block w-full p-2.5 font-bold"
              >
                {layouts.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <button 
                onClick={() => setIsCreatingLayout(true)}
                className="bg-sonicBlueNavy text-white px-3 py-2.5 rounded-lg text-sm font-bold hover:bg-sonicBlueMain transition-colors whitespace-nowrap"
              >
                + Novo
              </button>
            </div>
          )}
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setActiveTab('editor')}
            className={`font-bold py-2 px-4 rounded-xl transition-colors ${activeTab === 'editor' ? 'bg-sonicBlueMain text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
          >
            EDITOR
          </button>
          <button 
            onClick={() => setActiveTab('lista')}
            className={`font-bold py-2 px-4 rounded-xl transition-colors ${activeTab === 'lista' ? 'bg-sonicBlueMain text-white' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
          >
            LISTA DE EXIBÍVEIS
          </button>

          <button 
            onClick={handlePreview}
            disabled={(!imageFile && !imagePreview) || isGenerating}
            className="bg-sonicCyan hover:bg-[#1da5cf] text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors shadow-md disabled:opacity-50"
          >
            <Eye size={20} /> PRÉVIA
          </button>
          <button 
            onClick={handleBatchGenerate}
            disabled={isGenerating || (!imageFile && !imagePreview)}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-xl flex items-center gap-2 disabled:opacity-50 transition-colors shadow-md"
          >
            <Download size={20} />
            GERAR {quantity === 1 ? '1 EXIBÍVEL' : `${quantity} EXIBÍVEIS`}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative">
          <span className="block sm:inline">{error}</span>
          <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)}>
            <XCircle size={20}/>
          </button>
        </div>
      )}

      {success && (
        <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative">
          <span className="block sm:inline font-bold">{success}</span>
          <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setSuccess(null)}>
            <XCircle size={20}/>
          </button>
        </div>
      )}

      <div className="flex flex-1 gap-6 pb-10">
        
        {activeTab === 'editor' && (
          <>
            {/* LEFT PANEL: Layers & Properties */}
            <div className="w-80 flex flex-col gap-6 shrink-0">
          
          {/* Upload */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm uppercase mb-3">1. Imagem Base</h3>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
              <div className="flex flex-col items-center justify-center">
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <p className="text-xs text-gray-500 font-semibold">Carregar Arte Original</p>
              </div>
              <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
            </label>
          </div>

          {/* Camadas */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm uppercase mb-3">2. Camadas</h3>
            <div className="space-y-2">
              <button 
                onClick={() => setSelectedElement("qr")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold text-sm transition-colors border ${selectedElement === "qr" ? "bg-sonicBlueMain/10 border-sonicBlueMain text-sonicBlueMain" : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"}`}
              >
                <QrCode size={18} /> QR Code (Preview)
              </button>
              <button 
                onClick={() => setSelectedElement("id")}
                className={`w-full flex items-center gap-3 p-3 rounded-lg font-bold text-sm transition-colors border ${selectedElement === "id" ? "bg-sonicBlueMain/10 border-sonicBlueMain text-sonicBlueMain" : "bg-gray-50 border-transparent text-gray-600 hover:bg-gray-100"}`}
              >
                <Type size={18} /> ID do Exibível
              </button>
            </div>
          </div>

          {/* Properties */}
          {selectedElement && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex-1">
              <h3 className="font-bold text-gray-800 text-sm uppercase mb-4 flex items-center gap-2">
                <Settings2 size={16} /> 
                Propriedades: {selectedElement === "qr" ? "QR Code" : "ID"}
              </h3>
              
              {selectedElement === "qr" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-gray-500">Pos X</label>
                      <input type="number" value={Math.round(qrConfig.x)} onChange={(e)=>setQrConfig(p=>({...p, x: Number(e.target.value)}))} className="w-full bg-gray-50 border rounded p-2 text-sm text-gray-900" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-500">Pos Y</label>
                      <input type="number" value={Math.round(qrConfig.y)} onChange={(e)=>setQrConfig(p=>({...p, y: Number(e.target.value)}))} className="w-full bg-gray-50 border rounded p-2 text-sm text-gray-900" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Tamanho (1:1)</label>
                    <input type="number" value={Math.round(qrConfig.size)} onChange={(e)=>setQrConfig(p=>({...p, size: Number(e.target.value)}))} className="w-full bg-gray-50 border rounded p-2 text-sm text-gray-900" />
                  </div>
                </div>
              )}

              {selectedElement === "id" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500">Cor do Texto</label>
                    <input type="color" value={idConfig.color} onChange={(e)=>setIdConfig(p=>({...p, color: e.target.value}))} className="w-full h-10 cursor-pointer rounded border" />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Tamanho da Fonte</label>
                    <input type="range" min="10" max="72" value={idConfig.fontSize} onChange={(e)=>setIdConfig(p=>({...p, fontSize: Number(e.target.value)}))} className="w-full" />
                    <div className="text-right text-xs font-bold text-sonicBlueMain">{idConfig.fontSize}px</div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500">Peso (Weight)</label>
                    <select value={idConfig.fontWeight} onChange={(e)=>setIdConfig(p=>({...p, fontWeight: e.target.value}))} className="w-full bg-gray-50 border rounded p-2 text-sm font-bold text-gray-900">
                      <option value="normal">Normal</option>
                      <option value="bold">Bold</option>
                      <option value="900">Black / Extra Bold</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Gerar Lote */}
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 text-sm uppercase mb-3">3. Configuração do Lote</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Quantidade</label>
                <input type="number" min="1" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full border rounded-lg p-2 font-bold text-gray-900 bg-gray-50" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">Pessoas por Exibível</label>
                <select value={peoplePerInvite} onChange={e => setPeoplePerInvite(Number(e.target.value))} className="w-full border rounded-lg p-2 font-bold text-gray-900 bg-gray-50">
                  <option value={1}>1 pessoa</option>
                  <option value={2}>2 pessoas</option>
                  <option value={3}>3 pessoas</option>
                  <option value={4}>4 pessoas</option>
                  <option value={5}>5 pessoas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Botão Salvar Configuração */}
          <button 
            onClick={() => handleSaveConfig(false)}
            disabled={isSaving}
            className="w-full bg-sonicBlueNavy hover:bg-sonicBlueMain text-white font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
            SALVAR
          </button>
        </div>

        {/* RIGHT PANEL: Canvas */}
        <div className="flex-1 bg-gray-200 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center p-8 relative">
          
          {!imagePreview && (
            <div className="text-center text-gray-400">
              <ImageIcon size={48} className="mx-auto mb-4 opacity-50" />
              <p className="font-bold text-lg">Faça o upload de uma imagem para iniciar.</p>
            </div>
          )}

          {imagePreview && (
            <div 
              className="relative shadow-2xl" 
              ref={containerRef}
              style={{ maxWidth: '100%', maxHeight: '100%', display: 'inline-block' }}
              onClick={() => setSelectedElement(null)}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={imagePreview} 
                alt="Canvas" 
                className="max-w-full max-h-[700px] block pointer-events-none select-none"
                onLoad={handleImageLoad}
              />
              
              {/* QR Code RND Component */}
              <Rnd
                size={{ width: qrConfig.size, height: qrConfig.size }}
                position={{ x: qrConfig.x, y: qrConfig.y }}
                onDragStop={(e, d) => { setQrConfig(p => ({ ...p, x: d.x, y: d.y })); setSelectedElement("qr"); }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  setQrConfig({
                    size: parseInt(ref.style.width, 10),
                    x: position.x,
                    y: position.y
                  });
                  setSelectedElement("qr");
                }}
                lockAspectRatio={true}
                bounds="parent"
                className={`flex items-center justify-center bg-white ${selectedElement === "qr" ? "ring-4 ring-sonicCyan shadow-xl z-20" : "z-10 ring-2 ring-gray-300 shadow"}`}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedElement("qr"); }}
              >
                <div className="w-full h-full p-2 pointer-events-none flex items-center justify-center">
                   <QRCodeSVG value="https://preview.local/exibivel/demo" width="100%" height="100%" />
                </div>
                {selectedElement === "qr" && <div className="absolute -top-6 left-0 bg-sonicCyan text-white text-[10px] font-bold px-2 py-1 rounded shadow">QR CODE</div>}
              </Rnd>

              {/* ID RND Component */}
              <Rnd
                size={{ width: idConfig.width, height: idConfig.height }}
                position={{ x: idConfig.x, y: idConfig.y }}
                onDragStop={(e, d) => { setIdConfig(p => ({ ...p, x: d.x, y: d.y })); setSelectedElement("id"); }}
                onResizeStop={(e, direction, ref, delta, position) => {
                  setIdConfig(p => ({
                    ...p,
                    width: parseInt(ref.style.width, 10),
                    height: parseInt(ref.style.height, 10),
                    x: position.x,
                    y: position.y
                  }));
                  setSelectedElement("id");
                }}
                bounds="parent"
                className={`flex items-center ${selectedElement === "id" ? "ring-2 ring-sonicCyan shadow-xl bg-sonicCyan/10 z-20" : "z-10 hover:ring-1 hover:ring-gray-300"}`}
                style={{ 
                  justifyContent: idConfig.align === 'center' ? 'center' : idConfig.align === 'right' ? 'flex-end' : 'flex-start'
                }}
                onClick={(e: React.MouseEvent) => { e.stopPropagation(); setSelectedElement("id"); }}
              >
                <span 
                  className="pointer-events-none whitespace-nowrap"
                  style={{
                    color: idConfig.color,
                    fontSize: `${idConfig.fontSize}px`,
                    fontWeight: idConfig.fontWeight,
                    fontFamily: 'Montserrat, sans-serif'
                  }}
                >
                  LM-0001
                </span>
                {selectedElement === "id" && <div className="absolute -top-6 left-0 bg-sonicCyan text-white text-[10px] font-bold px-2 py-1 rounded shadow">ID</div>}
              </Rnd>
            </div>
          )}
        </div>
        </>
      )}

      {activeTab === 'lista' && (
        <div className="flex-1 bg-white rounded-3xl shadow-sm p-8">
          <h3 className="text-2xl font-black italic text-gray-800 mb-6">Lista de Exibíveis Gerados</h3>
          <p className="text-gray-500 mb-8 font-bold">Nesta aba, em breve, aparecerão todos os exibíveis que você gerou, podendo visualizar e baixar novamente caso perca o ZIP.</p>
          <div className="bg-gray-100 p-10 rounded-2xl text-center">
             <QrCode size={48} className="mx-auto text-gray-400 mb-4" />
             <p className="text-gray-500 font-bold">Construção da Listagem em Andamento...</p>
          </div>
        </div>
      )}
      </div>

      {/* Generating Overlay */}
      {isGenerating && (
        <div className="fixed inset-0 bg-sonicBlueNavy/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
            <Loader2 className="w-16 h-16 animate-spin text-sonicCyan mx-auto mb-6" />
            <h3 className="text-2xl font-black text-gray-800 italic uppercase mb-2">Gerando Exibíveis...</h3>
            <p className="text-gray-500 font-bold mb-6">Por favor, não feche esta janela.</p>
            
            <div className="w-full bg-gray-200 rounded-full h-4 mb-2 overflow-hidden">
              <div 
                className="bg-sonicCyan h-4 rounded-full transition-all duration-300" 
                style={{ width: `${(progress / quantity) * 100}%` }}
              ></div>
            </div>
            <div className="text-gray-600 font-bold">
              {progress} / {quantity}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl max-w-4xl w-full flex flex-col max-h-full overflow-hidden shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center bg-gray-50">
              <h3 className="text-xl font-black text-gray-800 italic uppercase">Prévia do Exibível</h3>
              <button onClick={() => setPreviewModalOpen(false)} className="text-gray-500 hover:text-gray-800 transition-colors">
                <XCircle size={28} />
              </button>
            </div>
            <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center justify-center bg-gray-200">
              {isPreviewLoading ? (
                <div className="text-center text-gray-500">
                  <Loader2 className="w-12 h-12 animate-spin text-sonicCyan mx-auto mb-4" />
                  <p className="font-bold">Gerando prévia final...</p>
                </div>
              ) : previewError ? (
                <div className="text-red-500 font-bold text-center">
                  <XCircle className="w-12 h-12 mx-auto mb-2" />
                  {previewError}
                </div>
              ) : previewImage ? (
                <>
                  <div className="mb-4 bg-green-100 text-green-700 font-bold px-4 py-2 rounded-lg flex items-center gap-2 border border-green-300">
                    <CheckCircle size={20} />
                    QR CODE GERADO E LIDO COM SUCESSO!
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewImage} alt="Prévia" className="max-h-[60vh] object-contain shadow-lg rounded-xl" />
                </>
              ) : null}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
