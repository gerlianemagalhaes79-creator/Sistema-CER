import React, { useEffect, useState, useMemo } from 'react';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot 
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
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { safeISOString } from '../services/SurveyService';

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

export const EvaluationList = () => {
  // Realtime Data state
  const [forms, setForms] = useState<FirebaseForm[]>([]);
  const [evaluations, setEvaluations] = useState<FirebaseEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorStr, setErrorStr] = useState<string | null>(null);

  // Expanded row state
  const [expandedForms, setExpandedForms] = useState<Record<string, boolean>>({});

  // Filters State
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'patient' | 'physical'>('all');
  const [npsFilter, setNpsFilter] = useState<'all' | 'promoters' | 'passives' | 'detractors'>('all');

  // 1. Two Simultaneous Realtime Queries using Firebase Listeners
  useEffect(() => {
    setLoading(true);
    setErrorStr(null);

    // Form Query: Limit 50, ordered by createdAt desc
    const formsQuery = query(
      collection(db, 'forms'), 
      orderBy('createdAt', 'desc'), 
      limit(50)
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
      const creator = f.createdByName || '';
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

      return matchesSearch && matchesSource && matchesNps;
    });
  }, [forms, search, sourceFilter, npsFilter, evaluationsByFormId]);

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
            <p className="text-[10px] text-emerald-600 font-black uppercase tracking-wide">
              {stats.npsClassic >= 75 ? 'Excelente' : stats.npsClassic >= 50 ? 'Muito Bom' : stats.npsClassic >= 0 ? 'Razoável' : 'Crítico'}
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
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Distribuição de Voz</span>
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

                      {/* c) Subtítulo no formato "Lançado por [Nome do Usuário] às HH:MM" acompanhado do ícone */}
                      <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 font-medium">
                        <UserIcon size={12} className="text-slate-400 shrink-0" />
                        <span>Lançado por <strong className="text-slate-700 font-extrabold">{form.createdByName || 'Anônimo'}</strong></span>
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
    </div>
  );
};
