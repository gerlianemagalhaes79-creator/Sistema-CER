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
  AlertCircle
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

// Subtle internal component for Stat Cards styled premium
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: React.ReactNode;
  icon: React.ReactNode;
  color: 'blue' | 'emerald' | 'amber' | 'rose' | 'indigo';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, subtitle, icon, color }) => {
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
    <div className={`relative overflow-hidden bg-white p-6 rounded-[2rem] border ${currentTheme.border} transition-all duration-300 hover:scale-[1.02] shadow-sm hover:shadow-md ${currentTheme.shadow} flex items-center justify-between`}>
      {/* Subtle background bubble for visual comfort and material style */}
      <div className={`absolute -right-6 -bottom-6 w-24 h-24 rounded-full ${currentTheme.bubble} blur-xl`} />
      
      <div className="space-y-1 z-10">
        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">{title}</span>
        <span className="text-3xl font-black text-slate-900 block">{value}</span>
        <div className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">{subtitle}</div>
      </div>
      <div className={`w-12 h-12 rounded-2xl ${currentTheme.iconBg} flex items-center justify-center shrink-0 z-10`}>
        {icon}
      </div>
    </div>
  );
};

export const Dashboard = () => {
  const now = new Date();
  
  // Year and Month selection controls
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [loading, setLoading] = useState<boolean>(true);
  
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

  // Filter local data based on Selected Month and Selected Year
  const filteredEvaluations = useMemo(() => {
    return allEvaluations.filter(e => {
      const d = getDocDate(e.createdAt);
      if (!d) return false;
      return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
    });
  }, [allEvaluations, selectedMonth, selectedYear]);

  const filteredForms = useMemo(() => {
    return allForms.filter(f => {
      const d = getDocDate(f.createdAt);
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
      return { score: 0, status: 'Sem dados', promotersPercent: 0, detractorsPercent: 0, passivesPercent: 0 };
    }

    let promoters = 0;
    let detractors = 0;
    let passives = 0;

    filteredForms.forEach(f => {
      const score = f.npsScore;
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

    let status = 'Razoável';
    if (score >= 75) status = 'Excelente';
    else if (score >= 50) status = 'Muito Bom';
    else if (score >= 0) status = 'Razoável';
    else status = 'Crítico';

    return {
      score,
      status,
      promotersPercent,
      detractorsPercent,
      passivesPercent
    };
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

      // Filter evaluations for this specific historical month
      const monthEvals = allEvaluations.filter(e => {
        const d = getDocDate(e.createdAt);
        return d ? d.getMonth() === m && d.getFullYear() === y : false;
      });

      const total = monthEvals.length;
      const positive = monthEvals.filter(e => e.rating === 'Ótimo' || e.rating === 'Otimo' || e.rating === 'Bom').length;
      const satPercent = total > 0 ? Math.round((positive / total) * 100) : 0;

      const monthName = tempDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
      list.push({
        name: monthName,
        'Satisfação (%)': satPercent,
        'Total Avaliações': total
      });
    }
    return list;
  }, [allEvaluations, selectedMonth, selectedYear]);

  // Auto identify critical sectors with >= 15% ratings as "Ruim"
  const criticalSectors = useMemo(() => {
    const sectorStats: Record<string, { total: number; ruins: number }> = {};
    
    filteredEvaluations.forEach(e => {
      const sector = e.sector || 'Geral';
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

  // Performance de Aprovação por Setor (%) sorted from best to worst
  const sectorPerformanceData = useMemo(() => {
    const sectorStats: Record<string, { total: number; positive: number }> = {};
    
    filteredEvaluations.forEach(e => {
      const sector = e.sector?.trim() || 'Geral/Outros';
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
        return { name, 'Aprovação (%)': approvalPercent, total: stats.total };
      })
      .sort((a, b) => b['Aprovação (%)'] - a['Aprovação (%)']);
  }, [filteredEvaluations]);

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
    switch (status) {
      case 'Excelente': return 'bg-emerald-50 border-emerald-200 text-emerald-800';
      case 'Muito Bom': return 'bg-teal-50 border-teal-200 text-teal-850';
      case 'Razoável': return 'bg-amber-50 border-amber-200 text-amber-850';
      case 'Crítico': return 'bg-rose-50 border-rose-200 text-rose-850 animate-pulse';
      default: return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  return (
    <div className="space-y-8" id="real_reactive_dashboard">
      
      {/* Premium Header in Slate & Blue */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Dashboard Executivo</h2>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest block mt-1">PANORAMA DE GESTÃO POLICLÍNICA</p>
        </div>
        
        {/* Date Filter Panel with Calendar Icon */}
        <div className="flex flex-wrap items-center gap-3 bg-white p-3 rounded-[2rem] border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2 px-3 border-r border-slate-150 last:border-none">
            <Calendar size={15} className="text-blue-600 shrink-0" />
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
            <Layers size={15} className="text-blue-600 shrink-0" />
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

      {/* Automatic Critical Alerts */}
      {criticalSectors.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-[2rem] p-6 flex gap-4 shadow-xs" id="id_critical_alert_sectors">
          <div className="w-12 h-12 rounded-2xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-sm">
            <AlertCircle size={22} className="text-white" />
          </div>
          <div className="space-y-1 flex-1">
            <h4 className="text-sm font-black text-rose-950 uppercase tracking-tight">Atenção Necessária (Setores Críticos)</h4>
            <p className="text-xs text-rose-700 uppercase font-bold tracking-wide">
              Os seguintes setores ultrapassaram o limite aceitável de 15% de avaliações com nota "Ruim" no período selecionado:
            </p>
            <div className="flex flex-wrap gap-2.5 mt-3">
              {criticalSectors.map(s => (
                <span key={s.name} className="px-3.5 py-1.5 bg-white border border-rose-200 text-rose-700 text-[10px] font-black rounded-xl shadow-xs uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping"></span>
                  {s.name}: {s.ruinPercent}% RUIM ({s.ruins} de {s.total} avaliações)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Grid of Metric Cards (Grade com 4 colunas no computador e 1 no mobile) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Card 1: Avaliações */}
        <StatCard 
          title="Avaliações" 
          value={totalEvaluationsCount} 
          subtitle="Total de Avaliações" 
          icon={<ClipboardList size={22} />} 
          color="blue" 
        />

        {/* Card 2: Qualidade de Satisfação */}
        <StatCard 
          title="Qualidade de Satisfação" 
          value={`${satisfactionPercent}%`} 
          subtitle="Satisfação" 
          icon={<CheckCircle2 size={22} />} 
          color="emerald" 
        />

        {/* Card 3: NPS Global */}
        <StatCard 
          title="NPS Global" 
          value={totalFormsCount > 0 ? `${npsMetrics.score > 0 ? '+' : ''}${npsMetrics.score}` : 'N/A'} 
          subtitle={`Zona: ${npsMetrics.status}`} 
          icon={<Activity size={22} />} 
          color={npsColorClass} 
        />

        {/* Card 4: Amostras */}
        <StatCard 
          title="Amostras" 
          value={totalFormsCount} 
          subtitle="Total de Formulários" 
          icon={<Users size={22} />} 
          color="amber" 
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
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none">Total</span>
                  <span className="text-3xl font-black text-slate-800 leading-none my-1">{totalEvaluationsCount}</span>
                  <span className="text-[9px] font-bold uppercase text-slate-400 tracking-wider leading-none">votos</span>
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
              <TrendingUp size={18} className="text-emerald-600" /> Tendência de Satisfação (%)
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Percentual de aprovação (Ótimo & Bom) nos últimos 6 meses</p>
          </div>

          <div className="h-[280px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={satisfactionTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} />
                <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} unit="%" />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }} />
                <Line 
                  type="monotone" 
                  dataKey="Satisfação (%)" 
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
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Desempenho Setorial</span>
            <h3 className="text-lg font-black text-slate-850 uppercase flex items-center gap-2">
              Performance de Aprovação por Setor (%)
            </h3>
            <p className="text-[11px] text-slate-400 font-bold uppercase mt-1">Percentual cumulativo de notas Ótimo & Bom ordenado de forma decrescente</p>
          </div>

          <div className="h-[320px] w-full">
            {sectorPerformanceData.length > 0 ? (
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
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4">
                <span className="text-3xl">📭</span>
                <p className="text-xs font-black uppercase text-slate-400 tracking-wider mt-2">Nenhum setor com avaliações neste período</p>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
