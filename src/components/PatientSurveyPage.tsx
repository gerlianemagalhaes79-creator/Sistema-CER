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
  HelpCircle
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
  const defaultSectors = ['Portaria', 'Recepção', 'Triagem', 'Consultas', 'Laboratório', 'Higiene'];
  const sectors = availableSectors.length > 0 ? availableSectors : defaultSectors;

  // Sector evaluations state
  // Key: sector name, value: { rating: 'Otimo'|'Bom'|'Regular'|'Ruim', comment: string }
  const [sectorRatings, setSectorRatings] = useState<Record<string, { rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim'; comment: string }>>({});
  const [generalComment, setGeneralComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Auto sign-in anonymously in background when survey loads
  useEffect(() => {
    SurveyService.ensureAnonymousAuth();
  }, []);

  // Timer for automatic restart on Success page (5 seconds)
  useEffect(() => {
    if (step === 4) {
      const timer = setTimeout(() => {
        handleResetSurvey();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleResetSurvey = () => {
    setNpsScore(null);
    setSectorRatings({});
    setGeneralComment('');
    setStep(1);
  };

  const handleSetSectorRating = (sector: string, rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim') => {
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
        rating: prev[sector]?.rating,
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
          return item && item.rating;
        }) // Only send answered sectors
        .map(([sector, data]) => {
          const item = data as { rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim'; comment: string };
          return {
            sector,
            rating: item.rating,
            comment: item.comment
          };
        });

      // Submit direct to database anonymously
      await SurveyService.submitSurvey(npsScore, generalComment, finalRatings, 'patient');
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
            <div className="w-12 h-12 bg-[#01402E] rounded-2xl flex items-center justify-center text-white text-xl font-black">
              SUS
            </div>
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
          
          {/* STEP 1: NPS SCALE */}
          {step === 1 && (
            <motion.div
              key="step-1"
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
                      // Auto trigger step 2 to minimize actions count and enhance speed
                      setTimeout(() => setStep(2), 250);
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
              <div className="pt-6 flex justify-end">
                <button
                  type="button"
                  disabled={npsScore === null}
                  onClick={() => setStep(2)}
                  className="px-8 py-5 bg-[#01402E] text-white rounded-2xl text-sm font-black uppercase tracking-wider hover:bg-emerald-950 transition-all shadow-lg flex items-center gap-2 max-xs:w-full justify-center disabled:opacity-40"
                >
                  Continuar <ArrowRight size={18} />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: SECTOR EVALUATION (SMILEYS) */}
          {step === 2 && (
            <motion.div
              key="step-2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-emerald-50 text-center space-y-2 shadow-md">
                <h2 className="text-xl md:text-2xl font-black text-[#01402E] uppercase">Como você avalia os setores onde passou hoje?</h2>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Sua opinião é secreta e ajuda a melhorar nossos serviços públicos do SUS.</p>
              </div>

              {/* Vertically scrolls sectors for visual comfort */}
              <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-2 pb-4 scrollbar-thin">
                {sectors.map((sector) => {
                  const currentSelection = sectorRatings[sector]?.rating;
                  const currentComment = sectorRatings[sector]?.comment || '';

                  return (
                    <div 
                      key={sector} 
                      className="bg-white p-6 rounded-[2rem] border border-gray-150 shadow-sm space-y-4 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <span className="text-lg md:text-xl font-black text-[#01402E] uppercase tracking-tight">{sector}</span>
                        
                        {/* Smiley scale selectors (Large, accessible, very comfortable touch targets) */}
                        <div className="flex gap-2.5">
                          {[
                            { id: 'Otimo', label: 'Ótimo', emoji: '😁', color: 'text-emerald-700 bg-emerald-50 border-emerald-200 hover:bg-emerald-100', activeBg: 'bg-emerald-600 text-white ring-4 ring-emerald-200 font-extrabold' },
                            { id: 'Bom', label: 'Bom', emoji: '🙂', color: 'text-sky-700 bg-sky-50 border-sky-200 hover:bg-sky-100', activeBg: 'bg-sky-600 text-white ring-4 ring-sky-200 font-extrabold' },
                            { id: 'Regular', label: 'Regular', emoji: '😐', color: 'text-amber-700 bg-amber-50 border-amber-200 hover:bg-amber-100', activeBg: 'bg-amber-500 text-white ring-4 ring-amber-200 font-extrabold' },
                            { id: 'Ruim', label: 'Ruim', emoji: '🙁', color: 'text-red-700 bg-red-50 border-red-200 hover:bg-red-100', activeBg: 'bg-red-600 text-white ring-4 ring-red-200 font-extrabold' }
                          ].map((option) => {
                            const isSelected = currentSelection === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleSetSectorRating(sector, option.id as any)}
                                className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all active:scale-95 flex-1 min-w-[70px] ${
                                  isSelected ? option.activeBg + ' scale-105 shadow-md border-transparent' : option.color
                                }`}
                              >
                                <span className="text-3xl select-none leading-none mb-1">{option.emoji}</span>
                                <span className="text-[10px] font-black uppercase tracking-widest mt-1">{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Optional segment commentary for sector level if answered */}
                      {currentSelection && (
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
                            placeholder={`Escreva por que a ${sector} merece esta nota...`}
                            className="w-full px-4 py-3 rounded-xl border border-gray-150 bg-gray-50/50 text-xs font-bold text-gray-650 focus:outline-none focus:ring-2 focus:ring-[#01402E] focus:bg-white"
                          />
                        </motion.div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Navigation controls */}
              <div className="flex justify-between gap-4 pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-6 py-5 bg-white border border-gray-150 hover:bg-gray-50 text-[#01402E] rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 active:scale-95"
                >
                  <ArrowLeft size={16} /> Voltar
                </button>

                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-8 py-5 bg-[#01402E] text-white hover:bg-emerald-950 rounded-2xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 active:scale-95"
                >
                  Próximo <ArrowRight size={16} />
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
                <h2 className="text-2xl md:text-3xl font-black text-[#01402E] uppercase">Deseja registrar comentários gerais ou sugestões?</h2>
                <p className="text-xs md:text-sm font-bold text-gray-400 uppercase tracking-wider max-w-md mx-auto leading-relaxed">
                  Utilize o campo abaixo para elogiar profissionais, sugerir mudanças ou fazer qualquer reclamação adicional.
                </p>
              </div>

              {/* Large TEXTAREA for comfortable writing */}
              <div className="max-w-2xl mx-auto">
                <textarea
                  rows={5}
                  value={generalComment}
                  onChange={(e) => setGeneralComment(e.target.value)}
                  placeholder="DIGITE AQUI SEU COMENTÁRIO..."
                  className="w-full p-5 rounded-[2rem] border border-gray-200 bg-gray-50 text-base font-bold text-gray-600 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:bg-white resize-none"
                />
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
                  Sua opinião ajuda a aprimorar de forma democrática e transparente a qualidade do SUS na Policlínica Bernardo Félix da Silva.
                </p>
              </div>

              {/* Auto reset status line */}
              <div className="pt-6 font-semibold text-[10px] uppercase text-emerald-200/50 tracking-[0.2em]">
                Preparando painel para o próximo paciente...
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetSurvey}
                  className="px-6 py-4 bg-white/15 hover:bg-white/20 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                >
                  AVALIAR NOVAMENTE AGORA
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
