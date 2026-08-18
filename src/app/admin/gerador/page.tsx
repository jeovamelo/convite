"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Upload, Download, Loader2, Image as ImageIcon, Settings2, QrCode, Type, CheckCircle, Eye, Save, XCircle, Search, Check, Plus, Printer, ChevronDown, FileSpreadsheet, FileText, Filter, RefreshCw } from "lucide-react";
import { Rnd } from "react-rnd";
import { QRCodeSVG } from "qrcode.react";
import JSZip from "jszip";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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
  const [isArtLoading, setIsArtLoading] = useState(false);
  const [artLoadError, setArtLoadError] = useState<string | null>(null);
  
  const [naturalWidth, setNaturalWidth] = useState(1);
  const [naturalHeight, setNaturalHeight] = useState(1);

  // imgRef tracks the actual rendered <img> element so we can measure
  // its rendered width/height precisely (not the wrapping container).
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1);
  // scale = naturalWidth / rendered_img_width  (used to convert DOM px ↔ natural px)
  const [scale, setScale] = useState(1);
  const [scaleY, setScaleY] = useState(1);

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

  // Tickets List State
  const [tickets, setTickets] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"TODOS" | "DISPONIVEL" | "UTILIZADO" | "ENVIADO" | "PENDENTE">("TODOS");
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isBatchSaving, setIsBatchSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Inline editing: cada linha é editável direto na tabela, com auto-save
  // (debounce) e salvamento imediato ao sair do campo (blur).
  const [drafts, setDrafts] = useState<Record<string, { guest_name: string; whatsapp: string }>>({});
  const [rowStatus, setRowStatus] = useState<Record<string, "saving" | "saved" | "error" | undefined>>({});
  const draftsRef = useRef(drafts);
  draftsRef.current = drafts;
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const handleSaveAllTickets = async () => {
    setIsBatchSaving(true);
    setToastMessage(null);

    // Reset all row statuses to 'saving'
    const savingMap: Record<string, 'saving'> = {};
    tickets.forEach(t => { savingMap[t.id] = 'saving'; });
    setRowStatus(savingMap);

    let errorCount = 0;

    // Save guest_name + whatsapp for each ticket (one-by-one to track status per row)
    await Promise.all(
      tickets.map(async t => {
        const draft = draftsRef.current[t.id];
        const guest_name = draft ? draft.guest_name : t.guest_name;
        const whatsapp = draft ? draft.whatsapp : t.whatsapp;
        try {
          const res = await fetch("/api/tickets", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: t.id, guest_name: guest_name || "", whatsapp: whatsapp || "" })
          });
          if (!res.ok) throw new Error(await res.text());
          setRowStatus(prev => ({ ...prev, [t.id]: "saved" }));
        } catch {
          errorCount++;
          setRowStatus(prev => ({ ...prev, [t.id]: "error" }));
        }
      })
    );

    // Save sent status separately (best-effort, silently)
    await Promise.allSettled(
      tickets.map(t =>
        fetch("/api/tickets/sent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticket_id: t.id, is_sent: Boolean(t.is_sent) })
        })
      )
    );

    // Auto-clear 'saved' statuses after 3s
    setTimeout(() => {
      setRowStatus(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => { if (next[k] === 'saved') delete next[k]; });
        return next;
      });
    }, 3000);

    if (errorCount === 0) {
      setToastMessage("✓ Lista de exibíveis salva com sucesso!");
    } else {
      setToastMessage(`${errorCount} erro(s) ao salvar. Verifique as linhas marcadas.`);
    }
    setTimeout(() => setToastMessage(null), 5000);
    setIsBatchSaving(false);
  };

  const filteredTickets = tickets.filter(t => {
    const query = searchQuery.toLowerCase();
    const isSent = Boolean(t.is_sent || t.sent_status === 'SENT' || t.sent_status === 'ENVIADO');
    const sentLabel = isSent ? "enviado" : "pendente";
    const isUsed = t.status === 'USED';

    // Status filter
    if (statusFilter === "DISPONIVEL" && isUsed) return false;
    if (statusFilter === "UTILIZADO" && !isUsed) return false;
    if (statusFilter === "ENVIADO" && !isSent) return false;
    if (statusFilter === "PENDENTE" && isSent) return false;

    // Text search
    if (!query) return true;
    return (
      t.public_id?.toLowerCase().includes(query) ||
      t.guest_name?.toLowerCase().includes(query) ||
      t.whatsapp?.toLowerCase().includes(query) ||
      sentLabel.includes(query)
    );
  });

  // Counts per status (across all tickets in real-time)
  const statusCounts = useMemo(() => {
    const total = tickets.length;
    const disponivel = tickets.filter(t => t.status === 'AVAILABLE').length;
    const utilizado = tickets.filter(t => t.status === 'USED' || t.status === 'UTILIZADO').length;
    const enviado = tickets.filter(t => Boolean(t.is_sent || t.sent_status === 'SENT' || t.sent_status === 'ENVIADO')).length;
    const pendente = total - enviado;
    return {
      TODOS: total,
      DISPONIVEL: disponivel,
      UTILIZADO: utilizado,
      ENVIADO: enviado,
      PENDENTE: pendente
    };
  }, [tickets]);

  const handleToggleSent = async (id: string, currentIsSent: boolean) => {
    const nextState = !currentIsSent;
    
    // 1. Optimistic UI update
    setTickets(prev =>
      prev.map(t => (t.id === id || t.public_id === id) ? { ...t, is_sent: nextState } : t)
    );
    setRowStatus(prev => ({ ...prev, [id]: "saving" }));

    try {
      const res = await fetch("/api/tickets/sent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticket_id: id, is_sent: nextState })
      });

      if (res.ok) {
        setRowStatus(prev => ({ ...prev, [id]: "saved" }));
        setTimeout(() => {
          setRowStatus(prev => (prev[id] === "saved" ? { ...prev, [id]: undefined } : prev));
        }, 2000);
      } else {
        console.error("Erro ao salvar status de envio:", await res.text().catch(() => ''));
        // Reverte o estado em caso de erro
        setTickets(prev =>
          prev.map(t => (t.id === id || t.public_id === id) ? { ...t, is_sent: currentIsSent } : t)
        );
        setRowStatus(prev => ({ ...prev, [id]: "error" }));
      }
    } catch (e) {
      console.error("Erro ao salvar status de envio:", e);
      // Reverte o estado em caso de falha de conexão
      setTickets(prev =>
        prev.map(t => (t.id === id || t.public_id === id) ? { ...t, is_sent: currentIsSent } : t)
      );
      setRowStatus(prev => ({ ...prev, [id]: "error" }));
    }
  };

  // ── Regenerate Single Ticket Image (No DB mutation) ─────────────────────
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [regeneratedSuccessId, setRegeneratedSuccessId] = useState<string | null>(null);

  const handleRegenerateSingle = async (ticket: any) => {
    if (!ticket || !ticket.public_id) return;
    setRegeneratingId(ticket.public_id);
    setToastMessage(null);

    try {
      const formData = new FormData();
      if (imageFile) {
        formData.append("image", imageFile);
      } else if (imagePreview && imagePreview.startsWith("data:image/")) {
        formData.append("image_data_url", imagePreview);
      }

      formData.append("qr_x", Math.round(qrConfig.x).toString());
      formData.append("qr_y", Math.round(qrConfig.y).toString());
      formData.append("qr_size", Math.round(qrConfig.size).toString());

      formData.append("id_x", Math.round(idConfig.x).toString());
      formData.append("id_y", Math.round(idConfig.y).toString());
      formData.append("id_width", Math.round(idConfig.width).toString());
      formData.append("id_height", Math.round(idConfig.height).toString());
      formData.append("id_color", idConfig.color);
      formData.append("id_fontSize", Math.round(idConfig.fontSize).toString());
      formData.append("id_fontWeight", idConfig.fontWeight);

      formData.append("public_id", ticket.public_id);
      formData.append("token", ticket.public_id);
      formData.append("is_preview", "true"); // CRITICAL: is_preview = "true" prevents DB insertion/update!
      formData.append("peoplePerInvite", (ticket.quantidade_pessoas || 1).toString());
      if (selectedLayoutId) formData.append("layout_id", selectedLayoutId);

      const res = await fetch("/api/generate/single", {
        method: "POST",
        body: formData
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Erro ao regenerar exibível ${ticket.public_id}`);
      }

      const blob = await res.blob();
      const fileName = `exibivel_${ticket.public_id}.png`;

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setRegeneratedSuccessId(ticket.public_id);
      setTimeout(() => setRegeneratedSuccessId(null), 3500);

      setToastMessage(`✓ Imagem do exibível ${ticket.public_id} regenerada e baixada!`);
      setTimeout(() => setToastMessage(null), 4000);
    } catch (e: any) {
      console.error("[handleRegenerateSingle]", e);
      alert(e.message || "Erro ao regenerar imagem do exibível.");
    } finally {
      setRegeneratingId(null);
    }
  };


  
  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / itemsPerPage));
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // ── Export helpers ──────────────────────────────────────────────────────
  // Helper: returns the data source for exports (filtered if filter active, otherwise all)
  const getExportData = () => {
    const hasFilter = searchQuery.trim() !== '' || statusFilter !== 'TODOS';
    return hasFilter ? filteredTickets : tickets;
  };

  const mapTicketRow = (t: any) => {
    const isSent = Boolean(t.is_sent || t.sent_status === 'SENT' || t.sent_status === 'ENVIADO');
    return {
      "ID Exibível": t.public_id || "",
      "Nome do Convidado": t.guest_name || "",
      "WhatsApp": t.whatsapp || "",
      "Pessoas": t.quantidade_pessoas ?? 1,
      "Status Uso": t.status === 'USED' ? "Utilizado" : "Disponível",
      "Enviado": isSent ? "✓ Enviado" : "Pendente"
    };
  };

  const exportToCSV = () => {
    const data = getExportData();
    const header = ["ID Exibível", "Nome do Convidado", "WhatsApp", "Pessoas", "Status Uso", "Enviado"];
    const rows = data.map(t => {
      const row = mapTicketRow(t);
      return header.map(h => row[h as keyof typeof row]);
    });
    const csvContent = [header, ...rows]
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `exibiveis-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportMenuOpen(false);
  };

  const exportToExcel = () => {
    const data = getExportData().map(mapTicketRow);
    const ws = XLSX.utils.json_to_sheet(data);
    // Column widths
    ws['!cols'] = [
      { wch: 14 }, // ID Exibível
      { wch: 30 }, // Nome do Convidado
      { wch: 18 }, // WhatsApp
      { wch: 10 }, // Pessoas
      { wch: 14 }, // Status Uso
      { wch: 14 }, // Enviado
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Exibíveis");
    XLSX.writeFile(wb, `exibiveis-${new Date().toISOString().slice(0,10)}.xlsx`);
    setExportMenuOpen(false);
  };

  const buildPDF = (forPrint = false) => {
    const data = getExportData();
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('LISTA DE EXIBÍVEIS — Aniversário do Luiz Maurício', 14, 16);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const filterLabel = (searchQuery.trim() || statusFilter !== 'TODOS') ? ' (filtrado)' : '';
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}  |  Total: ${data.length} exibíveis${filterLabel}`, 14, 22);

    const tableRows = data.map(t => {
      const row = mapTicketRow(t);
      return [row["ID Exibível"], row["Nome do Convidado"], row["WhatsApp"], row["Pessoas"], row["Status Uso"], row["Enviado"]];
    });

    autoTable(doc, {
      head: [['ID Exibível', 'Nome do Convidado', 'WhatsApp', 'Pessoas', 'Status Uso', 'Enviado']],
      body: tableRows,
      startY: 28,
      theme: 'grid',
      styles: {
        fontSize: 8.5,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [10, 25, 47], // Cor tema azul marinho
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      columnStyles: {
        0: { cellWidth: 24 }, // ID Exibível (ex: LM-0001)
        1: { cellWidth: 'auto' }, // Nome do Convidado (Flexível)
        2: { cellWidth: 32 }, // WhatsApp
        3: { cellWidth: 16, halign: 'center' }, // Pessoas
        4: { cellWidth: 24, halign: 'center' }, // Status Uso
        5: { cellWidth: 22, halign: 'center' }  // Enviado
      }
    });

    if (forPrint) {
      doc.autoPrint();
    }

    return doc;
  };

  const exportToPDF = () => {
    setExportMenuOpen(false);
    try {
      const doc = buildPDF();
      doc.save(`exibiveis-${new Date().toISOString().slice(0,10)}.pdf`);
    } catch (e: any) {
      alert('Erro ao gerar PDF: ' + e.message);
    }
  };

  const handlePrint = () => {
    try {
      const doc = buildPDF(true);
      const pdfBlob = doc.output('blob');
      const url = URL.createObjectURL(pdfBlob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.focus();
      }
    } catch (e: any) {
      alert('Erro ao gerar PDF para impressão: ' + e.message);
    }
  };

  // Reset page to 1 when search or limit changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, itemsPerPage, statusFilter]);

  const loadTickets = async () => {
    setLoadingTickets(true);
    try {
      let res = await fetch("/api/tickets");
      let data = await res.json();
      let list = data.tickets || [];

      // Se os tickets existirem mas os nomes da lista (LM-0002+) estiverem vazios, executa auto-seed no banco
      const needsSeed = list.length > 0 && list.some((t: any) => !t.guest_name && t.public_id === "LM-0002");
      if (needsSeed) {
        console.log("[SEED] Executando preenchimento dos 115 convidados no banco...");
        await fetch("/api/seed-guests");
        res = await fetch("/api/tickets");
        data = await res.json();
        list = data.tickets || [];
      }

      // Merge sent status from separate table
      try {
        const sentRes = await fetch("/api/tickets/sent");
        if (sentRes.ok) {
          const sentData = await sentRes.json();
          const sentMap: Record<string, boolean> = {};
          (sentData.data || []).forEach((s: any) => {
            if (s.ticket_id) sentMap[s.ticket_id] = Boolean(s.is_sent);
            if (s.id) sentMap[s.id] = Boolean(s.is_sent);
            if (s.public_id) sentMap[s.public_id] = Boolean(s.is_sent);
          });
          list = list.map((t: any) => ({
            ...t,
            is_sent: sentMap[t.id] ?? sentMap[t.public_id] ?? Boolean(t.is_sent),
          }));
        }
      } catch {
        // sent status table may not exist yet — ignore
      }

      setTickets(list);
    } catch (e) {
      console.error("Erro ao carregar exibiveis", e);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (activeTab === "lista") {
      loadTickets();
    }
  }, [activeTab]);

  // Preenche os rascunhos de edição inline quando a lista carrega
  useEffect(() => {
    const next: Record<string, { guest_name: string; whatsapp: string }> = {};
    tickets.forEach(t => {
      next[t.id] = { guest_name: t.guest_name || "", whatsapp: t.whatsapp || "" };
    });
    setDrafts(next);
  }, [tickets]);

  const saveTicketInline = async (id: string) => {
    const draft = draftsRef.current[id];
    if (!draft) return;

    setRowStatus(prev => ({ ...prev, [id]: "saving" }));
    try {
      const res = await fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          guest_name: draft.guest_name,
          whatsapp: draft.whatsapp
        })
      });
      if (!res.ok) throw new Error("Erro ao salvar dados do convidado");

      // Mantém a lista base sincronizada com o que foi salvo
      setTickets(prev => prev.map(t => t.id === id ? { ...t, guest_name: draft.guest_name, whatsapp: draft.whatsapp } : t));
      setRowStatus(prev => ({ ...prev, [id]: "saved" }));
      setTimeout(() => {
        setRowStatus(prev => (prev[id] === "saved" ? { ...prev, [id]: undefined } : prev));
      }, 2500);
    } catch (e) {
      console.error(e);
      setRowStatus(prev => ({ ...prev, [id]: "error" }));
    }
  };

  const scheduleInlineSave = (id: string) => {
    clearTimeout(saveTimers.current[id]);
    saveTimers.current[id] = setTimeout(() => saveTicketInline(id), 800);
  };

  const handleInlineChange = (id: string, field: "guest_name" | "whatsapp", value: string) => {
    setDrafts(prev => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
    setRowStatus(prev => ({ ...prev, [id]: undefined }));
    scheduleInlineSave(id);
  };

  const handleInlineBlur = (id: string) => {
    clearTimeout(saveTimers.current[id]);
    const ticket = tickets.find(t => t.id === id);
    const draft = draftsRef.current[id];
    if (!ticket || !draft) return;
    const changed =
      (ticket.guest_name || "") !== draft.guest_name ||
      (ticket.whatsapp || "") !== draft.whatsapp;
    if (changed) saveTicketInline(id);
  };

  // Layout Management State
  const [layouts, setLayouts] = useState<{id: string, name: string}[]>([]);
  const [selectedLayoutId, setSelectedLayoutId] = useState<string>("");
  const [isCreatingLayout, setIsCreatingLayout] = useState(false);
  const [newLayoutName, setNewLayoutName] = useState("");

  // Load Layouts list
  const loadLayouts = async () => {
    try {
      const res = await fetch("/api/settings/list");
      const data = await res.json();
      if (data.layouts) {
        setLayouts(data.layouts);
        
        // If selectedLayoutId is not set, load the last worked layout from localStorage or default to the first one in the list
        const saved = localStorage.getItem("selectedLayoutId");
        if (saved && data.layouts.some((l: any) => l.id === saved)) {
          setSelectedLayoutId(saved);
        } else if (data.layouts.length > 0) {
          setSelectedLayoutId(data.layouts[0].id);
        }
      }
    } catch (e) {
      console.error("Erro ao carregar layouts", e);
    }
  };

  useEffect(() => {
    loadLayouts();
  }, []);

  // Save selected layout to localStorage
  useEffect(() => {
    if (selectedLayoutId) {
      localStorage.setItem("selectedLayoutId", selectedLayoutId);
    }
  }, [selectedLayoutId]);

  // Load Settings and Image for selected layout
  useEffect(() => {
    if (!selectedLayoutId) return;
    
    // Reset image preview when changing layout
    setImageFile(null);
    setImagePreview(null);
    setIsArtLoading(false);
    setArtLoadError(null);
    
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
          setIsArtLoading(true);
          setArtLoadError(null);
          setImagePreview(data.image);
        }
      }).catch(console.error);
  }, [selectedLayoutId]);


  // Close export menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Auto-save debounce — only when a layout is actually selected
  useEffect(() => {
    if (!selectedLayoutId) return;
    const timer = setTimeout(() => {
      handleSaveConfig(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [qrConfig, idConfig, quantity, peoplePerInvite, selectedLayoutId]);

  const handleSaveConfig = async (isAuto = false) => {
    if (!isAuto) setIsSaving(true);

    // Guard: don't attempt save without a valid layout
    if (!selectedLayoutId) {
      if (!isAuto) setError("Selecione um layout antes de salvar.");
      if (!isAuto) setIsSaving(false);
      return;
    }

    try {
      const layoutName = layouts.find(l => l.id === selectedLayoutId)?.name;
      const payload: Record<string, any> = {
        id: selectedLayoutId,
        qr_x: Math.round(qrConfig.x), qr_y: Math.round(qrConfig.y), qr_size: Math.round(qrConfig.size),
        id_x: Math.round(idConfig.x), id_y: Math.round(idConfig.y), id_width: Math.round(idConfig.width), id_height: Math.round(idConfig.height),
        id_color: idConfig.color, id_fontSize: Math.round(idConfig.fontSize), id_fontWeight: idConfig.fontWeight,
        quantity: Math.round(quantity), peoplePerInvite: Math.round(peoplePerInvite)
      };
      if (layoutName) payload.name = layoutName;

      const settingsRes = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!settingsRes.ok) {
        const errData = await settingsRes.json().catch(() => null);
        const msg = errData?.error || "Falha ao salvar configurações.";
        // On auto-save, only log to console — never show the error banner
        if (isAuto) { console.warn('[auto-save]', msg); return; }
        throw new Error(msg);
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
      // Only propagate to the error banner on manual saves
      if (!isAuto) {
        setError(e instanceof Error ? e.message : "Falha ao salvar.");
      }
      console.error('[handleSaveConfig]', e);
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

  // Recalculates scale whenever the rendered image dimensions change.
  const recalcScale = (img: HTMLImageElement) => {
    const renderedW = img.offsetWidth;
    const renderedH = img.offsetHeight;
    if (renderedW > 0 && img.naturalWidth > 0) {
      setNaturalWidth(img.naturalWidth);
      setNaturalHeight(img.naturalHeight);
      setScale(img.naturalWidth / renderedW);
      setScaleY(img.naturalHeight / renderedH);
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    }
  };

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsArtLoading(false);
    setArtLoadError(null);
    recalcScale(e.currentTarget);
  };

  const handleImageError = () => {
    setIsArtLoading(false);
    setArtLoadError("Não foi possível carregar a arte original. Verifique sua conexão e tente novamente.");
  };

  // ResizeObserver on the img itself to handle window/panel resize.
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const ro = new ResizeObserver(() => {
      if (img.naturalWidth > 0) recalcScale(img);
    });
    ro.observe(img);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imagePreview]);

  const buildFormData = (publicId: string, token: string, isPreview: boolean) => {
    const formData = new FormData();
    if (imageFile) {
      formData.append("image", imageFile);
    } else if (imagePreview && imagePreview.startsWith("data:image/")) {
      formData.append("image_data_url", imagePreview);
    }
    
    // As configurações já estão em pixels naturais da imagem-base
    // (o Rnd multiplica por `scale` só para exibir; o servidor espera naturais).
    // Multiplicar aqui de novo causava dupla escala: QR minúsculo/fora do
    // lugar e texto do ID cortado na prévia e na geração em lote.
    formData.append("qr_x", Math.round(qrConfig.x).toString());
    formData.append("qr_y", Math.round(qrConfig.y).toString());
    formData.append("qr_size", Math.round(qrConfig.size).toString());

    formData.append("id_x", Math.round(idConfig.x).toString());
    formData.append("id_y", Math.round(idConfig.y).toString());
    formData.append("id_width", Math.round(idConfig.width).toString());
    formData.append("id_height", Math.round(idConfig.height).toString());
    formData.append("id_color", idConfig.color);
    formData.append("id_fontSize", Math.round(idConfig.fontSize).toString());
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
    <div className="w-full min-h-[calc(100vh-80px)] flex flex-col relative">
      <div className="mb-6">
        <h2 className="text-3xl font-montserrat font-black italic text-sonicBlueNavy uppercase flex items-center gap-3">
          Editor Visual de Exibíveis 
          {saveStatus === 'Salvo' && <span className="text-sm font-normal text-gray-400 normal-case not-italic tracking-normal">({saveStatus})</span>}
        </h2>
        <p className="text-gray-500 font-inter font-bold">Posicione os elementos diretamente sobre a imagem.</p>
        
        {saveStatus && saveStatus !== 'Salvo' && (
          <p className="text-green-600 font-bold text-sm mt-1 animate-pulse">{saveStatus}</p>
        )}
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

      <div className="flex flex-col lg:flex-row gap-6 pb-10 flex-1">
        
        {/* LEFT COLUMN: Properties & Configurations (Visible only in "editor" tab) */}
        {activeTab === 'editor' && (
          <div className="w-80 flex flex-col gap-6 shrink-0">

            {/* 1. Imagem Base */}
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

            {/* 2. Camadas */}
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
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
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

            {/* 3. Configuração do Lote */}
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
            {/* Stack de Botões de Ação na ordem vertical solicitada */}
            <div className="flex flex-col gap-3">
              {/* 1. Prévia */}
              <button 
                onClick={handlePreview}
                disabled={(!imageFile && !imagePreview) || isGenerating}
                className="w-full bg-sonicCyan hover:bg-[#1da5cf] text-white font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
              >
                <Eye size={20} /> PRÉVIA
              </button>

              {/* 2. Salvar */}
              <button 
                onClick={() => handleSaveConfig(false)}
                disabled={isSaving}
                className="w-full bg-sonicBlueNavy hover:bg-sonicBlueMain text-white font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-md disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                SALVAR
              </button>

              {/* 3. Gerar */}
              <button 
                onClick={handleBatchGenerate}
                disabled={isGenerating || (!imageFile && !imagePreview)}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-4 px-6 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 transition-colors shadow-md"
              >
                {isGenerating ? <Loader2 className="animate-spin" size={20} /> : <Download size={20} />}
                GERAR
              </button>
            </div>

          </div>
        )}

        {/* RIGHT/MAIN PANEL: Tabs Navigation */}
        <div className="flex-1 flex flex-col gap-6 w-full">
          
          {/* Custom Tabs Navigation */}
          <div className="flex border-b border-gray-200 bg-white px-6 rounded-2xl shadow-sm">
            <button 
              onClick={() => setActiveTab('editor')}
              className={`font-black uppercase text-xs tracking-wider py-4 px-6 border-b-4 transition-colors ${activeTab === 'editor' ? 'border-sonicBlueMain text-sonicBlueMain' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Editor
            </button>
            <button 
              onClick={() => setActiveTab('lista')}
              className={`font-black uppercase text-xs tracking-wider py-4 px-6 border-b-4 transition-colors ${activeTab === 'lista' ? 'border-sonicBlueMain text-sonicBlueMain' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Lista de Exibíveis
            </button>
          </div>

          {/* Tab Content 1: Editor */}
          {activeTab === 'editor' && (
            <div className="flex-1 bg-gray-200 rounded-3xl overflow-hidden shadow-inner flex items-center justify-center p-8 relative min-h-[500px]">
              
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
                    ref={imgRef}
                    src={imagePreview}
                    alt="Canvas"
                    crossOrigin="anonymous"
                    className="max-w-full max-h-[700px] block pointer-events-none select-none"
                    onLoad={handleImageLoad}
                    onError={handleImageError}
                  />

                  {isArtLoading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-200/90 rounded">
                      <Loader2 size={40} className="animate-spin text-sonicBlueMain mb-3" />
                      <p className="font-bold text-gray-600 text-sm">Carregando arte original...</p>
                    </div>
                  )}

                  {artLoadError && !isArtLoading && (
                    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-gray-200/95 rounded p-6 text-center">
                      <p className="font-bold text-red-600 text-sm mb-3">{artLoadError}</p>
                      <button
                        type="button"
                        onClick={() => {
                          setIsArtLoading(true);
                          setArtLoadError(null);
                          setImagePreview((prev) => prev ? prev.split("?")[0] + "?t=" + Date.now() : prev);
                        }}
                        className="bg-sonicBlueMain hover:bg-sonicBlueDark text-white font-bold px-4 py-2 rounded-xl text-xs transition-colors"
                      >
                        Tentar novamente
                      </button>
                    </div>
                  )}

                  {/* QR Code RND Component */}
                  <Rnd
                    size={{ width: qrConfig.size / scale, height: qrConfig.size / scaleY }}
                    position={{ x: qrConfig.x / scale, y: qrConfig.y / scaleY }}
                    onDragStop={(e, d) => {
                      setQrConfig(prev => ({ ...prev, x: Math.round(d.x * scale), y: Math.round(d.y * scaleY) }));
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      setQrConfig({
                        x: Math.round(position.x * scale),
                        y: Math.round(position.y * scaleY),
                        size: Math.round(ref.offsetWidth * scale)
                      });
                    }}
                    bounds="parent"
                    lockAspectRatio={true}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setSelectedElement("qr");
                    }}
                    enableResizing={{
                      topLeft: selectedElement === "qr",
                      topRight: selectedElement === "qr",
                      bottomLeft: selectedElement === "qr",
                      bottomRight: selectedElement === "qr"
                    }}
                    disableDragging={isGenerating}
                    className={`border-2 ${selectedElement === "qr" ? "border-sonicCyan z-40" : "border-transparent hover:border-gray-400 z-30"}`}
                  >
                    <div className="w-full h-full bg-white p-1 relative flex items-center justify-center">
                      <QRCodeSVG
                        value="https://convite.ilocseguro.com/evento/LM-0001"
                        size={512}
                        level="H"
                        style={{ width: "100%", height: "100%" }}
                      />
                      {selectedElement === "qr" && <div className="absolute -top-6 left-0 bg-sonicCyan text-white text-[10px] font-bold px-2 py-1 rounded shadow">QR CODE</div>}
                    </div>
                  </Rnd>

                  {/* ID RND Component */}
                  <Rnd
                    size={{ width: idConfig.width / scale, height: idConfig.height / scaleY }}
                    position={{ x: idConfig.x / scale, y: idConfig.y / scaleY }}
                    onDragStop={(e, d) => {
                      setIdConfig(prev => ({ ...prev, x: Math.round(d.x * scale), y: Math.round(d.y * scaleY) }));
                    }}
                    onResizeStop={(e, direction, ref, delta, position) => {
                      setIdConfig(prev => ({
                        ...prev,
                        x: Math.round(position.x * scale),
                        y: Math.round(position.y * scaleY),
                        width: Math.round(ref.offsetWidth * scale),
                        height: Math.round(ref.offsetHeight * scaleY)
                      }));
                    }}
                    bounds="parent"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setSelectedElement("id");
                    }}
                    enableResizing={{
                      left: selectedElement === "id",
                      right: selectedElement === "id",
                      top: selectedElement === "id",
                      bottom: selectedElement === "id",
                      topLeft: selectedElement === "id",
                      topRight: selectedElement === "id",
                      bottomLeft: selectedElement === "id",
                      bottomRight: selectedElement === "id"
                    }}
                    disableDragging={isGenerating}
                    className={`border-2 flex items-center justify-center ${selectedElement === "id" ? "border-sonicCyan z-40" : "border-transparent hover:border-gray-400 z-30"}`}
                  >
                    <span
                      className="font-montserrat leading-none text-center select-none block w-full whitespace-nowrap"
                      style={{
                        fontSize: `${idConfig.fontSize / scale}px`,
                        color: idConfig.color,
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
          )}

          {/* Tab Content 2: Lista */}
          {activeTab === 'lista' && (
            <div className="flex-1 bg-white rounded-3xl shadow-sm p-8 flex flex-col min-h-[500px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                  <h3 className="text-2xl font-black italic text-gray-800 uppercase">Lista de Exibíveis Gerados</h3>
                  <p className="text-gray-500 font-bold text-sm">Digite nome e WhatsApp direto na lista — salva automaticamente.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto flex-wrap">
                  {/* Limit selector */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-gray-400 uppercase">Por Página:</span>
                    <select
                      value={itemsPerPage}
                      onChange={e => setItemsPerPage(parseInt(e.target.value, 10))}
                      className="border rounded-xl p-2 font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div className="relative w-full sm:w-64 md:w-80">
                    <input 
                      type="text" 
                      placeholder="Buscar por ID, Nome ou WhatsApp..." 
                      className="w-full pl-10 pr-4 py-2.5 border rounded-xl font-bold text-gray-900 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-sonicCyan"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                    <Search className="absolute left-3.5 top-3.5 text-gray-400" size={18} />
                  </div>

                  {/* Single ID Quick Regenerate Button */}
                  {filteredTickets.length === 1 && (
                    <button
                      type="button"
                      onClick={() => handleRegenerateSingle(filteredTickets[0])}
                      disabled={regeneratingId === filteredTickets[0].public_id}
                      className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white font-black px-4 py-2.5 rounded-xl shadow-md transition-all text-sm shrink-0 disabled:opacity-50 cursor-pointer no-print"
                      title={`Regenerar e baixar imagem do exibível ${filteredTickets[0].public_id}`}
                    >
                      {regeneratingId === filteredTickets[0].public_id ? <Loader2 className="animate-spin" size={18} /> : <RefreshCw size={18} />}
                      <span>REGENERAR {filteredTickets[0].public_id}</span>
                    </button>
                  )}

                  {/* ── EXPORT Dropdown ── */}
                  <div className="relative shrink-0 no-print" ref={exportMenuRef}>
                    <button
                      type="button"
                      onClick={() => setExportMenuOpen(p => !p)}
                      className="flex items-center gap-2 bg-sonicBlueNavy hover:bg-sonicBlueMain text-white font-black px-5 py-2.5 rounded-xl shadow-md transition-all text-sm"
                    >
                      <Download size={18} />
                      <span>EXPORTAR</span>
                      <ChevronDown size={14} className={`transition-transform ${exportMenuOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {exportMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 overflow-hidden min-w-[260px]">
                        <button
                          onClick={exportToExcel}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          <FileSpreadsheet size={18} className="text-green-600" />
                          📊 Exportar para Excel (.xlsx)
                        </button>
                        <button
                          onClick={exportToCSV}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                        >
                          <FileText size={18} className="text-blue-500" />
                          📄 Exportar para CSV (.csv)
                        </button>
                        <button
                          onClick={exportToPDF}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors border-t border-gray-100"
                        >
                          <FileText size={18} className="text-red-500" />
                          📑 Exportar para PDF (.pdf)
                        </button>
                      </div>
                    )}
                  </div>

                  {/* ── PRINT Button ── */}
                  <button
                    type="button"
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-800 text-white font-black px-5 py-2.5 rounded-xl shadow-md transition-all text-sm shrink-0 no-print"
                    title="Gerar PDF e abrir diálogo de impressão"
                  >
                    <Printer size={18} />
                    <span>IMPRIMIR</span>
                  </button>

                  {/* SALVAR LISTA Button */}
                  <button
                    type="button"
                    onClick={handleSaveAllTickets}
                    disabled={isBatchSaving || loadingTickets}
                    className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-black px-5 py-2.5 rounded-xl shadow-md transition-all text-sm shrink-0 disabled:opacity-50 cursor-pointer no-print"
                    title="Salvar todas as alterações da lista de exibíveis"
                  >
                    {isBatchSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    <span>SALVAR LISTA</span>
                  </button>
                </div>
              </div>

              {/* ── Status Filter Pills ── */}
              <div className="flex items-center gap-2 mb-4 flex-wrap no-print">
                <Filter size={16} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-400 uppercase mr-1">Status:</span>
                {(["TODOS", "DISPONIVEL", "UTILIZADO", "ENVIADO", "PENDENTE"] as const).map(s => {
                  const isActive = statusFilter === s;
                  const count = statusCounts[s];
                  const labels: Record<string, string> = {
                    TODOS: "TODOS",
                    DISPONIVEL: "DISPONÍVEL",
                    UTILIZADO: "UTILIZADO",
                    ENVIADO: "ENVIADO",
                    PENDENTE: "PENDENTE"
                  };
                  const activeColors: Record<string, string> = {
                    TODOS: "bg-sonicBlueNavy text-white shadow-md ring-2 ring-sonicBlueNavy/40",
                    DISPONIVEL: "bg-green-600 text-white shadow-md ring-2 ring-green-600/40",
                    UTILIZADO: "bg-red-600 text-white shadow-md ring-2 ring-red-600/40",
                    ENVIADO: "bg-emerald-600 text-white shadow-md ring-2 ring-emerald-600/40",
                    PENDENTE: "bg-amber-600 text-white shadow-md ring-2 ring-amber-600/40",
                  };
                  const inactiveColors: Record<string, string> = {
                    TODOS: "bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200",
                    DISPONIVEL: "bg-green-50 text-green-800 hover:bg-green-100 border border-green-200/60",
                    UTILIZADO: "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200/60",
                    ENVIADO: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60",
                    PENDENTE: "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/60",
                  };

                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setStatusFilter(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all duration-200 cursor-pointer select-none active:scale-95 flex items-center gap-1.5 ${
                        isActive ? activeColors[s] : inactiveColors[s]
                      }`}
                    >
                      <span>{labels[s]}</span>
                      <span className={`px-1.5 py-0.2 rounded-full text-[11px] font-black ${
                        isActive ? "bg-white/25 text-white" : "bg-black/10 text-gray-700"
                      }`}>
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>

          {/* Print-only header */}
          <div className="print-header">
            <h1>Lista de Exibíveis — Aniversário do Luiz Maurício</h1>
            <p>Gerado em: {new Date().toLocaleString('pt-BR')} &nbsp;|&nbsp; Total: {tickets.length} exibíveis</p>
          </div>

          {loadingTickets ? (
            <div className="flex-1 flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-sonicCyan w-12 h-12" />
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-between">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 text-xs uppercase font-bold tracking-wider border-b">
                      <th className="p-4 w-32">Exibível</th>
                      <th className="p-4">Nome do Convidado</th>
                      <th className="p-4 w-60">WhatsApp</th>
                      <th className="p-4 w-28 text-center">Pessoas</th>
                      <th className="p-4 w-32 text-center">Uso</th>
                      <th className="p-4 w-40 text-center">Enviado</th>
                      <th className="p-4 w-44 text-center">Imagem</th>
                      <th className="p-4 w-36 text-right">Salvamento</th>
                    </tr>
                  </thead>
                  <tbody className="font-inter text-sm text-gray-800">
                    {filteredTickets.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-8 text-center text-gray-400 font-bold">
                          Nenhum exibível encontrado.
                        </td>
                      </tr>
                    ) : (
                      paginatedTickets.map(t => {
                        const isSent = Boolean(t.is_sent || t.sent_status === 'SENT' || t.sent_status === 'ENVIADO');
                        const isRegenerating = regeneratingId === t.public_id;
                        return (
                          <tr key={t.id} className="hover:bg-gray-50/80 transition-colors border-b last:border-0">
                            <td className="p-4 font-mono font-black text-sonicBlueMain text-base">{t.public_id}</td>
                            <td className="p-4">
                              <input
                                type="text"
                                className="border border-gray-200 focus:border-sonicCyan p-2 rounded-lg font-bold text-gray-900 bg-white w-full text-sm focus:outline-none transition-colors"
                                value={drafts[t.id]?.guest_name ?? ""}
                                onChange={e => handleInlineChange(t.id, "guest_name", e.target.value)}
                                onBlur={() => handleInlineBlur(t.id)}
                                placeholder="Nome do convidado"
                              />
                            </td>
                            <td className="p-4">
                              <input
                                type="text"
                                className="border border-gray-200 focus:border-sonicCyan p-2 rounded-lg font-bold text-gray-900 bg-white w-full text-sm focus:outline-none transition-colors"
                                value={drafts[t.id]?.whatsapp ?? ""}
                                onChange={e => handleInlineChange(t.id, "whatsapp", e.target.value)}
                                onBlur={() => handleInlineBlur(t.id)}
                                placeholder="Ex: 85999999999"
                              />
                            </td>
                            <td className="p-4 font-bold text-base text-center">{t.quantidade_pessoas}</td>
                            <td className="p-4 text-center">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-black uppercase ${
                                t.status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              }`}>
                                {t.status === 'AVAILABLE' ? 'Disponível' : 'Utilizado'}
                              </span>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleSent(t.id, isSent)}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase transition-all duration-200 cursor-pointer border select-none ${
                                  isSent
                                    ? "bg-emerald-100 border-emerald-300 text-emerald-800 hover:bg-emerald-200 active:scale-95 shadow-sm"
                                    : "bg-gray-100 border-gray-200 text-gray-600 hover:bg-gray-200 active:scale-95 shadow-sm"
                                }`}
                                title={isSent ? "Marcar como pendente" : "Marcar como enviado"}
                              >
                                {isSent ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                                    <span>✓ Enviado</span>
                                  </>
                                ) : (
                                  <>
                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-gray-400 shrink-0" />
                                    <span>Pendente</span>
                                  </>
                                )}
                              </button>
                            </td>
                            <td className="p-4 text-center">
                              <button
                                type="button"
                                onClick={() => handleRegenerateSingle(t)}
                                disabled={isRegenerating}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sonicBlueNavy hover:bg-sonicBlueMain text-white rounded-xl text-xs font-black uppercase transition-all shadow-sm active:scale-95 disabled:opacity-50 cursor-pointer no-print"
                                title={`Regenerar e baixar imagem do exibível ${t.public_id}`}
                              >
                                {isRegenerating ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <RefreshCw size={14} />
                                )}
                                <span>Regenerar</span>
                              </button>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex justify-end items-center gap-2 min-w-[80px]">
                                {rowStatus[t.id] === "saving" && (
                                  <span className="flex items-center gap-1 text-xs font-bold text-gray-400">
                                    <Loader2 size={14} className="animate-spin" /> Salvando
                                  </span>
                                )}
                                {rowStatus[t.id] === "saved" && (
                                  <span className="flex items-center gap-1 text-xs font-bold text-green-600">
                                    <Check size={14} /> Salvo
                                  </span>
                                )}
                                {rowStatus[t.id] === "error" && (
                                  <span className="flex items-center gap-1 text-xs font-bold text-red-600">
                                    <XCircle size={14} /> Erro ao salvar
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination controls footer */}
              {filteredTickets.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-6 border-t border-gray-100">
                  <div className="text-xs font-bold text-gray-400 uppercase">
                    Mostrando {(currentPage - 1) * itemsPerPage + 1} a {Math.min(currentPage * itemsPerPage, filteredTickets.length)} de {filteredTickets.length} exibíveis
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      className="px-4 py-2 border rounded-xl font-bold text-xs uppercase transition-all disabled:opacity-40 disabled:pointer-events-none hover:bg-gray-50 active:scale-95 text-gray-600"
                    >
                      Anterior
                    </button>
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const page = i + 1;
                        const isCurrent = currentPage === page;
                        // Limit visible pages for high page counts
                        if (totalPages > 6 && Math.abs(currentPage - page) > 1 && page !== 1 && page !== totalPages) {
                          if (page === 2 || page === totalPages - 1) {
                            return <span key={page} className="px-1 text-gray-400 text-xs font-bold">...</span>;
                          }
                          return null;
                        }
                        return (
                          <button
                            key={page}
                            onClick={() => setCurrentPage(page)}
                            className={`w-8 h-8 rounded-lg font-bold text-xs flex items-center justify-center transition-all ${
                              isCurrent 
                                ? "bg-sonicCyan text-white shadow-md shadow-sonicCyan/20" 
                                : "hover:bg-gray-100 text-gray-600"
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      className="px-4 py-2 border rounded-xl font-bold text-xs uppercase transition-all disabled:opacity-40 disabled:pointer-events-none hover:bg-gray-50 active:scale-95 text-gray-600"
                    >
                      Próximo
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}




        </div>
      )}
        </div>
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

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-gray-900 text-white font-bold px-6 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-emerald-500/40 animate-pulse">
          <CheckCircle className="text-emerald-400" size={22} />
          <span className="text-sm font-black">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 text-gray-400 hover:text-white">
            <XCircle size={18} />
          </button>
        </div>
      )}

    </div>
  );
}
