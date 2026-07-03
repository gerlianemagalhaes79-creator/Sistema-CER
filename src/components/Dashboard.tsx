import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Activity, 
  CheckCircle2, 
  ClipboardList, 
  TrendingUp, 
  Calendar,
  Layers,
  Award,
  AlertCircle,
  List,
  BarChart2,
  Printer,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  BarChart, 
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend
} from 'recharts';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { SectorEvaluation, EvaluationForm } from '../types';
import { LogoService, ClinicLogos } from '../services/LogoService';

// Safely convert Firestore Timestamp or general dates to Date objects
const getDocDate = (createdAtField: any): Date | null => {
  if (!createdAtField) return null;
  if (typeof createdAtField.toDate === 'function') {
    return createdAtField.toDate();
  }
  if (createdAtField.seconds !== undefined) {
    return new Date(createdAtField.seconds * 1000);
  }
  const parsed = new Date(createdAtField);
  if (parsed.getTime() === 0 || isNaN(parsed.getTime())) return null;
  return parsed;
};

// Subtle internal component for Stat Cards styled premium with interactive click-explanation
interface StatCardProps {
  title: string;
  value: React.ReactNode;
  subtitle: React.ReactNode;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color, onClick }) => {
  const themes = {
    blue: {
      border: 'border-blue-100',
      shadow: 'hover:shadow-blue-500/10',
      iconBg: 'bg-blue-50 text-blue-600',
      bubble: 'bg-blue-500/5'
    },
    emerald: {
      border: 'border-emerald-100',
      shadow: 'hover:shadow-emerald-500/10',
      iconBg: 'bg-emerald-50 text-emerald-600',
      bubble: 'bg-emerald-500/5'
    },
    amber: {
      border: 'border-amber-100',
      shadow: 'hover:shadow-amber-500/10',
      iconBg: 'bg-amber-50 text-amber-500',
      bubble: 'bg-amber-500/5'
    },
    rose: {
      border: 'border-rose-100',
      shadow: 'hover:shadow-rose-500/10',
      iconBg: 'bg-rose-50 text-rose-600',
      bubble: 'bg-rose-500/5'
    },
    indigo: {
      border: 'border-indigo-100',
      shadow: 'hover:shadow-indigo-500/10',
      iconBg: 'bg-indigo-50 text-indigo-600',
      bubble: 'bg-indigo-500/5'
    }
  };

  const currentTheme = themes[color] || themes.blue;

  return (
    <div 
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`group relative overflow-hidden bg-white p-6 rounded-[2rem] border ${currentTheme.border} transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md ${currentTheme.shadow} flex items-center justify-between ${onClick ? 'cursor-pointer select-none active:scale-[0.98]' : ''}`}
      title={onClick ? "Clique para ver tutorial de cálculo" : undefined}
    >
      {/* Subtle background bubble for visual comfort and material style */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${currentTheme.bubble} blur-xl`} />
      
      <div className="space-y-1 z-10 w-full pr-2">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">{title}</span>
          {onClick && (
            <Info size={11} className="text-slate-350 group-hover:text-slate-500 transition-colors shrink-0" />
          )}
        </div>
        <span className="text-3xl font-black text-slate-900 block">{value}</span>
        <div className="flex items-center justify-between">
          <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">{subtitle}</div>
          {onClick && (
            <span className="text-[8px] font-bold text-blue-500/80 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity duration-200">Explicar 💡</span>
          )}
        </div>
      </div>
      <div className={`w-12 h-12 rounded-2xl ${currentTheme.iconBg} flex items-center justify-center shrink-0 z-10`}>
        {icon}
      </div>
    </div>
  );
};

interface DashboardProps {
  selectedMonth?: number;
  setSelectedMonth?: (month: number) => void;
  selectedYear?: number;
  setSelectedYear?: (year: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  selectedMonth: propSelectedMonth,
  setSelectedMonth: propSetSelectedMonth,
  selectedYear: propSelectedYear,
  setSelectedYear: propSetSelectedYear,
}) => {
  const now = new Date();
  
  // Logos
  const [loadedLogos, setLoadedLogos] = useState<ClinicLogos>({});
  
  // Year and Month selection controls
  const [localSelectedMonth, setLocalSelectedMonth] = useState<number>(now.getMonth());
  const [localSelectedYear, setLocalSelectedYear] = useState<number>(now.getFullYear());
  
  const selectedMonth = propSelectedMonth !== undefined ? propSelectedMonth : localSelectedMonth;
  const setSelectedMonth = propSetSelectedMonth !== undefined ? propSetSelectedMonth : setLocalSelectedMonth;
  const selectedYear = propSelectedYear !== undefined ? propSelectedYear : localSelectedYear;
  const setSelectedYear = propSetSelectedYear !== undefined ? propSetSelectedYear : setLocalSelectedYear;

  const [loading, setLoading] = useState<boolean>(true);
  const [sectorViewMode, setSectorViewMode] = useState<'list' | 'chart'>('list');
  const [sectorSortKey, setSectorSortKey] = useState<'approval' | 'volume'>('approval');
  const [showPrintPreview, setShowPrintPreview] = useState<boolean>(false);
  
  // State for metric help dialog with educational explanation
  const [selectedHelpMetric, setSelectedHelpMetric] = useState<{
    title: string;
    value: string | React.ReactNode;
    subtitle: string;
    description: string;
    formula: string;
    example: string;
    color: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
  } | null>(null);
  
  // Complete database collections storage
  const [allEvaluations, setAllEvaluations] = useState<SectorEvaluation[]>([]);
  const [allForms, setAllForms] = useState<EvaluationForm[]>([]);

  // Last 5 years array for select controls
  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  }, []);

  const months = [
    { value: 0, label: 'Janeiro' },
    { value: 1, label: 'Fevereiro' },
    { value: 2, label: 'Março' },
    { value: 3, label: 'Abril' },
    { value: 4, label: 'Maio' },
    { value: 5, label: 'Junho' },
    { value: 6, label: 'Julho' },
    { value: 7, label: 'Agosto' },
    { value: 8, label: 'Setembro' },
    { value: 9, label: 'Outubro' },
    { value: 10, label: 'Novembro' },
    { value: 11, label: 'Dezembro' }
  ];

  // Subscribe to logo changes from Firestore
  useEffect(() => {
    const unsubscribeLogos = LogoService.subscribeToLogos((data) => {
      setLoadedLogos(data);
    });
    return () => unsubscribeLogos();
  }, []);

  // Re-reactive subscription to Firestore collections
  useEffect(() => {
    let evaluationsFetched = false;
    let formsFetched = false;

    const checkInitialCompleteness = () => {
      if (evaluationsFetched && formsFetched) {
        setLoading(false);
      }
    };

    // Listen to Evaluations
    const evalsQuery = query(collection(db, 'evaluations'), orderBy('createdAt', 'desc'));
    const unsubEvals = onSnapshot(evalsQuery, (snapshot) => {
      const evalsList = snapshot.docs.map(doc => {
        const data = doc.data();
        let mappedRating = data.rating;
        // Keep spelling backwards compatibility intact
        if (mappedRating === 'Ótimo') {
          mappedRating = 'Otimo';
        }
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt,
          rating: mappedRating || 'Não informou',
        } as any;
      });
      setAllEvaluations(evalsList);
      evaluationsFetched = true;
      checkInitialCompleteness();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'evaluations');
    });

    // Listen to Forms
    const formsQuery = query(collection(db, 'forms'), orderBy('createdAt', 'desc'));
    const unsubForms = onSnapshot(formsQuery, (snapshot) => {
      const formsList = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: data.createdAt,
          npsScore: data.recommendationScore !== undefined ? data.recommendationScore : (data.npsScore || 0),
        } as any;
      });
      setAllForms(formsList);
      formsFetched = true;
      checkInitialCompleteness();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'forms');
    });

    return () => {
      unsubEvals();
      unsubForms();
    };
  }, []);

  // Build a fast lookup map from formId to its event date (favoring form.date first, then fallback to createdAt)
  const formDatesMap = useMemo(() => {
    const map = new Map<string, Date>();
    allForms.forEach(f => {
      const d = getDocDate(f.date) || getDocDate(f.createdAt);
      if (d) {
        map.set(f.id, d);
      }
    });
    return map;
  }, [allForms]);

  // Filter local data based on Selected Month and Selected Year
  const filteredEvaluations = useMemo(() => {
    return allEvaluations.filter(e => {
      const d = formDatesMap.get(e.formId) || getDocDate(e.createdAt);
      if (!d) return false;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allEvaluations, formDatesMap, selectedMonth, selectedYear]);

  const filteredForms = useMemo(() => {
    return allForms.filter(f => {
      const d = getDocDate(f.date) || getDocDate(f.createdAt);
      if (!d) return false;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allForms, selectedMonth, selectedYear]);


  // Metric computations based on filtered datasets
  const totalEvaluationsCount = filteredEvaluations.length;

  const satisfactionPercent = useMemo(() => {
    if (totalEvaluationsCount === 0) return 0;
    const positiveOnes = filteredEvaluations.filter(e => {
      const r = e.rating;
      return r === 'Ótimo' || r === 'Otimo' || r === 'Bom';
    }).length;
    return Math.round((positiveOnes / totalEvaluationsCount) * 100);
  }, [filteredEvaluations, totalEvaluationsCount]);

  const npsMetrics = useMemo(() => {
    const totalForms = filteredForms.length;
    if (totalForms === 0) {
      return { 
        score: 0, 
        status: 'Sem dados', 
        promotersPercent: 0, 
        detractorsPercent: 0, 
        passivesPercent: 0,
        promotersCount: 0,
        detractorsCount: 0,
        passivesCount: 0,
        averageScore: '0'
      };
    }

    let promoters = 0;
    let detractors = 0;
    let passives = 0;
    let scoreSum = 0;

    filteredForms.forEach(f => {
      const score = typeof f.npsScore === 'number' ? f.npsScore : 0;
      scoreSum += score;
      if (score >= 9) {
        promoters++;
      } else if (score <= 6) {
        detractors++;
      } else {
        passives++;
      }
    });

    const promotersPercent = Math.round((promoters / totalForms) * 100);
    const detractorsPercent = Math.round((detractors / totalForms) * 100);
    const passivesPercent = Math.round((passives / totalForms) * 100);
    const score = promotersPercent - detractorsPercent;
    const averageScore = (scoreSum / totalForms).toFixed(1);

    let status = 'Zona de Aperfeiçoamento 😐';
    if (score >= 75) status = 'Zona de Excelência ❤️';
    else if (score >= 50) status = 'Zona de Qualidade 😊';
    else if (score >= 0) status = 'Zona de Aperfeiçoamento 😐';
    else status = 'Zona Crítica 💀';

    return {
      score,
      status,
      promotersPercent,
      detractorsPercent,
      passivesPercent,
      promotersCount: promoters,
      detractorsCount: detractors,
      passivesCount: passives,
      averageScore
    };
  }, [filteredForms]);

  const npsDistributionData = useMemo(() => {
    const counts = Array.from({ length: 11 }, (_, i) => ({
      nota: `${i}`,
      votos: 0,
      tipo: i >= 9 ? 'Promotor' : i <= 6 ? 'Detrator' : 'Neutro',
      cor: i >= 9 ? '#10b981' : i <= 6 ? '#ef4444' : '#f59e0b'
    }));

    filteredForms.forEach(f => {
      const score = Math.round(Number(f.npsScore));
      if (!isNaN(score) && score >= 0 && score <= 10) {
        counts[score].votos++;
      }
    });

    return counts;
  }, [filteredForms]);

  const totalFormsCount = filteredForms.length;


  // Data calculations for Charts
  // 1. Ratings distribution dataset
  const ratingsDistributionData = useMemo(() => {
    let otimoCount = 0;
    let bomCount = 0;
    let regularCount = 0;
    let ruimCount = 0;
    let naoInformouCount = 0;

    filteredEvaluations.forEach(e => {
      const r = e.rating;
      if (r === 'Ótimo' || r === 'Otimo') {
        otimoCount++;
      } else if (r === 'Bom') {
        bomCount++;
      } else if (r === 'Regular') {
        regularCount++;
      } else if (r === 'Ruim') {
        ruimCount++;
      } else {
        naoInformouCount++;
      }
    });

    return [
      { name: 'Ótimo', valor: otimoCount, color: '#10b981' },
      { name: 'Bom', valor: bomCount, color: '#3b82f6' },
      { name: 'Regular', valor: regularCount, color: '#f59e0b' },
      { name: 'Ruim', valor: ruimCount, color: '#ef4444' },
      { name: 'Não informou', valor: naoInformouCount, color: '#94a3b8' }
    ];
  }, [filteredEvaluations]);

  // 2. Trend dataset of the last 6 months
  const satisfactionTrendData = useMemo(() => {
    const list = [];
    for (let i = 5; i >= 0; i--) {
      const tempDate = new Date(selectedYear, selectedMonth - i, 1);
      const m = tempDate.getMonth();
      const y = tempDate.getFullYear();

      // Filter forms for this specific historical month
      const monthForms = allForms.filter(f => {
        const d = formDatesMap.get(f.id) || getDocDate(f.date) || getDocDate(f.createdAt);
        return d ? d.getMonth() === m && d.getFullYear() === y : false;
      });

      const total = monthForms.length;
      let scoreSum = 0;
      monthForms.forEach(f => {
        scoreSum += typeof f.npsScore === 'number' ? f.npsScore : 0;
      });
      const avgNps = total > 0 ? Number((scoreSum / total).toFixed(1)) : 0;

      const monthName = tempDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
      list.push({
        name: monthName,
        'Média Geral NPS': avgNps,
        'Total Formulários': total
      });
    }
    return list;
  }, [allForms, formDatesMap, selectedMonth, selectedYear]);

  // Helper to map old sector names to new clean ones to prevent duplicates and fragmentation
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

  // Auto identify critical sectors with >= 15% ratings as "Ruim"
  const criticalSectors = useMemo(() => {
    const sectorStats: Record<string, { total: number; ruins: number }> = {};
    
    filteredEvaluations.forEach(e => {
      const sector = mapOldToNewSector(e.sector || 'Geral');
      if (!sectorStats[sector]) {
        sectorStats[sector] = { total: 0, ruins: 0 };
      }
      sectorStats[sector].total++;
      if (e.rating === 'Ruim') {
        sectorStats[sector].ruins++;
      }
    });

    return Object.entries(sectorStats)
      .map(([name, stats]) => {
        const ruinPercent = stats.total > 0 ? Math.round((stats.ruins / stats.total) * 105) / 105 : 0; // standard round
        const actualPercent = stats.total > 0 ? Math.round((stats.ruins / stats.total) * 100) : 0;
        return { name, ruinPercent: actualPercent, total: stats.total, ruins: stats.ruins };
      })
      .filter(s => s.total > 0 && s.ruinPercent >= 15)
      .sort((a, b) => b.ruinPercent - a.ruinPercent);
  }, [filteredEvaluations]);

  const npsColorClass = useMemo((): 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo' => {
    if (totalFormsCount === 0) return 'blue';
    const s = npsMetrics.score;
    if (s >= 75) return 'emerald';
    if (s >= 50) return 'indigo';
    if (s >= 0) return 'amber';
    return 'rose';
  }, [npsMetrics.score, totalFormsCount]);

  // Performance de Aprovação por Setor (%) sorted dynamically
  const sectorPerformanceData = useMemo(() => {
    const sectorStats: Record<string, { total: number; positive: number }> = {};
    
    filteredEvaluations.forEach(e => {
      const sector = mapOldToNewSector(e.sector?.trim() || 'Geral/Outros');
      if (!sectorStats[sector]) {
        sectorStats[sector] = { total: 0, positive: 0 };
      }
      sectorStats[sector].total++;
      if (e.rating === 'Ótimo' || e.rating === 'Otimo' || e.rating === 'Bom') {
        sectorStats[sector].positive++;
      }
    });

    return Object.entries(sectorStats)
      .map(([name, stats]) => {
        const approvalPercent = stats.total > 0 ? Math.round((stats.positive / stats.total) * 100) : 0;
        return { name, 'Aprovação (%)': approvalPercent, positive: stats.positive, total: stats.total };
      })
      .sort((a, b) => {
        if (sectorSortKey === 'approval') {
          if (b['Aprovação (%)'] !== a['Aprovação (%)']) {
            return b['Aprovação (%)'] - a['Aprovação (%)'];
          }
          return b.total - a.total; // Tie-breaker: volume of ratings
        } else {
          if (b.total !== a.total) {
            return b.total - a.total; // Primary: volume of ratings
          }
          return b['Aprovação (%)'] - a['Aprovação (%)']; // Tie-breaker: approval %
        }
      });
  }, [filteredEvaluations, sectorSortKey]);

  // LOADING STATE WITH COOPERATE THIN BLUE SPINNER GENTLY CENTRED
  if (loading) {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-[500px] space-y-4 bg-white/50 backdrop-blur-xs rounded-[2.5rem] border border-gray-100 p-8 shadow-xs" 
        id="dashboard_loading_state"
      >
        <div className="w-9 h-9 border-[2.5px] border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center space-y-1">
          <p className="text-xs font-black uppercase tracking-widest text-[#01402E]">Carregando Painel</p>
          <p className="text-[10px] uppercase font-bold text-gray-405 leading-none">Consultando dados no Firestore...</p>
        </div>
      </div>
    );
  }

  // NPS label helper styling
  const getNpsStatusBgColor = (status: string) => {
    if (status.includes('Excelência')) return 'bg-emerald-50 border-emerald-200 text-emerald-800';
    if (status.includes('Qualidade')) return 'bg-teal-50 border-teal-200 text-teal-850';
    if (status.includes('Aperfeiçoamento')) return 'bg-amber-50 border-amber-200 text-amber-850';
    if (status.includes('Crítica')) return 'bg-rose-50 border-rose-200 text-rose-850 animate-pulse';
    return 'bg-gray-50 border-gray-200 text-gray-600';
  };

  return (
    <div className="space-y-8" id="real_reactive_dashboard">
      
      {/* Premium Header in Policlínica Green */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-[#01402E] tracking-tight uppercase">Dashboard Executivo</h2>
          <p className="text-xs font-black text-emerald-500 uppercase tracking-widest block mt-1.5">PANORAMA DE GESTÃO POLICLÍNICA</p>
        </div>
        
        {/* Date Filter Panel with Calendar Icon */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-[2rem] border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 px-3 border-r border-slate-150 last:border-none">
            <Calendar size={15} className="text-emerald-600 shrink-0" />
            <select 
              value={selectedMonth} 
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-xs font-black text-slate-650 uppercase bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
              title="Filtrar Mês"
            >
              {months.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 last:border-none">
            <Layers size={15} className="text-emerald-600 shrink-0" />
            <select 
              value={selectedYear} 
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="text-xs font-black text-slate-650 bg-transparent border-none outline-none focus:ring-0 cursor-pointer"
              title="Filtrar Ano"
            >
              {years.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      </div>



      {/* Grid of Metric Cards (Grade com 5 colunas no computador e 1 no mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Avaliações */}
        <StatCard 
          title="Avaliações" 
          value={totalEvaluationsCount} 
          subtitle="Total de Avaliações" 
          icon={<ClipboardList size={22} />} 
          color="blue" 
          onClick={() => setSelectedHelpMetric({
            title: "Avaliações",
            value: totalEvaluationsCount,
            subtitle: "Total de Notas por Setores",
            description: "Representa a soma total das notas individuais dadas pelos pacientes para todos os setores avaliados. Cada vez que um paciente responde à pesquisa, ele pode avaliar um ou mais setores (ex: recepção, médico, enfermagem). Cada nota preenchida conta como uma avaliação individual de setor.",
            formula: "Soma das avaliações de todos os setores preenchidos nos formulários.",
            example: "Se 10 pacientes responderam à pesquisa e cada um deu nota para 3 setores, teremos um total de 30 Avaliações.",
            color: "blue"
          })}
        />

        {/* Card 2: Qualidade de Satisfação */}
        <StatCard 
          title="Qualidade de Satisfação" 
          value={`${satisfactionPercent}%`} 
          subtitle="Satisfação" 
          icon={<CheckCircle2 size={22} />} 
          color="emerald" 
          onClick={() => setSelectedHelpMetric({
            title: "Qualidade de Satisfação",
            value: `${satisfactionPercent}%`,
            subtitle: "Índice de Aprovação do Atendimento",
            description: "Este índice reflete o percentual de aprovação direta do atendimento por setor. Ele mostra a proporção de avaliações individuais de setores que receberam as notas máximas ('Ótimo' ou 'Bom') em relação ao total acumulado de notas recebidas.",
            formula: "((Notas 'Ótimo' + Notas 'Bom') / Total Geral de Avaliações) × 100",
            example: "Se houveram 50 avaliações de setores, sendo 30 'Ótimo', 10 'Bom', 5 'Regular' e 5 'Ruim', a Qualidade de Satisfação será: (30 + 10) / 50 = 80% de aprovação.",
            color: "emerald"
          })}
        />

        {/* Card 3: Média Geral NPS */}
        <StatCard 
          title="Média Geral NPS" 
          value={
            <span className="flex items-baseline gap-0.5">
              <span>{npsMetrics.averageScore}</span>
              <span className="text-sm font-bold text-slate-400 font-mono">/10</span>
            </span>
          } 
          subtitle="Nota média ponderada" 
          icon={<Sparkles size={22} />} 
          color="indigo" 
          onClick={() => setSelectedHelpMetric({
            title: "Média Geral NPS",
            value: `${npsMetrics.averageScore}/10`,
            subtitle: "Nota Média de Recomendação (0 a 10)",
            description: "É a nota média aritmética atribuída diretamente pelos pacientes à clássica pergunta de recomendação da instituição: 'De 0 a 10, o quanto você recomendaria nossa instituição para amigos/familiares?'. Ela exibe a nota média fria, sem o desconto de detratores na fórmula tradicional.",
            formula: "Soma de todas as notas de recomendação (0 a 10) / Número total de formulários respondidos",
            example: "Se você tem 3 formulários com notas de recomendação: 10, 9 e 5. A nota média geral é calculada somando 10 + 9 + 5 = 24 e dividindo por 3 pesquisas, resultando em: 8.0.",
            color: "indigo"
          })}
        />

        {/* Card 4: NPS Global */}
        <StatCard 
          title="NPS Global" 
          value={totalFormsCount > 0 ? `${npsMetrics.score > 0 ? '+' : ''}${npsMetrics.score}` : 'N/A'} 
          subtitle={`Zona: ${npsMetrics.status}`} 
          icon={<Activity size={22} />} 
          color={npsColorClass} 
          onClick={() => setSelectedHelpMetric({
            title: "NPS Global",
            value: totalFormsCount > 0 ? `${npsMetrics.score > 0 ? '+' : ''}${npsMetrics.score}` : 'N/A',
            subtitle: `Selo: ${npsMetrics.status}`,
            description: "O Net Promoter Score (NPS) é a métrica padrão ouro usada mundialmente para mensurar a lealdade e recomendação dos pacientes. O sistema separa as notas (0 a 10) em três grupos: Promotores (notas 9 ou 10), Neutros (notas 7 ou 8) e Detratores (notas de 0 a 6). O cálculo final varia de -100 a +100.",
            formula: "Percentual de Promotores (%) − Percentual de Detratores (%)",
            example: `Considerando as respostas das pesquisas do período filtrado:
• Promotores (notas 9-10): ${npsMetrics.promotersPercent}%
• Neutros (notas 7-8): ${npsMetrics.passivesPercent}%
• Detratores (notas 0-6): ${npsMetrics.detractorsPercent}%

Cálculo do NPS: ${npsMetrics.promotersPercent}% (Promotores) - ${npsMetrics.detractorsPercent}% (Detratores) = ${npsMetrics.score}.

Zonas de Classificação:
• Zona de Excelência ❤️ (75 a 100)
• Zona de Qualidade 😊 (50 a 74)
• Zona de Aperfeiçoamento 😐 (0 a 49)
• Zona Crítica 💀 (-100 a -1)`,
            color: npsColorClass
          })}
        />

        {/* Card 5: Amostras */}
        <StatCard 
          title="Amostras" 
          value={totalFormsCount} 
          subtitle="Total de Formulários" 
          icon={<Users size={22} />} 
          color="amber" 
          onClick={() => setSelectedHelpMetric({
            title: "Amostras",
            value: totalFormsCount,
            subtitle: "Número de Pesquisas Respondidas",
            description: "É a quantidade absoluta de formulários preenchidos e enviados de maneira única pelos pacientes. Cada formulário preenchido serve como a base estatística e amostral para obter a nota de recomendação (NPS) e as pontuações dos setores.",
            formula: "Contagem total de formulários (pacientes respondentes) submetidos no período filtrado.",
            example: "Se 85 pacientes responderam à pesquisa de opinião neste mês, o painel exibirá uma amostra de 85 formulários de opinião.",
            color: "amber"
          })}
        />

      </div>

      {/* NPS breakdown percentages info */}
      {totalFormsCount > 0 && (
        <div className="bg-[#fcfdfa] p-5 rounded-[2rem] border border-emerald-100 flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs font-bold text-gray-500 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#10b981] shrink-0"></span>
            <span className="text-slate-650">Promotores (9-10): <strong className="text-emerald-700 font-extrabold">{npsMetrics.promotersPercent}%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#f59e0b] shrink-0"></span>
            <span className="text-slate-650">Neutros (7-8): <strong className="text-amber-600 font-extrabold">{npsMetrics.passivesPercent}%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#ef4444] shrink-0"></span>
            <span className="text-slate-650">Detratores (0-6): <strong className="text-rose-600 font-extrabold">{npsMetrics.detractorsPercent}%</strong></span>
          </div>
          <div className="text-[10px] uppercase font-bold text-slate-400 border-t md:border-t-0 md:border-l border-slate-150 pt-2.5 md:pt-0 md:pl-4">
            FÓRMULA DO NPS: <span className="bg-white px-2 py-1 rounded-lg border border-slate-100 font-black text-slate-650">% Promotores - % Detratores ({npsMetrics.promotersPercent}% - {npsMetrics.detractorsPercent}% = {npsMetrics.score > 0 ? '+' : ''}{npsMetrics.score})</span>
          </div>
        </div>
      )}

      {/* Graphical Information Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Chart A: Donut Chart — Distribuição de Notas */}
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Distribuição de Opinião</span>
            <h3 className="text-lg font-black text-slate-850 uppercase flex items-center gap-2">
              <Award size={18} className="text-blue-600" /> Distribuição de Notas Mês
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Fatias exatas por categoria de satisfação no período</p>
          </div>

          <div className="relative h-[280px] w-full">
            {totalEvaluationsCount > 0 ? (
              <>
                {/* Absolutely Centered Indicator inside the Donut Hole */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-4">
                  {loadedLogos.ouvidoria ? (
                    <img 
                      src={loadedLogos.ouvidoria} 
                      alt="Ouvidoria" 
                      className="max-w-[100px] max-h-[100px] object-contain rounded-lg" 
                      referrerPolicy="no-referrer" 
                    />
                  ) : (
                    <>
                      <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Total</span>
                      <span className="text-3xl font-black text-slate-800 leading-none my-1">{totalEvaluationsCount}</span>
                      <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider leading-none">votos</span>
                    </>
                  )}
                </div>

                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={ratingsDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="valor"
                    >
                      {ratingsDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [`${value} avaliações`, 'Quantidade']} 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <span className="text-3xl">📭</span>
                <p className="text-xs font-black uppercase text-slate-400 tracking-wider mt-2">Sem dados de avaliações registrados neste período</p>
              </div>
            )}
          </div>

          {/* Gorgeous breakdown list for absolute self-explanation */}
          {totalEvaluationsCount > 0 && (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-5 gap-2 pt-4 border-t border-slate-100">
              {ratingsDistributionData.map((item) => {
                const percent = totalEvaluationsCount > 0 ? Math.round((item.valor / totalEvaluationsCount) * 100) : 0;
                return (
                  <div 
                    key={item.name} 
                    className="rounded-2xl p-2.5 border border-slate-100 bg-slate-50/20 hover:bg-slate-50 transition-colors text-center shadow-xs flex flex-col justify-between"
                  >
                    <span className="text-[8px] font-black uppercase tracking-wider block" style={{ color: item.color }}>
                      {item.name}
                    </span>
                    <span className="text-sm font-black text-slate-800 mt-1 block">
                      {percent}%
                    </span>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wide mt-0.5 block">
                      ({item.valor} {item.valor === 1 ? 'voto' : 'votos'})
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Chart B: Satisfaction Trend over Last 6 Months */}
        <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Evolução Histórica</span>
            <h3 className="text-lg font-black text-slate-850 uppercase flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-600" /> Tendência de Média NPS (0-10)
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Evolução da Nota Média Ponderada nos últimos 6 meses</p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={satisfactionTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} />
                <Line 
                  type="monotone" 
                  dataKey="Média Geral NPS" 
                  stroke="#10b981" 
                  strokeWidth={5} 
                  dot={{ r: 6, fill: "#10b981", strokeWidth: 3, stroke: "#fff" }}
                  activeDot={{ r: 8, fill: '#10b981', strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart C: Performance de Aprovação por Setor (%) - Full Width */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-50 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Desempenho Setorial</span>
              <h3 className="text-lg font-black text-slate-850 uppercase flex items-center gap-2">
                Qualidade de Aprovação por Setor
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                Visualização do percentual de satisfação de cada setor (Ótimo & Bom) ou volume total de votos
              </p>
            </div>

            {/* Controls Side by Side */}
            <div className="flex flex-wrap items-center gap-3 shrink-0 self-start xl:self-center">
              {/* IMPRESSÃO DO RELATÓRIO SETORIAL */}
              <button
                onClick={() => setShowPrintPreview(true)}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#022c22] hover:bg-emerald-950 text-white font-black text-[10px] uppercase tracking-wider rounded-2xl transition-all shadow-xs duration-200"
                title="Visualizar e Imprimir Relatório Oficial por Setor"
              >
                <Printer size={13} />
                Imprimir Desempenho
              </button>

              {/* ORDENAÇÃO */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1">
                <button
                  onClick={() => setSectorSortKey('approval')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    sectorSortKey === 'approval'
                      ? 'bg-white text-slate-800 shadow-xs border border-slate-100'
                      : 'text-slate-400 hover:text-slate-650'
                  }`}
                  title="Ordenar por maior percentual de aprovação"
                >
                  % Aprovação
                </button>
                <button
                  onClick={() => setSectorSortKey('volume')}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    sectorSortKey === 'volume'
                      ? 'bg-white text-slate-800 shadow-xs border border-slate-100'
                      : 'text-slate-400 hover:text-slate-650'
                  }`}
                  title="Ordenar por maior número de votos/avaliações"
                >
                  Qtd Votos
                </button>
              </div>

              {/* VISUALIZAÇÃO */}
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-1">
                <button
                  onClick={() => setSectorViewMode('list')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    sectorViewMode === 'list'
                      ? 'bg-white text-slate-800 shadow-xs border border-slate-100'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <List size={13} />
                  Lista
                </button>
                <button
                  onClick={() => setSectorViewMode('chart')}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                    sectorViewMode === 'chart'
                      ? 'bg-white text-slate-800 shadow-xs border border-slate-100'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <BarChart2 size={13} />
                  Gráfico
                </button>
              </div>
            </div>
          </div>

          <div>
            {sectorPerformanceData.length > 0 ? (
              sectorViewMode === 'list' ? (
                <div className="space-y-3.5 max-h-[440px] overflow-y-auto pr-1">
                  {sectorPerformanceData.map((sector, index) => {
                    const percent = sector['Aprovação (%)'];
                    const isExcellent = percent >= 75;
                    const isGood = percent >= 50;
                    const isRegular = percent >= 30;
                    
                    let barColor = 'bg-rose-500';
                    let textColor = 'text-rose-700';
                    let bgColor = 'bg-rose-50 border-rose-100/50';
                    let badgeText = 'Crítico ⚠️';
                    
                    if (isExcellent) {
                      barColor = 'bg-emerald-500';
                      textColor = 'text-emerald-700';
                      bgColor = 'bg-emerald-50 border-emerald-100';
                      badgeText = 'Excelente 😊';
                    } else if (isGood) {
                      barColor = 'bg-blue-500';
                      textColor = 'text-blue-700';
                      bgColor = 'bg-blue-50 border-blue-100';
                      badgeText = 'Bom 🙂';
                    } else if (isRegular) {
                      barColor = 'bg-amber-500';
                      textColor = 'text-amber-700';
                      bgColor = 'bg-amber-50 border-amber-100';
                      badgeText = 'Regular 😐';
                    }

                    // Rank badge color assignment
                    let rankBg = 'bg-slate-100 text-slate-600';
                    if (index === 0) rankBg = 'bg-gradient-to-r from-amber-500 to-yellow-400 text-white font-black shadow-xs';
                    else if (index === 1) rankBg = 'bg-[#cbd5e1] text-slate-800 font-black shadow-xs';
                    else if (index === 2) rankBg = 'bg-[#b45309]/80 text-white font-black shadow-xs';

                    return (
                      <div 
                        key={sector.name} 
                        className="p-4 rounded-[1.5rem] border border-slate-100 hover:border-slate-200 bg-white hover:bg-slate-50/40 transition-all duration-200"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                          <div className="flex items-start gap-3">
                            <span className={`w-7 h-7 rounded-lg text-xs flex items-center justify-center shrink-0 uppercase tracking-tighter ${rankBg}`}>
                              {index + 1}º
                            </span>
                            <div>
                              <h4 className="text-xs font-black text-slate-750 leading-snug break-words">
                                {sector.name}
                              </h4>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                                {sector.positive} {sector.positive === 1 ? 'voto positivo' : 'votos positivos'} de {sector.total} no total
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest ${textColor} ${bgColor}`}>
                              {badgeText}
                            </span>
                            <span className="text-sm font-black text-slate-800">
                              {percent}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar Track */}
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${barColor} transition-all duration-500 rounded-full`} 
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={sectorPerformanceData} margin={{ bottom: 45 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 9, fill: '#64748b', fontWeight: 'bold' }} 
                        angle={45} 
                        textAnchor="start" 
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} domain={[0, 100]} unit="%" />
                      <Tooltip 
                        cursor={{ fill: '#f8fafc' }} 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} 
                      />
                      <Bar dataKey="Aprovação (%)" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={25} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            ) : (
              <div className="h-[320px] flex flex-col items-center justify-center text-center p-4">
                <span className="text-3xl">📭</span>
                <p className="text-xs font-black uppercase text-slate-400 tracking-wider mt-2">Nenhum setor com avaliações neste período</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart D: NPS Estadual Detalhado (Escala 0 a 10) - Full Width */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-8 rounded-[2.5rem] border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 pb-4">
            <div>
              <span className="text-[10px] font-black uppercase text-emerald-700 tracking-widest block mb-1">Cobrança e Auditoria Estadual (NHO)</span>
              <h3 className="text-lg font-black text-slate-850 uppercase flex items-center gap-2">
                <Activity size={18} className="text-emerald-700 shrink-0" /> Detalhamento de Nota NPS (Escala de 0 a 10)
              </h3>
              <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">
                Visualização auditada de acordo com as notas específicas de recomendação (0 a 10) atribuídas pelos pacientes
              </p>
            </div>
            {totalFormsCount > 0 && (
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl px-4 py-2 text-center shrink-0">
                <span className="text-[9px] font-black text-emerald-800 uppercase tracking-widest block">Índice NPS Geral</span>
                <span className="text-xl font-black text-emerald-700 leading-none block mt-0.5">
                  {npsMetrics.score > 0 ? '+' : ''}{npsMetrics.score}
                </span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center font-sans">
            
            {/* 1. Bar Chart of the 0 to 10 scale */}
            <div className="lg:col-span-2 space-y-3">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block font-sans">Frequência por Nota Absoluta</span>
              <div className="h-[220px] w-full">
                {totalFormsCount > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={npsDistributionData} margin={{ bottom: 10, left: -25, right: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="nota" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#475569', fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} allowDecimals={false} />
                      <Tooltip 
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-slate-900 text-white rounded-xl p-3 shadow-md border-none text-[10px] leading-tight space-y-1">
                                <p className="font-black uppercase tracking-wider text-[9px] text-slate-300">Nota {data.nota}</p>
                                <p className="font-black text-xs">{data.votos} {data.votos === 1 ? 'paciente' : 'pacientes'}</p>
                                <p className="font-bold text-slate-400">Classificação: <strong style={{ color: data.cor }}>{data.tipo}</strong></p>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                      <Bar dataKey="votos" radius={[4, 4, 0, 0]} barSize={25}>
                        {npsDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.cor} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <span className="text-2xl">📭</span>
                    <p className="text-xs font-black uppercase text-slate-400 tracking-wider mt-2">Sem respostas de recomendação registradas</p>
                  </div>
                )}
              </div>
            </div>

            {/* 2. Visual Meter Gauge & Breakdown statistics */}
            <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-[2rem] space-y-5">
              <div className="text-center">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Zona do Score</span>
                <span className="text-4xl font-extrabold text-slate-900 block mt-1">
                  {totalFormsCount > 0 ? `${npsMetrics.score > 0 ? '+' : ''}${npsMetrics.score}` : 'N/A'}
                </span>
                <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg border inline-block mt-2 ${getNpsStatusBgColor(npsMetrics.status)}`}>
                  {npsMetrics.status}
                </span>
              </div>

              {/* Slider scale indicator representing the state audit spectrum */}
              <div className="space-y-2">
                <div className="flex justify-between text-[8px] font-black text-slate-450 uppercase tracking-wider px-1">
                  <span>Zona Crítica</span>
                  <span>Zona de Aperfeiçoamento</span>
                  <span>Zona de Excelência</span>
                </div>
                
                {/* Visual indicator bar */}
                <div className="relative h-2.5 bg-gradient-to-r from-red-500 via-amber-400 to-emerald-500 rounded-full w-full overflow-visible animate-none">
                  {totalFormsCount > 0 && (
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white border-2 border-slate-900 rounded-full shadow-md flex items-center justify-center transition-all duration-350"
                      // Map score from [-100, 100] to percentage [0, 100] -> percent = (score + 100) / 2
                      style={{ left: `calc(${((npsMetrics.score + 100) / 2)}% - 8px)` }}
                    >
                      <div className="w-1.5 h-1.5 bg-slate-900 rounded-full animate-none"></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="space-y-2 pt-2 border-t border-slate-200/50 text-[10px] text-slate-700">
                <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100/80">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>
                    Promotores (9-10)
                  </span>
                  <span className="font-black text-slate-800">{npsMetrics.promotersCount} ({npsMetrics.promotersPercent}%)</span>
                </div>
                <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100/80">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>
                    Neutros (7-8)
                  </span>
                  <span className="font-black text-slate-800">{npsMetrics.passivesCount} ({npsMetrics.passivesPercent}%)</span>
                </div>
                <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-slate-100/80">
                  <span className="flex items-center gap-1.5 font-bold">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]"></span>
                    Detratores (0-6)
                  </span>
                  <span className="font-black text-slate-800">{npsMetrics.detractorsCount} ({npsMetrics.detractorsPercent}%)</span>
                </div>
              </div>

            </div>

          </div>
        </div>

      </div>

      {/* SISTEMA DE IMPRESSÃO DE PDF OFICIAL */}
      {showPrintPreview && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto no-print">
          <div className="bg-slate-100 max-w-4xl w-full rounded-[2rem] border border-slate-200 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-[9px] font-black uppercase text-emerald-700 tracking-wider">Visualização de Documento Sanitário</span>
                <h3 className="font-black text-slate-800 text-sm uppercase leading-tight">Relatório de Qualidade Setorial (PDF)</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#022c22] hover:bg-emerald-950 text-white font-black text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-xs"
                >
                  <Printer size={13} />
                  Imprimir / Salvar PDF
                </button>
                <button
                  onClick={() => setShowPrintPreview(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black text-[10px] uppercase tracking-wider rounded-xl transition-all"
                >
                  Fechar
                </button>
              </div>
            </div>

            {/* Document A4 Preview Panel */}
            <div className="p-6 bg-slate-200/40 overflow-y-auto flex-1">
              <div className="bg-white p-12 max-w-[210mm] min-h-[297mm] mx-auto shadow-md rounded-[1.5rem] border border-slate-300/60 text-slate-800">
                
                {/* Header */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
                  <div className="flex items-center gap-3">
                    {loadedLogos.ouvidoria ? (
                      <img 
                        src={loadedLogos.ouvidoria} 
                        alt="Ouvidoria" 
                        className="w-12 h-12 object-contain rounded-xl shrink-0" 
                        referrerPolicy="no-referrer" 
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-[#022c22] flex items-center justify-center text-white shrink-0 font-black text-xs">
                        SUS
                      </div>
                    )}
                    <div>
                      <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">Policlínica Bernardo Félix da Silva</h1>
                      <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Serviço de Ouvidoria Geral & Humanização de Atendimento — SUS</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[9px] font-black uppercase text-slate-400 block leading-none">Código Doc</span>
                    <span className="text-xs font-mono font-black text-slate-700">#ODS-{selectedYear}{(selectedMonth+1).toString().padStart(2, '0')}</span>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center my-6 space-y-1">
                  <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Relatório Consolidado de Desempenho Setorial</h2>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                    Período de Referência: {months[selectedMonth].label} de {selectedYear}
                  </p>
                </div>

                {/* Metadata details info */}
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/60 mb-6 text-[10px] text-slate-700">
                  <div className="space-y-1">
                    <p><span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block leading-none">Data de Emissão</span> <strong className="text-slate-800 font-black">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></p>
                    <p><span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block leading-none">Unidade Sanitária</span> <strong className="text-slate-805 font-black">Policlínica Bernardo Félix da Silva</strong></p>
                  </div>
                  <div className="space-y-1">
                    <p><span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block leading-none">Status de Dados</span> <strong className="text-slate-800 font-black">Coleta de Campo Ativa via Nuvem Firestore</strong></p>
                    <p><span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block leading-none">Volume de Amostras</span> <strong className="text-slate-850 font-black">{totalEvaluationsCount} votos coletados</strong></p>
                  </div>
                </div>

                {/* Key satisfaction KPIs banner inside document */}
                <div className="grid grid-cols-3 gap-4 mb-6 text-center">
                  <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider leading-none">Amostras Coletadas</span>
                    <span className="text-base font-black text-slate-900 block mt-1">{totalEvaluationsCount} votos</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 bg-emerald-50/20 border-emerald-100">
                    <span className="text-[8px] uppercase font-black text-emerald-700 block tracking-wider leading-none">Índice Aprovação</span>
                    <span className="text-base font-black text-emerald-600 block mt-1">{satisfactionPercent}%</span>
                  </div>
                  <div className="border border-slate-200 rounded-xl p-3 bg-blue-50/20 border-blue-100">
                    <span className="text-[8px] uppercase font-black text-blue-700 block tracking-wider leading-none">Zona NPS</span>
                    <span className="text-base font-black text-blue-600 block mt-1">{totalFormsCount > 0 ? `${npsMetrics.score > 0 ? '+' : ''}${npsMetrics.score}` : 'N/A'}</span>
                  </div>
                </div>

                {/* Table Breakdown */}
                <div className="border border-slate-300 rounded-xl overflow-hidden mb-6">
                  <table className="w-full text-[10px] border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase tracking-wider text-[8px] font-black">
                        <th className="py-2.5 px-3 text-center w-10">Pos</th>
                        <th className="py-2.5 px-3 text-left">Setor Avaliado</th>
                        <th className="py-2.5 px-3 text-center">Votos Favoráveis</th>
                        <th className="py-2.5 px-3 text-center">Votos Totais</th>
                        <th className="py-2.5 px-3 text-right">Aprovação (%)</th>
                        <th className="py-2.5 px-3 text-center">Classificação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800 font-medium ms-text">
                      {sectorPerformanceData.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-450 uppercase font-black text-[9px] tracking-wider bg-slate-50">
                            Sem avaliações registradas para o período selecionado.
                          </td>
                        </tr>
                      ) : (
                        sectorPerformanceData.map((sector, index) => {
                          const percent = sector['Aprovação (%)'];
                          const isExcellent = percent >= 75;
                          const isGood = percent >= 50;
                          const isRegular = percent >= 30;

                          let badgeText = 'CRÍTICO';
                          let badgeStyle = 'text-rose-805 bg-rose-50 border-rose-200';
                          if (isExcellent) {
                            badgeText = 'EXCELENTE';
                            badgeStyle = 'text-emerald-805 bg-emerald-50 border-emerald-200';
                          } else if (isGood) {
                            badgeText = 'BOM';
                            badgeStyle = 'text-blue-805 bg-blue-50 border-blue-200';
                          } else if (isRegular) {
                            badgeText = 'REGULAR';
                            badgeStyle = 'text-amber-805 bg-amber-50 border-amber-200';
                          }

                          return (
                            <tr key={sector.name} className="bg-white">
                              <td className="py-2.5 px-3 text-center text-slate-500 font-extrabold">{index + 1}º</td>
                              <td className="py-2.5 px-3 text-slate-900 font-black uppercase text-[9px] whitespace-normal break-words leading-tight">{sector.name}</td>
                              <td className="py-2.5 px-3 text-center font-bold">{sector.positive}</td>
                              <td className="py-2.5 px-3 text-center text-slate-500 font-bold">{sector.total}</td>
                              <td className="py-2.5 px-3 text-right font-black text-slate-900 text-xs">{percent}%</td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${badgeStyle} tracking-wider block mx-auto w-fit`}>
                                  {badgeText}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Detalhamento de NPS (Escala de 0 a 10) para Auditoria Estadual */}
                <div className="border border-slate-300 rounded-xl p-4 bg-slate-50 mb-6 font-sans">
                  <span className="text-[10px] font-black uppercase text-slate-700 tracking-wider block mb-2.5">Detalhamento Ouvidoria - NPS Estadual (Escala de recomendação 0 a 10)</span>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                    <div className="p-2 bg-emerald-50/10 border-r border-slate-150 last:border-none">
                      <span className="text-[8px] uppercase font-black text-emerald-700 block leading-none">Promotores (9-10)</span>
                      <strong className="text-xs font-black text-slate-800 block mt-1.5">{npsMetrics.promotersCount} formulários</strong>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{npsMetrics.promotersPercent}% das respostas</span>
                    </div>
                    <div className="p-2 bg-amber-50/10 border-r border-slate-150 last:border-none">
                      <span className="text-[8px] uppercase font-black text-amber-600 block leading-none">Neutros (7-8)</span>
                      <strong className="text-xs font-black text-slate-800 block mt-1.5">{npsMetrics.passivesCount} formulários</strong>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{npsMetrics.passivesPercent}% das respostas</span>
                    </div>
                    <div className="p-2 bg-rose-50/10 border-r border-slate-150 last:border-none">
                      <span className="text-[8px] uppercase font-black text-rose-600 block leading-none">Detratores (0-6)</span>
                      <strong className="text-xs font-black text-slate-800 block mt-1.5">{npsMetrics.detractorsCount} formulários</strong>
                      <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{npsMetrics.detractorsPercent}% das respostas</span>
                    </div>
                    <div className="p-2 bg-[#022c22] text-white rounded-lg">
                      <span className="text-[8px] uppercase font-black text-slate-300 block leading-none">Score NPS</span>
                      <strong className="text-sm font-black block mt-1">{totalFormsCount > 0 ? `${npsMetrics.score > 0 ? '+' : ''}${npsMetrics.score}` : 'N/A'}</strong>
                      <span className="text-[8px] uppercase font-black tracking-wider text-emerald-400 mt-1 block">Zona {npsMetrics.status}</span>
                    </div>
                  </div>
                </div>

                {/* Metodology Context */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-6 text-[9px] text-slate-500 leading-relaxed">
                  <span className="font-black uppercase tracking-wider text-slate-700 block mb-0.5">Metodologia e Indicadores do Atendimento Geral</span>
                  <p>Métrica fundamentada segundo as diretrizes de acolhimento SUS. Índices de excelência superiores a 75% caracterizam boas práticas locais de atendimento contínuo. Indices críticos menores de 50% servem como disparador gerencial para as melhorias correspondentes aos planos setoriais.</p>
                </div>

                {/* Footnotes */}
                <div className="pt-6 border-t border-slate-200 grid grid-cols-2 gap-6 text-[10px] text-center text-slate-600">
                  <div className="space-y-4">
                    <div className="h-6"></div>
                    <div className="border-t border-slate-350 pt-1.5 mx-auto max-w-[200px] font-bold text-slate-805">
                      Coordenação de Qualidade
                    </div>
                    <span className="text-[8px] uppercase font-bold text-slate-400 block -mt-1 leading-none">Ouvidoria e Ouvidor Assistente</span>
                  </div>
                  <div className="space-y-4">
                    <div className="h-6"></div>
                    <div className="border-t border-slate-350 pt-1.5 mx-auto max-w-[200px] font-bold text-slate-805">
                      Direção Geral Administrativa
                    </div>
                    <span className="text-[8px] uppercase font-bold text-slate-400 block -mt-1 leading-none">Controle Interno Gestor</span>
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEPTÁCULO QUE RECEBE CONTEÚDO PRONTAMENTE QUANDO TRIGGADO O PRINT DO NAVEGADOR DO PACIENTE */}
      <div className="hidden print:block print-container bg-white text-slate-900 font-sans p-6 w-full">
        {/* Header */}
        <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5 mb-6">
          <div className="flex items-center gap-3">
            {loadedLogos.ouvidoria ? (
              <img 
                src={loadedLogos.ouvidoria} 
                alt="Ouvidoria" 
                className="w-12 h-12 object-contain rounded-xl shrink-0" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                SUS
              </div>
            )}
            <div>
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight animate-none">Policlínica Bernardo Félix da Silva</h1>
              <p className="text-[9px] font-black uppercase text-slate-500 tracking-wider leading-none mt-1">Serviço de Ouvidoria Geral & Humanização de Atendimento — SUS</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black uppercase text-slate-400 block leading-none">Código Doc</span>
            <span className="text-xs font-mono font-black text-slate-700">#ODS-{selectedYear}{(selectedMonth+1).toString().padStart(2, '0')}</span>
          </div>
        </div>

        {/* Title */}
        <div className="text-center my-6 space-y-1">
          <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">Relatório Consolidado de Desempenho Setorial</h2>
          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            Período de Referência: {months[selectedMonth].label} de {selectedYear}
          </p>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-[10px] text-slate-750">
          <div className="space-y-1">
            <p><span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block leading-none">Data de Emissão</span> <strong className="text-slate-800 font-black">{new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong></p>
            <p><span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block leading-none">Unidade Sanitária</span> <strong className="text-slate-800 font-black">Policlínica Bernardo Félix da Silva</strong></p>
          </div>
          <div className="space-y-1">
            <p><span className="text-[9px] uppercase font-black text-slate-400 tracking-wider block leading-none">Status de Dados</span> <strong className="text-slate-800 font-black">Coleta de Campo Ativa via Nuvem Firestore</strong></p>
            <p><span className="text-[8px] uppercase font-black text-slate-400 tracking-wider block leading-none">Volume de Amostras</span> <strong className="text-slate-800 font-black">{totalEvaluationsCount} votos coletados</strong></p>
          </div>
        </div>

        {/* KPIs bar */}
        <div className="grid grid-cols-3 gap-4 mb-6 text-center">
          <div className="border border-slate-250 rounded-xl p-3 bg-slate-50/50">
            <span className="text-[8px] uppercase font-black text-slate-400 block tracking-wider leading-none">Amostras Coletadas</span>
            <span className="text-base font-black text-slate-900 block mt-1">{totalEvaluationsCount} votos</span>
          </div>
          <div className="border border-slate-250 rounded-xl p-3 bg-emerald-50/20 border-emerald-300">
            <span className="text-[8px] uppercase font-black text-emerald-700 block tracking-wider leading-none">Índice Aprovação</span>
            <span className="text-base font-black text-emerald-600 block mt-1">{satisfactionPercent}%</span>
          </div>
          <div className="border border-slate-250 rounded-xl p-3 bg-blue-50/20 border-blue-300">
            <span className="text-[8px] uppercase font-black text-blue-700 block tracking-wider leading-none">Zona NPS</span>
            <span className="text-base font-black text-blue-600 block mt-1">{totalFormsCount > 0 ? `${npsMetrics.score > 0 ? '+' : ''}${npsMetrics.score}` : 'N/A'}</span>
          </div>
        </div>

        {/* Table representation */}
        <div className="border border-slate-350 rounded-xl overflow-hidden mb-6">
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-355 text-slate-700 uppercase tracking-wider text-[8px] font-black">
                <th className="py-2.5 px-3 text-center w-10">Pos</th>
                <th className="py-2.5 px-3 text-left">Setor Avaliado</th>
                <th className="py-2.5 px-3 text-center">Votos Favoráveis</th>
                <th className="py-2.5 px-3 text-center">Votos Totais</th>
                <th className="py-2.5 px-3 text-right">Aprovação (%)</th>
                <th className="py-2.5 px-3 text-center">Classificação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300 text-slate-900 font-medium">
              {sectorPerformanceData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-450 uppercase font-black text-[9px] tracking-wider bg-slate-50">
                    Sem avaliações registradas para o período selecionado.
                  </td>
                </tr>
              ) : (
                sectorPerformanceData.map((sector, index) => {
                  const percent = sector['Aprovação (%)'];
                  const isExcellent = percent >= 75;
                  const isGood = percent >= 50;
                  const isRegular = percent >= 30;

                  let badgeText = 'CRÍTICO';
                  let badgeStyle = 'text-rose-900 bg-rose-50/50 border-rose-300';
                  if (isExcellent) {
                    badgeText = 'EXCELENTE';
                    badgeStyle = 'text-emerald-900 bg-emerald-50/50 border-emerald-300';
                  } else if (isGood) {
                    badgeText = 'BOM';
                    badgeStyle = 'text-blue-900 bg-blue-50/50 border-blue-300';
                  } else if (isRegular) {
                    badgeText = 'REGULAR';
                    badgeStyle = 'text-amber-900 bg-amber-50/50 border-amber-300';
                  }

                  return (
                    <tr key={sector.name} className="bg-white">
                      <td className="py-2.5 px-3 text-center text-slate-500 font-extrabold">{index + 1}º</td>
                      <td className="py-2.5 px-3 text-slate-900 font-black uppercase text-[9px] whitespace-normal break-words leading-tight">{sector.name}</td>
                      <td className="py-2.5 px-3 text-center font-bold">{sector.positive}</td>
                      <td className="py-2.5 px-3 text-center text-slate-500 font-bold">{sector.total}</td>
                      <td className="py-2.5 px-3 text-right font-black text-slate-950 text-xs">{percent}%</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${badgeStyle} tracking-wider block mx-auto w-fit`}>
                          {badgeText}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Detalhamento de NPS (Escala de 0 a 10) para Auditoria Estadual (Impressão) */}
        <div className="border border-slate-350 rounded-xl p-4 bg-slate-50 mb-6 font-sans">
          <span className="font-black uppercase tracking-wider text-slate-700 block mb-2 text-[10px]">Detalhamento Ouvidoria - NPS Estadual (Escala de recomendação 0 a 10)</span>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white p-3 rounded-xl border border-slate-250">
            <div className="p-2 border-r border-slate-200 last:border-none">
              <span className="text-[8px] uppercase font-black text-emerald-700 block leading-none">Promotores (9-10)</span>
              <strong className="text-xs font-black text-slate-800 block mt-1.5">{npsMetrics.promotersCount} f.</strong>
              <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{npsMetrics.promotersPercent}% das respostas</span>
            </div>
            <div className="p-2 border-r border-slate-200 last:border-none">
              <span className="text-[8px] uppercase font-black text-amber-600 block leading-none">Neutros (7-8)</span>
              <strong className="text-xs font-black text-slate-800 block mt-1.5">{npsMetrics.passivesCount} f.</strong>
              <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{npsMetrics.passivesPercent}% das respostas</span>
            </div>
            <div className="p-2 border-r border-slate-200 last:border-none">
              <span className="text-[8px] uppercase font-black text-rose-600 block leading-none">Detratores (0-6)</span>
              <strong className="text-xs font-black text-slate-800 block mt-1.5">{npsMetrics.detractorsCount} f.</strong>
              <span className="text-[9px] text-slate-400 font-bold block mt-0.5">{npsMetrics.detractorsPercent}% das respostas</span>
            </div>
            <div className="p-2 bg-slate-900 border-none rounded-lg text-white">
              <span className="text-[8px] uppercase font-black text-slate-300 block leading-none">Score NPS</span>
              <strong className="text-sm font-black block mt-1">{totalFormsCount > 0 ? `${npsMetrics.score > 0 ? '+' : ''}${npsMetrics.score}` : 'N/A'}</strong>
              <span className="text-[8px] uppercase font-black tracking-wider text-emerald-400 mt-1 block">Zona {npsMetrics.status}</span>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="bg-slate-50 border border-slate-250 rounded-xl p-3 mb-6 text-[9px] text-slate-600 leading-relaxed">
          <span className="font-black uppercase tracking-wider text-slate-700 block mb-0.5">Legenda Padrão de Gestão Sanitária (Ouvidoria Geral)</span>
          <p>Excelência (Aprovação &ge; 75%) indica metas plenamente atingidas de acolhimento e agilidade no SUS. Ótimo &amp; Bom (Aprovação &ge; 50%) indica atendimento regular de conformidade. Níveis abaixo de 50% indicam necessidade periódica de auditoria interna.</p>
        </div>

        {/* Signature lines */}
        <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-6 text-[10px] text-center text-slate-600">
          <div className="space-y-4">
            <div className="h-6"></div>
            <div className="border-t border-slate-400 pt-1.5 mx-auto max-w-[200px] font-bold text-slate-800 animate-none">
              Coordenador(a) Geral de Qualidade
            </div>
            <span className="text-[8px] uppercase font-bold text-slate-400 block -mt-1 font-sans">Ouvidoria e Assistência Social</span>
          </div>
          <div className="space-y-4">
            <div className="h-6"></div>
            <div className="border-t border-slate-400 pt-1.5 mx-auto max-w-[200px] font-bold text-slate-800 animate-none">
              Direção Geral Administrativa
            </div>
            <span className="text-[8px] uppercase font-bold text-slate-400 block -mt-1 font-sans">Controle Sanitário de Gestão</span>
          </div>
        </div>
      </div>

      {/* Tutorial/Explanation Modal Popup for Metric Cards */}
      {selectedHelpMetric && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-[999] flex items-center justify-center p-4 animate-fade-in no-print" onClick={() => setSelectedHelpMetric(null)}>
          <div 
            className="bg-white rounded-[2.5rem] border border-slate-150 shadow-2xl p-6 md:p-8 w-full max-w-lg relative sm:max-h-[90vh] overflow-y-auto animate-scale-up"
            onClick={e => e.stopPropagation()}
          >
            {/* Header decoration */}
            <div className="absolute top-0 left-0 right-0 h-2 rounded-t-[2.5rem] bg-indigo-500" />
            
            <button 
              onClick={() => setSelectedHelpMetric(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-650 p-2 hover:bg-slate-50 rounded-full transition-all text-xs font-black uppercase tracking-wider"
              title="Fechar"
            >
              ✕
            </button>

            <div className="mt-2 space-y-6">
              {/* Card Meta Title & Visual Accent */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  💡
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest block">Como essa informação é calculada?</span>
                  <h3 className="text-xl font-black text-slate-950 tracking-tight">{selectedHelpMetric.title}</h3>
                </div>
              </div>

              {/* Current value display */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase text-slate-400 block tracking-wider">Valor Atual sob Filtros</span>
                  <p className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wide mt-0.5">{selectedHelpMetric.subtitle}</p>
                </div>
                <div className="text-2xl font-black text-slate-950 px-4 py-2 bg-white rounded-xl border border-slate-150">
                  {selectedHelpMetric.value}
                </div>
              </div>

              {/* Explanatory description text */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">O que significa?</h4>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">
                  {selectedHelpMetric.description}
                </p>
              </div>

              {/* Mathematical Formula block */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Fórmula de Cálculo:</h4>
                <div className="bg-slate-50 border border-slate-150 p-3 rounded-xl font-mono text-[10px] text-slate-700 leading-relaxed font-bold break-all">
                  {selectedHelpMetric.formula}
                </div>
              </div>

              {/* Real practical example explanation */}
              <div className="space-y-2 bg-blue-50/40 p-4 rounded-xl border border-blue-100/50">
                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider flex items-center gap-1">
                  <span>📝</span> Exemplo Prático de Cálculo:
                </h4>
                <p className="text-xs text-blue-950/80 leading-relaxed font-bold whitespace-pre-wrap">
                  {selectedHelpMetric.example}
                </p>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                <button
                  onClick={() => setSelectedHelpMetric(null)}
                  className="w-full bg-slate-900 hover:bg-slate-950 text-white font-black text-xs uppercase tracking-widest py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-md"
                >
                  Entendi, obrigado! 👍
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS Inject module for printable rules */}
      <style>{`
        @media print {
          /* Hide standard elements completely */
          body * {
            visibility: hidden !important;
          }
          #root, #root * {
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          /* Print container selection rules */
          .print-container, .print-container * {
            visibility: visible !important;
          }
          .print-container {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0px !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Prevent page cutoffs and scroll containers issue */
          html, body {
            height: auto !important;
            overflow: visible !important;
          }
        }
      `}</style>
    </div>
  );
};
