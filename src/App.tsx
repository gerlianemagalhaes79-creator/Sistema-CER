import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  ClipboardList, 
  BarChart3, 
  UserSquare2, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Menu,
  Plus,
  Search,
  Filter,
  Edit,
  Eye,
  Trash2,
  X,
  Calendar,
  Stethoscope,
  MapPin,
  Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient, PatientStatus, Movement, MovementType, CITIES, PROFESSIONALS, DIAGNOSES } from './types';
import { PatientService } from './services/PatientService';
import { MovementService } from './services/MovementService';

// --- Types ---
type Page = 'dashboard' | 'patients' | 'movements' | 'reports' | 'users';

// --- UI Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  collapsed 
}: { 
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void, 
  collapsed: boolean 
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-[#064e3b] text-white shadow-md' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-[#064e3b]'
    }`}
    title={collapsed ? label : ''}
  >
    <Icon size={20} className="shrink-0" />
    {!collapsed && <span className="font-medium whitespace-nowrap">{label}</span>}
  </button>
);

const Card = ({ title, value, subtitle, icon: Icon }: { title: string, value: string, subtitle?: string, icon?: any }) => (
  <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
    <div className="relative z-10">
      <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</h3>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-1">{subtitle}</p>}
    </div>
    {Icon && (
      <Icon className="absolute right-[-10px] bottom-[-10px] w-24 h-24 text-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
    )}
  </div>
);

const Header = ({ 
  user, 
  onLogout, 
  sidebarCollapsed, 
  setSidebarCollapsed 
}: { 
  user: string, 
  onLogout: () => void,
  sidebarCollapsed: boolean,
  setSidebarCollapsed: (v: boolean) => void
}) => (
  <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 sticky top-0 z-30">
    <div className="flex items-center gap-4">
      <button 
        onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
        className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 lg:hidden"
      >
        <Menu size={20} />
      </button>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 bg-[#064e3b] rounded-lg flex items-center justify-center lg:hidden">
          <UserSquare2 size={18} className="text-white" />
        </div>
        <h1 className="text-lg font-bold text-[#064e3b] hidden sm:block">CER Controle de Pacientes</h1>
        <h1 className="text-lg font-bold text-[#064e3b] sm:hidden">CER</h1>
      </div>
    </div>
    
    <div className="flex items-center gap-6">
      <div className="flex items-center gap-3">
        <div className="text-right hidden md:block">
          <p className="text-sm font-bold text-gray-800 leading-tight">{user}</p>
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Administrador</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#064e3b] font-bold shadow-sm">
          {user.charAt(0).toUpperCase()}
        </div>
      </div>
      <div className="h-8 w-px bg-gray-100"></div>
      <button 
        onClick={onLogout}
        className="flex items-center gap-2 p-2 px-3 rounded-lg text-red-600 hover:bg-red-50 transition-colors font-semibold text-sm"
      >
        <LogOut size={18} />
        <span className="hidden sm:inline">Sair</span>
      </button>
    </div>
  </header>
);

// --- Patient Modals & Components ---

const MultiSelect = ({ 
  label, 
  options, 
  selected, 
  onChange 
}: { 
  label: string, 
  options: string[], 
  selected: string[], 
  onChange: (val: string[]) => void 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(o => o !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <div className="relative">
      <label className="block text-sm font-semibold text-gray-700 mb-1.5">{label}</label>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[44px] p-2 rounded-lg border border-gray-200 bg-white cursor-pointer flex flex-wrap gap-1 items-center"
      >
        {selected.length === 0 && <span className="text-gray-400 text-sm px-1">Selecione opções...</span>}
        {selected.map(item => (
          <span key={item} className="bg-emerald-50 text-[#064e3b] text-xs font-bold px-2 py-1 rounded flex items-center gap-1 border border-emerald-100">
            {item}
            <X size={12} onClick={(e) => { e.stopPropagation(); toggleOption(item); }} className="hover:text-red-500" />
          </span>
        ))}
      </div>
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute z-50 mt-1 w-full max-h-60 overflow-auto bg-white border border-gray-200 rounded-xl shadow-xl p-2 grid grid-cols-1 gap-1">
            {options.map(option => (
              <button
                key={option}
                onClick={() => toggleOption(option)}
                className={`text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                  selected.includes(option) 
                    ? 'bg-[#064e3b] text-white font-semibold' 
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const PatientFormModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  editingPatient 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => void,
  editingPatient: Patient | null 
}) => {
  const [formData, setFormData] = useState<Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>>({
    name: '',
    medicalRecordNumber: '',
    birthDate: '',
    gender: 'M',
    city: CITIES[0],
    diagnoses: [],
    professionals: [],
    status: 'Ativo',
    entryDate: new Date().toISOString().split('T')[0],
    dischargeDate: '',
    observations: ''
  });

  useEffect(() => {
    if (editingPatient) {
      setFormData({
        name: editingPatient.name,
        medicalRecordNumber: editingPatient.medicalRecordNumber,
        birthDate: editingPatient.birthDate,
        gender: editingPatient.gender,
        city: editingPatient.city,
        diagnoses: editingPatient.diagnoses,
        professionals: editingPatient.professionals,
        status: editingPatient.status,
        entryDate: editingPatient.entryDate,
        dischargeDate: editingPatient.dischargeDate || '',
        observations: editingPatient.observations || ''
      });
    } else {
      setFormData({
        name: '',
        medicalRecordNumber: '',
        birthDate: '',
        gender: 'M',
        city: CITIES[0],
        diagnoses: [],
        professionals: [],
        status: 'Ativo',
        entryDate: new Date().toISOString().split('T')[0],
        dischargeDate: '',
        observations: ''
      });
    }
  }, [editingPatient, isOpen]);

  const age = useMemo(() => {
    if (!formData.birthDate) return '...';
    return PatientService.calculateAge(formData.birthDate);
  }, [formData.birthDate]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">{editingPatient ? 'Editar Paciente' : 'Novo Paciente'}</h3>
            <p className="text-sm text-gray-500">Preencha as informações clínicas básicas</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Informações Básicas */}
            <div className="col-span-full border-b border-gray-100 pb-2 mb-2">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                <UserSquare2 size={14} /> Dados Pessoais
              </h4>
            </div>
            
            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo</label>
              <input 
                type="text" 
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                placeholder="Ex: João da Silva Santos"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nº Prontuário</label>
              <input 
                type="text" 
                value={formData.medicalRecordNumber}
                onChange={e => setFormData({...formData, medicalRecordNumber: e.target.value})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                placeholder="Ex: 2024.001"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data Nasc.</label>
                <input 
                  type="date" 
                  value={formData.birthDate}
                  onChange={e => setFormData({...formData, birthDate: e.target.value})}
                  className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Idade</label>
                <div className="w-full p-3 rounded-lg border border-gray-100 bg-gray-50 text-gray-600 font-bold">
                  {age} anos
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Sexo</label>
              <select 
                value={formData.gender}
                onChange={e => setFormData({...formData, gender: e.target.value as any})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              >
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Município</label>
              <select 
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              >
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Dados Clínicos */}
            <div className="col-span-full border-b border-gray-100 pb-2 mt-4 mb-2">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                <Stethoscope size={14} /> Informações Clínicas
              </h4>
            </div>

            <div className="lg:col-span-2">
              <MultiSelect 
                label="Diagnósticos" 
                options={DIAGNOSES} 
                selected={formData.diagnoses} 
                onChange={val => setFormData({...formData, diagnoses: val})} 
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Situação</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as PatientStatus})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              >
                <option value="Ativo">Ativo</option>
                <option value="Alta">Alta</option>
                <option value="Investigação">Investigação</option>
                <option value="Espera">Espera</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <MultiSelect 
                label="Profissionais Responsáveis" 
                options={PROFESSIONALS} 
                selected={formData.professionals} 
                onChange={val => setFormData({...formData, professionals: val})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4 lg:col-span-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data Entrada</label>
                <input 
                  type="date" 
                  value={formData.entryDate}
                  onChange={e => setFormData({...formData, entryDate: e.target.value})}
                  className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${formData.status !== 'Alta' ? 'opacity-30' : ''}`}>Data Alta</label>
                <input 
                  type="date" 
                  disabled={formData.status !== 'Alta'}
                  value={formData.dischargeDate}
                  onChange={e => setFormData({...formData, dischargeDate: e.target.value})}
                  className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observações Adicionais</label>
              <textarea 
                value={formData.observations}
                onChange={e => setFormData({...formData, observations: e.target.value})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none min-h-[80px]"
                placeholder="Informações relevantes sobre o tratamento, convênios ou restrições..."
              />
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 rounded-lg font-bold text-gray-500 hover:bg-gray-200 transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onSave(formData)}
            className="px-8 py-2.5 rounded-lg font-bold bg-[#064e3b] text-white hover:bg-[#053d2e] shadow-lg shadow-emerald-900/10 transition-all"
          >
            {editingPatient ? 'Salvar Alterações' : 'Cadastrar Paciente'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: PatientStatus }) => {
  const styles = {
    Ativo: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    Alta: 'bg-blue-100 text-blue-800 border-blue-200',
    Investigação: 'bg-amber-100 text-amber-800 border-amber-200',
    Espera: 'bg-gray-100 text-gray-600 border-gray-200'
  };

  return (
    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${styles[status]}`}>
      {status}
    </span>
  );
};

