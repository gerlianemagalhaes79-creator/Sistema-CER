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

  // Dynamic state for the current active AI report
  const [aiReport, setAiReport] = useState<{
    praisePoints: string[];
    criticalAlerts: string[];
    strategicActions: string[];
    conclusionText: string;
  } | null>(null);

  // Sectors checklist to use as standard: Portaria, Recepção, Triagem, Consultas, Laboratório, Higiene
  const defaultSectors = ['Portaria', 'Recepção', 'Triagem', 'Consultas', 'Laboratório', 'Higiene'];
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
    if (totalForms === 0) {
      return {
        totalEvaluations: 0,
        npsGlobal: 0,
        npsClassification: 'Inexistente',
        promotersPercent: 0,
        neutralsPercent: 0,
        detractorsPercent: 0,
        technicalQualityIndex: 0,
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
      sectorsPerformance
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

  // 4. CHAT DYNAMIC UPDATE (CO-AUTHORING CHAT)
  const handleSendMessageToAI = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim() || !aiReport) return;

    setChatLoading(true);
    const backupMessage = chatMessage;
    setChatMessage('');

    try {
      const response = await fetch('/api/api/gemini/chat', { // Or fallback relative endpoint /api/gemini/chat
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentReport: aiReport,
          message: backupMessage
        })
      });

      // Simple routing safety: test alternative endpoint address
      let resData = null;
      if (!response.ok) {
        const fall = await fetch('/api/gemini/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            currentReport: aiReport,
            message: backupMessage
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
      }
    } catch (error: any) {
      alert(`Ajuste falhou: ${error.message}`);
      setChatMessage(backupMessage);
    } finally {
      setChatLoading(false);
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

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      className="space-y-8"
      id="id_reports_page_root"
    >
      {/* Header and Filter banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <span className="text-[10px] font-black tracking-widest text-emerald-800 uppercase bg-emerald-50 px-3 py-1 rounded-full">Análise SUS</span>
          <h2 className="text-2xl font-black text-[#01402E] tracking-tight mt-2">Relatórios da Ouvidoria</h2>
          <p className="text-xs text-gray-500 font-medium">Relatórios Gerenciais, NPS e Inteligência Artificial</p>
        </div>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-150">
            <FilterIcon size={14} className="text-[#01402E]" />
            <span className="text-xs font-bold text-gray-500">Filtrar:</span>
          </div>

          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="px-4 py-2 bg-white border border-gray-150 rounded-2xl text-xs font-bold text-[#01402E] focus:outline-none focus:ring-2 focus:ring-[#01402E]"
          >
            {MONTHS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>

          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="px-4 py-2 bg-white border border-gray-150 rounded-2xl text-xs font-bold text-[#01402E] focus:outline-none focus:ring-2 focus:ring-[#01402E]"
          >
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
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
            
            {/* Visual KPI Cards Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              <div className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Amostras Coletadas</span>
                <span className="text-3xl font-black text-[#01402E] mt-3">{metrics.totalEvaluations}</span>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-2 w-max">Totens & Físicos</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Aprovação Técnica</span>
                <span className="text-3xl font-black text-emerald-600 mt-3">{metrics.technicalQualityIndex}%</span>
                <span className="text-[10px] font-bold text-gray-400 mt-2">Médicos, recepção e limpeza</span>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-gray-100 flex flex-col justify-between shadow-sm">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Net Promoter Score (NPS)</span>
                <span className={`text-3xl font-black mt-3 ${metrics.npsGlobal >= 50 ? 'text-emerald-700' : metrics.npsGlobal >= 0 ? 'text-amber-600' : 'text-red-600'}`}>
                  {metrics.npsGlobal}%
                </span>
                <span className="text-[10px] font-extrabold uppercase mt-2 text-[#01402E]">
                  Classif: {metrics.npsClassification}
                </span>
              </div>

            </div>

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

            {/* Recharts - Sector Comparison Bar Chart */}
            <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
              <div className="flex items-center justify-between border-b border-gray-50 pb-4">
                <h3 className="text-sm font-black text-[#01402E] uppercase tracking-wider">Nível de Aprovação por Setor (%)</h3>
                <Activity size={18} className="text-emerald-600" />
              </div>
              
              {sectorChartData.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-400">Insuficiência de dados setoriais para o gráfico.</div>
              ) : (
                <div className="h-64 font-sans">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                      <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                      <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="Aprovação" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Insatisfação" fill="#ef4444" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Recharts - NPS Pie Representation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-6">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-4">Perfil NPS Coletado</h3>
                <div className="h-44 flex items-center justify-center relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Promotores (9-10)', value: metrics.promotersPercent, color: '#10b981' },
                          { name: 'Neutros (7-8)', value: metrics.neutralsPercent, color: '#f59e0b' },
                          { name: 'Detratores (0-6)', value: metrics.detractorsPercent, color: '#ef4444' }
                        ]}
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#f59e0b" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute text-center">
                    <span className="block text-2xl font-black text-[#01402E]">{metrics.npsGlobal}%</span>
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest">NPS Global</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-extrabold text-gray-500">
                  <div className="p-2 bg-emerald-50/50 rounded-xl">
                    <span className="block text-emerald-700">{metrics.promotersPercent}%</span>
                    Promotores
                  </div>
                  <div className="p-2 bg-amber-50/50 rounded-xl">
                    <span className="block text-amber-700">{metrics.neutralsPercent}%</span>
                    Neutros
                  </div>
                  <div className="p-2 bg-red-50/50 rounded-xl">
                    <span className="block text-red-700">{metrics.detractorsPercent}%</span>
                    Detratores
                  </div>
                </div>
              </div>

              {/* Feedbacks samples raw list inside reports view */}
              <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-4 mb-4">Feedbacks Recentes ({patientComments.length})</h3>
                <div className="flex-1 overflow-y-auto space-y-3 max-h-[220px] pr-1">
                  {patientComments.length === 0 ? (
                    <div className="text-center text-xs text-gray-400 py-12">Nenhum comentário textual neste mês.</div>
                  ) : (
                    patientComments.slice(0, 5).map((comment, i) => (
                      <div key={i} className="p-3 bg-gray-50/70 rounded-xl border border-gray-100 text-xs font-medium text-gray-600 line-clamp-3 leading-relaxed">
                        {comment}
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

          </div>

          {/* Right Column - Gemini AI Report Co-Author & Adjusting */}
          <div className="lg:col-span-1 space-y-8">
            
            {!aiReport ? (
              <div className="bg-white p-8 rounded-[2.5rem] border border-[#01402E]/10 shadow-lg space-y-6 relative overflow-hidden">
                {/* Decorative glow */}
                <div className="absolute -top-12 -right-12 w-32 h-32 bg-emerald-100/50 rounded-full blur-2xl pointer-events-none"></div>

                <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center shadow-inner">
                  <Sparkles size={26} className="animate-pulse" />
                </div>

                <div className="space-y-2">
                  <h3 className="text-lg font-black text-[#01402E] tracking-tight">Estudo Inteligente Gemini</h3>
                  <p className="text-xs text-gray-500 font-medium leading-relaxed">
                    Estude as métricas agregadas deste mês, insatisfações setoriais e comentários reais de pacientes com a inteligência do Gemini. 
                  </p>
                </div>

                {/* Additional contextual prompts text box */}
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Foco Adicional (Opcional)</label>
                  <textarea
                    value={extraPrompt}
                    onChange={(e) => setExtraPrompt(e.target.value)}
                    placeholder="Ex: focar nas melhorias do acolhimento na portaria ou enfatizar o atendimento humanizado..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-2xl border border-gray-150 bg-gray-50/50 text-xs font-bold text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#01402E] focus:bg-white resize-none"
                  />
                </div>

                <button
                  type="button"
                  disabled={reportLoading}
                  onClick={handleGenerateAIReport}
                  className="w-full py-4 bg-[#01402E] text-white hover:bg-emerald-950 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {reportLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Gerando Relatório...
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} /> Estudar Ouvidoria com AI
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[750px]">
                
                {/* AI report metadata header */}
                <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles size={16} className="text-emerald-700" />
                    <span className="text-xs font-black text-gray-800 uppercase tracking-wider">Laudo Ouvidoria</span>
                  </div>
                  <button
                    onClick={() => setAiReport(null)}
                    className="p-1 px-3 bg-white border border-gray-200 rounded-xl text-[9px] font-black uppercase text-gray-400 hover:text-red-500 hover:border-red-100 transition-colors"
                  >
                    Reciclar
                  </button>
                </div>

                {/* Content body split into segments */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                  
                  {/* Praise Points */}
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-lg">
                      <ThumbsUp size={10} /> Pontos Fortes
                    </span>
                    <ul className="space-y-2">
                      {aiReport.praisePoints.map((p, idx) => (
                        <li key={idx} className="p-3 bg-white border border-gray-100 rounded-2xl text-xs font-semibold text-gray-600 leading-relaxed shadow-sm">
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Critical Warning */}
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-red-50 text-red-800 px-2 py-0.5 rounded-lg">
                      <AlertTriangle size={10} /> Alertas de Desvios
                    </span>
                    {aiReport.criticalAlerts.length === 0 ? (
                      <p className="text-xs font-medium text-gray-400 p-3 bg-gray-50 rounded-xl">Inexistência de riscos alarmantes.</p>
                    ) : (
                      <ul className="space-y-2">
                        {aiReport.criticalAlerts.map((a, idx) => (
                          <li key={idx} className="p-3 bg-white border border-red-50 rounded-2xl text-xs font-semibold text-gray-600 leading-relaxed shadow-sm">
                            {a}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Strategic Actions */}
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-amber-50 text-amber-800 px-2 py-0.5 rounded-lg">
                      <Lightbulb size={10} /> Plano SUS Estratégico
                    </span>
                    <ul className="space-y-2">
                      {aiReport.strategicActions.map((s, idx) => (
                        <li key={idx} className="p-3 bg-amber-50/20 border border-amber-100/50 rounded-2xl text-xs font-semibold text-gray-600 leading-relaxed">
                          {s}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Editable Conclusion Parecer text box */}
                  <div className="space-y-2">
                    <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase bg-gray-50 text-gray-850 px-2 py-0.5 rounded-lg border border-gray-100">
                      <FileEdit size={10} /> Conclusão & Parecer Técnico
                    </span>
                    <textarea
                      value={aiReport.conclusionText}
                      onChange={(e) => setAiReport({ ...aiReport, conclusionText: e.target.value })}
                      rows={5}
                      className="w-full p-4 rounded-2xl border border-gray-200 text-xs font-semibold text-gray-600 leading-relaxed focus:ring-2 focus:ring-[#01402E] focus:outline-none"
                    />
                  </div>

                </div>

                {/* Co-authoring Prompt chat container */}
                <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-3">
                  <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1">
                    <MessageSquare size={10} /> Ajustar Relatório por Texto
                  </div>
                  
                  <form onSubmit={handleSendMessageToAI} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={chatMessage}
                      disabled={chatLoading}
                      onChange={(e) => setChatMessage(e.target.value)}
                      placeholder="Ex: 'Torne mais elegante', 'Foque no SUS'..."
                      className="flex-1 px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#01402E]"
                    />
                    <button
                      type="submit"
                      disabled={chatLoading}
                      className="p-2.5 bg-[#01402E] hover:bg-emerald-950 text-white rounded-xl transition-all shadow-md shrink-0 flex items-center justify-center disabled:opacity-50 active:scale-95"
                    >
                      {chatLoading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Send size={14} />
                      )}
                    </button>
                  </form>
                </div>

                {/* PDF compilation download button */}
                <div className="p-4 bg-white border-t border-gray-100">
                  <button
                    onClick={handleDownloadPDF}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
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
