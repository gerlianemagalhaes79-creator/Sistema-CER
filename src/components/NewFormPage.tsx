import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  UserPlus, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  ClipboardList, 
  Building2, 
  UserCheck, 
  Users,
  ShieldAlert,
  HelpCircle,
  Clock,
  Briefcase
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient, Movement, Citizen, ManifestationType, SatisfactionLevel } from '../types';
import { MovementService } from '../services/MovementService';
import { PatientService } from '../services/PatientService';

interface NewFormPageProps {
  key?: string;
  patients: Patient[];
  currentUser: any;
  availableSectors: string[];
  availableDiagnoses: string[];
  availableCities: string[];
  onNavigateToHistory: () => void;
}

export const NewFormPage = ({
  patients,
  currentUser,
  availableSectors,
  availableDiagnoses,
  availableCities,
  onNavigateToHistory
}: NewFormPageProps) => {
  // Navigation states within Form
  const [activeTab, setActiveTab] = useState<'existing' | 'new-citizen' | 'anonymous'>('existing');

  // New Ticket State
  const [ticketData, setTicketData] = useState({
    patientId: '',
    patientName: '',
    medicalRecordNumber: '',
    diagnoses: [] as string[],
    professionals: [] as string[],
    responsibleProfessional: '',
    type: 'Reclamação' as ManifestationType,
    date: new Date().toISOString().split('T')[0],
    observations: '',
    satisfaction: 'Satisfeito' as SatisfactionLevel
  });

  // Search Existing Citizen State
  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);
  const [selectedCitizen, setSelectedCitizen] = useState<Patient | null>(null);

  // New Citizen Creation Form (within same view, expands dynamically!)
  const [newCitizen, setNewCitizen] = useState({
    name: '',
    medicalRecordNumber: '', // CPF/CNS
    birthDate: '',
    gender: 'M' as 'M' | 'F' | 'Outro',
    city: 'Fortaleza',
    diagnoses: [] as string[],
    professionals: [] as string[],
    status: 'Ativo' as const,
    observations: ''
  });

  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // Filtering existing citizens
  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.medicalRecordNumber.includes(searchTerm)
    ).slice(0, 5);
  }, [patients, searchTerm]);

  const selectExistingPatient = (p: Patient) => {
    setSelectedCitizen(p);
    setSearchTerm(p.name);
    setTicketData(prev => ({
      ...prev,
      patientId: p.id,
      patientName: p.name,
      medicalRecordNumber: p.medicalRecordNumber,
      diagnoses: p.diagnoses || [],
      professionals: p.professionals || [],
      responsibleProfessional: p.professionals[0] || availableSectors[0] || ''
    }));
    setShowPatientList(false);
  };

  const handleSelectTab = (tab: 'existing' | 'new-citizen' | 'anonymous') => {
    setActiveTab(tab);
    // Reset specific states
    if (tab === 'anonymous') {
      setSelectedCitizen(null);
      setSearchTerm('Anônimo / Coletivo');
      setTicketData(prev => ({
        ...prev,
        patientId: 'anonymous',
        patientName: 'Anônimo / Coletivo',
        medicalRecordNumber: '999.999.999-99',
        diagnoses: [],
        professionals: []
      }));
    } else if (tab === 'new-citizen') {
      setSelectedCitizen(null);
      setSearchTerm('');
      setTicketData(prev => ({
        ...prev,
        patientId: '',
        patientName: '',
        medicalRecordNumber: '',
        diagnoses: [],
        professionals: []
      }));
    } else {
      setSelectedCitizen(null);
      setSearchTerm('');
      setTicketData(prev => ({
        ...prev,
        patientId: '',
        patientName: '',
        medicalRecordNumber: '',
        diagnoses: [],
        professionals: []
      }));
    }
  };

  const toggleDiagnosisSelection = (diag: string) => {
    setTicketData(prev => {
      const current = prev.diagnoses;
      const next = current.includes(diag) 
        ? current.filter(d => d !== diag)
        : [...current, diag];
      return { ...prev, diagnoses: next };
    });
  };

  const toggleSectorSelection = (sector: string) => {
    setTicketData(prev => {
      const current = prev.professionals;
      const next = current.includes(sector)
        ? current.filter(s => s !== sector)
        : [...current, sector];
      return { ...prev, professionals: next };
    });
  };

  const handleCreateAndSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;

    if (activeTab === 'existing' && !selectedCitizen) {
      alert('Por favor, busque e selecione um Cidadão/Manifestante antes de enviar.');
      return;
    }

    if (!ticketData.observations.trim()) {
      alert('Descrição/Relato detalhado é requerido.');
      return;
    }

    setSaving(true);
    try {
      let finalPatientId = ticketData.patientId;
      let finalPatientName = ticketData.patientName;
      let finalMedRecord = ticketData.medicalRecordNumber;

      // Stage 1: Create Citizen if 'new-citizen' is active
      if (activeTab === 'new-citizen') {
        if (!newCitizen.name.trim() || !newCitizen.medicalRecordNumber.trim()) {
          throw new Error('Nome e CPF/CNS do novo cidadão são obrigatórios.');
        }

        const created = await PatientService.addPatient({
          name: newCitizen.name.trim(),
          medicalRecordNumber: newCitizen.medicalRecordNumber.trim(),
          birthDate: newCitizen.birthDate || '1990-01-01',
          gender: newCitizen.gender,
          city: newCitizen.city,
          diagnoses: ticketData.diagnoses, // Sync topics selected
          professionals: ticketData.professionals, // Sync sectors selected
          status: 'Ativo',
          entryDate: new Date().toISOString().split('T')[0]
        });

        finalPatientId = created.id;
        finalPatientName = created.name;
        finalMedRecord = created.medicalRecordNumber;
      }

      // Stage 2: Create Manifestation Ticket
      const payload = {
        patientId: finalPatientId,
        patientName: finalPatientName,
        medicalRecordNumber: finalMedRecord,
        diagnoses: ticketData.diagnoses,
        professionals: ticketData.professionals,
        responsibleProfessional: ticketData.responsibleProfessional || availableSectors[0] || 'Ouvidoria Geral',
        type: ticketData.type,
        date: ticketData.date,
        observations: ticketData.observations.trim(),
        satisfaction: ticketData.satisfaction
      };

      await MovementService.addMovement(payload);

      // Side-effect counter absentees if needed
      if (ticketData.type === 'Absenteísmo' && activeTab === 'existing' && selectedCitizen) {
        const newCount = (selectedCitizen.absenteeismCount || 0) + 1;
        const updates: Partial<Patient> = { absenteeismCount: newCount };
        
        if (newCount >= 3) {
          updates.status = 'Bloqueado'; // Lose vaga/marked as inactive
        }
        await PatientService.updatePatient(selectedCitizen.id, updates);
      }

      setSuccessMsg(`Protocolo de ${ticketData.type} registrado com absoluto sucesso no Banco de Dados!`);
      
      // Clear forms
      setTicketData({
        patientId: '',
        patientName: '',
        medicalRecordNumber: '',
        diagnoses: [],
        professionals: [],
        responsibleProfessional: '',
        type: 'Reclamação',
        date: new Date().toISOString().split('T')[0],
        observations: '',
        satisfaction: 'Satisfeito'
      });
      setNewCitizen({
        name: '',
        medicalRecordNumber: '',
        birthDate: '',
        gender: 'M',
        city: 'Fortaleza',
        diagnoses: [],
        professionals: [],
        status: 'Ativo',
        observations: ''
      });
      setSelectedCitizen(null);
      setSearchTerm('');

    } catch (err: any) {
      console.error('Error submitting dynamic form:', err);
      alert(`Falha ao registrar formulário: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      {/* Header */}
      <div className="flex justify-between items-center bg-[#01402E]/5 p-6 rounded-3xl border border-[#01402E]/10">
        <div>
          <h2 className="text-3xl font-black text-[#01402E] tracking-tight">Novo Protocolo de Ouvidoria</h2>
          <p className="text-sm font-semibold text-gray-500 mt-1 uppercase tracking-widest leading-none">Canais Digitais de Solicitação & Transparência</p>
        </div>
        <button
          onClick={onNavigateToHistory}
          className="bg-[#01402E] text-white font-bold text-xs uppercase px-5 py-2.5 rounded-xl hover:bg-emerald-950 transition-all flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
        >
          <ClipboardList size={16} /> Ver Histórico
        </button>
      </div>

      <AnimatePresence mode="wait">
        {successMsg && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl flex items-center justify-between shadow-lg shadow-emerald-500/10"
          >
            <div className="flex items-center gap-3">
              <CheckCircle2 size={24} className="animate-bounce" />
              <div>
                <p className="font-extrabold text-sm">{successMsg}</p>
                <p className="text-xs opacity-90 font-medium">As credenciais foram auditadas e persistidas em tempo real.</p>
              </div>
            </div>
            <button 
              onClick={() => setSuccessMsg('')} 
              className="bg-white/14 px-3 py-1 rounded-lg text-xs font-black uppercase hover:bg-white/20 transition-all active:scale-95"
            >
              OK, fechar
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleCreateAndSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT/MID MAIN CONTAINER (Form Fields) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Citizen Identification Selector */}
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-[#01402E] tracking-tight flex items-center gap-2 border-b border-gray-50 pb-4">
              <UserCheck size={18} /> 1. Qualificação & Identificação do Cidadão
            </h3>

            {/* Custom Interactive Switcher tabs */}
            <div className="grid grid-cols-3 gap-2 bg-gray-50 p-1.5 rounded-2xl">
              <button
                type="button"
                onClick={() => handleSelectTab('existing')}
                className={`py-3 rounded-xl font-bold text-xs uppercase transition-all tracking-wider ${
                  activeTab === 'existing' 
                    ? 'bg-white text-[#01402E] shadow-sm font-black' 
                    : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                Cidadão Existente
              </button>
              <button
                type="button"
                onClick={() => handleSelectTab('new-citizen')}
                className={`py-3 rounded-xl font-bold text-xs uppercase transition-all tracking-wider ${
                  activeTab === 'new-citizen' 
                    ? 'bg-white text-[#01402E] shadow-sm font-black' 
                    : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                Novo Cadastro
              </button>
              <button
                type="button"
                onClick={() => handleSelectTab('anonymous')}
                className={`py-3 rounded-xl font-bold text-xs uppercase transition-all tracking-wider ${
                  activeTab === 'anonymous' 
                    ? 'bg-white text-[#01402E] shadow-sm font-black' 
                    : 'text-gray-400 hover:text-gray-900'
                }`}
              >
                Anônimo / Geral
              </button>
            </div>

            {/* Tab Render: Search Existing */}
            {activeTab === 'existing' && (
              <div className="relative space-y-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Buscar Cidadão no Banco de Dados</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      setShowPatientList(true);
                      if (!e.target.value) setSelectedCitizen(null);
                    }}
                    onFocus={() => setShowPatientList(true)}
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-bold text-[#01402E] text-sm"
                    placeholder="Digite nome completo, CPF ou Cartão SUS..."
                  />
                </div>

                {/* Patient Suggestion dropdown */}
                {showPatientList && filteredPatients.length > 0 && (
                  <div className="absolute z-20 w-full mt-1 bg-white border border-gray-100 rounded-2xl shadow-xl overflow-hidden max-h-[250px] overflow-y-auto">
                    {filteredPatients.map(p => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => selectExistingPatient(p)}
                        className="w-full text-left px-5 py-4 hover:bg-emerald-50/50 border-b border-gray-50 last:border-none flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-extrabold text-[#01402E] text-sm">{p.name}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">#{p.medicalRecordNumber} • {p.city}</p>
                        </div>
                        <span className="text-[10px] bg-emerald-50 text-emerald-800 font-black uppercase px-2.5 py-1 rounded-md border border-emerald-100 opacity-0 group-hover:opacity-100 transition-opacity">
                          Selecionar
                        </span>
                      </button>
                    ))}
                  </div>
                )}

                {selectedCitizen ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-5 bg-emerald-50/30 rounded-2xl border border-emerald-100/50 grid grid-cols-2 gap-4"
                  >
                    <div>
                      <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">Cidadão Selecionado</p>
                      <p className="text-sm font-extrabold text-emerald-950 mt-1">{selectedCitizen.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest">Município / CPF</p>
                      <p className="text-xs font-bold text-gray-600 mt-1">{selectedCitizen.city} • {selectedCitizen.medicalRecordNumber}</p>
                    </div>
                  </motion.div>
                ) : (
                  <div className="p-5 text-center text-gray-400 italic text-xs bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    Nenhum cidadão selecionado. Por favor, faça uma busca pelo campo acima.
                  </div>
                )}
              </div>
            )}

            {/* Tab Render: New Citizen Form */}
            {activeTab === 'new-citizen' && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-6 p-1 bg-white"
              >
                <div className="space-y-2 md:col-span-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Nome Completo do Cidadão</label>
                  <input
                    type="text"
                    required
                    value={newCitizen.name}
                    onChange={e => setNewCitizen({...newCitizen, name: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-bold text-[#01402E] text-sm"
                    placeholder="Ex: Clara Ribeiro de Souza"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Identificação Principal (CPF/CNS)</label>
                  <input
                    type="text"
                    required
                    value={newCitizen.medicalRecordNumber}
                    onChange={e => setNewCitizen({...newCitizen, medicalRecordNumber: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-bold text-[#01402E] text-sm"
                    placeholder="Ex: 000.000.000-00"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Data de Nascimento</label>
                  <input
                    type="date"
                    value={newCitizen.birthDate}
                    onChange={e => setNewCitizen({...newCitizen, birthDate: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-bold text-[#01402E] text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Município de Origem</label>
                  <select
                    value={newCitizen.city}
                    onChange={e => setNewCitizen({...newCitizen, city: e.target.value})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-bold text-[#01402E] text-sm appearance-none"
                  >
                    {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Gênero</label>
                  <select
                    value={newCitizen.gender}
                    onChange={e => setNewCitizen({...newCitizen, gender: e.target.value as any})}
                    className="w-full px-4 py-3 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-bold text-[#01402E] text-sm appearance-none"
                  >
                    <option value="M">Masculino</option>
                    <option value="F">Feminino</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </motion.div>
            )}

            {/* Tab Render: Anonymous */}
            {activeTab === 'anonymous' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-5 bg-amber-50/50 rounded-2xl border border-amber-100 text-amber-900 text-xs font-bold leading-relaxed flex gap-3"
              >
                <ShieldAlert size={18} className="shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-extrabold uppercase mb-1">Atenção ao Registro Anônimo / Coletivo</p>
                  <p className="font-medium">O protocolo será associado a um manifestante genérico e anônimo. Utilize essa categoria para manifestações físicas registradas em urnas, correspondências coletivas, reclamações sigilosas encaminhadas ou canais semelhantes que necessitem de preservação de sigilo total.</p>
                </div>
              </motion.div>
            )}
          </div>

          {/* Section 2: Manifestation Content and Relato */}
          <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-lg font-black text-[#01402E] tracking-tight flex items-center gap-2 border-b border-gray-50 pb-4">
              <ClipboardList size={18} /> 2. Teor da Manifestação & Relato Ouvidor
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Tipo de Manifestação</label>
                <select
                  value={ticketData.type}
                  onChange={e => setTicketData({...ticketData, type: e.target.value as ManifestationType})}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-extrabold text-[#01402E] text-sm appearance-none"
                >
                  <option value="Reclamação">Reclamação</option>
                  <option value="Denúncia">Denúncia</option>
                  <option value="Sugestão">Sugestão</option>
                  <option value="Elogio">Elogio</option>
                  <option value="Solicitação">Solicitação</option>
                  <option value="Absenteísmo">Absenteísmo</option>
                  <option value="Atendimento">Atendimento / Ocorrência Geral</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Setor Destinatário / Demandado</label>
                <select
                  value={ticketData.responsibleProfessional}
                  onChange={e => setTicketData({...ticketData, responsibleProfessional: e.target.value})}
                  required
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-extrabold text-[#01402E] text-sm appearance-none"
                >
                  <option value="">Selecione o setor encarregado...</option>
                  {availableSectors.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Data da Ocorrência/Fato</label>
                <div className="relative">
                  <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-[#01402E]" size={16} />
                  <input
                    type="date"
                    required
                    value={ticketData.date}
                    onChange={e => setTicketData({...ticketData, date: e.target.value})}
                    className="w-full pl-12 pr-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-extrabold text-[#01402E] text-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Satisfação Prévia (se manifestado)</label>
                <select
                  value={ticketData.satisfaction}
                  onChange={e => setTicketData({...ticketData, satisfaction: e.target.value as any})}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-extrabold text-[#01402E] text-sm appearance-none"
                >
                  <option value="Satisfeito">Satisfeito</option>
                  <option value="Muito Satisfeito">Muito Satisfeito</option>
                  <option value="Regular">Regular</option>
                  <option value="Insatisfeito">Insatisfeito</option>
                </select>
              </div>

            </div>

            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Relato Detalhado & Descrição das Ocorrências</label>
              <textarea
                value={ticketData.observations}
                onChange={e => setTicketData({...ticketData, observations: e.target.value})}
                required
                className="w-full p-5 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-bold text-gray-700 text-sm min-h-[160px] leading-relaxed"
                placeholder="Descreva detalhadamente o relato completo, trâmites adotados, testemunhas ou qualquer manifestação relatada fisicamente pelo cidadão..."
              />
            </div>

          </div>

        </div>

        {/* RIGHT BAR CONTAINER (Quick-select Subjects/Sectors and Submission Action) */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* Box 1: Core Theme & Subject Tag Selection */}
          <div className="bg-white p-7 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-3">
              <HelpCircle size={16} className="text-[#01402E]" /> Assuntos e Temas
            </h4>
            <p className="text-[10px] text-gray-400 font-bold leading-relaxed">Assinale os temas abordados nesta manifestação para indexação de relatórios estatísticos:</p>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
              {availableDiagnoses.map((diag) => {
                const isSelected = ticketData.diagnoses.includes(diag);
                return (
                  <button
                    key={diag}
                    type="button"
                    onClick={() => toggleDiagnosisSelection(diag)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between group ${
                      isSelected 
                        ? 'bg-[#01402E]/5 border-[#01402E] text-[#01402E]'
                        : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-500'
                    }`}
                  >
                    <span className="truncate max-w-[85%]">{diag}</span>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-[#01402E]' : 'bg-transparent border border-gray-300'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Box 2: Involved Sectors (Co-responsibility) */}
          <div className="bg-white p-7 rounded-[2rem] border border-gray-100 shadow-sm space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 border-b border-gray-50 pb-3">
              <Building2 size={16} className="text-[#01402E]" /> Setores Vinculados
            </h4>
            <p className="text-[10px] text-gray-400 font-bold leading-relaxed">Selecione outras áreas correlacionadas para co-responsabilização técnica:</p>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
              {availableSectors.map((sector) => {
                const isSelected = ticketData.professionals.includes(sector);
                return (
                  <button
                    key={sector}
                    type="button"
                    onClick={() => toggleSectorSelection(sector)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'bg-[#01402E]/5 border-[#01402E] text-[#01402E]'
                        : 'bg-white border-gray-100 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <span className="truncate max-w-[85%]">{sector}</span>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      isSelected ? 'bg-[#01402E]' : 'bg-transparent border border-gray-300'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action Card: Save Trigger */}
          <div className="bg-[#01402E] p-8 rounded-[2rem] text-white space-y-6 shadow-xl shadow-emerald-950/20">
            <div>
              <p className="text-[10px] font-black text-emerald-300/60 uppercase tracking-widest">Protocolar Registro</p>
              <h4 className="text-xl font-black mt-1 leading-tight text-white">Pronto para envio?</h4>
              <p className="text-xs text-emerald-100 mt-2 leading-relaxed">Este registro será instantaneamente auditado pela Coordenação e disponibilizado no Histórico Geral da Ouvidoria.</p>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-4 bg-white text-[#01402E] rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-emerald-50 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-[#01402E]/20 border-t-[#01402E] rounded-full animate-spin"></div>
              ) : (
                <>
                  <CheckCircle2 size={16} /> Enviar Protocolo
                </>
              )}
            </button>
          </div>

        </div>

      </form>
    </motion.div>
  );
};
