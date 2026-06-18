import React, { useState, useMemo, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  Printer, 
  Filter as FilterIcon, 
  ChevronRight, 
  PieChart as PieIcon, 
  Activity,
  Users,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Send,
  Loader2,
  ThumbsUp,
  AlertTriangle,
  Lightbulb,
  FileEdit,
  ClipboardList,
  RefreshCw,
  MessageSquare,
  Search,
  Quote
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line
} from 'recharts';
import { jsPDF } from 'jspdf';
import * as htmlToImage from 'html-to-image';
import { User, EvaluationForm, SectorEvaluation } from '../types';

interface ReportsPageProps {
  forms: EvaluationForm[];
  evaluations: SectorEvaluation[];
  currentUser: User;
  availableSectors: string[];
}

export const ReportsPage = ({ 
  forms = [], 
  evaluations = [], 
  currentUser,
  availableSectors = []
}: ReportsPageProps) => {
  const currentMonthNum = new Date().getMonth() + 1;
  const currentYearNum = new Date().getFullYear();

  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonthNum);
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);
  const [extraPrompt, setExtraPrompt] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [chatMessage, setChatMessage] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [feedbackSearch, setFeedbackSearch] = useState('');
  const [feedbackFilter, setFeedbackFilter] = useState<'all' | 'promoters' | 'neutrals' | 'detractors'>('all');

  // Dynamic state for the current active AI report
  const [aiReport, setAiReport] = useState<{
    praisePoints: string[];
    criticalAlerts: string[];
    strategicActions: string[];
    conclusionText: string;
  } | null>(null);

  const [isEditingReport, setIsEditingReport] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { 
      role: 'assistant', 
      content: 'Olá! Desenvolvi o estudo analítico inicial para este mês. Se houver necessidade de ajustes ou refinamentos específicos, digite abaixo ou utilize as recomendações rápidas de estilo.' 
    }
  ]);

  // Sectors checklist to use as standard: exact 12 items
  const defaultSectors = [
    "Portaria/ Segurança", 
    "Recepção Geral", 
    "Sinais Vitais - Triagem", 
    "Consulta Médica", 
    "Consulta Multiprofissional (Psicólogo(a), Fisioterapeuta, Fonoaudiólogo(a), Nutricionista, T.O, outros)", 
    "Realização de Exames (Raio x, mamografia, ultrassom, outros)", 
    "Laboratório (sangue, urina, outros)", 
    "Entrega de Exames", 
    "Centro Especializado em Reabilitação - CER (NEP, Fisioterapia)", 
    "Ambiente (conforto e acomodações)", 
    "Limpeza e organização dos ambientes", 
    "Higiene e organização dos banheiros"
  ];

  const mapOldToNewSector = (name: string): string => {
    const norm = name.trim();
    switch (norm) {
      case "Portaria/Segurança":
        return "Portaria/ Segurança";
      case "Triagem":
        return "Sinais Vitais - Triagem";
      case "Consultas Médicas":
        return "Consulta Médica";
      case "Consultas Multiprofissionais":
        return "Consulta Multiprofissional (Psicólogo(a), Fisioterapeuta, Fonoaudiólogo(a), Nutricionista, T.O, outros)";
      case "Realização de Exames":
        return "Realização de Exames (Raio x, mamografia, ultrassom, outros)";
      case "Laboratório":
        return "Laboratório (sangue, urina, outros)";
      case "CER (Centro Especializado em Reabilitação)":
        return "Centro Especializado em Reabilitação - CER (NEP, Fisioterapia)";
      case "Ambiente (Conforto, Temperatura, Espaço)":
        return "Ambiente (conforto e acomodações)";
      case "Limpeza (Conservação Geral)":
        return "Limpeza e organização dos ambientes";
      case "Higiene e Organização dos Banheiros":
        return "Higiene e organização dos banheiros";
      default:
        return norm;
    }
  };

  const SECTOR_ORDER: Record<string, number> = {
    "Portaria/ Segurança": 1,
    "Recepção Geral": 2,
    "Sinais Vitais - Triagem": 3,
    "Consulta Médica": 4,
    "Consulta Multiprofissional (Psicólogo(a), Fisioterapeuta, Fonoaudiólogo(a), Nutricionista, T.O, outros)": 5,
    "Realização de Exames (Raio x, mamografia, ultrassom, outros)": 6,
    "Laboratório (sangue, urina, outros)": 7,
    "Entrega de Exames": 8,
    "Centro Especializado em Reabilitação - CER (NEP, Fisioterapia)": 9,
    "Ambiente (conforto e acomodações)": 10,
    "Limpeza e organização dos ambientes": 11,
    "Higiene e organização dos banheiros": 12
  };

  const activeSectors = useMemo(() => {
    const mappedAvailable = availableSectors.map(mapOldToNewSector);
    const list = [...defaultSectors];
    mappedAvailable.forEach(s => {
      if (!list.includes(s) && s.length < 150) {
        list.push(s);
      }
    });

    return list.sort((a, b) => {
      const orderA = SECTOR_ORDER[a] ?? 99;
      const orderB = SECTOR_ORDER[b] ?? 99;
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.localeCompare(b);
    });
  }, [availableSectors]);

  // Months labels list
  const MONTHS = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  // Year choices
  const YEARS = [currentYearNum - 1, currentYearNum, currentYearNum + 1];

  const parseToDate = (val: any): Date | null => {
    if (!val) return null;
    if (typeof val.toDate === 'function') {
      return val.toDate();
    }
    if (val.seconds !== undefined) {
      return new Date(val.seconds * 1000);
    }
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d;
  };

  const formDatesMap = useMemo(() => {
    const map = new Map<string, Date>();
    forms.forEach(f => {
      const d = parseToDate(f.date) || parseToDate(f.createdAt);
      if (d) {
        map.set(f.id, d);
      }
    });
    return map;
  }, [forms]);

  // 1. FILTER DATA BY MONTH AND YEAR
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const date = parseToDate(f.date) || parseToDate(f.createdAt);
      if (!date) return false;
      return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [forms, selectedMonth, selectedYear]);

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      const date = formDatesMap.get(e.formId) || parseToDate(e.createdAt);
      if (!date) return false;
      return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [evaluations, formDatesMap, selectedMonth, selectedYear]);

  // 2. COMPUTE MULTIPLE SATISFACTION METRICS
  const metrics = useMemo(() => {
    const totalForms = filteredForms.length;
    const physicalFormsCount = filteredForms.filter(f => f.source === 'physical').length;

    if (totalForms === 0) {
      return {
        totalEvaluations: 0,
        npsGlobal: 0,
        npsClassification: 'Inexistente',
        promotersPercent: 0,
        neutralsPercent: 0,
        detractorsPercent: 0,
        technicalQualityIndex: 0,
        physicalFormsCount: 0,
        sectorsPerformance: {} as Record<string, { positivePercent: number; negativePercent: number; total: number; ratings: Record<string, number> }>
      };
    }

    // NPS calculations
    let promoters = 0;
    let neutrals = 0;
    let detractors = 0;

    filteredForms.forEach(f => {
      if (f.npsScore >= 9) promoters++;
      else if (f.npsScore >= 7) neutrals++;
      else detractors++;
    });

    const promotersPercent = Math.round((promoters / totalForms) * 100);
    const neutralsPercent = Math.round((neutrals / totalForms) * 100);
    const detractorsPercent = Math.round((detractors / totalForms) * 100);
    const npsGlobal = Math.round(((promoters - detractors) / totalForms) * 100);

    let npsClassification = 'Zona de Aperfeiçoamento 😐';
    if (npsGlobal >= 75) npsClassification = 'Zona de Excelência ❤️';
    else if (npsGlobal >= 50) npsClassification = 'Zona de Qualidade 😊';
    else if (npsGlobal >= 0) npsClassification = 'Zona de Aperfeiçoamento 😐';
    else npsClassification = 'Zona Crítica 💀';

    // Sector evaluation calculations
    const sectorsPerformance: Record<string, { positivePercent: number; negativePercent: number; total: number; ratings: Record<string, number> }> = {};
    
    // Initialize active sectors
    activeSectors.forEach(sec => {
      sectorsPerformance[sec] = { positivePercent: 0, negativePercent: 0, total: 0, ratings: { Otimo: 0, Bom: 0, Regular: 0, Ruim: 0 } };
    });

    // Populate ratings from database
    filteredEvaluations.forEach(e => {
      const secName = mapOldToNewSector(e.sector);
      if (!sectorsPerformance[secName]) {
        sectorsPerformance[secName] = { positivePercent: 0, negativePercent: 0, total: 0, ratings: { Otimo: 0, Bom: 0, Regular: 0, Ruim: 0 } };
      }
      if (e.rating in sectorsPerformance[secName].ratings) {
        sectorsPerformance[secName].ratings[e.rating as any]++;
        sectorsPerformance[secName].total++;
      }
    });

    // Calculate rates
    let totalPositiveEvaluations = 0;
    let totalOverallSectorAnswers = 0;

    Object.entries(sectorsPerformance).forEach(([sec, data]) => {
      const { ratings, total } = data;
      if (total > 0) {
        const positive = ratings.Otimo + ratings.Bom;
        const negative = ratings.Regular + ratings.Ruim;
        data.positivePercent = Math.round((positive / total) * 100);
        data.negativePercent = Math.round((negative / total) * 100);

        totalPositiveEvaluations += positive;
        totalOverallSectorAnswers += total;
      } else {
        data.positivePercent = 0;
        data.negativePercent = 0;
      }
    });

    // Approval index: percentage of (Ótimo + Bom) over all evaluations
    const technicalQualityIndex = totalOverallSectorAnswers > 0
      ? Math.round((totalPositiveEvaluations / totalOverallSectorAnswers) * 100)
      : 0;

    return {
      totalEvaluations: totalForms,
      npsGlobal,
      npsClassification,
      promotersPercent,
      neutralsPercent,
      detractorsPercent,
      technicalQualityIndex,
      sectorsPerformance,
      physicalFormsCount
    };
  }, [filteredForms, filteredEvaluations, activeSectors]);

  // List comments with relevant ratings to feed into the AI prompt
  const patientComments = useMemo(() => {
    const list: string[] = [];
    filteredForms.forEach(f => {
      if (f.generalComment && f.generalComment.trim().length > 3) {
        list.push(`NPS Nota ${f.npsScore}: ${f.generalComment}`);
      }
    });
    filteredEvaluations.forEach(e => {
      if (e.comment && e.comment.trim().length > 3) {
        list.push(`Setor ${e.sector} (${e.rating}): ${e.comment}`);
      }
    });
    return list;
  }, [filteredForms, filteredEvaluations]);

  // List structured comments with relevant details for beautiful presentation & filtering
  const detailedPatientFeedbacks = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'nps' | 'sector';
      title: string;
      scoreOrRating: string | number;
      comment: string;
      sentiment: 'promoter' | 'neutral' | 'detractor' | 'otimo' | 'bom' | 'regular' | 'ruim';
      category: 'promoter' | 'neutral' | 'detractor';
      source: string;
      date: string;
    }> = [];

    filteredForms.forEach(f => {
      if (f.generalComment && f.generalComment.trim().length > 3) {
        let category: 'promoter' | 'neutral' | 'detractor' = 'neutral';
        if (f.npsScore >= 9) category = 'promoter';
        else if (f.npsScore <= 6) category = 'detractor';

        list.push({
          id: `f-${f.id || Math.random()}`,
          type: 'nps',
          title: `NPS Nota ${f.npsScore}`,
          scoreOrRating: f.npsScore,
          comment: f.generalComment,
          sentiment: category,
          category,
          source: f.source === 'physical' ? 'Fisíco (Papel)' : 'Totem Digital',
          date: new Date(f.createdAt).toLocaleDateString('pt-BR')
        });
      }
    });

    filteredEvaluations.forEach(e => {
      if (e.comment && e.comment.trim().length > 3) {
        let category: 'promoter' | 'neutral' | 'detractor' = 'neutral';
        if (e.rating === 'Otimo' || e.rating === 'Bom') category = 'promoter';
        else if (e.rating === 'Ruim') category = 'detractor';

        const ratingLabels: Record<string, string> = {
          Otimo: 'Ótimo',
          Bom: 'Bom',
          Regular: 'Regular',
          Ruim: 'Ruim'
        };

        list.push({
          id: `e-${e.id || Math.random()}`,
          type: 'sector',
          title: `Setor ${e.sector}`,
          scoreOrRating: ratingLabels[e.rating] || e.rating,
          comment: e.comment,
          sentiment: e.rating.toLowerCase() as any,
          category,
          source: 'Avaliação de Canis/Setor',
          date: new Date(e.createdAt).toLocaleDateString('pt-BR')
        });
      }
    });

    return list.sort((a, b) => b.id.localeCompare(a.id));
  }, [filteredForms, filteredEvaluations]);

  // Detect sectors that violate the >15% dissatisfaction rule!
  const criticalSectorsAlerts = useMemo(() => {
    return Object.entries(metrics.sectorsPerformance)
      .map(([sector, data]) => {
        const d = data as { positivePercent: number; negativePercent: number; total: number };
        return { sector, ...d };
      })
      .filter(s => s.total > 0 && s.negativePercent > 15);
  }, [metrics]);

  // Reset local report state when selected month/year switches
  useEffect(() => {
    setAiReport(null);
  }, [selectedMonth, selectedYear]);

  // 3. CALL SECURE SERVER-SIDE GEMINI FOR REPORT GENERATION
  const handleGenerateAIReport = async () => {
    setReportLoading(true);
    setReportError(null);
    try {
      const response = await fetch('/api/gemini/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          metrics,
          comments: patientComments,
          extraPrompt
        })
      });

      if (!response.ok) {
        let errorMsg = 'Falha ao conectar com o serviço do Gemini.';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } else {
            const txt = await response.text();
            errorMsg = txt || errorMsg;
          }
        } catch {
          errorMsg = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const reportData = await response.json();
      setAiReport(reportData);
      setReportError(null);
    } catch (err: any) {
      console.error("Erro na ouvidoria inteligente (geração):", err);
      setReportError(err.message || 'Erro desconhecido');
    } finally {
      setReportLoading(false);
    }
  };

  // 4. CHAT DYNAMIC UPDATE (CO-AUTHORING CHAT WITH REAL TIMELINE GRAPHICS)
  const handleSendMessageToAI = async (arg?: any) => {
    let msgText = '';
    if (arg && typeof arg === 'object' && 'preventDefault' in arg) {
      arg.preventDefault();
      msgText = chatMessage;
    } else if (typeof arg === 'string') {
      msgText = arg;
    } else {
      msgText = chatMessage;
    }

    if (!msgText.trim() || !aiReport) return;
    const userMsg = msgText.trim();
    
    // Add user message to chat history immediately
    setChatHistory(prev => [...prev, { role: 'user', content: userMsg }]);
    setChatMessage('');
    setChatLoading(true);
    setChatError(null);

    try {
      const response = await fetch('/api/gemini/chat', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentReport: aiReport,
          message: userMsg
        })
      });

      if (!response.ok) {
        let errorMsg = 'Erro ao ajustar o relatório.';
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const errData = await response.json();
            errorMsg = errData.error || errorMsg;
          } else {
            const txt = await response.text();
            errorMsg = txt || errorMsg;
          }
        } catch {
          errorMsg = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(errorMsg);
      }

      const resData = await response.json();

      if (resData) {
        setAiReport(resData);
        setChatError(null);
        setChatHistory(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: `Relatório atualizado com sucesso com base nas instruções de: "${userMsg}".` 
          }
        ]);
      }
    } catch (error: any) {
      console.error("Erro no chat de ouvidoria inteligente:", error);
      setChatError(error.message);
      setChatHistory(prev => [
        ...prev, 
        { 
          role: 'assistant', 
          content: `Ops, ocorreu um erro ao atualizar: ${error.message}` 
        }
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // 5.1 EXPORT PORTAL/DASHBOARD REPORT (html-to-image + jsPDF Async)
  const handleExportDashboardPDF = async () => {
    const node = document.getElementById('id_reports_page_root');
    if (!node) {
      alert('Elemento do painel não encontrado.');
      return;
    }

    setExporting(true);
    try {
      // Delay to ensure any transitions or animations are rendered
      await new Promise((resolve) => setTimeout(resolve, 400));
      
      const dataUrl = await htmlToImage.toPng(node, {
        backgroundColor: '#F9FAFB', // Light off-white matching page bg
        quality: 0.98,
        pixelRatio: 1.8, // Elegant compromise for high resolution and fast build
      });

      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 295; // A4 height in mm
      
      const imgProps = pdf.getImageProperties(dataUrl);
      const imgHeight = (imgProps.height * imgWidth) / imgProps.width;
      
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(dataUrl, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const monthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || '';
      pdf.save(`Relatorio_Consolidado_Ouvidoria_${monthLabel}_${selectedYear}.pdf`);
    } catch (err: any) {
      console.error('Error generating PDF:', err);
      alert('Erro ao exportar o Painel para PDF.');
    } finally {
      setExporting(false);
    }
  };

  // 5. DOWNLOAD OFFICIAL PDF (Styled elegantly in SUS Forest Green and warm beige accents)
  const handleDownloadPDF = () => {
    if (!aiReport) return;

    const doc = new jsPDF() as any;
    const dateStamp = new Date().toLocaleDateString('pt-BR');
    const selectedMonthLabel = MONTHS.find(m => m.value === selectedMonth)?.label || '';

    // Render Forest green header banner
    doc.setFillColor(1, 64, 46); // #01402E
    doc.rect(0, 0, 210, 48, 'F');

    // Title Block
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(22);
    doc.text('POLICLÍNICA BERNARDO FÉLIX', 105, 18, { align: 'center' });
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(200, 225, 215);
    doc.text('Sistema de Ouvidoria e Monitoramento de Qualidade do SUS', 105, 24, { align: 'center' });
    
    // Period Label
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.text(`RELATÓRIO DE SATISFAÇÃO - ${selectedMonthLabel.toUpperCase()} / ${selectedYear}`, 105, 36, { align: 'center' });

    // Document Metadata
    doc.setFillColor(245, 249, 247);
    doc.rect(15, 55, 180, 25, 'F');
    doc.setDrawColor(220, 235, 225);
    doc.rect(15, 55, 180, 25, 'S');

    doc.setTextColor(1, 64, 46);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('METADADOS DO DOCUMENTO', 20, 61);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Responsável Clínico: ${currentUser.name} (${currentUser.role || 'Ouvidoria'})`, 20, 67);
    doc.text(`Data de Emissão Técnica: ${dateStamp}`, 20, 72);
    doc.text(`Origem dos Dados: Totens Físicos e Pesquisas Móveis do Paciente`, 120, 67);
    doc.text(`Amostras do Mês: ${metrics.totalEvaluations} formulários únicos`, 120, 72);

    // KPI Metrics Section
    doc.setFillColor(250, 247, 240); // Soft beige
    doc.rect(15, 87, 180, 24, 'F');
    doc.rect(15, 87, 180, 24, 'S');

    doc.setTextColor(1, 64, 46);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('KPIs DE SATISFAÇÃO CONSOLIDADO', 20, 93);

    doc.setFontSize(12);
    const cleanNpsClassification = metrics.npsClassification.replace(/[^\w\sÀ-ÿ]/g, '').trim();
    doc.text(`NPS Global: ${metrics.npsGlobal}% (${cleanNpsClassification})`, 20, 101);
    doc.text(`Índice de Aprovação: ${metrics.technicalQualityIndex}%`, 115, 101);

    // AI Praise section
    let currentY = 120;
    doc.setFontSize(12);
    doc.setTextColor(1, 64, 46);
    doc.setFont('helvetica', 'bold');
    doc.text('PONTOS DE DESTAQUE E ELOGIOS', 15, currentY);
    doc.line(15, currentY + 2, 195, currentY + 2);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    aiReport.praisePoints.forEach((p, idx) => {
      const lines = doc.splitTextToSize(`${idx + 1}. ${p}`, 175);
      doc.text(lines, 18, currentY);
      currentY += (lines.length * 4.5) + 2;
    });

    currentY += 4;

    // AI Critical warnings
    doc.setFontSize(12);
    doc.setTextColor(150, 40, 40);
    doc.setFont('helvetica', 'bold');
    doc.text('ALERTA DE DESVIOS E SETORES EXCEDENTES (>15% INSATISFAÇÃO)', 15, currentY);
    doc.line(15, currentY + 2, 195, currentY + 2);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    if (aiReport.criticalAlerts.length === 0) {
      doc.text('Nenhum desvio ou setor crítico com insatisfação expressiva registrado no período atual.', 18, currentY);
      currentY += 6;
    } else {
      aiReport.criticalAlerts.forEach((a, idx) => {
        const lines = doc.splitTextToSize(`* [ALERTA] ${a}`, 175);
        doc.text(lines, 18, currentY);
        currentY += (lines.length * 4.5) + 2;
      });
    }

    currentY += 4;

    // Page break checks for Strategic actions
    if (currentY > 210) {
      doc.addPage();
      currentY = 25;
    }

    // AI Strategic plans
    doc.setFontSize(12);
    doc.setTextColor(1, 64, 46);
    doc.setFont('helvetica', 'bold');
    doc.text('PLANO DE AÇÃO E METAS SUS IMEDIATAS', 15, currentY);
    doc.line(15, currentY + 2, 195, currentY + 2);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    aiReport.strategicActions.forEach((sa, idx) => {
      const lines = doc.splitTextToSize(`Plan ${idx + 1}: ${sa}`, 175);
      doc.text(lines, 18, currentY);
      currentY += (lines.length * 4.5) + 3;
    });

    currentY += 6;

    // Page break checks for Conclusion Text
    if (currentY > 190) {
      doc.addPage();
      currentY = 25;
    }

    // AI Conclusion Text
    doc.setFontSize(12);
    doc.setTextColor(1, 64, 46);
    doc.setFont('helvetica', 'bold');
    doc.text('PARECER FINAL DA OUVIDORIA GERAL', 15, currentY);
    doc.line(15, currentY + 2, 195, currentY + 2);
    currentY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);

    const concLines = doc.splitTextToSize(aiReport.conclusionText, 175);
    doc.text(concLines, 15, currentY);
    currentY += (concLines.length * 4.5) + 15;

    // Signatures
    if (currentY > 255) {
      doc.addPage();
      currentY = 40;
    }

    doc.setLineWidth(0.3);
    doc.setDrawColor(180, 180, 180);
    doc.line(40, currentY, 170, currentY);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(1, 64, 46);
    doc.text(currentUser.name.toUpperCase(), 105, currentY + 5, { align: 'center' });
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(`Responsável Técnico pela Ouvidoria • Cargo: ${currentUser.role || 'Ouvidor Geral'}`, 105, currentY + 9, { align: 'center' });
    doc.text('Policlínica Bernardo Félix da Silva, Ceará', 105, currentY + 13, { align: 'center' });

    // Number pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
    }

    doc.save(`Parecer_Ouvidoria_Policlinica_${selectedMonthLabel}_${selectedYear}.pdf`);
  };

  // Build sector evaluation chart data
  const sectorChartData = useMemo(() => {
    return Object.entries(metrics.sectorsPerformance).map(([sector, data]) => {
      const d = data as { positivePercent: number; negativePercent: number };
      return {
        name: sector,
        'Aprovação': d.positivePercent,
        'Insatisfação': d.negativePercent,
      };
    }).filter(s => s['Aprovação'] > 0 || s['Insatisfação'] > 0);
  }, [metrics]);

  // NPS Trend evolution in the last 6 months
  const last6MonthsNpsData = useMemo(() => {
    const data = [];
    for (let i = 5; i >= 0; i--) {
      let m = selectedMonth - i;
      let y = selectedYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }

      const monthForms = forms.filter(f => {
        const d = parseToDate(f.date) || parseToDate(f.createdAt);
        return d ? (d.getMonth() + 1) === m && d.getFullYear() === y : false;
      });

      const total = monthForms.length;
      let npsValue = 0;
      if (total > 0) {
        let promoters = 0;
        let detractors = 0;
        monthForms.forEach(f => {
          if (f.npsScore >= 9) promoters++;
          else if (f.npsScore <= 6) detractors++;
        });
        npsValue = Math.round(((promoters - detractors) / total) * 100);
      }

      const mInfo = MONTHS.find(item => item.value === m);
      const mLabel = mInfo ? mInfo.label.substring(0, 3) : `${m}`;
      data.push({
        name: `${mLabel}/${String(y).substring(2)}`,
        'NPS': npsValue,
        total
      });
    }
    return data;
  }, [forms, selectedMonth, selectedYear]);

  // Aggregate global ratings for Pie composition
  const compositeRatings = useMemo(() => {
    let otimo = 0;
    let bom = 0;
    let regular = 0;
    let ruim = 0;

    Object.values(metrics.sectorsPerformance).forEach((sectorData: any) => {
      if (sectorData && sectorData.ratings) {
        otimo += sectorData.ratings.Otimo || 0;
        bom += sectorData.ratings.Bom || 0;
        regular += sectorData.ratings.Regular || 0;
        ruim += sectorData.ratings.Ruim || 0;
      }
    });

    const total = otimo + bom + regular + ruim;
    return { otimo, bom, regular, ruim, total };
  }, [metrics]);

  // Composition data for the Pie Chart
  const compositionPieData = useMemo(() => {
    const { otimo, bom, regular, ruim, total } = compositeRatings;
    if (total === 0) {
      return [
        { name: 'Ótimo', value: 0, percentage: 0, color: '#10B981' },
        { name: 'Bom', value: 0, percentage: 0, color: '#3B82F6' },
        { name: 'Regular', value: 0, percentage: 0, color: '#F59E0B' },
        { name: 'Ruim', value: 0, percentage: 0, color: '#EF4444' }
      ];
    }
    return [
      { name: 'Ótimo', value: otimo, percentage: Math.round((otimo / total) * 100), color: '#10B981' },
      { name: 'Bom', value: bom, percentage: Math.round((bom / total) * 100), color: '#3B82F6' },
      { name: 'Regular', value: regular, percentage: Math.round((regular / total) * 100), color: '#F59E0B' },
      { name: 'Ruim', value: ruim, percentage: Math.round((ruim / total) * 100), color: '#EF4444' }
    ];
  }, [compositeRatings]);

  // Get elegant status badge for sectors based on performance
  const getSectorStatus = (data: { ratings: { Otimo: number; Bom: number; Regular: number; Ruim: number }; positivePercent: number; negativePercent: number; total: number }) => {
    if (data.total === 0) {
      return { 
        label: 'Sem Avaliações Registradas', 
        color: 'bg-gray-50 text-gray-400 border-gray-200/50',
        textColor: 'text-gray-400',
        icon: ClipboardList
      };
    }
    
    const ruimPercent = Math.round((data.ratings.Ruim / data.total) * 100);
    
    if (ruimPercent > 15) {
      return { 
        label: 'Alerta Crítico (>15% Ruim)', 
        color: 'bg-red-50 text-red-700 border-red-200/60',
        textColor: 'text-red-700',
        icon: AlertTriangle
      };
    }
    if (data.positivePercent >= 85) {
      return { 
        label: 'Excelência Operacional', 
        color: 'bg-emerald-50 text-emerald-800 border-emerald-250/60',
        textColor: 'text-emerald-800',
        icon: CheckCircle2
      };
    }
    if (data.positivePercent >= 70) {
      return { 
        label: 'Bom Desempenho', 
        color: 'bg-blue-50 text-blue-700 border-blue-200/60',
        textColor: 'text-blue-700',
        icon: ThumbsUp
      };
    }
    return { 
      label: 'Atenção Necessária', 
      color: 'bg-amber-50 text-amber-700 border-amber-200/60',
      textColor: 'text-amber-700',
      icon: AlertCircle
    };
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
      id="id_reports_page_root"
    >
      {/* Header and Filter banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <span className="text-[10px] font-black tracking-widest text-[#01402E] uppercase bg-emerald-50/70 px-3 py-1 rounded-full">Análise de Desempenho</span>
          <h2 className="text-2xl font-black text-[#01402E] tracking-tight mt-2">Relatórios da Ouvidoria</h2>
          <p className="text-xs text-gray-500 font-medium">Relatórios Gerenciais, NPS e Inteligência Artificial</p>
        </div>

        {/* Dynamic Filters and PDF Generation */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-3.5 py-2 rounded-2xl border border-gray-150">
            <FilterIcon size={13} className="text-[#01402E]" />
            <span className="text-xs font-black text-gray-550">Filtrar:</span>
          </div>

          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-150 rounded-2xl text-xs font-extrabold text-[#01402E] focus:outline-none focus:ring-2 focus:ring-[#01402E] cursor-pointer"
            >
              {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#01402E]">
              <ChevronRight size={12} className="rotate-90 text-[#01402E]/60 inline-block" />
            </div>
          </div>

          <div className="relative">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="appearance-none pl-4 pr-10 py-2.5 bg-white border border-gray-150 rounded-2xl text-xs font-extrabold text-[#01402E] focus:outline-none focus:ring-2 focus:ring-[#01402E] cursor-pointer"
            >
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-[#01402E]">
              <ChevronRight size={12} className="rotate-90 text-[#01402E]/60 inline-block" />
            </div>
          </div>

          <button
            onClick={handleExportDashboardPDF}
            disabled={exporting}
            className="px-5 py-2.5 bg-[#01402E] hover:bg-[#064e40] duration-150 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-sm transition-all flex items-center gap-2 disabled:opacity-50 active:scale-95 cursor-pointer shrink-0"
          >
            {exporting ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Gerando PDF...
              </>
            ) : (
              <>
                <Download size={13} /> Exportar PDF
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Minimalist Stat Cards - Rounded with up to 3xl corners */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total de Avaliações */}
        <div className="bg-white p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition duration-200">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Total de Avaliações</span>
            <div className="text-3xl font-black text-[#01402E]">{metrics.totalEvaluations}</div>
            <span className="text-[10px] font-bold text-gray-500">no mês selecionado</span>
          </div>
          <div className="p-3.5 bg-emerald-50 text-[#01402E] rounded-2xl shrink-0">
            <Users size={18} />
          </div>
        </div>

        {/* Card 2: Índice de Qualidade Técnica */}
        <div className="bg-white p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition duration-200">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Qualidade Técnica</span>
            <div className="text-3xl font-black text-emerald-600">
              {metrics.totalEvaluations > 0 ? `${metrics.technicalQualityIndex}%` : '0%'}
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">Ótimo & Bom (Soma)</span>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
            <CheckCircle2 size={18} />
          </div>
        </div>

        {/* Card 3: NPS Global */}
        <div className="bg-white p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition duration-200">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">NPS Global</span>
            <div className={`text-3xl font-black ${
              metrics.totalEvaluations === 0 ? 'text-gray-400' :
              metrics.npsGlobal >= 50 ? 'text-emerald-700' :
              metrics.npsGlobal >= 0 ? 'text-amber-600' : 'text-red-900'
            }`}>
              {metrics.totalEvaluations > 0 ? `${metrics.npsGlobal > 0 ? '+' : ''}${metrics.npsGlobal}` : 'N/A'}
            </div>
            <span className="text-[10px] font-extrabold uppercase text-[#01402E]">
              {metrics.totalEvaluations > 0 ? metrics.npsClassification : 'Sem dados'}
            </span>
          </div>
          <div className="p-3.5 bg-emerald-50 text-emerald-700 rounded-2xl shrink-0">
            <Activity size={18} />
          </div>
        </div>

        {/* Card 4: Formulários Físicos */}
        <div className="bg-white p-6 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition duration-200">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Formulários Físicos</span>
            <div className="text-3xl font-black text-gray-700">{metrics.physicalFormsCount}</div>
            <span className="text-[10px] font-bold text-gray-400">amostras em papel</span>
          </div>
          <div className="p-3.5 bg-gray-50 text-gray-500 rounded-2xl shrink-0">
            <FileText size={18} />
          </div>
        </div>
      </div>

      {metrics.totalEvaluations === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 p-16 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto">
            <ClipboardList size={38} />
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold text-gray-800">Sem Informações no Período</h3>
            <p className="text-sm text-gray-400 max-w-sm mx-auto font-medium">
              Nenhum formulário de satisfação ou avaliação foi encontrado para {MONTHS.find(m => m.value === selectedMonth)?.label} de {selectedYear}. 
            </p>
          </div>
          <div className="text-xs text-gray-400 font-bold uppercase bg-gray-50 px-4 py-2 rounded-xl inline-block">
            Dica: use o menu "Novo Formulário" para registrar um caso manual físico ou preencha no painel do paciente.
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {criticalSectorsAlerts.length > 0 && (
            <div className="bg-red-50/75 border border-red-100 rounded-3xl p-6 flex gap-4">
              <div className="w-12 h-12 rounded-2xl bg-red-600 text-white flex items-center justify-center shrink-0">
                <AlertCircle size={22} />
              </div>
              <div>
                <h4 className="text-sm font-black text-red-950">Alerta Técnico de Desvio do Setor</h4>
                <p className="text-xs text-red-700/80 mt-1 leading-relaxed">
                  Os seguintes setores ativos apresentaram índice de desaprovação superior a 15% de acordo com as regras de auditoria operacional do SUS:
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {criticalSectorsAlerts.map(s => (
                    <span key={s.sector} className="px-3 py-1 bg-white border border-red-200 text-red-700 text-xs font-black rounded-xl">
                      {s.sector}: {s.negativePercent}% Rejeição ({s.total} avaliações)
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Professional Analytics Grid (NPS Deep Scan + Ratings breakdown with comments) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-stretch">
            
            {/* Column 1: NPS Deep Analysis */}
            <div className="xl:col-span-6 flex">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between w-full">
                <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                  <div>
                    <h3 className="text-sm font-black text-[#01402E] uppercase tracking-wider">Painel de Análise Profunda do NPS</h3>
                    <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Visão segmentada e evolução temporal de promotores e detratores/passivos</p>
                  </div>
                  <Activity size={18} className="text-[#01402E]" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center py-4 flex-1">
                  {/* Column Left: Category Progress Bars */}
                  <div className="space-y-5">
                    <h4 className="text-xs font-black text-[#01402E] uppercase tracking-widest">Distribuição de Respondentes</h4>
                    
                    {/* Promoters (9-10) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-extrabold text-[#01402E] flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                          Promotores (Nota 9-10)
                        </span>
                        <span className="font-black text-emerald-600">{metrics.promotersPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#10b981] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${metrics.promotersPercent}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-semibold uppercase">Altamente satisfeitos, com alta probabilidade de indicação ativa.</p>
                    </div>

                    {/* Neutrals (7-8) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-extrabold text-amber-700 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                          Passivos (Nota 7-8)
                        </span>
                        <span className="font-black text-amber-600">{metrics.neutralsPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#f59e0b] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${metrics.neutralsPercent}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-semibold uppercase">Satisfeitos, porém indiferentes. Vulneráveis à concorrência operacional.</p>
                    </div>

                    {/* Detractors (0-6) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="font-extrabold text-red-700 flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                          Detratores (Nota 0-6)
                        </span>
                        <span className="font-black text-red-650">{metrics.detractorsPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-[#ef4444] h-full rounded-full transition-all duration-500" 
                          style={{ width: `${metrics.detractorsPercent}%` }}
                        ></div>
                      </div>
                      <p className="text-[9px] text-gray-400 font-semibold uppercase">Insatisfeitos. Potenciais detratores da reputação técnica do serviço.</p>
                    </div>
                  </div>

                  {/* Column Right: Elegant Bar Chart (Last 6 Months NPS) */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-[#01402E] uppercase tracking-widest text-center md:text-left">Evolução do NPS Mensal (Últimos 6 Meses)</h4>
                    <div className="h-48 font-sans">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={last6MonthsNpsData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} />
                          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} domain={[-100, 100]} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px' }} 
                            formatter={(value: any) => [`${value}%`, 'Índice NPS']}
                          />
                          <Bar dataKey="NPS" radius={[4, 4, 0, 0]}>
                            {last6MonthsNpsData.map((entry, index) => {
                              const isPositive = entry.NPS >= 50;
                              const isCritical = entry.NPS < 0;
                              let fill = '#3b82f6'; 
                              if (isPositive) fill = '#10b981'; 
                              else if (isCritical) fill = '#ef4444'; 
                              else if (entry.NPS >= 0 && entry.NPS < 50) fill = '#f59e0b'; 
                              return <Cell key={`cell-${index}`} fill={fill} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <p className="text-[9px] text-gray-400 font-bold uppercase text-center md:text-left">
                      Meta de Qualidade SUS: Manter índice acima de 50%.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Column 2: Donut Composition */}
            <div className="xl:col-span-6 flex">
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6 flex flex-col justify-between w-full">
                <div>
                  <h3 className="text-sm font-black text-[#01402E] uppercase tracking-wider">Composição de Notas (Percentual)</h3>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Proporção absoluta das notas individuais atribuídas</p>
                </div>
                
                {compositeRatings.total === 0 ? (
                  <div className="text-center py-12 text-xs text-gray-400">Insuficiência de dados para o gráfico de composição.</div>
                ) : (
                  <>
                    <div className="h-44 flex items-center justify-center relative">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={compositionPieData}
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={4}
                            dataKey="value"
                          >
                            {compositionPieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: any, name: any, props: any) => [`${value} votos (${props.payload.percentage}%)`, name]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute text-center">
                        <span className="block text-2xl font-black text-[#01402E]">{compositeRatings.total}</span>
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Avaliações Totais</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 text-center text-[10px] font-extrabold text-gray-500">
                      {compositionPieData.map((item, idx) => (
                        <div key={idx} className="p-2.5 rounded-xl border border-gray-50/50 bg-gray-50/20 flex flex-col justify-center items-center">
                          <span className="block text-xs font-black" style={{ color: item.color }}>
                            {item.percentage}%
                          </span>
                          <span className="text-gray-430 uppercase tracking-wider text-[8px] mt-0.5">{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

          </div>

          {/* Section 3.5: Central de Opinião e Feedbacks Interativa (Widescreen, spacious) */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-50 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#01402E] animate-pulse" />
                  <h3 className="text-sm font-black text-[#01402E] uppercase tracking-wider">Mural de Feedbacks Recentes</h3>
                </div>
                <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">
                  Visão transparente de comentários, elogios e reclamações registradas no período
                </p>
              </div>

              {/* Search Box */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={feedbackSearch}
                    onChange={(e) => setFeedbackSearch(e.target.value)}
                    placeholder="Buscar nos depoimentos..."
                    className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 rounded-2xl text-xs font-semibold text-gray-700 placeholder-text-gray-405 focus:outline-none focus:ring-2 focus:ring-[#01402E] focus:bg-white w-full sm:w-56"
                  />
                </div>
              </div>
            </div>

            {/* Filter pills segment */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => setFeedbackFilter('all')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-155 cursor-pointer ${
                  feedbackFilter === 'all'
                    ? 'bg-[#01402E] text-white shadow-xs'
                    : 'bg-slate-50 text-slate-550 border border-slate-100 hover:bg-slate-100'
                }`}
              >
                Todos ({detailedPatientFeedbacks.length})
              </button>
              <button
                onClick={() => setFeedbackFilter('promoters')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-155 cursor-pointer flex items-center gap-1.5 ${
                  feedbackFilter === 'promoters'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-emerald-50/50 text-emerald-800 border border-emerald-100/50 hover:bg-emerald-50'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                Promotores / Elogios ({detailedPatientFeedbacks.filter(f => f.category === 'promoter').length})
              </button>
              <button
                onClick={() => setFeedbackFilter('neutrals')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-155 cursor-pointer flex items-center gap-1.5 ${
                  feedbackFilter === 'neutrals'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50/50 text-amber-800 border border-amber-100/50 hover:bg-amber-50'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                Neutros ({detailedPatientFeedbacks.filter(f => f.category === 'neutral').length})
              </button>
              <button
                onClick={() => setFeedbackFilter('detractors')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all duration-155 cursor-pointer flex items-center gap-1.5 ${
                  feedbackFilter === 'detractors'
                    ? 'bg-red-650 text-white shadow-xs'
                    : 'bg-red-50 text-red-800 border border-red-100 hover:bg-red-50/50'
                }`}
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                Detratores / Críticas ({detailedPatientFeedbacks.filter(f => f.category === 'detractor').length})
              </button>
            </div>

            {/* List feedbacks as cards in grid */}
            {(() => {
              const filteredList = detailedPatientFeedbacks.filter(item => {
                const matchesSearch = item.comment.toLowerCase().includes(feedbackSearch.toLowerCase()) || 
                                     item.title.toLowerCase().includes(feedbackSearch.toLowerCase());
                if (feedbackFilter === 'all') return matchesSearch;
                return matchesSearch && item.category === feedbackFilter;
              });

              if (filteredList.length === 0) {
                return (
                  <div className="text-center py-16 border border-dashed border-slate-100 rounded-3xl bg-slate-50/20">
                    <MessageSquare size={32} className="mx-auto text-slate-350" />
                    <p className="text-xs text-gray-400 font-black mt-3 uppercase tracking-wider">
                      Nenhum depoimento encontrado para os critérios selecionados.
                    </p>
                  </div>
                );
              }

              return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 max-h-[360px] overflow-y-auto pr-1">
                  {filteredList.map((item) => {
                    let cardBorder = 'border-slate-100 hover:border-slate-200 hover:shadow-xs';
                    let badgeBg = 'bg-slate-50 text-slate-600 border-slate-100';

                    if (item.category === 'promoter') {
                      cardBorder = 'border-emerald-50 hover:border-emerald-250/80 bg-emerald-50/5 hover:bg-emerald-50/10 hover:shadow-xs';
                      badgeBg = 'bg-emerald-50 text-emerald-800 border-emerald-100/30';
                    } else if (item.category === 'detractor') {
                      cardBorder = 'border-red-50 hover:border-red-250/80 bg-red-50/5 hover:bg-red-50/10 hover:shadow-xs';
                      badgeBg = 'bg-red-50 text-red-800 border-red-100/30';
                    } else if (item.category === 'neutral') {
                      cardBorder = 'border-amber-50 hover:border-amber-250/80 bg-amber-50/5 hover:bg-amber-50/10 hover:shadow-xs';
                      badgeBg = 'bg-amber-100/30 text-amber-800 border-amber-200/20';
                    }

                    // Simple initials for profile initials icon
                    const titleWords = item.title.replace('Setor ', '').split(' ');
                    const initials = titleWords.map(w => w[0]).join('').substring(0, 2).toUpperCase();

                    return (
                      <div
                        key={item.id}
                        className={`p-5 rounded-2xl border transition-all duration-155 flex flex-col justify-between space-y-4 ${cardBorder}`}
                      >
                        <div className="space-y-3">
                          {/* Top row */}
                          <div className="flex items-start justify-between gap-2.5">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                                item.category === 'promoter' ? 'bg-emerald-100 text-emerald-700' :
                                item.category === 'detractor' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                              }`}>
                                {initials || 'P'}
                              </div>
                              <div className="text-[10px] font-extrabold text-slate-700 leading-tight">
                                <span className="block truncate max-w-[120px] font-black">{item.title}</span>
                                <span className="text-[8px] text-gray-400 block font-bold">{item.source}</span>
                              </div>
                            </div>

                            {/* Badge */}
                            <span className={`px-2.5 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider shrink-0 ${badgeBg}`}>
                              {item.type === 'nps' ? `NPS ${item.scoreOrRating}` : item.scoreOrRating}
                            </span>
                          </div>

                          {/* Comment block quotes */}
                          <div className="relative">
                            <Quote size={20} className="text-gray-100 absolute -top-1 -left-1 opacity-50" />
                            <p className="text-xs font-semibold text-slate-655 leading-relaxed italic bg-slate-50/30 p-3 pl-6 text-justify rounded-xl border border-slate-50/50">
                              {item.comment}
                            </p>
                          </div>
                        </div>

                        {/* Footer stamp */}
                        <div className="pt-2 border-t border-slate-100/30 flex items-center justify-between text-[8px] font-extrabold text-gray-400 uppercase tracking-widest">
                          <span>Amostra Ouvidoria</span>
                          <span>{item.date}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
          </div>

          {/* Section 4: Performance por Setor (Espaço horizontal total para máxima claridade!) */}
          <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-gray-50 pb-4">
              <div>
                <h3 className="text-sm font-black text-[#01402E] uppercase tracking-wider">Desempenho Detalhado por Setor</h3>
                <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Índice real de aprovação regulatória e selo técnico de classificação</p>
              </div>
              <ClipboardList size={18} className="text-[#01402E]" />
            </div>

            <div className="divide-y divide-gray-100 animate-fade-in">
              {activeSectors.map((sector) => {
                const data = metrics.sectorsPerformance[sector] || {
                  ratings: { Otimo: 0, Bom: 0, Regular: 0, Ruim: 0 },
                  positivePercent: 0,
                  negativePercent: 0,
                  total: 0
                };

                const status = getSectorStatus(data);
                const StatusIcon = status.icon;

                const otimoCount = data.ratings.Otimo || 0;
                const bomCount = data.ratings.Bom || 0;
                const regularCount = data.ratings.Regular || 0;
                const ruimCount = data.ratings.Ruim || 0;
                const total = data.total || 0;

                const otimoPercent = total > 0 ? Math.round((otimoCount / total) * 100) : 0;
                const bomPercent = total > 0 ? Math.round((bomCount / total) * 100) : 0;
                const regularPercent = total > 0 ? Math.round((regularCount / total) * 100) : 0;
                const ruimPercent = total > 0 ? Math.round((ruimCount / total) * 100) : 0;

                return (
                  <div key={sector} className="py-6 grid grid-cols-1 lg:grid-cols-12 lg:items-center gap-6 transition-all duration-150 hover:bg-slate-50/50 px-4 rounded-3xl border border-transparent hover:border-slate-100">
                    {/* Left Block: Title and metadata */}
                    <div className="space-y-1.5 lg:col-span-3">
                      <h4 className="text-sm font-black text-slate-800 tracking-tight leading-tight uppercase">{sector}</h4>
                      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-50 border border-slate-150 text-slate-500 rounded-lg text-[9px] font-black uppercase">
                          <Users size={10} className="text-slate-400" />
                          {total} {total === 1 ? 'Avaliação' : 'Avaliações'}
                        </span>
                      </div>
                    </div>

                    {/* Center Block */}
                    <div className="lg:col-span-6 w-full space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-black text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Aprovação Geral: {data.positivePercent}%
                        </span>
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
                          Distribuição das Notas
                        </span>
                      </div>

                      {/* 4-color multi-segmented bar */}
                      <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden flex shadow-inner">
                        {total > 0 ? (
                          <>
                            {otimoPercent > 0 && (
                              <div 
                                className="bg-emerald-500 h-full transition-all duration-500" 
                                style={{ width: `${otimoPercent}%` }}
                                title={`Ótimo: ${otimoPercent}% (${otimoCount} votos)`}
                              />
                            )}
                            {bomPercent > 0 && (
                              <div 
                                className="bg-blue-500 h-full transition-all duration-500" 
                                style={{ width: `${bomPercent}%` }}
                                title={`Bom: ${bomPercent}% (${bomCount} votos)`}
                              />
                            )}
                            {regularPercent > 0 && (
                              <div 
                                className="bg-amber-500 h-full transition-all duration-500" 
                                style={{ width: `${regularPercent}%` }}
                                title={`Regular: ${regularPercent}% (${regularCount} votos)`}
                              />
                            )}
                            {ruimPercent > 0 && (
                              <div 
                                className="bg-red-500 h-full transition-all duration-500" 
                                style={{ width: `${ruimPercent}%` }}
                                title={`Ruim: ${ruimPercent}% (${ruimCount} votos)`}
                              />
                            )}
                          </>
                        ) : (
                          <div className="w-full bg-slate-100/80 h-full text-center flex items-center justify-center">
                            <span className="text-[8px] font-black text-slate-350 uppercase tracking-widest">Aguardando Coleta de Amostras</span>
                          </div>
                        )}
                      </div>

                      {/* Inline explanatory grid list cards */}
                      <div className="grid grid-cols-4 gap-1.5 pt-0.5 text-center">
                        <div className={`rounded-xl p-1.5 border transition-colors ${otimoCount > 0 ? 'bg-emerald-50/30 border-emerald-100/50 text-emerald-800' : 'bg-slate-50/20 border-slate-100/30 text-slate-400'}`}>
                          <span className="block text-[8px] font-black uppercase tracking-wider text-emerald-500/85">Ótimo</span>
                          <span className="text-[10px] font-black">{otimoPercent}%</span>
                          <span className="text-[8px] block font-bold text-slate-400 mt-0.5">({otimoCount}v)</span>
                        </div>
                        
                        <div className={`rounded-xl p-1.5 border transition-colors ${bomCount > 0 ? 'bg-blue-50/30 border-blue-105/50 text-blue-800' : 'bg-slate-50/20 border-slate-100/30 text-slate-400'}`}>
                          <span className="block text-[8px] font-black uppercase tracking-wider text-blue-500/85">Bom</span>
                          <span className="text-[10px] font-black">{bomPercent}%</span>
                          <span className="text-[8px] block font-bold text-slate-400 mt-0.5">({bomCount}v)</span>
                        </div>

                        <div className={`rounded-xl p-1.5 border transition-colors ${regularCount > 0 ? 'bg-amber-50/30 border-amber-100/50 text-amber-800' : 'bg-slate-50/20 border-slate-100/30 text-slate-400'}`}>
                          <span className="block text-[8px] font-black uppercase tracking-wider text-amber-500/85">Regular</span>
                          <span className="text-[10px] font-black">{regularPercent}%</span>
                          <span className="text-[8px] block font-bold text-slate-400 mt-0.5">({regularCount}v)</span>
                        </div>

                        <div className={`rounded-xl p-1.5 border transition-colors ${ruimCount > 15 / 100 * total ? 'bg-red-50/60 border-red-200/50 text-red-900 animate-pulse' : ruimCount > 0 ? 'bg-red-50/30 border-red-100/50 text-red-800' : 'bg-slate-50/20 border-slate-100/30 text-slate-400'}`}>
                          <span className="block text-[8px] font-black uppercase tracking-wider text-red-500/85">Ruim</span>
                          <span className="text-[10px] font-black">{ruimPercent}%</span>
                          <span className="text-[8px] block font-bold text-slate-400 mt-0.5">({ruimCount}v)</span>
                        </div>
                      </div>
                    </div>

                    {/* Right Block: Official Status Seal with descriptive legend */}
                    <div className="lg:col-span-3 flex items-center lg:justify-end w-full">
                      <span className={`px-3 py-2 rounded-2xl border text-[9px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xs ${status.color}`}>
                        <StatusIcon size={12} className={status.textColor} />
                        <span>{status.label}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 5: Ouvidoria Inteligente com IA (Elegante e integrado, posicionado ao final dos relatórios) */}
          <div className="space-y-6 pt-6 border-t border-gray-100">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-black tracking-widest text-[#01402E] uppercase bg-emerald-50/70 px-3 py-1 rounded-full w-fit">
                Inteligência Artificial Co-Autora
              </span>
              <h3 className="text-lg font-black text-[#01402E] tracking-tight">Parecer Assistido de IA</h3>
              <p className="text-xs text-gray-400 font-medium">Análise contextual das opiniões qualitativas e métricas quantitativas do SUS</p>
            </div>

            {!aiReport ? (
              <div className="bg-emerald-50/30 border border-emerald-100/70 p-6 rounded-[2rem] relative overflow-hidden text-slate-800">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 w-full">
                  <div className="space-y-2 flex-1 w-full">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#01402E]/10 text-[#01402E] rounded-xl flex items-center justify-center shadow-inner">
                        <Sparkles size={20} className="text-[#01402E] animate-pulse" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black tracking-tight text-[#01402E]">Laudo Técnico Instantâneo</h3>
                        <p className="text-[10px] text-emerald-800 font-bold uppercase tracking-wider">Apoio de Decisão do Ouvidor</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-550 font-medium leading-relaxed max-w-2xl">
                      Estude as métricas consolidadas de NPS, comentários reais de pacientes e insatisfações setoriais em segundos através do modelo de inteligência artificial do Gemini para pautar planos estratégicos.
                    </p>
                  </div>

                  <div className="flex-1 space-y-2 max-w-md w-full">
                    <span className="block text-[9px] font-black text-emerald-850 uppercase tracking-widest pl-0.5">Parâmetro de Foco Especial (Opcional)</span>
                    <div className="flex gap-2">
                      <textarea
                        value={extraPrompt}
                        onChange={(e) => setExtraPrompt(e.target.value)}
                        placeholder="Ex: Enfatizar acolhimento humanizado, tempos de espera em Pronto Atendimento..."
                        rows={2}
                        className="flex-1 px-4 py-2 bg-white rounded-xl border border-emerald-200 bg-white text-xs font-semibold text-gray-700 placeholder-emerald-800/30 focus:outline-[#01402E] focus:ring-1 focus:ring-[#01402E] resize-none transition-all"
                      />
                      <button
                        type="button"
                        disabled={reportLoading}
                        onClick={handleGenerateAIReport}
                        className="px-6 bg-[#01402E] hover:bg-emerald-900 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-250 shadow-sm active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 group cursor-pointer whitespace-nowrap"
                      >
                        {reportLoading ? (
                          <Loader2 size={12} className="animate-spin text-white" />
                        ) : (
                          <>
                            <Sparkles size={14} className="group-hover:scale-110 transition-transform text-white/90" /> Gerar Parecer
                          </>
                        )}
                      </button>
                    </div>

                    {reportError && (
                      <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl flex items-start gap-2 text-red-700 mt-2 select-text text-left">
                        <AlertTriangle className="text-red-600 mt-0.5 shrink-0" size={14} />
                        <div className="space-y-0.5">
                          <span className="block font-black text-[10px] uppercase tracking-wide text-red-800">Falha na Inteligência Artificial</span>
                          <p className="text-[11px] leading-tight font-medium opacity-90">{reportError}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] border border-gray-150 shadow-sm overflow-hidden">
                
                {/* AI report metadata header with Toggle editing */}
                <div className="p-5 bg-slate-50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-[#01402E] flex items-center justify-center">
                      <Sparkles size={16} className="text-[#01402E] animate-pulse" />
                    </div>
                    <div>
                      <span className="text-[9px] font-black tracking-wider text-[#01402E] bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase">
                        Auditoria de Qualidade
                      </span>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide mt-1.5 font-sans">Laudo de Análise Automatizada com IA</h4>
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <button
                      onClick={() => setIsEditingReport(!isEditingReport)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 border cursor-pointer ${
                        isEditingReport 
                          ? 'bg-[#01402E] border-[#01402E] text-white hover:bg-emerald-900 shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-650 hover:text-[#01402E] hover:border-emerald-100'
                      }`}
                    >
                      {isEditingReport ? (
                        <>
                          <CheckCircle2 size={11} /> Concluir Edição
                        </>
                      ) : (
                        <>
                          <FileEdit size={11} /> Editar Relatório
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setAiReport(null);
                        setChatHistory([{ role: 'assistant', content: 'Olá! Desenvolvi o estudo analítico inicial para este mês. Se houver necessidade de ajustes ou refinamentos específicos, digite abaixo ou utilize as recomendações rápidas de estilo.' }]);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-red-500 hover:border-red-150 transition-colors cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Simulated Warning Banner */}
                {aiReport && (aiReport as any).isSimulated && (
                  <div className="bg-emerald-50/70 border-b border-emerald-100 p-4 px-6 flex items-start gap-3 text-emerald-950">
                    <Sparkles className="text-[#01402E] mt-0.5 shrink-0" size={16} />
                    <div className="space-y-0.5">
                      <span className="block font-black text-xs uppercase tracking-wide text-[#01402E]">Modo de Apresentação (Ouvidoria Simulada Ativa)</span>
                      <p className="text-[11px] leading-relaxed font-bold opacity-80">
                        Os dados e diretrizes estratégicas acima foram consolidados utilizando heurísticas locais de conformidade com o SUS. 
                        Para ativar a <strong>Inteligência Artificial real do Gemini</strong>, adicione sua chave API em <span className="underline decoration-emerald-300">Settings &gt; Secrets</span> com o nome da variável <code className="bg-emerald-100 px-1 py-0.5 rounded text-[#01402E] font-mono">GEMINI_API_KEY</code>.
                      </p>
                    </div>
                  </div>
                )}

                {/* 3-column Grid for wide monitor (Layout retangular de alta performance) */}
                <div className="grid grid-cols-1 xl:grid-cols-12 divide-y xl:divide-y-0 xl:divide-x divide-slate-105 bg-white">
                  
                  {/* Left part (xl:col-span-8) containing the four core boxes */}
                  <div className="xl:col-span-8 p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      
                      {/* Card 1: Resumo Institucional */}
                      <div className="space-y-2 bg-slate-50/20 p-4 rounded-3xl border border-slate-105 shadow-3xs flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-emerald-50/70 text-[#01402E] px-2.5 py-1 rounded-lg border border-emerald-105">
                              <FileText size={10} /> Resumo Institucional
                            </span>
                            {!isEditingReport && (
                              <button
                                onClick={() => setIsEditingReport(true)}
                                className="text-[10px] font-bold text-gray-405 hover:text-[#014532] flex items-center gap-0.5 cursor-pointer"
                              >
                                <FileEdit size={10} />
                              </button>
                            )}
                          </div>
                          {isEditingReport ? (
                            <textarea
                              value={aiReport.conclusionText || ''}
                              onChange={(e) => setAiReport({ ...aiReport, conclusionText: e.target.value })}
                              rows={4}
                              className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-655 leading-relaxed focus:ring-1 focus:ring-[#01402E] focus:outline-none focus:bg-white bg-slate-50/20"
                              placeholder="Escreva a consolidação do parecer técnico..."
                            />
                          ) : (
                            <div className="text-xs font-semibold text-gray-655 leading-relaxed">
                              {aiReport.conclusionText || 'Nenhum parecer técnico gerado.'}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card 2: Pontos Positivos */}
                      <div className="space-y-2 bg-slate-50/20 p-4 rounded-3xl border border-slate-105 shadow-3xs flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-emerald-50 text-emerald-805 px-2.5 py-1 rounded-lg border border-emerald-100">
                              <ThumbsUp size={10} /> Pontos Positivos
                            </span>
                            {!isEditingReport && (
                              <button
                                onClick={() => setIsEditingReport(true)}
                                className="text-[10px] font-bold text-gray-405 hover:text-[#01402E] flex items-center gap-0.5 cursor-pointer"
                              >
                                <FileEdit size={10} />
                              </button>
                            )}
                          </div>
                          {isEditingReport ? (
                            <div>
                              <textarea
                                value={aiReport.praisePoints ? aiReport.praisePoints.join('\n') : ''}
                                onChange={(e) => {
                                  const lines = e.target.value.split('\n');
                                  setAiReport({ ...aiReport, praisePoints: lines });
                                }}
                                rows={4}
                                className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-655 leading-relaxed focus:ring-1 focus:ring-[#01402E] focus:outline-none focus:bg-white bg-slate-50/20"
                                placeholder="Ponto positivo..."
                              />
                            </div>
                          ) : (
                            <ul className="space-y-1.5">
                              {aiReport.praisePoints && aiReport.praisePoints.map((p, idx) => p && p.trim() && (
                                <li key={idx} className="text-xs font-semibold text-gray-655 leading-relaxed flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                                  <span>{p}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                      {/* Card 3: Alertas Críticos */}
                      <div className="space-y-2 bg-slate-50/20 p-4 rounded-3xl border border-slate-105 shadow-3xs flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-red-50 text-red-805 px-2.5 py-1 rounded-lg border border-red-100">
                              <AlertTriangle size={10} /> Alertas Críticos
                            </span>
                            {!isEditingReport && (
                              <button
                                onClick={() => setIsEditingReport(true)}
                                className="text-[10px] font-bold text-gray-405 hover:text-[#01402E] flex items-center gap-0.5 cursor-pointer"
                              >
                                <FileEdit size={10} />
                              </button>
                            )}
                          </div>
                          {isEditingReport ? (
                            <div>
                              <textarea
                                value={aiReport.criticalAlerts ? aiReport.criticalAlerts.join('\n') : ''}
                                onChange={(e) => {
                                  const lines = e.target.value.split('\n');
                                  setAiReport({ ...aiReport, criticalAlerts: lines });
                                }}
                                rows={4}
                                className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-655 leading-relaxed focus:ring-1 focus:ring-[#01402E] focus:outline-none focus:bg-white bg-slate-50/20"
                                placeholder="Alerta crítico..."
                              />
                            </div>
                          ) : (
                            !aiReport.criticalAlerts || aiReport.criticalAlerts.length === 0 ? (
                              <p className="text-[11px] font-bold text-gray-400">Sem desvios agravantes no período.</p>
                            ) : (
                              <ul className="space-y-1.5">
                                {aiReport.criticalAlerts.map((a, idx) => a && a.trim() && (
                                  <li key={idx} className="text-xs font-semibold text-gray-655 leading-relaxed flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                    <span>{a}</span>
                                  </li>
                                ))}
                              </ul>
                            )
                          )}
                        </div>
                      </div>

                      {/* Card 4: Ações Recomendadas */}
                      <div className="space-y-2 bg-slate-50/20 p-4 rounded-3xl border border-slate-105 shadow-3xs flex flex-col justify-between">
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-xs">
                            <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-amber-50 text-amber-850 px-2.5 py-1 rounded-lg border border-amber-100">
                              <Lightbulb size={10} /> Ações Recomendadas
                            </span>
                            {!isEditingReport && (
                              <button
                                onClick={() => setIsEditingReport(true)}
                                className="text-[10px] font-bold text-gray-405 hover:text-[#01402E] flex items-center gap-0.5 cursor-pointer"
                              >
                                <FileEdit size={10} />
                              </button>
                            )}
                          </div>
                          {isEditingReport ? (
                            <div>
                              <textarea
                                value={aiReport.strategicActions ? aiReport.strategicActions.join('\n') : ''}
                                onChange={(e) => {
                                  const lines = e.target.value.split('\n');
                                  setAiReport({ ...aiReport, strategicActions: lines });
                                }}
                                rows={4}
                                className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-655 leading-relaxed focus:ring-1 focus:ring-[#01402E] focus:outline-none focus:bg-white bg-slate-50/20"
                                placeholder="Ação recomendada..."
                              />
                            </div>
                          ) : (
                            <ul className="space-y-1.5">
                              {aiReport.strategicActions && aiReport.strategicActions.map((s, idx) => s && s.trim() && (
                                <li key={idx} className="text-xs font-semibold text-gray-655 leading-relaxed flex items-start gap-2">
                                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                                  <span>{s}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* Right part (xl:col-span-4) with interactive messaging and compilation download */}
                  <div className="xl:col-span-4 p-6 flex flex-col justify-between space-y-6 bg-slate-50/40">
                    
                    <div className="space-y-3.5">
                      <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-450 uppercase tracking-wider">
                        <MessageSquare size={12} className="text-[#01402E]" />
                        <span>Ajustar Laudo de IA</span>
                      </div>

                      {/* Chat text panel heights are responsive & tightly optimized */}
                      <div className="max-h-[160px] overflow-y-auto space-y-3 pr-1 text-xs">
                        {chatHistory.map((msg, idx) => (
                          <div 
                            key={idx} 
                            className={`flex flex-col max-w-[85%] ${
                              msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                            }`}
                          >
                            <div 
                              className={`p-2.5 rounded-2xl leading-relaxed text-xs font-semibold ${
                                msg.role === 'user' 
                                  ? 'bg-[#01402E] text-white rounded-br-none' 
                                  : 'bg-white border border-slate-105 text-gray-700 shadow-3xs rounded-bl-none'
                              }`}
                            >
                              {msg.content}
                            </div>
                            <span className="text-[7px] font-black text-slate-400 mt-0.5 uppercase">
                              {msg.role === 'user' ? 'Você' : 'Suporte IA'}
                            </span>
                          </div>
                        ))}
                        {chatLoading && (
                          <div className="flex items-center gap-2 text-[10px] text-gray-450 font-bold ml-1 animate-pulse">
                            <Loader2 size={10} className="animate-spin text-[#01402E]" />
                            <span>Remodelando laudo técnico...</span>
                          </div>
                        )}
                      </div>

                      {/* Predefined prompts */}
                      <div className="flex flex-wrap gap-1">
                        <button
                          type="button"
                          disabled={chatLoading}
                          onClick={() => handleSendMessageToAI("Por favor, reescreva todo o relatório e parecer técnico em um tom altamente formal e acadêmico do SUS.")}
                          className="p-1 px-2.5 bg-white hover:bg-emerald-50/50 border border-gray-200 rounded-lg text-[8px] font-extrabold text-[#01402E] transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          👔 Tom SUS
                        </button>
                        <button
                          type="button"
                          disabled={chatLoading}
                          onClick={() => handleSendMessageToAI("Deixe o relatório mais curto, bem direto e focado no essencial das estatísticas.")}
                          className="p-1 px-2.5 bg-white hover:bg-slate-105 border border-gray-200 rounded-lg text-[8px] font-extrabold text-slate-655 transition active:scale-95 cursor-pointer disabled:opacity-50"
                        >
                          ⚡ Direto
                        </button>
                      </div>

                      <form 
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendMessageToAI();
                        }} 
                        className="flex gap-1.5"
                      >
                        <input
                          type="text"
                          required
                          value={chatMessage}
                          disabled={chatLoading}
                          onChange={(e) => setChatMessage(e.target.value)}
                          placeholder="Solicitar ajuste..."
                          className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-755 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#01402E]"
                        />
                        <button
                          type="submit"
                          disabled={chatLoading || !chatMessage.trim()}
                          className="p-2 bg-[#01402E] hover:bg-emerald-990 text-white rounded-lg transition-all shadow-md shrink-0 flex items-center justify-center disabled:opacity-50 cursor-pointer"
                        >
                          <Send size={12} />
                        </button>
                      </form>
                    </div>

                    <button
                      onClick={handleDownloadPDF}
                      className="w-full py-3 bg-emerald-950 hover:bg-[#01402E] text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Download size={12} /> Exportar Laudo (PDF)
                    </button>

                  </div>

                </div>

              </div>
            )}
          </div>

        </div>
      )}
    </motion.div>
  );
};