const MovementTypeBadge = ({ type }: { type: MovementType }) => {
  const styles = {
    'Entrada': 'bg-emerald-100 text-emerald-800 border-emerald-200',
    'Alta': 'bg-blue-100 text-blue-800 border-blue-200',
    'Transferência': 'bg-purple-100 text-purple-800 border-purple-200',
    'Mudança de profissional': 'bg-amber-100 text-amber-800 border-amber-200',
    'Atualização cadastral': 'bg-gray-100 text-gray-600 border-gray-200',
  };

  return (
    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-tight border ${styles[type]}`}>
      {type}
    </span>
  );
};

const MovementFormModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  patients 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (movement: Omit<Movement, 'id' | 'createdAt'>) => void,
  patients: Patient[]
}) => {
  const [formData, setFormData] = useState<Omit<Movement, 'id' | 'createdAt'>>({
    patientId: '',
    patientName: '',
    medicalRecordNumber: '',
    diagnoses: [],
    professionals: [],
    type: 'Entrada',
    date: new Date().toISOString().split('T')[0],
    observations: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  const filteredPatients = useMemo(() => {
    if (!searchTerm) return [];
    return patients.filter(p => 
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.medicalRecordNumber.includes(searchTerm)
    ).slice(0, 5);
  }, [patients, searchTerm]);

  const selectPatient = (p: Patient) => {
    setFormData({
      ...formData,
      patientId: p.id,
      patientName: p.name,
      medicalRecordNumber: p.medicalRecordNumber,
      diagnoses: p.diagnoses,
      professionals: p.professionals
    });
    setSearchTerm(p.name);
    setShowPatientList(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-emerald-50/50">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Nova Movimentação</h3>
            <p className="text-sm text-gray-500">Registre entradas, altas ou mudanças clínicas</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Patient Selection */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Buscar Paciente</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setShowPatientList(true);
                  if (!e.target.value) setFormData({...formData, patientId: ''});
                }}
                onFocus={() => setShowPatientList(true)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                placeholder="Digite o nome ou prontuário..."
              />
            </div>
            
            {showPatientList && filteredPatients.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                {filteredPatients.map(p => (
                  <button
                    key={p.id}
                    onClick={() => selectPatient(p)}
                    className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-gray-50 last:border-none flex items-center justify-between group"
                  >
                    <div>
                      <p className="font-bold text-[#064e3b] text-sm">{p.name}</p>
                      <p className="text-[10px] text-gray-400 uppercase font-black">#{p.medicalRecordNumber} • {p.city}</p>
                    </div>
                    <Plus size={16} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Auto-filled Preview */}
          {formData.patientId && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-emerald-50/30 p-4 rounded-xl border border-emerald-100/50 grid grid-cols-2 gap-4"
            >
              <div>
                <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Diagnóstico(s)</p>
                <div className="flex flex-wrap gap-1">
                   {formData.diagnoses.map(d => (
                     <span key={d} className="bg-white/60 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 border border-emerald-100">{d}</span>
                   ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Equipe</p>
                <p className="text-[10px] font-bold text-gray-600 truncate">{formData.professionals.join(', ') || 'Nenhum'}</p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Movimentação</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as MovementType})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              >
                <option value="Entrada">Entrada</option>
                <option value="Alta">Alta</option>
                <option value="Transferência">Transferência</option>
                <option value="Mudança de profissional">Mudança de profissional</option>
                <option value="Atualização cadastral">Atualização cadastral</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data da Ocorrência</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Observações Detalhadas</label>
            <textarea 
              value={formData.observations}
              onChange={e => setFormData({...formData, observations: e.target.value})}
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none min-h-[100px]"
              placeholder="Descreva o motivo da movimentação ou detalhes importantes..."
            />
          </div>
        </div>

        <div className="p-6 border-t border-gray-100 flex justify-end gap-3 bg-gray-50">
          <button onClick={onClose} className="px-6 py-2.5 rounded-lg font-bold text-gray-500 hover:bg-gray-200 transition-colors">Cancelar</button>
          <button 
            disabled={!formData.patientId}
            onClick={() => onSave(formData)}
            className="px-8 py-2.5 rounded-lg font-bold bg-[#064e3b] text-white hover:bg-[#053d2e] shadow-lg shadow-emerald-900/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Registrar Movimentação
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main Pages ---

const DashboardPage = ({ patients }: { patients: Patient[], key?: string }) => {
  const stats = useMemo(() => {
    const total = patients.length;
    const active = patients.filter(p => p.status === 'Ativo').length;
    const discharge = patients.filter(p => {
      if (p.status !== 'Alta' || !p.dischargeDate) return false;
      const dischargeDate = new Date(p.dischargeDate);
      const now = new Date();
      return dischargeDate.getMonth() === now.getMonth() && dischargeDate.getFullYear() === now.getFullYear();
    }).length;
    
    // Professionals count - simplistic unique names across all lists
    const pros = new Set();
    patients.forEach(p => p.professionals.forEach(pro => pros.add(pro)));
    const professionalCount = pros.size;

    return { total, active, discharge, professionalCount };
  }, [patients]);

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#064e3b] tracking-tight">Dashboard</h2>
          <p className="text-sm font-medium text-gray-500">Indicadores do Centro Especializado em Reabilitação</p>
        </div>
        <div className="bg-white px-5 py-2.5 rounded-2xl border border-emerald-100 text-sm font-bold text-emerald-700 shadow-sm flex items-center gap-2">
          <Calendar size={16} />
          {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Total de Pacientes" value={stats.total.toString()} subtitle="Registros históricos" icon={Users} />
        <Card title="Pacientes Ativos" value={stats.active.toString()} subtitle="Em acompanhamento" icon={Clock} />
        <Card title="Altas no Mês" value={stats.discharge.toString()} subtitle="Ciclos concluídos" icon={ClipboardList} />
        <Card title="Profissionais" value={stats.professionalCount.toString()} subtitle="Equipe multidisciplinar" icon={Stethoscope} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 min-h-[350px] shadow-sm flex flex-col items-center justify-center text-gray-300">
          <BarChart3 size={48} className="mb-4 opacity-20" />
          <p className="font-bold text-gray-400">Evolução Mensal</p>
          <p className="text-sm">Gráficos estarão disponíveis em breve</p>
        </div>
        <div className="bg-[#064e3b] p-8 rounded-2xl shadow-xl shadow-emerald-900/20 text-white flex flex-col justify-between">
          <div>
            <h3 className="text-xl font-bold mb-2">Próximas Metas</h3>
            <p className="text-emerald-100 text-sm leading-relaxed opacity-70">
              O sistema CER está em fase de expansão. Em breve teremos integração com prontuário eletrônico completo e telemedicina.
            </p>
          </div>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl">
              <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
              <span className="text-xs font-semibold">Módulo de Agenda - Março/2024</span>
            </div>
            <div className="flex items-center gap-3 bg-white/10 p-3 rounded-xl opacity-50">
              <div className="w-2 h-2 rounded-full bg-white"></div>
              <span className="text-xs font-semibold">Faturamento TISS - Junho/2024</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const PatientsPage = ({ patients, onReload }: { patients: Patient[], onReload: () => void, key?: string }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterProfessional, setFilterProfessional] = useState('');
  const [filterStatus, setFilterStatus] = useState<PatientStatus | ''>('');

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.medicalRecordNumber.includes(search);
      const matchCity = filterCity ? p.city === filterCity : true;
      const matchPro = filterProfessional ? p.professionals.includes(filterProfessional) : true;
      const matchStatus = filterStatus ? p.status === filterStatus : true;
      return matchSearch && matchCity && matchPro && matchStatus;
    });
  }, [patients, search, filterCity, filterProfessional, filterStatus]);

  const handleSave = (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingPatient) {
      PatientService.updatePatient(editingPatient.id, data);
    } else {
      PatientService.addPatient(data);
    }
    setIsModalOpen(false);
    onReload();
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Deseja realmente excluir este paciente? Esta ação não pode ser desfeita.')) {
      PatientService.deletePatient(id);
      onReload();
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#064e3b] tracking-tight">Pacientes</h2>
          <p className="text-sm font-medium text-gray-500">Gestão centralizada do cadastro de pacientes</p>
        </div>
        <button 
          onClick={() => { setEditingPatient(null); setIsModalOpen(true); }}
          className="bg-[#064e3b] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#053d2e] shadow-lg shadow-emerald-900/10 transition-all active:scale-95"
        >
          <Plus size={20} />
          Novo Paciente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou prontuário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium"
            />
          </div>
          
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium appearance-none"
            >
              <option value="">Todos os Municípios</option>
              {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="relative">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={filterProfessional}
              onChange={e => setFilterProfessional(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium appearance-none"
            >
              <option value="">Equipe Multidisciplinar</option>
              {PROFESSIONALS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium appearance-none"
            >
              <option value="">Todas as Situações</option>
              <option value="Ativo">Ativo</option>
              <option value="Alta">Alta</option>
              <option value="Investigação">Investigação</option>
              <option value="Espera">Espera</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Prontuário</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Paciente</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Idade</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Diagnóstico Principal</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Resp. Técnico</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold">Nenhum paciente encontrado</p>
                    <p className="text-xs">Tente ajustar seus filtros ou cadastrar um novo paciente</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors group">
                    <td className="px-6 py-4 text-sm font-black text-emerald-700 tracking-tighter">#{p.medicalRecordNumber}</td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900 leading-none mb-1">{p.name}</p>
                        <p className="text-[10px] text-gray-400 uppercase font-black">{p.city}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-600">{PatientService.calculateAge(p.birthDate)} anos</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {p.diagnoses.slice(0, 1).map(d => (
                          <span key={d} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            {d}
                          </span>
                        ))}
                        {p.diagnoses.length > 1 && (
                          <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded text-[10px] font-bold">
                            +{p.diagnoses.length - 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-[10px] font-bold text-gray-500">
                        {p.professionals[0]?.split('(')[0] || 'Nenhum'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Visualizar">
                          <Eye size={16} />
                        </button>
                        <button 
                          onClick={() => { setEditingPatient(p); setIsModalOpen(true); }}
                          className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                          title="Editar"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDelete(p.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                          title="Excluir"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Listando {filteredPatients.length} de {patients.length} pacientes</p>
        </div>
      </div>

      <PatientFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        editingPatient={editingPatient}
      />
    </motion.div>
  );
};

const MovementsPage = ({ 
  movements, 
  patients, 
  onReload 
}: { 
  movements: Movement[], 
  patients: Patient[], 
  onReload: () => void, 
  key?: string 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MovementType | ''>('');
  const [filterProfessional, setFilterProfessional] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM

  const filteredMovements = useMemo(() => {
    return movements
      .filter(m => {
        const matchSearch = m.patientName.toLowerCase().includes(search.toLowerCase()) || 
                            m.medicalRecordNumber.includes(search);
        const matchType = filterType ? m.type === filterType : true;
        const matchPro = filterProfessional ? m.professionals.includes(filterProfessional) : true;
        const matchMonth = filterMonth ? m.date.startsWith(filterMonth) : true;
        return matchSearch && matchType && matchPro && matchMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, search, filterType, filterProfessional, filterMonth]);

  const stats = useMemo(() => {
    const currentMonth = filteredMovements;
    const entries = currentMonth.filter(m => m.type === 'Entrada').length;
    const discharges = currentMonth.filter(m => m.type === 'Alta').length;
    const activePatients = patients.filter(p => p.status === 'Ativo').length;
    return { entries, discharges, activePatients, total: currentMonth.length };
  }, [filteredMovements, patients]);

  const handleSave = (data: Omit<Movement, 'id' | 'createdAt'>) => {
    MovementService.addMovement(data);
    setIsModalOpen(false);
    onReload();
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#064e3b] tracking-tight">Movimentações</h2>
          <p className="text-sm font-medium text-gray-500">Controle mensal de entradas, altas e fluxos</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#064e3b] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#053d2e] shadow-lg shadow-emerald-900/10 transition-all active:scale-95"
        >
          <Plus size={20} />
          Nova Movimentação
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card title="Entradas no Mês" value={stats.entries.toString()} subtitle="Novos pacientes" icon={Plus} />
        <Card title="Altas no Mês" value={stats.discharges.toString()} subtitle="Ciclos finalizados" icon={ClipboardList} />
        <Card title="Pacientes Ativos" value={stats.activePatients.toString()} subtitle="Base atual" icon={Users} />
        <Card title="Total Movimentações" value={stats.total.toString()} subtitle="No período selecionado" icon={Clock} />
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Nome ou prontuário..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium"
            />
          </div>
          
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input 
              type="month" 
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium"
            />
          </div>

          <div className="relative">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={filterProfessional}
              onChange={e => setFilterProfessional(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium appearance-none"
            >
              <option value="">Todos Profissionais</option>
              {PROFESSIONALS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium appearance-none"
            >
              <option value="">Todos os Tipos</option>
              <option value="Entrada">Entrada</option>
              <option value="Alta">Alta</option>
              <option value="Transferência">Transferência</option>
              <option value="Mudança de profissional">Mudança de profissional</option>
              <option value="Atualização cadastral">Atualização cadastral</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Data</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Tipo</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Paciente</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Diagnóstico</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Resp. Técnico</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Observação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-gray-400">
                    <ClipboardList size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold">Nenhuma movimentação no período</p>
                    <p className="text-xs">Registre uma nova ocorrência clicando no botão acima</p>
                  </td>
                </tr>
              ) : (
                filteredMovements.map(m => (
                  <tr key={m.id} className="hover:bg-emerald-50/20 transition-colors group">
                    <td className="px-6 py-4">
                       <p className="text-xs font-bold text-gray-500">{new Date(m.date).toLocaleDateString('pt-BR')}</p>
                       <p className="text-[9px] font-medium text-gray-400">{new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                    </td>
                    <td className="px-6 py-4 text-center">
                       <MovementTypeBadge type={m.type} />
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm font-bold text-gray-900 leading-none mb-1">{m.patientName}</p>
                        <p className="text-[10px] text-emerald-700 font-black">#{m.medicalRecordNumber}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {m.diagnoses.map(d => (
                          <span key={d} className="bg-gray-50 text-gray-500 px-2 py-0.5 rounded text-[9px] font-bold border border-gray-100">
                             {d}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-[10px] font-bold text-gray-500">{m.professionals[0]?.split('(')[0] || '-'}</p>
                       {m.professionals.length > 1 && <p className="text-[9px] text-gray-400">+{m.professionals.length - 1} outros</p>}
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-xs text-gray-500 max-w-[200px] truncate" title={m.observations}>{m.observations || '-'}</p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <MovementFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        patients={patients}
      />
    </motion.div>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    setPatients(PatientService.getPatients());
    setMovements(MovementService.getMovements());
  }, []);

  const handleLogin = (name: string) => {
    setUserName(name);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPage('dashboard');
  };

  const reloadData = () => {
    setPatients(PatientService.getPatients());
    setMovements(MovementService.getMovements());
  };

  if (!isLoggedIn) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Desktop */}
      <motion.aside 
        animate={{ width: sidebarCollapsed ? 80 : 260 }}
        className={`bg-white border-r border-[#064e3b]/5 hidden lg:flex flex-col fixed h-full z-40 transition-all ${sidebarCollapsed ? 'items-center' : 'p-5'}`}
      >
        <div className={`flex items-center mb-10 h-10 ${sidebarCollapsed ? 'justify-center' : 'justify-between px-2'}`}>
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#064e3b] rounded-xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <UserSquare2 size={18} className="text-white" />
              </div>
              <span className="font-extrabold text-[#064e3b] tracking-tighter text-xl">CER</span>
            </div>
          )}
          {sidebarCollapsed && (
             <div className="w-12 h-12 bg-[#064e3b] rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-900/20">
                <UserSquare2 size={24} className="text-white" />
             </div>
          )}
        </div>

        <nav className="space-y-2 flex-1">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={currentPage === 'dashboard'} 
            onClick={() => setCurrentPage('dashboard')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem 
            icon={Users} 
            label="Pacientes" 
            active={currentPage === 'patients'} 
            onClick={() => setCurrentPage('patients')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem 
            icon={ClipboardList} 
            label="Movimentações" 
            active={currentPage === 'movements'} 
            onClick={() => setCurrentPage('movements')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Relatórios" 
            active={currentPage === 'reports'} 
            onClick={() => setCurrentPage('reports')}
            collapsed={sidebarCollapsed}
          />
          <SidebarItem 
            icon={UserSquare2} 
            label="Usuários" 
            active={currentPage === 'users'} 
            onClick={() => setCurrentPage('users')}
            collapsed={sidebarCollapsed}
          />
        </nav>

        {!sidebarCollapsed && (
          <div className="mt-auto p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
            <p className="text-[9px] font-black text-emerald-800/40 uppercase tracking-[0.2em] mb-2">Sistema Operativo</p>
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)] animate-pulse"></div>
              <span className="text-xs text-[#064e3b] font-extrabold uppercase tracking-tight">Estável</span>
            </div>
          </div>
        )}
      </motion.aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all lg:ml-[260px] ${sidebarCollapsed ? 'lg:!ml-20' : ''}`}>
        <Header 
          user={userName} 
          onLogout={handleLogout} 
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
        
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            {currentPage === 'dashboard' && <DashboardPage key="dashboard" patients={patients} />}
            {currentPage === 'patients' && <PatientsPage key="patients" patients={patients} onReload={reloadData} />}
            {currentPage === 'movements' && <MovementsPage key="movements" movements={movements} patients={patients} onReload={reloadData} />}
            
            {/* Template placeholders for other pages */}
            {currentPage === 'reports' && (
              <motion.div key="reports" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <BarChart3 size={64} className="mx-auto mb-4 opacity-10" />
                <h3 className="text-xl font-bold">Módulo de Relatórios</h3>
                <p className="text-gray-500">Desenvolvimento em progresso</p>
              </motion.div>
            )}
            {currentPage === 'users' && (
              <motion.div key="users" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
                <UserSquare2 size={64} className="mx-auto mb-4 opacity-10" />
                <h3 className="text-xl font-bold">Gestão de Usuários</h3>
                <p className="text-gray-500">Desenvolvimento em progresso</p>
              </motion.div>
            )}
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
};

const LoginPage = ({ onLogin }: { onLogin: (name: string) => void }) => {
  const [name, setName] = useState('');
  
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-900/5 w-full max-w-md border border-emerald-50"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-[#064e3b] rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/40 transform -rotate-3 hover:rotate-0 transition-transform">
            <UserSquare2 className="text-white" size={40} />
          </div>
          <h2 className="text-3xl font-black text-[#064e3b] tracking-tight">CER Policlínica</h2>
          <p className="text-gray-400 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Acesso Restrito</p>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Identificação do Profissional</label>
            <div className="relative">
              <UserSquare2 className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={18} />
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-bold text-[#064e3b]"
                placeholder="Ex: Dr. Fernando Lima"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Senha de Acesso</label>
            <div className="relative">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-600" size={18} />
              <input 
                type="password" 
                className="w-full pl-12 pr-4 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:ring-4 focus:ring-emerald-500/10 focus:bg-white outline-none transition-all font-bold text-[#064e3b]"
                placeholder="••••••••"
              />
            </div>
          </div>
          <button 
            onClick={() => name && onLogin(name)}
            className="w-full bg-[#064e3b] text-white py-4 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-[#053d2e] shadow-xl shadow-emerald-900/20 transition-all active:scale-95 flex items-center justify-center gap-3"
          >
            Entrar no Sistema
          </button>
        </div>
        
        <div className="mt-12 flex items-center justify-center gap-4">
          <div className="h-px bg-gray-100 flex-1"></div>
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Protocolo Seguro</p>
          <div className="h-px bg-gray-100 flex-1"></div>
        </div>
      </motion.div>
    </div>
  );
};
