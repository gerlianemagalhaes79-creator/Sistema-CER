import React, { useEffect, useState, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot,
  doc,
  updateDoc,
  Timestamp
} from 'firebase/firestore';
import { 
  ClipboardList, 
  Search, 
  Filter, 
  Calendar, 
  User as UserIcon, 
  MessageSquare, 
  AlertCircle, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  Smartphone,
  Stamp,
  Users,
  Clock,
  ThumbsUp,
  Meh,
  Frown,
  Activity,
  Image as ImageIcon,
  X,
  Trash2,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { safeISOString, SurveyService } from '../services/SurveyService';

interface FirebaseForm {
  id: string;
  recommendationScore?: number;
  npsScore?: number;
  observation?: string;
  generalComment?: string;
  createdAt: any;
  date: any;
  createdBy?: string;
  createdByName?: string;
  source?: 'patient' | 'physical';
  patientName?: string;
  patientPhone?: string;
  photoUrl?: string;
}

interface FirebaseEvaluation {
  id: string;
  formId: string;
  sector: string;
  rating: string;
  observation?: string;
  comment?: string;
  createdAt: any;
}

interface EvaluationListProps {
  selectedMonth?: number; // 0-indexed
  setSelectedMonth?: (month: number) => void;
  selectedYear?: number;
  setSelectedYear?: (year: number) => void;
}

export const EvaluationList: React.FC<EvaluationListProps> = ({
  selectedMonth: propSelectedMonth,
  setSelectedMonth: propSetSelectedMonth,
  selectedYear: propSelectedYear,
  setSelectedYear: propSetSelectedYear,
}) => {
  // Realtime Data state
  const [forms, setForms] = useState<FirebaseForm[]>([]);
  const [evaluations, setEvaluations] = useState<FirebaseEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStr, setErrorStr] = useState<string | null>(null);

  // Expanded row state
  const [expandedForms, setExpandedForms] = useState<Record<string, boolean>>({});
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);

  // Filters State
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'patient' | 'physical'>('all');
  const [npsFilter, setNpsFilter] = useState<'all' | 'promoters' | 'passives' | 'detractors'>('all');
  
  const [localMonthFilter, setLocalMonthFilter] = useState<string>('all');
  const [localYearFilter, setLocalYearFilter] = useState<string>('all');

  const monthFilter = propSelectedMonth !== undefined ? propSelectedMonth.toString() : localMonthFilter;
  const setMonthFilter = (val: string) => {
    if (propSetSelectedMonth !== undefined) {
      if (val !== 'all') {
        propSetSelectedMonth(Number(val));
      }
    } else {
      setLocalMonthFilter(val);
    }
  };

  const yearFilter = propSelectedYear !== undefined ? propSelectedYear.toString() : localYearFilter;
  const setYearFilter = (val: string) => {
    if (propSetSelectedYear !== undefined) {
      if (val !== 'all') {
        propSetSelectedYear(Number(val));
      }
    } else {
      setLocalYearFilter(val);
    }
  };

  // UI status for retroactive date adjustments
  const [updatingFormId, setUpdatingFormId] = useState<string | null>(null);
  const [successFormId, setSuccessFormId] = useState<string | null>(null);
  const [deletingFormId, setDeletingFormId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showVoiceExplanation, setShowVoiceExplanation] = useState(false);

  // Dynamically extract available years from queried forms
  const availableYears = useMemo(() => {
    const yearsSet = new Set<string>();
    forms.forEach(f => {
      const dateVal = f.date || f.createdAt;
      if (dateVal) {
        try {
          const iso = safeISOString(dateVal);
          const d = new Date(iso);
          if (!isNaN(d.getTime())) {
            yearsSet.add(d.getFullYear().toString());
          }
        } catch {}
      }
    });
    if (yearsSet.size === 0) {
      yearsSet.add(new Date().getFullYear().toString());
    }
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [forms]);

  // 1. Two Simultaneous Realtime Queries using Firebase Listeners
  useEffect(() => {
    setLoading(true);
    setErrorStr(null);

    // Form Query: Limit 250 records to allow flexible historical monthly filtering
    const formsQuery = query(
      collection(db, 'forms'), 
      orderBy('createdAt', 'desc'), 
      limit(250)
    );

    // Evaluation Query: Limit 500, ordered by createdAt desc
    const evalsQuery = query(
      collection(db, 'evaluations'), 
      orderBy('createdAt', 'desc'), 
      limit(500)
    );

    // List of active unsubscribes
    let unsubForms: (() => void) | null = null;
    let unsubEvals: (() => void) | null = null;

    try {
      unsubForms = onSnapshot(
        formsQuery, 
        (snapshot) => {
          const list: FirebaseForm[] = [];
          snapshot.forEach(doc => {
            list.push({
              id: doc.id,
              ...doc.data()
            } as FirebaseForm);
          });
          setForms(list);
          setLoading(false);
        }, 
        (err) => {
          console.error("Firestore Forms Listener Error:", err);
          setErrorStr("Erro nas regras de segurança ou acesso do banco de dados ao carregar Formulários de Ouvidoria.");
          handleFirestoreError(err, OperationType.LIST, 'forms');
        }
      );

      unsubEvals = onSnapshot(
        evalsQuery, 
        (snapshot) => {
          const list: FirebaseEvaluation[] = [];
          snapshot.forEach(doc => {
            list.push({
              id: doc.id,
              ...doc.data()
            } as FirebaseEvaluation);
          });
          setEvaluations(list);
        }, 
        (err) => {
          console.error("Firestore Evaluations Listener Error:", err);
          setErrorStr("Erro de segurança ou acesso ao carregar Avaliações de Setores.");
          handleFirestoreError(err, OperationType.LIST, 'evaluations');
        }
      );
    } catch (err: any) {
      console.error("Simultaneous listener initialisation failed:", err);
      setErrorStr(err?.message || "Falha nas conexões simultâneas em tempo real do Firebase.");
    }

    return () => {
      if (unsubForms) unsubForms();
      if (unsubEvals) unsubEvals();
    };
  }, []);

  // 2. Memory Index Grouping Optimizer: Maps formId -> Array of evaluations
  const evaluationsByFormId = useMemo(() => {
    const map: Record<string, FirebaseEvaluation[]> = {};
    evaluations.forEach((evalItem) => {
      if (!map[evalItem.formId]) {
        map[evalItem.formId] = [];
      }
      map[evalItem.formId].push(evalItem);
    });
    return map;
  }, [evaluations]);

  // Expand or collapse all
  const toggleRow = (id: string) => {
    setExpandedForms(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const toggleAll = () => {
    const isAnyCollapsed = forms.some(f => !expandedForms[f.id]);
    const newState: Record<string, boolean> = {};
    forms.forEach(f => {
      newState[f.id] = isAnyCollapsed;
    });
    setExpandedForms(newState);
  };

  // Safe formatting helpers
  const formatNpsCode = (score: number) => {
    if (score >= 9) return { label: 'Promotor', color: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' };
    if (score >= 7) return { label: 'Passivo', color: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' };
    return { label: 'Detrator', color: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500' };
  };

  const parseDateAndHours = (dateProperty: any) => {
    if (!dateProperty) return { dateStr: 'Não informada', timeStr: '--:--' };
    try {
      const iso = safeISOString(dateProperty);
      const d = new Date(iso);
      if (isNaN(d.getTime())) return { dateStr: 'Data Inválida', timeStr: '--:--' };
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const timeStr = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      return { dateStr, timeStr };
    } catch {
      return { dateStr: 'Formato inválido', timeStr: '--:--' };
    }
  };

  // Filter application
  const filteredFormsList = useMemo(() => {
    return forms.filter(f => {
      const score = f.recommendationScore !== undefined ? f.recommendationScore : (f.npsScore || 0);
      const obs = f.observation || f.generalComment || '';
      const isDigital = f.source !== 'physical';
      const creator = isDigital ? 'próprio paciente digital' : (f.createdByName || '');
      const formEvaluations = evaluationsByFormId[f.id] || [];
      
      // Search matching (case insensitive)
      const matchesSearch = 
        creator.toLowerCase().includes(search.toLowerCase()) ||
        obs.toLowerCase().includes(search.toLowerCase()) ||
        f.id.toLowerCase().includes(search.toLowerCase()) ||
        formEvaluations.some(e => e.sector.toLowerCase().includes(search.toLowerCase())) ||
        formEvaluations.some(e => {
          const normRating = e.rating.toLowerCase();
          return normRating.includes(search.toLowerCase()) || (e.observation || e.comment || '').toLowerCase().includes(search.toLowerCase());
        }) ||
        String(score).includes(search);

      // Source matching
      const formSource = f.source || 'patient';
      const matchesSource = sourceFilter === 'all' || formSource === sourceFilter;

      // NPS Classifying match
      let matchesNps = true;
      if (npsFilter === 'promoters') matchesNps = score >= 9;
      else if (npsFilter === 'passives') matchesNps = score >= 7 && score <= 8;
      else if (npsFilter === 'detractors') matchesNps = score <= 6;

      // Month & Year filtering
      let matchesMonth = true;
      let matchesYear = true;
      const formDateVal = f.date || f.createdAt;
      if (formDateVal && (monthFilter !== 'all' || yearFilter !== 'all')) {
        try {
          const iso = safeISOString(formDateVal);
          const d = new Date(iso);
          if (!isNaN(d.getTime())) {
            if (monthFilter !== 'all') {
              matchesMonth = d.getMonth().toString() === monthFilter;
            }
            if (yearFilter !== 'all') {
              matchesYear = d.getFullYear().toString() === yearFilter;
            }
          } else {
            matchesMonth = false;
            matchesYear = false;
          }
        } catch {
          matchesMonth = false;
          matchesYear = false;
        }
      }

      return matchesSearch && matchesSource && matchesNps && matchesMonth && matchesYear;
    });
  }, [forms, search, sourceFilter, npsFilter, monthFilter, yearFilter, evaluationsByFormId]);

  // Overall Statistics computation for summary cards
  const stats = useMemo(() => {
    const total = filteredFormsList.length;
    let sumNps = 0;
    let promoters = 0;
    let passives = 0;
    let detractors = 0;

    filteredFormsList.forEach(f => {
      const score = f.recommendationScore !== undefined ? f.recommendationScore : (f.npsScore || 0);
      sumNps += score;
      if (score >= 9) promoters++;
      else if (score >= 7) passives++;
      else detractors++;
    });

    const averageNps = total > 0 ? (sumNps / total).toFixed(1) : '0';
    // Classic NPS index: % Promoters - % Detractors
    const npsClassic = total > 0 
      ? Math.round(((promoters - detractors) / total) * 100)
      : 0;

    return {
      total,
      averageNps,
      npsClassic,
      promoters,
      passives,
      detractors
    };
  }, [filteredFormsList]);

  return (
    <div className="space-y-6">
      
      {/* Top statistics widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 - Total Loaded */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Amostras Coletadas</span>
            <h4 className="text-2xl font-black text-slate-800 tracking-tight">{stats.total}</h4>
            <p className="text-[10px] text-slate-400 font-bold">Na fila de visualização (onSnapshot)</p>
          </div>
          <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <ClipboardList size={20} />
          </div>
        </div>

        {/* Metric 2 - Pure NPS Index */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">NPS Ouvidoria</span>
            <div className="flex items-baseline gap-1">
              <h4 className="text-2xl font-black text-slate-800 tracking-tight">
                {stats.npsClassic > 0 ? `+${stats.npsClassic}` : stats.npsClassic}
              </h4>
              <span className="text-xs font-bold text-slate-400 font-mono">pts</span>
            </div>
            <p className={`text-[10px] font-black uppercase tracking-wide ${
              stats.npsClassic >= 75 ? 'text-emerald-650' :
              stats.npsClassic >= 50 ? 'text-teal-600' :
              stats.npsClassic >= 0 ? 'text-amber-500' : 'text-rose-600'
            }`}>
              {stats.npsClassic >= 75 ? 'Zona de Excelência ❤️' : stats.npsClassic >= 50 ? 'Zona de Qualidade 😊' : stats.npsClassic >= 0 ? 'Zona de Aperfeiçoamento 😐' : 'Zona Crítica 💀'}
            </p>
          </div>
          <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <Sparkles size={18} />
          </div>
        </div>

        {/* Metric 3 - Average Recommendation Rating */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Média Geral NPS</span>
            <div className="flex items-baseline gap-1">
              <h4 className="text-2xl font-black text-slate-800 tracking-tight">{stats.averageNps}</h4>
              <span className="text-xs font-bold text-slate-400 font-mono">/10</span>
            </div>
            <p className="text-[10px] text-slate-400 font-bold">Nota média ponderada</p>
          </div>
          <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
            <Users size={18} />
          </div>
        </div>

        {/* Metric 4 - Sentiment Bar */}
        <div 
          onClick={() => setShowVoiceExplanation(true)}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2 cursor-pointer hover:border-slate-350 hover:bg-slate-50/40 transition-all duration-200 active:scale-[0.98] relative group"
          title="Clique para ver o que significa"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Distribuição de Voz</span>
              <HelpCircle size={12} className="text-slate-400 shrink-0 group-hover:text-indigo-600 transition-colors" />
            </div>
            <span className="text-[10px] font-bold text-slate-400">{stats.promoters} P / {stats.detractors} D</span>
          </div>
          
          <div className="h-2 w-full bg-slate-100 rounded-full flex overflow-hidden">
            <div 
              style={{ width: `${stats.total > 0 ? (stats.promoters/stats.total)*100 : 33}%` }} 
              className="bg-emerald-500 h-full"
              title="Promotores"
            />
            <div 
              style={{ width: `${stats.total > 0 ? (stats.passives/stats.total)*100 : 33}%` }} 
              className="bg-amber-400 h-full"
              title="Passivos"
            />
            <div 
              style={{ width: `${stats.total > 0 ? (stats.detractors/stats.total)*100 : 34}%` }} 
              className="bg-rose-500 h-full"
              title="Detratores"
            />
          </div>

          <div className="flex justify-between text-[8px] font-black uppercase text-slate-400 tracking-wider">
            <span className="text-emerald-600">PRO: {stats.total > 0 ? Math.round((stats.promoters/stats.total)*100) : 0}%</span>
            <span className="text-rose-600">DET: {stats.total > 0 ? Math.round((stats.detractors/stats.total)*100) : 0}%</span>
          </div>
        </div>
      </div>

      {/* Connection error banner */}
      {errorStr && (
        <div className="p-4 bg-red-50 text-red-950 rounded-2xl border border-red-100 flex items-center gap-3">
          <AlertCircle className="text-red-600 shrink-0" size={18} />
          <p className="text-xs font-bold font-sans">{errorStr}</p>
        </div>
      )}

      {/* CABEÇALHO FLUTUANTE STICKY / FLOATING */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between transition-all">
        {/* Barra de pesquisa moderna à esquerda */}
        <div className="relative w-full md:max-w-md shrink-0">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-450 pointer-events-none">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Filtrar por atendente, observação, setor, nota..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white rounded-xl py-2.5 pl-10 pr-4 font-bold text-slate-700 text-xs focus:ring-4 focus:ring-emerald-100 outline-none transition-all placeholder-slate-400"
          />
        </div>

        {/* Filters and Counters à direita */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto md:justify-end">
          
          {/* Source Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Smartphone size={13} className="text-slate-450" />
            <select
              value={sourceFilter}
              onChange={(e) => setSourceFilter(e.target.value as any)}
              className="bg-transparent border-none text-[10px] font-black text-slate-500 uppercase tracking-widest focus:ring-0 outline-none cursor-pointer p-0"
            >
              <option value="all">TODAS FONTES</option>
              <option value="patient">PACIENTE APP</option>
              <option value="physical">URNA FÍSICA</option>
            </select>
          </div>

          {/* NPS Detractor/Promotor Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Filter size={13} className="text-slate-450" />
            <select
              value={npsFilter}
              onChange={(e) => setNpsFilter(e.target.value as any)}
              className="bg-transparent border-none text-[10px] font-black text-slate-500 uppercase tracking-widest focus:ring-0 outline-none cursor-pointer p-0"
            >
              <option value="all">SINALIZAÇÃO FILTRO</option>
              <option value="promoters">PROMOTORES (9-10)</option>
              <option value="passives">PASSIVOS (7-8)</option>
              <option value="detractors">DETRATORES (0-6)</option>
            </select>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Calendar size={13} className="text-slate-450" />
            <select
              value={monthFilter}
              onChange={(e) => setMonthFilter(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black text-slate-500 uppercase tracking-widest focus:ring-0 outline-none cursor-pointer p-0"
            >
              <option value="all">TODOS MESES</option>
              <option value="0">JANEIRO</option>
              <option value="1">FEVEREIRO</option>
              <option value="2">MARÇO</option>
              <option value="3">ABRIL</option>
              <option value="4">MAIO</option>
              <option value="5">JUNHO</option>
              <option value="6">JULHO</option>
              <option value="7">AGOSTO</option>
              <option value="8">SETEMBRO</option>
              <option value="9">OUTUBRO</option>
              <option value="10">NOVEMBRO</option>
              <option value="11">DEZEMBRO</option>
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-50 rounded-xl px-3 py-2 border border-slate-200">
            <Calendar size={13} className="text-slate-450" />
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="bg-transparent border-none text-[10px] font-black text-slate-500 uppercase tracking-widest focus:ring-0 outline-none cursor-pointer p-0"
            >
              <option value="all">TODOS ANOS</option>
              {availableYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          {/* Expand/Collapse All */}
          <button
            type="button"
            onClick={toggleAll}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[10px] font-black uppercase tracking-wider transition-colors"
          >
            Expandir / Recolher
          </button>

          {/* Contador de estatísticas à direita exibindo o total filtrado na tela */}
          <div className="flex items-center gap-1.5 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 shadow-sm shrink-0">
            <span className="text-[9px] font-black uppercase text-emerald-800 tracking-wider">Filtrados:</span>
            <span className="text-2xl font-black text-emerald-950 font-mono leading-none">{stats.total}</span>
          </div>

        </div>
      </div>

      {/* Main Real-time List of Vertical Cards */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white/80 p-6 rounded-[2rem] border border-slate-200/50 shadow-sm animate-pulse flex flex-col gap-3">
              <div className="flex justify-between items-center">
                <div className="w-40 h-4 bg-slate-200 rounded" />
                <div className="w-20 h-4 bg-slate-200 rounded" />
              </div>
              <div className="w-full h-8 bg-slate-100 rounded" />
            </div>
          ))}
        </div>
      ) : filteredFormsList.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-3xl border border-slate-200/80 shadow-sm max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 bg-slate-50 text-slate-450 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
            <ClipboardList size={28} />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-slate-700">Nenhum formulário encontrado</h4>
            <p className="text-xs text-slate-400 font-bold font-sans">
              Revise o texto de pesquisa ou mude os filtros selecionados no topo.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredFormsList.map((form) => {
            const score = form.recommendationScore !== undefined ? form.recommendationScore : (form.npsScore || 0);
            const isExpanded = !!expandedForms[form.id];
            const formEvaluations = evaluationsByFormId[form.id] || [];
            
            // Format time and date cleanly
            const { dateStr, timeStr } = parseDateAndHours(form.date || form.createdAt);

            // Calculate sector ratings summary counts
            const counts = {
              otimo: 0,
              bom: 0,
              regular: 0,
              ruim: 0
            };
            formEvaluations.forEach(e => {
              const norm = e.rating.toLowerCase();
              if (norm.includes('ótimo') || norm.includes('otimo')) counts.otimo++;
              else if (norm.includes('bom')) counts.bom++;
              else if (norm.includes('regular')) counts.regular++;
              else if (norm.includes('ruim')) counts.ruim++;
            });

            // NPS dynamic badge style
            const npsMeta = score >= 9 
              ? { label: 'Promotor', text: 'NPS ' + score, color: 'border-emerald-200 text-emerald-700 bg-emerald-50/50', dot: 'bg-emerald-500' }
              : score >= 7 
                ? { label: 'Passivo', text: 'NPS ' + score, color: 'border-amber-200 text-amber-700 bg-amber-50/50', dot: 'bg-amber-500' }
                : { label: 'Detrator', text: 'NPS ' + score, color: 'border-rose-200 text-rose-700 bg-rose-50/50', dot: 'bg-rose-500' };

            return (
              <div 
                key={form.id}
                className="bg-white rounded-3xl border border-slate-200/80 shadow-md hover:shadow-lg transition-all duration-300 relative overflow-hidden"
              >
                
                {/* Ribbon decoration indicator based on NPS on the left border */}
                <div className={`absolute left-0 top-0 bottom-0 w-2.5 ${score >= 9 ? 'bg-emerald-500' : score >= 7 ? 'bg-amber-400' : 'bg-rose-500'}`} />

                {/* Header Card View - Whole header is clickable */}
                <div 
                  onClick={() => toggleRow(form.id)}
                  className="p-6 pl-9 flex flex-col lg:flex-row lg:items-center justify-between gap-5 cursor-pointer select-none hover:bg-slate-50/50 transition-colors"
                >
                  
                  {/* Left Side: Calendar icon, Title, Short ID, Date and Subtitle */}
                  <div className="flex items-start gap-4">
                    {/* a) Ícone de calendário com fundo neutro à esquerda */}
                    <div className="w-11 h-11 bg-slate-100/90 text-slate-600 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
                      <Calendar size={20} />
                    </div>

                    <div className="space-y-1">
                      {/* b) Número identificador encurtado e data formatada */}
                      <div className="flex flex-wrap items-baseline gap-2">
                        <span className="font-extrabold text-slate-900 text-base md:text-lg tracking-tight">
                          Formulário #{form.id.substring(0, 6).toUpperCase()}
                        </span>
                        <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/40">
                          {dateStr}
                        </span>
                      </div>

                      {/* c) Subtítulo no formato "Lançado por [Nome do Usuário] às HH:MM" ou "Respondido pelo Próprio Paciente às HH:MM" acompanhado do ícone */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <UserIcon size={12} className="text-slate-400 shrink-0" />
                        {form.source === 'physical' ? (
                          <span>Lançado por <strong className="text-slate-700 font-extrabold">{form.createdByName || 'Anônimo'}</strong></span>
                        ) : (
                          <span>Respondido pelo <strong className="text-purple-750 font-extrabold">Próprio Paciente</strong></span>
                        )}
                        <span className="text-slate-300">•</span>
                        <Clock size={12} className="text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-600">às {timeStr}</span>
                        
                        {/* Source tiny label */}
                        {form.source === 'physical' ? (
                          <span className="ml-1 px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[9px] font-black uppercase tracking-wider border border-blue-100">
                            Física
                          </span>
                        ) : (
                          <span className="ml-1 px-1.5 py-0.5 bg-purple-50 text-purple-700 rounded text-[9px] font-black uppercase tracking-wider border border-purple-100">
                            Digital
                          </span>
                        )}
                      </div>

                      {(form.patientName || form.patientPhone) && (
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {form.patientName && (
                            <div className="flex items-center gap-1.5 text-xs text-blue-650 font-black uppercase tracking-wider bg-blue-50/50 px-2.5 py-1 rounded-xl border border-blue-100/40">
                              <UserIcon size={11} className="text-blue-550 shrink-0" />
                              <span>Paciente: {form.patientName}</span>
                            </div>
                          )}
                          {form.patientPhone && (
                            <div className="flex items-center gap-1.5 text-xs text-slate-650 font-black uppercase tracking-wider bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
                              <Smartphone size={11} className="text-slate-500 shrink-0" />
                              <span>Tel: {form.patientPhone}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Side Info Group (Pills, NPS Indicator, Sector trigger) */}
                  <div className="flex flex-wrap items-center gap-3 lg:justify-end shrink-0" onClick={(e) => e.stopPropagation()}>
                    
                    {/* d) Pílulas de resumo contendo as quantidades de notas simplificadas (sem preenchimento total) */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {counts.otimo > 0 && (
                        <span className="border border-emerald-200 text-emerald-600 font-extrabold px-2 py-1 rounded-lg text-[9px] uppercase tracking-wider bg-transparent">
                          {counts.otimo} Ótimo{counts.otimo > 1 ? 's' : ''}
                        </span>
                      )}
                      {counts.bom > 0 && (
                        <span className="border border-blue-200 text-blue-600 font-extrabold px-2 py-1 rounded-lg text-[9px] uppercase tracking-wider bg-transparent">
                          {counts.bom} Bom{counts.bom > 1 ? 's' : ''}
                        </span>
                      )}
                      {counts.regular > 0 && (
                        <span className="border border-amber-200 text-amber-600 font-extrabold px-2 py-1 rounded-lg text-[9px] uppercase tracking-wider bg-transparent">
                          {counts.regular} Regular{counts.regular > 1 ? 'es' : ''}
                        </span>
                      )}
                      {counts.ruim > 0 && (
                        <span className="border border-rose-200 text-rose-600 font-extrabold px-2 py-1 rounded-lg text-[9px] uppercase tracking-wider bg-transparent">
                          {counts.ruim} Ruim{counts.ruim > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>

                    {/* e) Indicador de score NPS nas cores correspondentes */}
                    <span className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider border flex items-center gap-1.5 ${npsMeta.color} shadow-sm`}>
                      <span className={`w-2 h-2 rounded-full ${npsMeta.dot}`} />
                      {npsMeta.text} • {npsMeta.label}
                    </span>

                    {/* f) Contador do número de setores avaliados naquele formulário e um ícone de seta */}
                    <button
                      type="button"
                      onClick={() => toggleRow(form.id)}
                      className="px-4 py-2 rounded-xl border border-slate-200 hover:border-slate-300 text-slate-700 bg-slate-50 hover:bg-slate-100 font-black text-xs flex items-center justify-between gap-3 active:scale-95 transition-all w-full sm:w-auto"
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 bg-slate-200/60 px-1.5 py-0.5 rounded">
                        {formEvaluations.length} {formEvaluations.length === 1 ? 'Setor' : 'Setores'}
                      </span>
                      {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                    </button>

                  </div>
                </div>

                {/* Sub-Rows - Accordion detailing Sector evaluations */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: 'auto' }}
                      exit={{ height: 0 }}
                      className="overflow-hidden border-t border-slate-200 bg-slate-50/30"
                      style={{ 
                        backgroundImage: 'radial-gradient(#cbd5e1 0.75px, transparent 0.75px)', 
                        backgroundSize: '12px 12px' 
                      }}
                    >
                      <div className="p-6 pl-9 space-y-5">
                        
                        {/* 2. No topo dos detalhes internos - Observação Geral como balão com fundo branco, bordas arredondadas e ícone de mensagem azul, exibindo o comentário em texto itálico */}
                        {(form.observation || form.generalComment) && (
                          <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm flex items-start gap-3 relative max-w-2xl">
                            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                              <MessageSquare size={18} />
                            </div>
                            <div className="space-y-1">
                              <span className="text-[10px] font-black uppercase text-blue-500 tracking-wider">Observação Geral do Paciente:</span>
                              <p className="font-medium text-slate-700 text-xs md:text-sm italic leading-relaxed">
                                &ldquo;{form.observation || form.generalComment}&rdquo;
                              </p>
                            </div>
                          </div>
                        )}

                        {/* Foto Anexada pelo Paciente */}
                        {form.photoUrl && (
                          <div className="bg-white rounded-2xl p-4.5 border border-slate-200/80 shadow-sm flex items-start gap-3 relative max-w-2xl">
                            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                              <ImageIcon size={18} />
                            </div>
                            <div className="space-y-1 flex-1">
                              <span className="text-[10px] font-black uppercase text-purple-500 tracking-wider block mb-1.5">Foto Anexada pelo Paciente:</span>
                              <div className="relative inline-block group cursor-pointer border border-slate-100 rounded-xl overflow-hidden bg-slate-50 p-1 shadow-sm" onClick={() => setSelectedPhoto(form.photoUrl)}>
                                <img 
                                  src={form.photoUrl} 
                                  alt="Foto anexada" 
                                  className="h-24 sm:h-32 w-auto object-contain rounded-lg hover:opacity-90 transition-opacity" 
                                />
                                <div className="absolute inset-0 bg-black/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <span className="text-[9px] font-black uppercase tracking-wider text-white bg-slate-900/80 px-2.5 py-1 rounded-full">Clique para ampliar</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Seção Ouvidoria: Ajuste de Data Retroativa para correção de lançamento em mês incorreto */}
                        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-2xl font-sans">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center shrink-0">
                              <Calendar size={18} />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-black uppercase text-emerald-700 tracking-wider">Ajustar Data Retrospectiva</span>
                              <p className="text-xs text-slate-500 font-semibold leading-none">
                                Esta pesquisa está vinculada ao dia: <strong className="text-slate-800 font-black">{dateStr}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="date"
                              id={`date-adjust-${form.id}`}
                              defaultValue={(() => {
                                try {
                                  const iso = safeISOString(form.date || form.createdAt);
                                  return iso.split('T')[0];
                                } catch {
                                  return '';
                                }
                              })()}
                              className="bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-2.5 py-1.5 font-bold text-slate-700 text-xs focus:ring-4 focus:ring-emerald-100 outline-none transition-all cursor-pointer"
                            />
                            <button
                              type="button"
                              disabled={updatingFormId === form.id}
                              onClick={async (e) => {
                                e.stopPropagation();
                                const inputEl = document.getElementById(`date-adjust-${form.id}`) as HTMLInputElement;
                                if (!inputEl || !inputEl.value) return;
                                
                                const newDateStr = inputEl.value;
                                setUpdatingFormId(form.id);
                                setSuccessFormId(null);
                                try {
                                  const targetDate = new Date(newDateStr + 'T12:00:00');
                                  if (isNaN(targetDate.getTime())) {
                                    setUpdatingFormId(null);
                                    return;
                                  }

                                  const formRef = doc(db, 'forms', form.id);
                                  const timestampVal = Timestamp.fromDate(targetDate);
                                  
                                  await updateDoc(formRef, {
                                    date: timestampVal,
                                    createdAt: timestampVal 
                                  });
                                  
                                  setSuccessFormId(form.id);
                                  setTimeout(() => {
                                    setSuccessFormId(null);
                                  }, 4000);
                                } catch (err) {
                                  console.error("Erro ao atualizar data do formulário no Firebase:", err);
                                } finally {
                                  setUpdatingFormId(null);
                                }
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm shadow-emerald-600/10 shrink-0"
                            >
                              {updatingFormId === form.id ? 'Salvando...' : 'Atualizar'}
                            </button>
                          </div>

                          {successFormId === form.id && (
                            <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider animate-pulse font-sans">
                              ✓ Salvo com sucesso!
                            </span>
                          )}
                        </div>

                        {/* Seção Ouvidoria: Excluir Formulário Individual */}
                        <div className="bg-white rounded-2xl p-5 border border-rose-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-2xl font-sans">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center shrink-0">
                              <Trash2 size={18} />
                            </div>
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-black uppercase text-rose-600 tracking-wider">Excluir Formulário</span>
                              <p className="text-xs text-slate-500 font-semibold leading-relaxed max-w-md">
                                {confirmDeleteId === form.id ? (
                                  <strong className="text-rose-700 font-extrabold animate-pulse">
                                    Atenção: Confirma a exclusão definitiva deste formulário e das suas {formEvaluations.length} notas setoriais? Esta ação não pode ser desfeita!
                                  </strong>
                                ) : (
                                  <>
                                    Aviso: Esta ação é definitiva e removerá este formulário e todas as suas <strong className="text-slate-800 font-black">{formEvaluations.length} notas setoriais</strong> do banco de dados.
                                  </>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="shrink-0 flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                            {confirmDeleteId === form.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl transition-all"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  disabled={deletingFormId === form.id}
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setDeletingFormId(form.id);
                                    try {
                                      await SurveyService.deleteSurvey(form.id, formEvaluations);
                                      setConfirmDeleteId(null);
                                    } catch (err: any) {
                                      console.error("Erro ao excluir formulário:", err);
                                      let msg = "Erro ao excluir formulário.";
                                      try {
                                        const errData = JSON.parse(err.message);
                                        if (errData.error.includes("permission")) {
                                          msg += " Permissão insuficiente.";
                                        }
                                      } catch (e) {}
                                      alert(msg);
                                    } finally {
                                      setDeletingFormId(null);
                                    }
                                  }}
                                  className="bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 text-white font-black text-[10px] uppercase tracking-wider px-3.5 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm shadow-rose-600/10"
                                >
                                  {deletingFormId === form.id ? 'Excluindo...' : 'Sim, Excluir'}
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmDeleteId(form.id);
                                }}
                                className="bg-rose-600 hover:bg-rose-700 text-white font-black text-[10px] uppercase tracking-wider px-4 py-2.5 rounded-xl active:scale-95 transition-all shadow-sm shadow-rose-600/10 w-full sm:w-auto"
                              >
                                Excluir
                              </button>
                            )}
                          </div>
                        </div>

                        <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
                          Notas Individuais Por Setores ({formEvaluations.length})
                        </h5>

                        {formEvaluations.length === 0 ? (
                          <p className="text-xs text-slate-400 font-bold italic px-1">
                            Este formulário foi enviado apenas com nota geral de recomendação do NPS.
                          </p>
                        ) : (
                          /* 3. Logo abaixo, organize uma grade flexível de duas colunas (ou uma em dispositivos móveis) */
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {formEvaluations.map((e) => {
                              // Identify color for rating tag
                              const getRatingBadge = (ratingValue: string) => {
                                const norm = ratingValue.toLowerCase();
                                if (norm.includes('ótimo') || norm.includes('otimo')) {
                                  return { bg: 'bg-emerald-600 text-white border-emerald-600', label: 'Ótimo' };
                                }
                                if (norm.includes('bom')) {
                                  return { bg: 'bg-blue-600 text-white border-blue-600', label: 'Bom' };
                                }
                                if (norm.includes('regular')) {
                                  return { bg: 'bg-amber-500 text-white border-amber-500', label: 'Regular' };
                                }
                                if (norm.includes('ruim')) {
                                  return { bg: 'bg-rose-600 text-white border-rose-600', label: 'Ruim' };
                                }
                                return { bg: 'bg-slate-500 text-white border-slate-500', label: ratingValue || 'N/A' };
                              };

                              const badge = getRatingBadge(e.rating);
                              const subComment = e.observation || e.comment;

                              return (
                                /* Cada setor deve aparecer dentro de um minicard branco, com o nome do setor em destaque à esquerda e uma pílula colorida chapada */
                                <div 
                                  key={e.id}
                                  className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between gap-3"
                                >
                                  {/* Top header block: nome do setor à esquerda, pílula colorida chapada à direita */}
                                  <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2.5">
                                    <span className="font-extrabold text-slate-800 text-xs md:text-sm tracking-tight leading-snug">
                                      {e.sector}
                                    </span>
                                    <span className={`px-3 py-1 text-[10px] font-black uppercase rounded-full tracking-wider shrink-0 whitespace-nowrap shadow-sm ${badge.bg}`}>
                                      {badge.label}
                                    </span>
                                  </div>

                                  {/* Se o setor tiver observações complementares, exiba com texto destacado em itálico e com bordas discretas */}
                                  {subComment ? (
                                    <div className="bg-slate-50 rounded-xl p-3 text-xs font-semibold text-slate-600 border border-slate-200/30 flex items-start gap-2 italic">
                                      <MessageSquare size={13} className="text-slate-400 shrink-0 mt-0.5" />
                                      <span className="leading-relaxed">&ldquo;{subComment}&rdquo;</span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-slate-400 font-bold italic pl-1 font-sans">
                                      Sem observações complementares para este setor
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>
            );
          })}
        </div>
      )}

      {/* Full screen photo modal */}
      <AnimatePresence>
        {selectedPhoto && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[9999] flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div 
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="relative max-w-4xl max-h-[85vh] bg-white p-2 rounded-2xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-slate-900/80 text-white hover:bg-slate-950 rounded-full transition-all active:scale-90 shadow-lg z-10"
                title="Fechar"
              >
                <X size={18} />
              </button>
              <img 
                src={selectedPhoto} 
                alt="Foto Anexada Ampliada" 
                className="max-w-full max-h-[80vh] object-contain rounded-lg" 
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Voice Explanation Modal */}
      <AnimatePresence>
        {showVoiceExplanation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 font-sans"
            onClick={() => setShowVoiceExplanation(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl p-6 sm:p-8 max-w-lg w-full relative overflow-hidden border border-slate-100"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4 mb-6">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">
                    <Activity size={12} /> Ajuda & Metodologia
                  </div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight mt-2">
                    O que é a Distribuição de Voz?
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowVoiceExplanation(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-all active:scale-90"
                  title="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Description */}
              <div className="space-y-4 text-xs sm:text-sm text-slate-600 font-semibold leading-relaxed mb-6">
                <p>
                  A barra de <strong className="text-slate-800 font-black">Distribuição de Voz</strong> ilustra graficamente o percentual e o total de respostas agrupadas segundo a metodologia oficial do <strong className="text-slate-800 font-black">NPS (Net Promoter Score)</strong>.
                </p>
                <p>
                  Ela reflete a saúde da experiência geral do paciente dividida em três perfis:
                </p>

                {/* Legend items */}
                <div className="space-y-2.5 pt-2">
                  {/* PRO */}
                  <div className="bg-emerald-50/50 border border-emerald-100 p-3 rounded-2xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-emerald-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm shadow-emerald-500/25">
                      PRO
                    </span>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-emerald-800 uppercase tracking-wide">Promotores (Notas 9 e 10)</h4>
                      <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                        Pacientes extremamente satisfeitos que promovem ativamente sua clínica e indicam o atendimento a familiares e amigos.
                      </p>
                    </div>
                  </div>

                  {/* PAS */}
                  <div className="bg-amber-50/50 border border-amber-100 p-3 rounded-2xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-amber-400 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm shadow-amber-400/25">
                      PAS
                    </span>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-amber-800 uppercase tracking-wide">Passivos (Notas 7 e 8)</h4>
                      <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                        Pacientes satisfeitos, porém neutros. Eles não fazem propaganda negativa, mas estão abertos a alternativas de atendimento.
                      </p>
                    </div>
                  </div>

                  {/* DET */}
                  <div className="bg-rose-50/50 border border-rose-100 p-3 rounded-2xl flex items-start gap-3">
                    <span className="w-6 h-6 rounded-lg bg-rose-500 text-white flex items-center justify-center text-[10px] font-black shrink-0 shadow-sm shadow-rose-500/25">
                      DET
                    </span>
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black text-rose-800 uppercase tracking-wide">Detratores (Notas 0 a 6)</h4>
                      <p className="text-[11px] text-slate-500 font-semibold leading-normal">
                        Pacientes insatisfeitos que tiveram experiências desfavoráveis. Têm alta probabilidade de criticar a clínica e devem ser prioridade para ações corretivas da ouvidoria.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => setShowVoiceExplanation(false)}
                className="w-full py-3.5 bg-slate-900 hover:bg-slate-950 text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all active:scale-[0.98] shadow-lg shadow-slate-900/10"
              >
                Entendi!
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
