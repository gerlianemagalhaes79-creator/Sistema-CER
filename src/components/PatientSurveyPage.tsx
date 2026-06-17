import React, { useState, useEffect } from 'react';
import { 
  Smile, 
  Meh, 
  Frown, 
  Heart, 
  Send, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle,
  HelpCircle,
  User
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SurveyService } from '../services/SurveyService';

interface PatientSurveyPageProps {
  availableSectors: string[];
}

export const PatientSurveyPage = ({ availableSectors = [] }: PatientSurveyPageProps) => {
  // Steps: 1 = NPS, 2 = Setores, 3 = Comentário Geral, 4 = Sucesso
  const [step, setStep] = useState(1);
  const [npsScore, setNpsScore] = useState<number | null>(null);

  // Default active sectors
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
  // We strictly use the 12 environments for the public patient survey to guarantee identical mapping
  const sectors = defaultSectors;

  // Sector evaluations state
  // Key: sector name, value: { rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'NaoPassei'; comment: string }
  const [sectorRatings, setSectorRatings] = useState<Record<string, { rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'NaoPassei'; comment: string }>>({});
  const [generalComment, setGeneralComment] = useState('');
  const [patientName, setPatientName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto sign-in anonymously in background when survey loads
  useEffect(() => {
    SurveyService.ensureAnonymousAuth();
  }, []);

  // Timer for automatic restart on Success page (15 seconds with visual countdown)
  const [countdown, setCountdown] = useState(15);

  useEffect(() => {
    if (step === 4) {
      setCountdown(15);
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleResetSurvey();
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [step]);

  const handleResetSurvey = () => {
    setNpsScore(null);
    setSectorRatings({});
    setGeneralComment('');
    setPatientName('');
    setStep(1);
  };

  const handleSetSectorRating = (sector: string, rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'NaoPassei') => {
    setSectorRatings(prev => ({
      ...prev,
      [sector]: {
        rating,
        comment: prev[sector]?.comment || ''
      }
    }));
  };

  const handleSetSectorComment = (sector: string, comment: string) => {
    setSectorRatings(prev => ({
      ...prev,
      [sector]: {
        rating: prev[sector]?.rating || 'NaoPassei',
        comment
      }
    }));
  };

  const handleFinalSubmit = async () => {
    if (npsScore === null) return;
    setSubmitting(true);
    try {
      // Structure sector ratings into final list
      const finalRatings = Object.entries(sectorRatings)
        .filter(([_, data]) => {
          const item = data as any;
          return item && item.rating && item.rating !== 'NaoPassei';
        }) // Only send answered sectors
        .map(([sector, data]) => {
          const item = data as { rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'NaoPassei'; comment: string };
          return {
            sector,
            rating: item.rating as 'Otimo' | 'Bom' | 'Regular' | 'Ruim',
            comment: item.comment
          };
        });

      // Submit direct to database anonymously, passing optional patient name as seventh argument
      await SurveyService.submitSurvey(
        npsScore, 
        generalComment, 
        finalRatings, 
        'patient', 
        undefined, 
        undefined, 
        patientName.trim() || 'Anônimo (Paciente)'
      );
      setStep(4);
    } catch (err) {
      console.error(err);
      alert("Houve um erro ao enviar sua pesquisa. Por favor, tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  // NPS buttons colors (Red to Green spectrum)
  const getNpsButtonColor = (score: number) => {
    if (score <= 4) return 'bg-red-500 text-white hover:bg-red-600';
    if (score <= 6) return 'bg-orange-500 text-white hover:bg-orange-600';
    if (score <= 8) return 'bg-yellow-500 text-gray-900 hover:bg-yellow-600';
    return 'bg-emerald-500 text-white hover:bg-emerald-600';
  };

  return (
    <div className="min-h-screen bg-[#F0FDF4] text-gray-800 flex flex-col justify-between" id="id_patient_survey_root">
      
      {/* Header with high UI hierarchy and SUS compliance */}
      <header className="bg-white border-b border-emerald-100 py-6 px-4 md:px-8 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-lg md:text-xl font-black text-[#01402E] tracking-tight uppercase">POLICLÍNICA BERNARDO FÉLIX</h1>
              <p className="text-[10px] md:text-xs text-emerald-800 font-extrabold tracking-widest uppercase">Pesquisa de Satisfação de Pacientes</p>
            </div>
          </div>
          
          {/* Visual Step Indicator Indicator */}
          {step <= 3 && (
            <div className="text-right">
              <span className="text-xs text-emerald-800 font-black tracking-wider uppercase leading-none block">Etapa {step} de 3</span>
              <div className="flex gap-2.5 mt-2 justify-end">
                <div className={`w-3 h-3 rounded-full ${step >= 1 ? 'bg-[#01402E]' : 'bg-emerald-100'}`} />
                <div className={`w-3 h-3 rounded-full ${step >= 2 ? 'bg-[#01402E]' : 'bg-emerald-100'}`} />
                <div className={`w-3 h-3 rounded-full ${step >= 3 ? 'bg-[#01402E]' : 'bg-emerald-100'}`} />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Form Body */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-8 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          
          {/* STEP 1: SECTOR EVALUATION (SMILEYS) */}
          {step === 1 && (
            <motion.div
              key="step-1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-emerald-50 text-center space-y-2 shadow-md">
                <h2 className="text-xl md:text-2xl font-black text-[#01402E] uppercase">Como você avalia os setores onde passou hoje?</h2>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Sua opinião é segura e fundamental! Avalie apenas onde você passou hoje (se não passou, marque "Não passei").</p>
              </div>

              {/* Vertically scrolls sectors for visual comfort */}
              <div className="space-y-4 max-h-[62vh] overflow-y-auto pr-1 pb-4 scrollbar-thin">
                {sectors.map((sector) => {
                  const currentSelection = sectorRatings[sector]?.rating;
                  const currentComment = sectorRatings[sector]?.comment || '';

                  return (
                    <div 
                      key={sector} 
                      className="bg-white p-4 sm:p-6 rounded-[2rem] border border-gray-150 shadow-sm space-y-4 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <span className="text-base sm:text-lg md:text-xl font-black text-[#01402E] uppercase tracking-tight">{sector}</span>
                        
                        {/* Smiley scale selectors (Grid scale: large, robust and fully responsive) */}
                        <div className="grid grid-cols-5 gap-1 sm:gap-2 w-full md:w-auto md:min-w-[420px]">
                          {[
                            { id: 'Otimo', label: 'Ótimo', emoji: '😁', color: 'text-emerald-700 bg-emerald-50 border-emerald-100 hover:bg-emerald-100', activeBg: 'bg-emerald-600 text-white ring-4 ring-emerald-200 font-extrabold' },
                            { id: 'Bom', label: 'Bom', emoji: '🙂', color: 'text-sky-700 bg-sky-50 border-sky-100 hover:bg-sky-100', activeBg: 'bg-sky-600 text-white ring-4 ring-sky-200 font-extrabold' },
                            { id: 'Regular', label: 'Regular', emoji: '😐', color: 'text-amber-700 bg-amber-50 border-amber-100 hover:bg-amber-100', activeBg: 'bg-amber-500 text-white ring-4 ring-amber-200 font-extrabold' },
                            { id: 'Ruim', label: 'Ruim', emoji: '🙁', color: 'text-red-700 bg-red-50 border-red-100 hover:bg-red-100', activeBg: 'bg-red-600 text-white ring-4 ring-red-200 font-extrabold' },
                            { id: 'NaoPassei', label: 'Não passei', emoji: '🚫', color: 'text-slate-500 bg-slate-50 border-slate-150 hover:bg-slate-100', activeBg: 'bg-slate-500 text-white ring-4 ring-slate-200 font-extrabold' }
                          ].map((option) => {
                            const isSelected = currentSelection === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSetSectorRating(sector, option.id as any)}
                                className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-2xl border transition-all active:scale-95 text-center ${
                                  isSelected ? option.activeBg + ' scale-105 shadow-md border-transparent' : option.color
                                }`}
                              >
                                <span className="text-xl sm:text-2xl select-none leading-none mb-1">{option.emoji}</span>
                                <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-wider mt-1">{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Optional segment commentary for sector level if answered - 16px font-size to prevent zoom */}
                      {currentSelection && currentSelection !== 'NaoPassei' && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          className="pt-2"
                        >
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 mb-1">Quer deixar algum comentário sobre este setor? (Opcional)</label>
                          <input
                            type="text"
                            value={currentComment}
                            onChange={(e) => handleSetSectorComment(sector, e.target.value)}
                            placeholder={`Escreva por que determinou esta nota...`}
                            className="w-full px-4 py-3 rounded-xl border border-gray-150 bg-gray-50/50 text-base font-bold text-gray-650 focus:outline-none focus:ring-2 focus:ring-[#01402E] focus:bg-white"
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Navigation controls */}
              <div className="flex justify-end gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-8 py-5 bg-[#01402E] text-white hover:bg-emerald-950 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                >
                  Próximo <ArrowRight size={16} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: NPS SCALE */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl border border-emerald-50 text-center space-y-8"
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-[#01402E] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
                  <Heart size={32} className="fill-current text-[#01402E]" />
                </div>
                {/* Large uppercase headers for accessibility */}
                <h2 className="text-2xl md:text-3xl font-black text-[#01402E] leading-tight uppercase px-2">
                  O quanto você recomenda a Policlínica Bernardo Félix para amigos e familiares?
                </h2>
                <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider">
                  Selecione uma nota de 0 (Não Recomendaria) até 10 (Recomendaria muito)
                </p>
              </div>

              {/* Large Táctile Scale Buttons */}
              <div className="grid grid-cols-6 sm:grid-cols-11 gap-2.5 max-w-3xl mx-auto pt-4">
                {Array.from({ length: 11 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setNpsScore(i);
                      // Auto trigger step 3 to minimize actions count and enhance speed
                      setTimeout(() => setStep(3), 250);
                    }}
                    className={`h-16 md:h-20 text-xl md:text-2xl font-black rounded-2xl transition-all active:scale-90 shadow-md ${
                      npsScore === i 
                        ? 'ring-4 ring-emerald-700 bg-[#01402E] text-white scale-105' 
                        : getNpsButtonColor(i)
                    }`}
                  >
                    {i}
                  </button>
                ))}
              </div>

              {/* Slider Legends labels description */}
              <div className="flex justify-between px-4 text-xs font-black text-gray-400 uppercase tracking-wider max-w-3xl mx-auto pt-2">
                <span className="text-red-500">0 - NÃO RECOMENDO</span>
                <span className="text-emerald-600">10 - RECOMENDO MUITO</span>
              </div>

              {/* Next Step Control */}
              <div className="pt-6 flex justify-between gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-5 bg-white border border-gray-150 hover:bg-gray-50 text-[#01402E] rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <ArrowLeft size={16} /> Voltar
                </button>
                <button
                  type="button"
                  disabled={npsScore === null}
                  onClick={() => setStep(3)}
                  className="px-8 py-5 bg-[#01402E] text-white rounded-2xl text-sm font-black uppercase tracking-wider hover:bg-emerald-950 transition-all shadow-lg flex items-center gap-2 max-xs:w-full justify-center disabled:opacity-40"
                >
                  Continuar <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: GENERAL COMMENT AND SUBMIT */}
          {step === 3 && (
            <motion.div
              key="step-3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white p-6 md:p-12 rounded-[2.5rem] shadow-xl border border-emerald-50 text-center space-y-8"
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-emerald-50 text-[#01402E] rounded-2xl flex items-center justify-center mx-auto">
                  <Smile size={32} />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-[#01402E] uppercase">IDENTIFICAÇÃO E COMENTÁRIOS ADICIONAIS</h2>
                <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider max-w-md mx-auto leading-relaxed">
                  Insira suas informações opcionais abaixo. Se não desejar se identificar, basta deixar o nome em branco.
                </p>
              </div>

              {/* Identification and general commentaries - iOS safari font-size 16px to prevent automatic zooming */}
              <div className="max-w-2xl mx-auto space-y-6 text-left">
                <div className="bg-emerald-50/35 p-5 rounded-3xl border border-emerald-100/60 space-y-3">
                  <label className="flex items-center gap-2 text-xs font-black text-[#01402E] uppercase tracking-widest leading-none">
                    <User size={16} /> Seu Nome (Opcional)
                  </label>
                  <input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="DIGITE SEU NOME COMPLETO DE FORMA OPCIONAL..."
                    className="w-full px-5 py-4 rounded-2xl border border-gray-200 bg-white text-base font-bold text-gray-700 focus:outline-none focus:ring-4 focus:ring-emerald-500/15"
                  />
                  <p className="text-[10px] text-emerald-800/65 font-black uppercase tracking-wider ml-1 leading-relaxed">
                    Sua pesquisa continua anônima se você decidir não preencher este campo.
                  </p>
                </div>

                <div className="space-y-3">
                  <label className="block text-xs font-black text-[#01402E] uppercase tracking-widest leading-none ml-1">
                    Comentário Geral ou Sugestão (Opcional)
                  </label>
                  <textarea
                    rows={4}
                    value={generalComment}
                    onChange={(e) => setGeneralComment(e.target.value)}
                    placeholder="DIGITE SEU COMENTÁRIO, ELOGIO OU RECLAMAÇÃO AQUI..."
                    className="w-full p-5 rounded-[2rem] border border-gray-200 bg-gray-50 text-base font-bold text-gray-650 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white resize-none"
                  />
                </div>
              </div>

              {/* Navigation and final submit controls */}
              <div className="flex justify-between items-center max-w-2xl mx-auto pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-5 bg-white border border-gray-150 hover:bg-gray-50 text-[#01402E] rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <ArrowLeft size={16} /> Voltar
                </button>

                <button
                  type="button"
                  disabled={submitting}
                  onClick={handleFinalSubmit}
                  className="px-10 py-5 bg-[#01402E] hover:bg-emerald-950 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-xl flex items-center gap-2 active:scale-95 disabled:opacity-50"
                >
                  {submitting ? (
                    <>Enviando...</>
                  ) : (
                    <>
                      Enviar Pesquisa <Send size={14} />
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 4: SUCCESS WITH AUTO RESET TIMING */}
          {step === 4 && (
            <motion.div
              key="step-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#01402E] text-white p-8 md:p-16 rounded-[3rem] shadow-2xl text-center space-y-8 max-w-2xl mx-auto border-4 border-emerald-300/30"
            >
              <div className="w-24 h-24 bg-white text-emerald-800 rounded-3xl flex items-center justify-center mx-auto shadow-xl transform rotate-3">
                <CheckCircle size={52} className="text-emerald-700 fill-current text-white" />
              </div>

              <div className="space-y-4">
                <h2 className="text-3xl md:text-4xl font-black tracking-tight uppercase px-4 leading-tight">
                  MUITO OBRIGADO POR SUA COLABORAÇÃO!
                </h2>
                <p className="text-emerald-100 font-bold max-w-md mx-auto text-sm leading-relaxed uppercase">
                  Sua opinião ajuda a aprimorar de forma transparente e acolhedora o atendimento e as equipes na Policlínica Bernardo Félix da Silva.
                </p>
              </div>

              {/* Dynamic countdown visual feedback */}
              <div className="space-y-3 pt-6">
                <div className="w-full bg-emerald-950/55 h-2 rounded-full overflow-hidden max-w-xs mx-auto border border-emerald-800">
                  <div 
                    className="bg-emerald-400 h-full transition-all duration-1000 ease-linear" 
                    style={{ width: `${(countdown / 15) * 100}%` }}
                  />
                </div>
                <div className="text-[11px] font-bold uppercase text-emerald-200/70 tracking-[0.14em]">
                  Esta tela será reiniciada automaticamente em <span className="text-emerald-300 font-black text-xs px-1.5 py-0.5 bg-emerald-950/40 rounded-md">{countdown} s</span>...
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={handleResetSurvey}
                  className="px-8 py-4.5 bg-white text-emerald-900 hover:bg-emerald-50 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-md active:scale-95"
                >
                  CONCLUIR AGORA (VOLTAR AO INÍCIO)
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer metadata description */}
      <footer className="py-6 px-4 text-center text-[10px] font-black text-emerald-800/40 uppercase tracking-[0.14em]">
        Controle Ouvidoria • Policlínica Bernardo Félix da Silva • Canal Direto do Cidadão
      </footer>

    </div>
  );
};
