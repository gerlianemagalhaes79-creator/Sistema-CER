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
  MessageSquare
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

  // Dynamic state for the current active AI report
  const [aiReport, setAiReport] = useState<{
    praisePoints: string[];
    criticalAlerts: string[];
    strategicActions: string[];
    conclusionText: string;
  } | null>(null);

  const [isEditingReport, setIsEditingReport] = useState(false);
  const [chatHistory, setChatHistory] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([
    { 
      role: 'assistant', 
      content: 'Olá! Desenvolvi o estudo analítico inicial para este mês. Se houver necessidade de ajustes ou refinamentos específicos, digite abaixo ou utilize as recomendações rápidas de estilo.' 
    }
  ]);

  // Sectors checklist to use as standard: exact 12 items
  const defaultSectors = [
    "Portaria/Segurança", 
    "Recepção Geral", 
    "Triagem", 
    "Consultas Médicas", 
    "Consultas Multiprofissionais", 
    "Realização de Exames", 
    "Laboratório", 
    "Entrega de Exames", 
    "CER (Centro Especializado em Reabilitação)", 
    "Ambiente (Conforto, Temperatura, Espaço)", 
    "Limpeza (Conservação Geral)", 
    "Higiene e Organização dos Banheiros"
  ];
  const activeSectors = useMemo(() => {
    const list = [...defaultSectors];
    availableSectors.forEach(s => {
      if (!list.includes(s) && s.length < 25) {
        list.push(s);
      }
    });
    return list;
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

  // 1. FILTER DATA BY MONTH AND YEAR
  const filteredForms = useMemo(() => {
    return forms.filter(f => {
      const date = new Date(f.createdAt);
      return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [forms, selectedMonth, selectedYear]);

  const filteredEvaluations = useMemo(() => {
    return evaluations.filter(e => {
      const date = new Date(e.createdAt);
      return (date.getMonth() + 1) === selectedMonth && date.getFullYear() === selectedYear;
    });
  }, [evaluations, selectedMonth, selectedYear]);

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

    let npsClassification = 'Regular';
    if (npsGlobal >= 75) npsClassification = 'Excelente';
    else if (npsGlobal >= 50) npsClassification = 'Muito Bom';
    else if (npsGlobal >= 0) npsClassification = 'Regular';
    else npsClassification = 'Crítico';

    // Sector evaluation calculations
    const sectorsPerformance: Record<string, { positivePercent: number; negativePercent: number; total: number; ratings: Record<string, number> }> = {};
    
    // Initialize active sectors
    activeSectors.forEach(sec => {
      sectorsPerformance[sec] = { positivePercent: 0, negativePercent: 0, total: 0, ratings: { Otimo: 0, Bom: 0, Regular: 0, Ruim: 0 } };
    });

    // Populate ratings from database
    filteredEvaluations.forEach(e => {
      if (!sectorsPerformance[e.sector]) {
        sectorsPerformance[e.sector] = { positivePercent: 0, negativePercent: 0, total: 0, ratings: { Otimo: 0, Bom: 0, Regular: 0, Ruim: 0 } };
      }
      if (e.rating in sectorsPerformance[e.sector].ratings) {
        sectorsPerformance[e.sector].ratings[e.rating as any]++;
        sectorsPerformance[e.sector].total++;
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
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao conectar com o serviço do Gemini.');
      }

      const reportData = await response.json();
      setAiReport(reportData);
    } catch (err: any) {
      alert(`Erro: ${err.message}`);
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

    try {
      const response = await fetch('/api/api/gemini/chat', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentReport: aiReport,
          message: userMsg
        })
      });

      let resData = null;
      if (!response.ok) {
        const fall = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentReport: aiReport,
            message: userMsg
          })
        });
        if (!fall.ok) {
          const rawErr = await fall.json();
          throw new Error(rawErr.error || 'Erro ao ajustar o relatório.');
        }
        resData = await fall.json();
      } else {
        resData = await response.json();
      }

      if (resData) {
        setAiReport(resData);
        setChatHistory(prev => [
          ...prev, 
          { 
            role: 'assistant', 
            content: `Relatório atualizado com sucesso com base nas instruções de: "${userMsg}".` 
          }
        ]);
      }
    } catch (error: any) {
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
    doc.text(`NPS Global: ${metrics.npsGlobal}% (${metrics.npsClassification})`, 20, 101);
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
        const d = new Date(f.createdAt);
        return (d.getMonth() + 1) === m && d.getFullYear() === y;
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Main Column - KPIs & Charts */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Removed legacy duplicate kpi cards row */}

            {/* Dissatisfaction alert if critical > 15% */}
            {criticalSectorsAlerts.length > 0 && (
              <div className="bg-red-50/75 border border-red-100 rounded-3xl p-6 flex gap-4 animate-pulse">
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

            {/* 1. Painel de Análise Profunda do NPS */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div>
                  <h3 className="text-sm font-black text-[#01402E] uppercase tracking-wider">Painel de Análise Profunda do NPS</h3>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Visão segmentada e evolução temporal de promotores e detratores/passivos</p>
                </div>
                <Activity size={18} className="text-[#01402E]" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
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
                      <span className="font-black text-red-600">{metrics.detractorsPercent}%</span>
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
                    Meta de Qualidade SUS: Manter índice acima de 50% (Zona de Especialização/Excelência).
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Composição da Média Mensal */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Pie/Donut Chart for Ratings Composition */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
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

                    <div className="grid grid-cols-2 gap-2 text-center text-[10px] font-extrabold text-gray-500">
                      {compositionPieData.map((item, idx) => (
                        <div key={idx} className="p-2 rounded-xl border border-gray-50/50 bg-gray-50/20 flex flex-col justify-center items-center">
                          <span className="block text-xs font-black" style={{ color: item.color }}>
                            {item.percentage}%
                          </span>
                          <span className="text-gray-400 uppercase tracking-wider text-[8px] mt-0.5">{item.name} ({item.value})</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Feedbacks em tempo real */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                <div>
                  <h3 className="text-sm font-black text-[#01402E] uppercase tracking-wider">Feedbacks Recentes</h3>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Últimas avaliações e comentários dos pacientes</p>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[220px] pr-1 mt-6">
                  {patientComments.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-12">Nenhum comentário textual neste mês.</div>
                  ) : (
                    patientComments.slice(0, 5).map((comment, i) => (
                      <div key={i} className="p-3 bg-gray-50/70 rounded-xl border border-gray-100 text-xs font-semibold text-gray-600 line-clamp-3 leading-relaxed">
                        {comment}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* 3. Performance por Setor */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <div>
                  <h3 className="text-sm font-black text-[#01402E] uppercase tracking-wider">Desempenho Detalhado por Setor</h3>
                  <p className="text-[10px] uppercase font-bold text-gray-400 mt-1">Índice real de aprovação regulatória e selo técnico de classificação</p>
                </div>
                <ClipboardList size={18} className="text-[#01402E]" />
              </div>

              <div className="divide-y divide-gray-100">
                {activeSectors.map((sector) => {
                  const data = metrics.sectorsPerformance[sector] || {
                    ratings: { Otimo: 0, Bom: 0, Regular: 0, Ruim: 0 },
                    positivePercent: 0,
                    negativePercent: 0,
                    total: 0
                  };

                  const status = getSectorStatus(data);
                  const StatusIcon = status.icon;

                  return (
                    <div key={sector} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 hover:bg-gray-50/50 px-3 rounded-2xl">
                      {/* Left information */}
                      <div className="space-y-1 min-w-[180px]">
                        <h4 className="text-sm font-extrabold text-[#01402E]">{sector}</h4>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 font-bold">
                          <Users size={11} />
                          <span>{data.total} {data.total === 1 ? 'avaliação' : 'avaliações'}</span>
                        </div>
                      </div>

                      {/* Stacked visualization track */}
                      <div className="flex-1 max-w-md w-full space-y-1.5">
                        <div className="flex justify-between text-xs font-bold text-gray-500">
                          <span>Aprovação Ótimo/Bom</span>
                          <span className="text-[#01402E]">{data.positivePercent}%</span>
                        </div>
                        <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-emerald-500 h-full transition-all duration-500" 
                            style={{ width: `${data.positivePercent}%` }}
                          ></div>
                          <div 
                            className="bg-red-400 h-full transition-all duration-500" 
                            style={{ width: `${data.total > 0 ? ((data.ratings.Ruim) / data.total) * 100 : 0}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-[8px] uppercase tracking-wider font-extrabold text-gray-400">
                          <span>Aprovados ({data.ratings.Otimo + data.ratings.Bom})</span>
                          <span>Incompatível ({data.ratings.Ruim})</span>
                        </div>
                      </div>

                      {/* Status seal */}
                      <div className="shrink-0 flex items-center">
                        <span className={`px-3 py-1.5 rounded-xl border text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 shadow-2xs ${status.color}`}>
                          <StatusIcon size={12} className={status.textColor} />
                          <span>{status.label}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Right Column - Gemini AI Report Co-Author & Adjusting */}
          <div className="lg:col-span-1 space-y-8">
            
            {!aiReport ? (
              <div className="bg-gradient-to-br from-[#2D1B4E] via-[#1F1235] to-[#120B24] border border-indigo-700/25 p-8 rounded-[2.5rem] shadow-xl space-y-6 relative overflow-hidden text-white">
                {/* Elegant background glows */}
                <div className="absolute -top-12 -right-12 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 backdrop-blur-md text-white rounded-2xl flex items-center justify-center shadow-inner border border-white/10">
                    <Sparkles size={24} className="text-purple-300 animate-pulse" />
                  </div>
                  <div>
                    <span className="text-[9px] font-black tracking-widest text-indigo-300 uppercase bg-indigo-500/20 px-2.5 py-1 rounded-full border border-indigo-400/20">
                      Ouvidoria Inteligente
                    </span>
                    <h3 className="text-base font-black tracking-tight mt-1 text-white">Estudo Analítico de IA</h3>
                  </div>
                </div>

                <p className="text-xs text-indigo-100/70 font-medium leading-relaxed">
                  Estude as métricas consolidadas de NPS, comentários reais de pacientes e insatisfações setoriais do SUS em segundos através da inteligência artificial do Gemini.
                </p>

                {/* Focus prompt field */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-black text-indigo-300 uppercase tracking-widest pl-0.5">Parâmetro de Foco Especial (Opcional)</span>
                  <textarea
                    value={extraPrompt}
                    onChange={(e) => setExtraPrompt(e.target.value)}
                    placeholder="Instrua a IA a enfatizar portaria acolhedora, tom das avaliações médicas, redução de gargalos na triagem..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border border-indigo-500/20 bg-indigo-950/45 text-xs font-semibold text-indigo-100 placeholder-indigo-400/30 focus:outline-[#1C0D32] focus:ring-2 focus:ring-indigo-400 focus:bg-[#1C0D32] resize-none border-dashed transition-all"
                  />
                </div>

                <button
                  type="button"
                  disabled={reportLoading}
                  onClick={handleGenerateAIReport}
                  className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-lg hover:shadow-indigo-500/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 group cursor-pointer"
                >
                  {reportLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" /> Analisando Registros...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="group-hover:scale-110 transition-transform text-white/90" /> Gerar Análise Inteligente
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[820px]">
                
                {/* AI report metadata header with Toggle editing */}
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-700 animate-pulse" />
                    <span className="text-xs font-black text-gray-800 uppercase tracking-widest">Painel Assistente de IA</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setIsEditingReport(!isEditingReport)}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 border cursor-pointer ${
                        isEditingReport 
                          ? 'bg-[#01402E] border-[#01402E] text-white hover:bg-emerald-900 shadow-sm' 
                          : 'bg-white border-gray-200 text-gray-600 hover:text-[#01402E] hover:border-emerald-100'
                      }`}
                    >
                      {isEditingReport ? (
                        <>
                          <CheckCircle2 size={11} /> Concluir Edição
                        </>
                      ) : (
                        <>
                          <FileEdit size={11} /> Editar Manuscrito
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => {
                        setAiReport(null);
                        setChatHistory([{ role: 'assistant', content: 'Olá! Desenvolvi o estudo analítico inicial para este mês. Se houver necessidade de ajustes ou refinamentos específicos, digite abaixo ou utilize as recomendações rápidas de estilo.' }]);
                      }}
                      className="px-3 py-1.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase text-gray-400 hover:text-red-500 hover:border-red-105 transition-colors cursor-pointer"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                {/* Content body with the requested four text boxes */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Card 1: Resumo Institucional */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-indigo-50 text-indigo-805 px-2.5 py-1 rounded-lg border border-indigo-100">
                        <FileText size={10} /> Resumo Institucional
                      </span>
                      {!isEditingReport && (
                        <button
                          onClick={() => setIsEditingReport(true)}
                          className="text-[10px] font-bold text-gray-400 hover:text-[#01402E] flex items-center gap-1 cursor-pointer"
                        >
                          <FileEdit size={10} /> Editar
                        </button>
                      )}
                    </div>
                    {isEditingReport ? (
                      <textarea
                        value={aiReport.conclusionText}
                        onChange={(e) => setAiReport({ ...aiReport, conclusionText: e.target.value })}
                        rows={4}
                        className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-600 leading-relaxed focus:ring-2 focus:ring-[#01402E] focus:outline-none focus:bg-white bg-slate-50/20"
                        placeholder="Escreva a consolidação do parecer técnico..."
                      />
                    ) : (
                      <div className="p-4 bg-white border border-gray-100 rounded-2xl text-xs font-semibold text-gray-600 leading-relaxed shadow-3xs">
                        {aiReport.conclusionText || 'Nenhum parecer técnico gerado.'}
                      </div>
                    )}
                  </div>

                  {/* Card 2: Pontos Positivos */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-100">
                        <ThumbsUp size={10} /> Pontos Positivos
                      </span>
                      {!isEditingReport && (
                        <button
                          onClick={() => setIsEditingReport(true)}
                          className="text-[10px] font-bold text-gray-400 hover:text-[#01402E] flex items-center gap-1 cursor-pointer"
                        >
                          <FileEdit size={10} /> Editar
                        </button>
                      )}
                    </div>
                    {isEditingReport ? (
                      <div>
                        <textarea
                          value={aiReport.praisePoints.join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n');
                            setAiReport({ ...aiReport, praisePoints: lines });
                          }}
                          rows={4}
                          className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-600 leading-relaxed focus:ring-2 focus:ring-[#01402E] focus:outline-none focus:bg-white bg-slate-50/20"
                          placeholder="Escreva cada ponto positivo em uma nova linha..."
                        />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1 mt-1 block">
                          * Insira cada ponto em uma nova linha
                        </span>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {aiReport.praisePoints.map((p, idx) => p.trim() && (
                          <li key={idx} className="p-3 bg-white border border-gray-100 rounded-2xl text-xs font-semibold text-gray-650 leading-relaxed shadow-3xs flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Card 3: Alertas Críticos */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-red-50 text-red-800 px-2.5 py-1 rounded-lg border border-red-100">
                        <AlertTriangle size={10} /> Alertas Críticos
                      </span>
                      {!isEditingReport && (
                        <button
                          onClick={() => setIsEditingReport(true)}
                          className="text-[10px] font-bold text-gray-400 hover:text-[#01402E] flex items-center gap-1 cursor-pointer"
                        >
                          <FileEdit size={10} /> Editar
                        </button>
                      )}
                    </div>
                    {isEditingReport ? (
                      <div>
                        <textarea
                          value={aiReport.criticalAlerts.join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n');
                            setAiReport({ ...aiReport, criticalAlerts: lines });
                          }}
                          rows={4}
                          className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-600 leading-relaxed focus:ring-2 focus:ring-[#01402E] focus:outline-none focus:bg-white bg-slate-50/20"
                          placeholder="Escreva cada alerta crítico em uma nova linha..."
                        />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1 mt-1 block">
                          * Insira cada alerta em uma nova linha
                        </span>
                      </div>
                    ) : (
                      aiReport.criticalAlerts.length === 0 ? (
                        <p className="text-xs font-bold text-gray-400 p-3 bg-gray-50 rounded-xl border border-dashed border-gray-200">Sem desvios agravantes.</p>
                      ) : (
                        <ul className="space-y-2">
                          {aiReport.criticalAlerts.map((a, idx) => a.trim() && (
                            <li key={idx} className="p-3 bg-white border border-red-50 rounded-2xl text-xs font-semibold text-gray-650 leading-relaxed shadow-3xs flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                              <span>{a}</span>
                            </li>
                          ))}
                        </ul>
                      )
                    )}
                  </div>

                  {/* Card 4: Ações Recomendadas */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-amber-50 text-amber-805 px-2.5 py-1 rounded-lg border border-amber-100">
                        <Lightbulb size={10} /> Ações Recomendadas
                      </span>
                      {!isEditingReport && (
                        <button
                          onClick={() => setIsEditingReport(true)}
                          className="text-[10px] font-bold text-gray-400 hover:text-[#01402E] flex items-center gap-1 cursor-pointer"
                        >
                          <FileEdit size={10} /> Editar
                        </button>
                      )}
                    </div>
                    {isEditingReport ? (
                      <div>
                        <textarea
                          value={aiReport.strategicActions.join('\n')}
                          onChange={(e) => {
                            const lines = e.target.value.split('\n');
                            setAiReport({ ...aiReport, strategicActions: lines });
                          }}
                          rows={4}
                          className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-600 leading-relaxed focus:ring-2 focus:ring-[#01402E] focus:outline-none focus:bg-white bg-slate-50/20"
                          placeholder="Escreva cada recomendação estrutural em uma nova linha..."
                        />
                        <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1 mt-1 block">
                          * Insira cada recomendação em uma nova linha
                        </span>
                      </div>
                    ) : (
                      <ul className="space-y-2">
                        {aiReport.strategicActions.map((s, idx) => s.trim() && (
                          <li key={idx} className="p-3 bg-amber-50/10 border border-amber-100 rounded-2xl text-xs font-semibold text-gray-600 leading-relaxed flex items-start gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                </div>

                {/* Simulated Collaboration Chat Timeline with shortcuts */}
                <div className="p-5 border-t border-gray-100 bg-gray-50/60 space-y-4 flex-shrink-0">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-gray-400 uppercase tracking-wider">
                    <MessageSquare size={12} className="text-indigo-600 animate-pulse" />
                    <span>Chat de Refinamento (Colaboração)</span>
                  </div>

                  {/* Message displays wrapper */}
                  <div className="max-h-[140px] overflow-y-auto space-y-3.5 pr-1 text-xs">
                    {chatHistory.map((msg, idx) => (
                      <div 
                        key={idx} 
                        className={`flex flex-col max-w-[85%] ${
                          msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
                        }`}
                      >
                        <div 
                          className={`p-3 rounded-2xl leading-relaxed text-xs font-semibold ${
                            msg.role === 'user' 
                              ? 'bg-indigo-600 text-white rounded-br-none' 
                              : 'bg-white border border-gray-100 text-gray-750 shadow-3xs rounded-bl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <span className="text-[8px] font-black text-gray-400 mt-1 uppercase pl-1 pr-1">
                          {msg.role === 'user' ? 'Você' : 'Assistente'}
                        </span>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex items-center gap-2 text-[10px] text-gray-400 font-bold ml-1 animate-pulse">
                        <Loader2 size={10} className="animate-spin" />
                        <span>Ajustando parecer...</span>
                      </div>
                    )}
                  </div>

                  {/* Predefined instruction pills/shortcuts */}
                  <div className="space-y-1.5">
                    <span className="block text-[8px] font-black text-gray-400 uppercase tracking-wider pl-0.5">Ações de Refinamento Rápido</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={chatLoading}
                        onClick={() => handleSendMessageToAI("Por favor, reescreva todo o relatório e parecer técnico em um tom altamente formal e acadêmico do SUS.")}
                        className="p-1 px-2.5 bg-white hover:bg-indigo-50 border border-gray-200 rounded-lg text-[9px] font-extrabold text-[#01402E] transition active:scale-95 cursor-pointer disabled:opacity-50 inline-block shrink-0"
                      >
                        👔 Tom Técnico Formal
                      </button>
                      <button
                        type="button"
                        disabled={chatLoading}
                        onClick={() => handleSendMessageToAI("Deixe o relatório mais curto, bem direto e focado no essencial das estatísticas.")}
                        className="p-1 px-2.5 bg-white hover:bg-indigo-50 border border-gray-200 rounded-lg text-[9px] font-extrabold text-[#01402E] transition active:scale-95 cursor-pointer disabled:opacity-50 inline-block shrink-0"
                      >
                        ⚡ Mais Sucinto
                      </button>
                      <button
                        type="button"
                        disabled={chatLoading}
                        onClick={() => handleSendMessageToAI("Escreva sugestões focando no fortalecimento do acolhimento com classificação de risco.")}
                        className="p-1 px-2.5 bg-white hover:bg-indigo-50 border border-gray-200 rounded-lg text-[9px] font-extrabold text-[#01402E] transition active:scale-95 cursor-pointer disabled:opacity-50 inline-block shrink-0"
                      >
                        🎯 Foco no Acolhimento
                      </button>
                      <button
                        type="button"
                        disabled={chatLoading}
                        onClick={() => handleSendMessageToAI("Aprofunde todos os alertas de insatisfação, indicando as consequências imediatas no acolhimento do paciente.")}
                        className="p-1 px-2.5 bg-white hover:bg-indigo-50 border border-gray-200 rounded-lg text-[9px] font-extrabold text-[#01402E] transition active:scale-95 cursor-pointer disabled:opacity-50 inline-block shrink-0"
                      >
                        ⚠️ Detalhar Alertas
                      </button>
                    </div>
                  </div>

                  {/* Message Input Box Form */}
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleSendMessageToAI();
                    }} 
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      required
                      value={chatMessage}
                      disabled={chatLoading}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Peça ajustes no tom, estrutura ou foco do parecer..."
                      className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading || !chatMessage.trim()}
                      className="p-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center disabled:opacity-50 active:scale-95 cursor-pointer"
                    >
                      <Send size={13} />
                    </button>
                  </form>
                </div>

                {/* PDF compilation download button */}
                <div className="p-4 bg-white border-t border-gray-100 flex-shrink-0">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download size={14} /> Exportar Parecer Técnico (PDF)
                  </button>
                </div>

              </div>
            )}

          </div>

        </div>
      )}
    </motion.div>
  );
};
