import React, { useState } from 'react';
import { 
  ClipboardList, 
  Calendar, 
  MessageSquare, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  Smile,
  X,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SurveyService } from '../services/SurveyService';

interface NewFormPageProps {
  key?: string;
  patients?: any[];
  currentUser?: any;
  availableSectors?: string[];
  availableDiagnoses?: string[];
  availableCities?: string[];
  onNavigateToHistory?: () => void;
}

export const NewFormPage = ({
  availableSectors = [],
  onNavigateToHistory,
  currentUser
}: NewFormPageProps) => {
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

  const rawSectors = availableSectors.length > 0 ? availableSectors : defaultSectors;
  const mappedSectors = Array.from(new Set(rawSectors.map(mapOldToNewSector)));
  const sectors = mappedSectors.sort((a, b) => {
    const orderA = SECTOR_ORDER[a] ?? 99;
    const orderB = SECTOR_ORDER[b] ?? 99;
    if (orderA !== orderB) {
      return orderA - orderB;
    }
    return a.localeCompare(b);
  });

  // Form State
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [patientName, setPatientName] = useState('');
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [ratings, setRatings] = useState<Record<string, { rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'N'; comment: string }>>(() => {
    const initial: Record<string, { rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'N'; comment: string }> = {};
    sectors.forEach(s => {
      initial[s] = { rating: 'N', comment: '' };
    });
    return initial;
  });
  const [generalComment, setGeneralComment] = useState('');
  
  // Interface state
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle rating change
  const handleRatingChange = (sector: string, rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'N') => {
    setRatings(prev => ({
      ...prev,
      [sector]: {
        ...prev[sector],
        rating
      }
    }));
  };

  // Handle comment change for sector
  const handleCommentChange = (sector: string, comment: string) => {
    setRatings(prev => ({
      ...prev,
      [sector]: {
        ...prev[sector],
        comment
      }
    }));
  };

  // Reset form
  const handleReset = () => {
    setNpsScore(null);
    setDate(new Date().toISOString().split('T')[0]);
    setPatientName('');
    setGeneralComment('');
    const resetRatings: Record<string, { rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'N'; comment: string }> = {};
    sectors.forEach(s => {
      resetRatings[s] = { rating: 'N', comment: '' };
    });
    setRatings(resetRatings);
    setSuccess(false);
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (npsScore === null) {
      setErrorMsg('Por favor, selecione uma nota na Escala de Recomendação (NPS).');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // Filter out unanswered ratings ('N')
      const sectorRatingsArray = sectors
        .map(sector => ({
          sector,
          rating: ratings[sector]?.rating,
          comment: ratings[sector]?.comment || ''
        }))
        .filter(item => item.rating && item.rating !== 'N') as { sector: string; rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim'; comment: string }[];

      await SurveyService.submitSurvey(
        npsScore,
        generalComment,
        sectorRatingsArray,
        'physical',
        date,
        currentUser?.id,
        currentUser?.name,
        patientName.trim()
      );

      setSuccess(true);
    } catch (error: any) {
      console.error('Error submitting physical survey:', error);
      setErrorMsg('Erro de segurança ou infraestrutura ao salvar os dados no banco de dados.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-5xl mx-auto space-y-8 p-1"
    >
      {/* Header Container Card */}
      <div className="bg-slate-50/50 p-6 md:p-8 rounded-[2rem] border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-600/10 shrink-0">
            <ClipboardList size={24} />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">
              Lançar Formulário de Pesquisa
            </h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              Área Administrativa para Lançamento Físico de Urna
            </p>
          </div>
        </div>

        {/* Custom date input with calendar icon */}
        <div className="relative w-full md:w-auto min-w-[200px]">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none">
            <Calendar size={18} />
          </span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full md:w-auto bg-white border border-slate-200 hover:border-slate-350 rounded-2xl py-3.5 pl-12 pr-5 font-bold text-slate-700 text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all cursor-pointer"
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success-container"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-blue-600 text-white p-10 md:p-14 rounded-[2.5rem] shadow-2xl text-center space-y-6 border border-blue-500 relative overflow-hidden"
          >
            {/* Background absolute subtle glow circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none" />

            <div className="w-20 h-20 bg-white text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl">
              <CheckCircle2 size={44} />
            </div>

            <div className="space-y-3">
              <h3 className="text-2xl md:text-3xl font-black tracking-tight uppercase">
                Pesquisa Salva com Sucesso!
              </h3>
              <p className="text-blue-100 text-sm font-bold max-w-lg mx-auto leading-relaxed">
                A resposta do formulário físico foi devidamente registrada e integrada aos relatórios estatísticos gerais em tempo real.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={handleReset}
                className="px-8 py-4 bg-white text-blue-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-50 active:scale-95 transition-all shadow-md"
              >
                Lançar Outro Formulário
              </button>
              {onNavigateToHistory && (
                <button
                  onClick={onNavigateToHistory}
                  className="px-8 py-4 bg-blue-700 text-white border border-blue-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-800 active:scale-95 transition-all"
                >
                  Ir para Histórico
                </button>
              )}
            </div>
          </motion.div>
        ) : (
          <form key="survey-form" onSubmit={handleSubmit} className="space-y-8">
            
            {/* Patient Identification Card */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <User size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-800 tracking-tight">
                    Identificação do Paciente (Opcional)
                  </h3>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                    Permite vincular o nome ao formulário para elogios/críticas nominais
                  </p>
                </div>
              </div>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <User size={18} />
                </span>
                <input
                  type="text"
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                  placeholder="Nome completo do paciente (ou deixe vazio para manter Anônimo)..."
                  className="w-full bg-slate-50 border border-slate-150 hover:border-slate-200 focus:bg-white rounded-2xl py-4 pl-12 pr-5 font-bold text-slate-700 text-sm focus:ring-4 focus:ring-blue-100 outline-none transition-all placeholder:text-slate-400 leading-snug"
                />
              </div>
            </div>

            {/* NPS Scale Card */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/80 shadow-sm space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none">
                  Métrica Principal (NPS)
                </p>
                <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                  O quanto você indicaria a Policlínica Bernardo Félix da Silva?
                </h3>
                <p className="text-xs font-bold text-slate-400 font-sans tracking-wide">
                  Escala de recomendação variando entre 0 (provavelmente não) e 10 (com certeza sim).
                </p>
              </div>

              {/* Slider scale Buttons in line */}
              <div className="grid grid-cols-6 sm:grid-cols-11 gap-2 md:gap-2.5 max-w-4xl pt-2">
                {Array.from({ length: 11 }).map((_, i) => {
                  const isSelected = npsScore === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNpsScore(i)}
                      className={`h-12 sm:h-14 md:h-16 rounded-2xl text-base md:text-lg font-black transition-all ${
                        isSelected
                          ? 'bg-blue-600 scale-110 shadow-lg text-white ring-4 ring-blue-100'
                          : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-100'
                      }`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>

              {/* Scale descriptions */}
              <div className="flex justify-between text-[10px] font-black text-slate-400 uppercase tracking-wider max-w-4xl ml-1">
                <span className="text-red-500">0 - Improvável</span>
                <span className="text-emerald-600">10 - Muito Provável</span>
              </div>
            </div>

            {/* ERROR BANNER IF ANY */}
            {errorMsg && (
              <div className="p-4 bg-red-50 text-red-900 rounded-2xl border border-red-100 flex items-center gap-3">
                <AlertCircle className="text-red-650 shrink-0" size={18} />
                <p className="text-xs font-bold font-sans">{errorMsg}</p>
              </div>
            )}

            {/* SECTORS EVALUATION TABLE CARD */}
            <div className="bg-white rounded-[2rem] border border-slate-200/80 shadow-sm overflow-hidden">
              <div className="p-6 md:p-8 border-b border-slate-100">
                <h3 className="text-lg md:text-xl font-black text-slate-800 tracking-tight">
                  Avaliação Detalhada por Setores
                </h3>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">
                  Atribua notas rápidas e observações aos canais selecionados
                </p>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 font-sans text-xs font-black text-slate-400 tracking-wider">
                      <th className="py-4 px-6 md:px-8 w-1/3">Setor</th>
                      <th className="py-4 px-4 text-center md:text-left w-1/3">Classificação</th>
                      <th className="py-4 px-6 md:px-8 w-1/3">Observação Específica</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sectors.map((sector) => {
                      const current = ratings[sector] || { rating: 'N', comment: '' };
                      const hasSelectedRating = current.rating !== 'N';

                      return (
                        <tr 
                          key={sector}
                          className={`transition-colors duration-150 ${
                            hasSelectedRating ? 'bg-blue-50/40' : 'hover:bg-slate-50/30'
                          }`}
                        >
                          {/* Sector Column */}
                          <td className="py-5 px-6 md:px-8">
                            <span className="font-bold text-slate-700 tracking-tight text-sm md:text-base">
                              {sector}
                            </span>
                          </td>

                          {/* Classification buttons column */}
                          <td className="py-5 px-4">
                            <div className="flex items-center justify-center md:justify-start gap-1.5 md:gap-2">
                              {[
                                { id: 'Otimo', label: 'Ó', desc: 'Ótimo', color: 'bg-emerald-600 text-white shadow-emerald-100 ring-emerald-200', defaultColor: 'text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100/60' },
                                { id: 'Bom', label: 'B', desc: 'Bom', color: 'bg-blue-600 text-white shadow-blue-100 ring-blue-200', defaultColor: 'text-blue-700 bg-blue-50 border-blue-100 hover:bg-blue-100/60' },
                                { id: 'Regular', label: 'R', desc: 'Regular', color: 'bg-amber-500 text-white shadow-amber-100 ring-amber-150', defaultColor: 'text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100/60' },
                                { id: 'Ruim', label: 'R', desc: 'Ruim', color: 'bg-red-650 text-white shadow-red-100 ring-red-200', defaultColor: 'text-red-700 bg-red-50 border-red-100 hover:bg-red-100/60' },
                                { id: 'N', label: 'N', desc: 'Não informou', color: 'bg-slate-400 text-white shadow-slate-100 ring-slate-150', defaultColor: 'text-slate-500 bg-slate-100 border-slate-150 hover:bg-slate-200/60' }
                              ].map((option) => {
                                const isOptionSelected = current.rating === option.id;
                                return (
                                  <button
                                    key={option.id}
                                    type="button"
                                    onClick={() => handleRatingChange(sector, option.id as any)}
                                    title={`${option.desc}`}
                                    className={`w-9 h-9 sm:w-10 sm:h-10 text-xs sm:text-sm font-black rounded-xl transition-all duration-150 flex items-center justify-center border active:scale-90 ${
                                      isOptionSelected
                                        ? `${option.color} scale-105 shadow-md border-transparent ring-4`
                                        : `${option.defaultColor}`
                                    }`}
                                  >
                                    {option.label}
                                  </button>
                                );
                              })}
                            </div>
                          </td>

                          {/* Specific Observation Column */}
                          <td className="py-5 px-6 md:px-8">
                            <div className="relative w-full">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                                <MessageSquare size={14} />
                              </span>
                              <input
                                type="text"
                                value={current.comment}
                                onChange={(e) => handleCommentChange(sector, e.target.value)}
                                placeholder="Comentário sobre o setor..."
                                className="w-full bg-slate-50 border border-slate-100 hover:border-slate-200 focus:bg-white rounded-xl py-2 pl-9 pr-4 font-medium text-slate-700 text-xs md:text-sm focus:ring-4 focus:ring-blue-50/50 outline-none transition-all placeholder-slate-400"
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* General Feedback Comments Card */}
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-slate-200/80 shadow-sm space-y-4">
              <div className="flex items-center gap-2.5">
                <Smile size={20} className="text-blue-650" />
                <h3 className="text-lg font-black text-slate-800 tracking-tight">
                  Comentários ou Sugestões Gerais
                </h3>
              </div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Utilize o campo de texto livre para registrar outras opiniões e relatos do paciente
              </p>
              <textarea
                value={generalComment}
                onChange={(e) => setGeneralComment(e.target.value)}
                placeholder="Insira sugestões, condolências, relatos adicionais recolhidos na pesquisa física..."
                className="w-full min-h-[120px] bg-slate-50 border border-slate-150 hover:border-slate-200 focus:bg-white rounded-2xl p-4 font-medium text-slate-700 text-sm focus:ring-4 focus:ring-blue-100/50 outline-none transition-all leading-relaxed placeholder-slate-400"
              />
            </div>

            {/* Final Action Submission Button Card */}
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-10 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] font-black uppercase text-xs tracking-widest hover:shadow-xl shadow-blue-200 transition-all active:scale-95 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Send size={15} />
                    Salvar Formulário de Pesquisa
                  </>
                )}
              </button>
            </div>

          </form>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
