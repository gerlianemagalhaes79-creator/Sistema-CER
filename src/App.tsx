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
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Shield,
  Mail,
  Key,
  CheckCircle2,
  AlertCircle,
  Building2,
  QrCode,
  Share2,
  TrendingUp,
  FileText,
  PlusCircle,
  ListOrdered,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import { Patient, PatientStatus, Movement, MovementType, CITIES, User, AccessType, Professional, Municipality, Diagnosis, EvaluationForm, SectorEvaluation } from './types';
import { PatientService } from './services/PatientService';
import { MovementService } from './services/MovementService';
import { UserService } from './services/UserService';
import { ProfessionalService } from './services/ProfessionalService';
import { SectorService } from './services/SectorService';
import { MunicipalityService } from './services/MunicipalityService';
import { DiagnosisService } from './services/DiagnosisService';
import { SurveyService } from './services/SurveyService';
import { UsersPage } from './components/UsersPage';
import { ProfilePage } from './components/ProfilePage';
import { ReportsPage } from './components/ReportsPage';
import { SectorsPage } from './components/SectorsPage';
import { MunicipalitiesPage } from './components/MunicipalitiesPage';
import { DiagnosesPage } from './components/DiagnosesPage';
import { TrashPage } from './components/TrashPage';
import { NewFormPage } from './components/NewFormPage';
import { ShareSurveyModal } from './components/ShareSurveyModal';
import { PatientSurveyPage } from './components/PatientSurveyPage';
import { EvaluationList } from './components/EvaluationList';
import { Dashboard } from './components/Dashboard';
import { LogoService, ClinicLogos } from './services/LogoService';
import { LogoManagerModal } from './components/LogoManagerModal';
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
  AreaChart, 
  Area,
  Legend,
  LineChart,
  Line
} from 'recharts';

// --- Types ---
type Page = 'dashboard' | 'patients' | 'movements' | 'reports' | 'users' | 'profile' | 'professionals' | 'municipalities' | 'diagnoses' | 'trash' | 'new-form';

// --- UI Components ---

const SidebarItem = ({ 
  icon: Icon, 
  label, 
  active, 
  onClick, 
  collapsed
}: { 
  key?: any,
  icon: any, 
  label: string, 
  active: boolean, 
  onClick: () => void, 
  collapsed: boolean,
  isNewForm?: boolean,
  isHistory?: boolean
}) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all duration-200 text-xs font-bold leading-tight ${
      active 
        ? 'bg-emerald-50 text-[#01402E] shadow-sm font-black border border-emerald-100/50' 
        : 'text-slate-600 hover:bg-slate-50'
    }`}
    title={collapsed ? label : ''}
  >
    <div className="flex items-center gap-2.5">
      <Icon size={16} className={`shrink-0 ${active ? 'text-emerald-600' : 'text-slate-500'}`} />
      {!collapsed && <span className="whitespace-nowrap font-sans">{label}</span>}
    </div>
    {active && !collapsed && (
      <ChevronRight size={14} className="text-emerald-500 shrink-0 ml-1 font-black" />
    )}
  </button>
);

const Card = ({ title, value, subtitle, icon: Icon, colorClass }: { title: string, value: string, subtitle?: string, icon?: any, colorClass?: string }) => (
  <motion.div 
    whileHover={{ y: -4 }}
    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
  >
    <div className="relative z-10">
      <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.15em] mb-1">{title}</h3>
      <p className={`text-3xl font-black ${colorClass || 'text-gray-900'} tracking-tighter`}>{value}</p>
      {subtitle && <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tight">{subtitle}</p>}
    </div>
    {Icon && (
      <Icon className={`absolute right-[-10px] bottom-[-10px] w-20 h-20 opacity-5 group-hover:opacity-10 transition-opacity duration-500 pointer-events-none ${colorClass || 'text-gray-900'}`} />
    )}
  </motion.div>
);

const Header = ({ 
  user, 
  onLogout, 
  onProfile,
  sidebarCollapsed, 
  setSidebarCollapsed 
}: { 
  user: User, 
  onLogout: () => void,
  onProfile: () => void,
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
        <h1 className="text-lg font-bold text-[#064e3b] hidden sm:block">Ouvidoria Policlínica</h1>
        <h1 className="text-lg font-bold text-[#064e3b] sm:hidden">Ouvidoria</h1>
      </div>
    </div>
    
    <div className="flex items-center gap-6">
      <button 
        onClick={onProfile}
        className="flex items-center gap-3 group transition-all"
      >
        <div className="text-right hidden md:block group-hover:opacity-80">
          <p className="text-sm font-bold text-gray-800 leading-tight">{user.name}</p>
          <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">{user.accessType}</p>
        </div>
        <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-[#064e3b] font-bold shadow-sm group-hover:shadow-md transition-shadow overflow-hidden">
          {user.photoUrl ? (
            <img 
              src={user.photoUrl} 
              alt={user.name} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
            />
          ) : (
            user.name.charAt(0).toUpperCase()
          )}
        </div>
      </button>
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
  editingPatient,
  availableCities,
  availableProfessionals,
  availableDiagnoses
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>) => void,
  editingPatient: Patient | null,
  availableCities: string[],
  availableProfessionals: string[],
  availableDiagnoses: string[]
}) => {
  const [formData, setFormData] = useState<Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>>({
    name: '',
    medicalRecordNumber: '',
    birthDate: '',
    gender: 'M',
    city: availableCities[0] || '',
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
        city: availableCities[0] || '',
        diagnoses: [],
        professionals: [],
        status: 'Ativo',
        entryDate: new Date().toISOString().split('T')[0],
        dischargeDate: '',
        observations: ''
      });
    }
  }, [editingPatient, isOpen, availableCities]);

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
            <h3 className="text-xl font-bold text-gray-900">{editingPatient ? 'Editar Cadastro de Cidadão' : 'Novo Cadastro de Cidadão'}</h3>
            <p className="text-sm text-gray-500">Preencha os dados de contato do manifestante e de identificação</p>
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
                <UserSquare2 size={14} /> Dados do Cidadão / Manifestante
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">CNS ou CPF (Identificação)</label>
              <input 
                type="text" 
                value={formData.medicalRecordNumber}
                onChange={e => setFormData({...formData, medicalRecordNumber: e.target.value})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                placeholder="Ex: CPF ou Cartão SUS"
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
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Município de Residência</label>
              <select 
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              >
                {!availableCities.length && <option value="">Nenhum município cadastrado</option>}
                {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Dados Clínicos */}
            <div className="col-span-full border-b border-gray-100 pb-2 mt-4 mb-2">
              <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-2">
                <Stethoscope size={14} /> Temas, Assuntos e Setores de Interesse
              </h4>
            </div>

            <div className="lg:col-span-2">
              <MultiSelect 
                label="Assuntos e Temas Recorrentes" 
                options={availableDiagnoses} 
                selected={formData.diagnoses} 
                onChange={val => setFormData({...formData, diagnoses: val})} 
              />
            </div>

            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Situação Cadastral</label>
              <select 
                value={formData.status}
                onChange={e => setFormData({...formData, status: e.target.value as PatientStatus})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              >
                <option value="Ativo">Ativo</option>
                <option value="Alta">Alta / Resposta Final</option>
                <option value="Investigação">Em Análise / Investigação</option>
                <option value="Espera">Espera / Pendência</option>
              </select>
            </div>

            <div className="lg:col-span-3">
              <MultiSelect 
                label="Setores Policlínica (Envolvidos)" 
                options={availableProfessionals} 
                selected={formData.professionals} 
                onChange={val => setFormData({...formData, professionals: val})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4 lg:col-span-1">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data Cadastro</label>
                <input 
                  type="date" 
                  value={formData.entryDate}
                  onChange={e => setFormData({...formData, entryDate: e.target.value})}
                  className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
                />
              </div>
              <div>
                <label className={`block text-sm font-semibold text-gray-700 mb-1.5 ${formData.status !== 'Alta' ? 'opacity-30' : ''}`}>Data Resolução</label>
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
                placeholder="Insira observações relevantes sobre o histórico do cidadão ou trâmites de contato..."
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
            {editingPatient ? 'Salvar Alterações' : 'Cadastrar Cidadão'}
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
    'Atendimento': 'bg-indigo-100 text-indigo-800 border-indigo-200',
    'Absenteísmo': 'bg-red-100 text-red-800 border-red-200',
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
  patients,
  availableProfessionals,
  editingMovement
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onSave: (movement: Omit<Movement, 'id' | 'createdAt' | 'deletedAt'>) => void,
  patients: Patient[],
  availableProfessionals: string[],
  editingMovement: Movement | null
}) => {
  const [formData, setFormData] = useState<Omit<Movement, 'id' | 'createdAt' | 'deletedAt'>>({
    patientId: '',
    patientName: '',
    medicalRecordNumber: '',
    diagnoses: [],
    professionals: [],
    responsibleProfessional: '',
    type: 'Atendimento',
    date: new Date().toISOString().split('T')[0],
    observations: ''
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [showPatientList, setShowPatientList] = useState(false);

  useEffect(() => {
    if (editingMovement) {
      setFormData({
        patientId: editingMovement.patientId,
        patientName: editingMovement.patientName,
        medicalRecordNumber: editingMovement.medicalRecordNumber,
        diagnoses: editingMovement.diagnoses,
        professionals: editingMovement.professionals,
        responsibleProfessional: editingMovement.responsibleProfessional || '',
        type: editingMovement.type,
        date: editingMovement.date,
        observations: editingMovement.observations || ''
      });
      setSearchTerm(editingMovement.patientName);
    } else {
      setFormData({
        patientId: '',
        patientName: '',
        medicalRecordNumber: '',
        diagnoses: [],
        professionals: [],
        responsibleProfessional: '',
        type: 'Atendimento',
        date: new Date().toISOString().split('T')[0],
        observations: ''
      });
      setSearchTerm('');
    }
  }, [editingMovement, isOpen]);

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
      professionals: p.professionals,
      responsibleProfessional: p.professionals[0] || ''
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
            <h3 className="text-xl font-bold text-gray-900">{editingMovement ? 'Editar Manifestação / Protocolo' : 'Nova Manifestação / Protocolo'}</h3>
            <p className="text-sm text-gray-500">Registre reclamações, denúncias, elogios, sugestões ou ocorrências</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Patient Selection */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Buscar Cidadão / Manifestante</label>
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
                placeholder="Digite o nome ou identificação (CPF)..."
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
                <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Assunto(s) do Cidadão</p>
                <div className="flex flex-wrap gap-1">
                   {formData.diagnoses.map(d => (
                     <span key={d} className="bg-white/60 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600 border border-emerald-100">{d}</span>
                   ))}
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black text-emerald-800/40 uppercase tracking-widest mb-1">Setor(es) Relacionado(s)</p>
                <p className="text-[10px] font-bold text-gray-600 truncate">{formData.professionals.join(', ') || 'Nenhum'}</p>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Tipo de Manifestação</label>
              <select 
                value={formData.type}
                onChange={e => setFormData({...formData, type: e.target.value as MovementType})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              >
                <option value="Reclamação">Reclamação</option>
                <option value="Denúncia">Denúncia</option>
                <option value="Sugestão">Sugestão</option>
                <option value="Elogio">Elogio</option>
                <option value="Solicitação">Solicitação</option>
                <option value="Absenteísmo">Absenteísmo</option>
                <option value="Atendimento">Atendimento / Ocorrência Geral</option>
                <option value="Entrada">Entrada</option>
                <option value="Alta">Alta / Resolução</option>
                <option value="Transferência">Transferência de Setor</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Setor Encarregado</label>
              <select 
                value={formData.responsibleProfessional}
                onChange={e => setFormData({...formData, responsibleProfessional: e.target.value})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              >
                <option value="">Selecione o setor...</option>
                {availableProfessionals.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data do Registro</label>
              <input 
                type="date" 
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
                className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Relato Detalhado & Trâmites da Ouvidoria</label>
            <textarea 
              value={formData.observations}
              onChange={e => setFormData({...formData, observations: e.target.value})}
              className="w-full p-3 rounded-lg border border-gray-200 focus:ring-2 focus:ring-emerald-500 transition-all outline-none min-h-[100px]"
              placeholder="Descreva minuciosamente o relato do cidadão, manifestação registrada ou providências tomadas para resolução..."
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
            {editingMovement ? 'Salvar Protocolo' : 'Registrar Protocolo'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Main Pages ---

const DashboardPage = ({ 
  patients, 
  movements,
  availableCities,
  availableProfessionals,
  availableDiagnoses,
  forms = [],
  evaluations = []
}: { 
  patients: Patient[], 
  movements: Movement[],
  availableCities: string[],
  availableProfessionals: string[],
  availableDiagnoses: string[],
  forms?: EvaluationForm[],
  evaluations?: SectorEvaluation[],
  key?: string 
}) => {
  const [filterCity, setFilterCity] = useState('');
  const [filterProfessional, setFilterProfessional] = useState('');
  const [filterDiagnosis, setFilterDiagnosis] = useState('');
  const [filterMonth, setFilterMonth] = useState(new Date().toISOString().substring(0, 7));

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const matchCity = filterCity ? p.city === filterCity : true;
      const matchPro = filterProfessional ? p.professionals.includes(filterProfessional) : true;
      const matchDiag = filterDiagnosis ? p.diagnoses?.includes(filterDiagnosis) : true;
      return matchCity && matchPro && matchDiag;
    });
  }, [patients, filterCity, filterProfessional, filterDiagnosis]);

  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchPro = filterProfessional 
        ? (m.responsibleProfessional?.includes(filterProfessional) || m.professionals.includes(filterProfessional)) 
        : true;
      const matchMonth = filterMonth ? m.date.startsWith(filterMonth) : true;
      return matchPro && matchMonth;
    });
  }, [movements, filterProfessional, filterMonth]);

  const filteredFormsByMonth = useMemo(() => {
    return forms.filter(f => {
      return !filterMonth || (f.createdAt && f.createdAt.startsWith(filterMonth));
    });
  }, [forms, filterMonth]);

  const filteredEvaluationsByMonth = useMemo(() => {
    return evaluations.filter(e => {
      return !filterMonth || (e.createdAt && e.createdAt.startsWith(filterMonth));
    });
  }, [evaluations, filterMonth]);

  const stats = useMemo(() => {
    const total = filteredPatients.length;
    const active = filteredPatients.filter(p => p.status === 'Ativo').length;
    const totalManifests = filteredMovements.length;
    const reclamacoes = filteredMovements.filter(m => m.type === 'Reclamação').length;
    const denuncias = filteredMovements.filter(m => m.type === 'Denúncia').length;
    const sugestoes = filteredMovements.filter(m => m.type === 'Sugestão').length;
    const elogios = filteredMovements.filter(m => m.type === 'Elogio').length;
    const absentees = filteredMovements.filter(m => m.type === 'Absenteísmo').length;

    // NPS calculations on current month filtered forms
    const totalForms = filteredFormsByMonth.length;
    let npsGlobal = 0;
    let promotersPercent = 0;
    let neutralsPercent = 0;
    let detractorsPercent = 0;
    let npsZone = 'Razoável';
    
    if (totalForms > 0) {
      let promoters = 0;
      let neutrals = 0;
      let detractors = 0;
      filteredFormsByMonth.forEach(f => {
        if (f.npsScore >= 9) promoters++;
        else if (f.npsScore >= 7) neutrals++;
        else detractors++;
      });
      promotersPercent = Math.round((promoters / totalForms) * 100);
      neutralsPercent = Math.round((neutrals / totalForms) * 100);
      detractorsPercent = Math.round((detractors / totalForms) * 100);
      npsGlobal = Math.round(promotersPercent - detractorsPercent);

      // excellent: >75, muito bom: 50 a 74, razoavel: 0 a 49, critico: <0
      if (npsGlobal >= 75) npsZone = 'Zona de Excelência ❤️';
      else if (npsGlobal >= 50) npsZone = 'Zona de Qualidade 😊';
      else if (npsGlobal >= 0) npsZone = 'Zona de Aperfeiçoamento 😐';
      else npsZone = 'Zona Crítica 💀';
    }

    // Approval Index (percentage of Ótimo + Bom over all current month filtered evaluations)
    const totalAnswers = filteredEvaluationsByMonth.length;
    let positiveCount = 0;
    filteredEvaluationsByMonth.forEach(e => {
      if (e.rating === 'Otimo' || e.rating === 'Bom') positiveCount++;
    });
    const approvalIndex = totalAnswers > 0 ? Math.round((positiveCount / totalAnswers) * 100) : 0;

    return { 
      total, 
      active, 
      totalManifests, 
      reclamacoes, 
      denuncias, 
      sugestoes, 
      elogios, 
      absentees,
      totalForms,
      npsGlobal,
      promotersPercent,
      neutralsPercent,
      detractorsPercent,
      npsZone,
      approvalIndex
    };
  }, [filteredPatients, filteredMovements, filteredFormsByMonth, filteredEvaluationsByMonth]);

  // Data for Charts
  const diagnosisData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPatients.forEach(p => {
      p.diagnoses.forEach(d => {
        counts[d] = (counts[d] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [filteredPatients]);

  const cityData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPatients.forEach(p => {
      counts[p.city] = (counts[p.city] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPatients]);

  const professionalData = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredPatients.forEach(p => {
      p.professionals.forEach(pro => {
        const name = pro.split(' (')[0];
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [filteredPatients]);

  const criticalSectorsDashboard = useMemo(() => {
    const list: Record<string, { positive: number; total: number; ruins: number }> = {};
    filteredEvaluationsByMonth.forEach(e => {
      if (!list[e.sector]) {
        list[e.sector] = { positive: 0, total: 0, ruins: 0 };
      }
      list[e.sector].total++;
      if (e.rating === 'Otimo' || e.rating === 'Bom') {
        list[e.sector].positive++;
      }
      if (e.rating === 'Ruim') {
        list[e.sector].ruins++;
      }
    });

    return Object.entries(list)
      .map(([sector, data]) => {
        const negativePercent = data.total > 0 ? Math.round(((data.total - data.positive) / data.total) * 100) : 0;
        return { sector, negativePercent, total: data.total, ruins: data.ruins };
      })
      .filter(s => s.total > 0 && (s.negativePercent > 15 || s.ruins >= 1));
  }, [filteredEvaluationsByMonth]);

  const chartSectorsData = useMemo(() => {
    const list: Record<string, { approval: number; total: number }> = {};
    filteredEvaluationsByMonth.forEach(e => {
      if (!list[e.sector]) {
        list[e.sector] = { approval: 0, total: 0 };
      }
      list[e.sector].total++;
      if (e.rating === 'Otimo' || e.rating === 'Bom') {
        list[e.sector].approval++;
      }
    });

    return Object.entries(list)
      .map(([name, data]) => ({
        name,
        'Aprovação (%)': data.total > 0 ? Math.round((data.approval / data.total) * 100) : 0,
        Votos: data.total
      }))
      .sort((a, b) => b['Aprovação (%)'] - a['Aprovação (%)'])
      .slice(0, 10);
  }, [filteredEvaluationsByMonth]);

  const satisfactionTrendData = useMemo(() => {
    const data = [];
    const now = new Date();
    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = d.getMonth() + 1;
      const monthStr = `${year}-${String(monthNum).padStart(2, '0')}`;
      
      const monthEvals = evaluations.filter(e => e.createdAt && e.createdAt.startsWith(monthStr));
      const total = monthEvals.length;
      const positive = monthEvals.filter(e => e.rating === 'Otimo' || e.rating === 'Bom').length;
      const satPercent = total > 0 ? Math.round((positive / total) * 100) : 0;
      
      const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase();
      data.push({
        name: monthName,
        'Satisfação (%)': satPercent,
        'Total Votos': total
      });
    }
    return data;
  }, [evaluations]);

  const PIE_COLORS = ['#064e3b', '#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-8"
    >
      {/* Dashboard Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-black text-[#01402E] tracking-tight">Painel da Ouvidoria</h2>
          <p className="text-sm font-semibold text-gray-400 mt-1 uppercase tracking-widest">Secretaria Municipal de Saúde - Policlínica</p>
        </div>
        
        <div className="bg-white p-2 rounded-2xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 px-3 border-r border-gray-100 last:border-none">
            <Calendar size={14} className="text-[#01402E]" />
            <input 
              type="month" 
              value={filterMonth}
              onChange={e => setFilterMonth(e.target.value)}
              className="text-xs font-bold text-gray-600 outline-none bg-transparent"
              title="Filtrar Mês"
            />
          </div>
          <div className="flex items-center gap-2 px-3 border-r border-gray-100 last:border-none">
            <MapPin size={14} className="text-[#01402E]" />
            <select 
              value={filterCity}
              onChange={e => setFilterCity(e.target.value)}
              className="text-xs font-bold text-gray-600 outline-none bg-transparent"
            >
              <option value="">Todos Municípios</option>
              {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3 border-r border-gray-100 last:border-none">
            <ClipboardList size={14} className="text-[#01402E]" />
            <select 
              value={filterDiagnosis}
              onChange={e => setFilterDiagnosis(e.target.value)}
              className="text-xs font-bold text-gray-600 outline-none bg-transparent max-w-[150px]"
            >
              <option value="">Todos Assuntos</option>
              {availableDiagnoses.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 px-3">
            <Stethoscope size={14} className="text-[#01402E]" />
            <select 
              value={filterProfessional}
              onChange={e => setFilterProfessional(e.target.value)}
              className="text-xs font-bold text-gray-600 outline-none bg-transparent max-w-[150px]"
            >
              <option value="">Todos os Setores</option>
              {availableProfessionals.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Real-time Sector Dissatisfaction warning alerts */}
      {criticalSectorsDashboard.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-[2rem] p-6 flex gap-4 shadow-sm" id="id_sector_alarm_dashboard">
          <div className="w-12 h-12 rounded-2xl bg-red-650 text-white flex items-center justify-center shrink-0 shadow-md">
            <AlertCircle size={24} className="text-red-700" />
          </div>
          <div>
            <h4 className="text-sm font-black text-red-950 uppercase tracking-tight">ALERTA CRÍTICO: ALTA INSATISFAÇÃO</h4>
            <p className="text-xs text-red-700 mt-1 uppercase font-semibold">
              Os seguintes setores registram insatisfação acumulada de pacientes superior a 15% (LGPD sob conformidade SUS):
            </p>
            <div className="flex flex-wrap gap-2.5 mt-3">
              {criticalSectorsDashboard.map(s => (
                <span key={s.sector} className="px-3.5 py-1.5 bg-white border border-red-200 text-red-700 text-[10px] font-black rounded-xl shadow-xs uppercase">
                  {s.sector}: {s.negativePercent}% Reclamações ({s.total} avaliações)
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-4">
        <Card title="Pesquisas SUS" value={stats.totalForms.toString()} subtitle="Pesquisas Totem" icon={Users} />
        <Card 
          title="NPS Global" 
          value={stats.totalForms > 0 ? `${stats.npsGlobal > 0 ? '+' : ''}${stats.npsGlobal}` : 'N/A'} 
          subtitle={stats.totalForms > 0 ? stats.npsZone : 'Sem dados'} 
          colorClass={
            stats.npsZone.includes('Excelência') ? "text-emerald-700" :
            stats.npsZone.includes('Qualidade') ? "text-teal-600" :
            stats.npsZone.includes('Aperfeiçoamento') ? "text-amber-500 font-bold" :
            stats.npsZone.includes('Crítica') ? "text-red-650 font-extrabold animate-pulse" : "text-gray-400"
          } 
          icon={Activity} 
        />
        <Card title="Aprovação SUS" value={`${stats.approvalIndex}%`} subtitle="Ótimo & Bom" colorClass="text-emerald-600" icon={CheckCircle2} />
        <Card title="Total Protocolos" value={stats.totalManifests.toString()} subtitle="Ouvidoria Geral" colorClass="text-blue-500" icon={ClipboardList} />
        <Card title="Reclamações" value={stats.reclamacoes.toString()} subtitle="Manifestações" colorClass="text-orange-600" icon={AlertCircle} />
        <Card title="Denúncias" value={stats.denuncias.toString()} subtitle="Casos Graves" colorClass="text-red-600" icon={Shield} />
        <Card title="Elogios" value={stats.elogios.toString()} subtitle="Pontos Pró" colorClass="text-indigo-600" icon={ArrowUpRight} />
        <Card title="Sugestões" value={stats.sugestoes.toString()} subtitle="Aprimoramentos" colorClass="text-amber-500" icon={Plus} />
      </div>

      {stats.totalForms > 0 && (
        <div className="bg-gray-50/50 p-4 rounded-2xl border border-gray-100 flex flex-wrap items-center justify-between gap-4 text-xs font-semibold text-gray-500 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span>Promotores (9-10): <strong className="text-emerald-700 font-black">{stats.promotersPercent}%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0"></span>
            <span>Neutros/Passivos (7-8): <strong className="text-amber-600 font-black">{stats.neutralsPercent}%</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400 shrink-0"></span>
            <span>Detratores (0-6): <strong className="text-red-650 font-black">{stats.detractorsPercent}%</strong></span>
          </div>
          <div className="text-[10px] uppercase font-bold text-gray-400 border-l border-gray-100 pl-4">
            Cálculo NPS: <span className="bg-white px-2 py-0.5 rounded-md border border-gray-100 font-bold text-gray-600">% Promotores - % Detratores ({stats.promotersPercent}% - {stats.detractorsPercent}% = {stats.npsGlobal > 0 ? '+' : ''}{stats.npsGlobal})</span>
          </div>
        </div>
      )}

      {/* Grid of Main Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Trend Chart (Evolução de Satisfação) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 <TrendingUp size={16} className="text-[#01402E]" /> Gráfico de Satisfação Mensal (%)
              </h3>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">Tendência histórica global de aprovação (votos Ótimo/Bom) nos últimos 6 meses</p>
            </div>
            <span className="text-[10px] uppercase font-black text-[#01402E] bg-emerald-50 px-3 py-1 rounded-xl">linha de evolução</span>
          </div>
          <div className="h-[300px] w-full">
            {satisfactionTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={satisfactionTrendData}>
                  <defs>
                    <linearGradient id="colorSatisfaction" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#01402E" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#01402E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} unit="%" />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', fontSize: '12px' }}
                  />
                  <Line 
                    type="monotone" 
                    name="Satisfação (%)" 
                    dataKey="Satisfação (%)" 
                    stroke="#01402E" 
                    strokeWidth={4} 
                    dot={{ stroke: '#01402E', strokeWidth: 3, r: 5, fill: '#ffffff' }}
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#01402E' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-300">
                <p className="text-sm font-bold uppercase text-xs">Sem dados suficientes</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* City Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="mb-8">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
               <MapPin size={16} className="text-[#01402E]" /> Distribuição por Origem (Cidadão)
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} width={100} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="value" fill="#01402E" radius={[0, 10, 10, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Performance de Aprovação por Setor (%) with both Columns Chart and Table side-by-side */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm lg:col-span-2"
        >
          <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                 <Building2 size={16} className="text-[#01402E]" /> Performance de Aprovação por Setor (%)
              </h3>
              <p className="text-xs text-gray-400 mt-1 uppercase font-semibold">Avaliação desagregada baseada em votos digitados no Totem Eletrônico no mês corrente (Ótimo & Bom)</p>
            </div>
            {chartSectorsData.length > 0 && (
              <span className="text-[10px] uppercase font-black text-[#01402E] bg-emerald-50 px-3 py-1 rounded-xl self-start">
                {chartSectorsData.length} Setores Avaliados
              </span>
            )}
          </div>
          
          {chartSectorsData.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              {/* Columns Chart */}
              <div className="xl:col-span-7 h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSectorsData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#64748b', fontWeight: 'bold'}} />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#64748b', fontWeight: 'bold'}} unit="%" />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                    <Bar dataKey="Aprovação (%)" fill="#01402E" radius={[6, 6, 0, 0]} barSize={35} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Data Table */}
              <div className="xl:col-span-5 overflow-hidden rounded-2xl border border-gray-100">
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-gray-50/50 border-b border-gray-100 text-gray-400 uppercase tracking-wider sticky top-0">
                        <th className="p-3 font-black text-[10px]">Setor</th>
                        <th className="p-3 font-black text-[10px] text-center">Nº Avaliações</th>
                        <th className="p-3 font-black text-[10px] text-right">Aprovação (%)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {chartSectorsData.map((s) => (
                        <tr key={s.name} className="hover:bg-gray-50/50 transition">
                          <td className="p-3 font-bold text-gray-850">{s.name}</td>
                          <td className="p-3 text-center font-bold text-gray-500">{s.Votos}</td>
                          <td className="p-3 text-right">
                            <span className={`inline-block px-2.5 py-1 rounded-lg font-black text-[10px] ${
                              s['Aprovação (%)'] >= 75 ? 'bg-emerald-50 text-emerald-700' :
                              s['Aprovação (%)'] >= 50 ? 'bg-teal-50 text-teal-700' :
                              s['Aprovação (%)'] >= 30 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-700'
                            }`}>
                              {s['Aprovação (%)']}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-300">
              <p className="text-sm font-bold uppercase text-xs">Sem dados setoriais para exibir</p>
              <p className="text-xs mt-1">Colete pesquisas no totem para alimentar as aprovações.</p>
            </div>
          )}
        </motion.div>

        {/* Professional Capacity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="mb-8">
            <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
               <UserSquare2 size={16} className="text-[#01402E]" /> Manifestações por Setor Demandado
            </h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={professionalData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 700, fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWight: 700, fill: '#64748b'}} />
                <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                <Bar dataKey="value" fill="#10b981" radius={[10, 10, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity Lists */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Recent Totem Feedbacks */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-[#01402E] tracking-tight uppercase text-xs flex items-center gap-2">
              <Plus size={14} /> Comentários Recentes do Totem
            </h3>
          </div>
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
            {forms.filter(f => f.generalComment).slice(0, 5).map(f => (
              <div key={f.id} className="p-4 bg-gray-50/50 rounded-2xl border border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-[#01402E]">Pesquisa Eletrônica</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black ${
                    f.npsScore >= 9 ? 'bg-emerald-50 text-emerald-700' : f.npsScore >= 7 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-700'
                  }`}>
                    Nota NPS: {f.npsScore}
                  </span>
                </div>
                <p className="text-xs font-semibold text-gray-600 leading-relaxed italic">
                  "{f.generalComment}"
                </p>
                <div className="text-right text-[8px] font-bold text-gray-400">
                  {new Date(f.createdAt).toLocaleDateString('pt-BR')} às {new Date(f.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
            {forms.filter(f => f.generalComment).length === 0 && (
               <div className="py-12 text-center text-gray-300">
                  <Users size={32} className="mx-auto mb-2 opacity-10 text-emerald-800" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Sem comentários recém-registrados</p>
               </div>
            )}
          </div>
        </motion.div>

        {/* Latest Movements */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-black text-[#064e3b] tracking-tight uppercase text-xs flex items-center gap-2">
              <Clock size={14} /> Últimas Manifestações Registradas
            </h3>
            <button className="text-[10px] font-black text-emerald-600 uppercase hover:underline">Histórico Completo</button>
          </div>
          <div className="space-y-4">
            {movements.slice(-5).reverse().map(m => (
              <div key={m.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-blue-50/20 transition-all border border-transparent hover:border-blue-50">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center">
                  <MovementTypeBadge type={m.type} />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{m.patientName}</p>
                  <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                     <span>{new Date(m.date).toLocaleDateString('pt-BR')}</span>
                     <span className="w-1 h-1 rounded-full bg-gray-200"></span>
                     <span>{m.type}</span>
                  </div>
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-bold text-gray-400">{new Date(m.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
              </div>
            ))}
            {movements.length === 0 && (
               <div className="py-10 text-center text-gray-300">
                  <ClipboardList size={32} className="mx-auto mb-2 opacity-10" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Sem movimentos registrados</p>
               </div>
            )}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

const PatientsPage = ({ 
  patients, 
  currentUser,
  availableCities,
  availableProfessionals,
  availableDiagnoses,
  onReload 
}: { 
  patients: Patient[], 
  currentUser: User,
  availableCities: string[],
  availableProfessionals: string[],
  availableDiagnoses: string[],
  onReload: () => void, 
  key?: string 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
  const [search, setSearch] = useState('');
  const [filterCity, setFilterCity] = useState('');
  const [filterProfessional, setFilterProfessional] = useState('');
  const [filterStatus, setFilterStatus] = useState<PatientStatus | ''>('');
  const [showOnlyAbsentees, setShowOnlyAbsentees] = useState(false);

  const canEdit = currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação' || currentUser.accessType === 'Recepção' || currentUser.accessType === 'Profissional';
  const canDelete = currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação' || currentUser.accessType === 'Recepção' || currentUser.accessType === 'Profissional';

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      // Permission filtering: Professionals only see their patients
      if (currentUser.accessType === 'Profissional') {
        const nameClean = currentUser.name.split(' (')[0];
        const isLinked = p.professionals.some(pro => pro.includes(nameClean));
        if (!isLinked) return false;
      }

      const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || 
                          p.medicalRecordNumber.includes(search);
      const matchCity = filterCity ? p.city === filterCity : true;
      const matchPro = filterProfessional ? p.professionals.includes(filterProfessional) : true;
      const matchStatus = filterStatus ? p.status === filterStatus : true;
      const matchAbsentees = showOnlyAbsentees ? (p.absenteeismCount || 0) > 0 : true;
      return matchSearch && matchCity && matchPro && matchStatus && matchAbsentees;
    });
  }, [patients, search, filterCity, filterProfessional, filterStatus, showOnlyAbsentees, currentUser]);

  const handleSave = async (data: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingPatient) {
        await PatientService.updatePatient(editingPatient.id, data);
      } else {
        await PatientService.addPatient(data);
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving patient:', error);
      alert('Erro ao salvar cadastro. Verifique suas credenciais de acesso.');
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Deseja realmente enviar este registro de cidadão para a lixeira?')) {
      try {
        await PatientService.softDeletePatient(id);
      } catch (error: any) {
        console.error('Error deleting patient:', error);
        let msg = 'Erro ao excluir cidadão.';
        try {
          const errData = JSON.parse(error.message);
          if (errData.error.includes('permission')) {
            msg += ' Permissão insuficiente de banco de dados.';
          }
        } catch (e) {}
        alert(msg);
      }
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
          <h2 className="text-2xl font-black text-[#064e3b] tracking-tight">Cidadãos e Manifestantes</h2>
          <p className="text-sm font-medium text-gray-500">Gestão centralizada do cadastro de cidadãos e manifestantes da Policlínica</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => { setEditingPatient(null); setIsModalOpen(true); }}
            className="bg-[#064e3b] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#053d2e] shadow-lg shadow-emerald-900/10 transition-all active:scale-95"
          >
            <Plus size={20} />
            Novo Cadastro
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Buscar por nome ou CPF/CNS..."
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
              {availableCities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="relative">
            <Stethoscope className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={filterProfessional}
              onChange={e => setFilterProfessional(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium appearance-none"
            >
              <option value="">Todos os Setores</option>
              {availableProfessionals.map(p => <option key={p} value={p}>{p}</option>)}
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
              <option value="Alta">Alta / Resposta Final</option>
              <option value="Investigação">Em Análise / Investigação</option>
              <option value="Espera">Espera / Pendência</option>
            </select>
          </div>
        </div>
        <div className="flex items-center gap-4 pt-2">
           <label className="flex items-center gap-2 cursor-pointer group">
             <input 
               type="checkbox"
               className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
               checked={showOnlyAbsentees}
               onChange={e => setShowOnlyAbsentees(e.target.checked)}
             />
             <span className="text-xs font-bold text-gray-500 group-hover:text-emerald-700 transition-colors">Ver apenas cidadãos com registro de absenteísmo</span>
           </label>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Identificação (CPF)</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Cidadão / Manifestante</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Idade</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Assunto Principal</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Setores Vinculados</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Situação</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400">
                    <Users size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold">Nenhum cidadão ou manifestante encontrado</p>
                    <p className="text-xs">Tente ajustar seus filtros de busca ou registrar um novo cidadão</p>
                  </td>
                </tr>
              ) : (
                filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-emerald-50/20 transition-colors group">
                    <td className="px-6 py-4 text-sm font-black text-emerald-700 tracking-tighter">#{p.medicalRecordNumber}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="text-sm font-bold text-gray-900 leading-none mb-1">{p.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase font-black">{p.city}</p>
                        </div>
                        {p.absenteeismCount && p.absenteeismCount > 0 && (
                          <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter shadow-sm border ${p.absenteeismCount >= 3 ? 'bg-red-500 text-white border-red-600 animate-bounce' : 'bg-amber-100 text-amber-800 border-amber-200'}`} title={`${p.absenteeismCount} absenteísmos`}>
                            {p.absenteeismCount} ABS
                          </div>
                        )}
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
                      {p.updatedBy && (
                        <p className="text-[8px] text-gray-300 font-medium italic mt-1">
                          Ref: {p.updatedBy.split('@')[0]}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Visualizar">
                          <Eye size={16} />
                        </button>
                        {canEdit && (
                          <button 
                            onClick={() => { setEditingPatient(p); setIsModalOpen(true); }}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDelete(p.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 bg-gray-50/30 border-t border-gray-100 flex items-center justify-between">
           <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Listando {filteredPatients.length} de {patients.length} cidadãos</p>
        </div>
      </div>

      <PatientFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        editingPatient={editingPatient}
        availableCities={availableCities}
        availableProfessionals={availableProfessionals}
        availableDiagnoses={availableDiagnoses}
      />
    </motion.div>
  );
};

const MovementsPage = ({ 
  movements, 
  patients, 
  currentUser,
  availableProfessionals,
  onReload,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear
}: { 
  movements: Movement[], 
  patients: Patient[], 
  currentUser: User,
  availableProfessionals: string[],
  onReload: () => void, 
  key?: string,
  selectedMonth?: number;
  setSelectedMonth?: (month: number) => void;
  selectedYear?: number;
  setSelectedYear?: (year: number) => void;
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<MovementType | ''>('');
  const [filterProfessional, setFilterProfessional] = useState('');
  
  const [localFilterMonth, setLocalFilterMonth] = useState(new Date().toISOString().substring(0, 7)); // YYYY-MM
  
  const filterMonth = useMemo(() => {
    if (selectedMonth !== undefined && selectedYear !== undefined) {
      const mStr = String(selectedMonth + 1).padStart(2, '0');
      return `${selectedYear}-${mStr}`;
    }
    return localFilterMonth;
  }, [selectedMonth, selectedYear, localFilterMonth]);

  const setFilterMonth = (val: string) => {
    setLocalFilterMonth(val);
  };

  const [activeTab, setActiveTab] = useState<'movements' | 'nps'>('movements');

  const canCreate = currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação' || currentUser.accessType === 'Recepção' || currentUser.accessType === 'Profissional';
  const canEdit = currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação' || currentUser.accessType === 'Recepção' || currentUser.accessType === 'Profissional';
  const canDelete = currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação' || currentUser.accessType === 'Recepção' || currentUser.accessType === 'Profissional';

  const filteredMovements = useMemo(() => {
    return movements
      .filter(m => {
        // Permission filtering: Professionals only see movements of their patients
        if (currentUser.accessType === 'Profissional') {
          const nameClean = currentUser.name.split(' (')[0];
          const isLinked = m.professionals.some(pro => pro.includes(nameClean));
          if (!isLinked) return false;
        }

        const matchSearch = m.patientName.toLowerCase().includes(search.toLowerCase()) || 
                            m.medicalRecordNumber.includes(search);
        const matchType = filterType ? m.type === filterType : true;
        const matchPro = filterProfessional ? m.professionals.includes(filterProfessional) : true;
        const matchMonth = filterMonth ? m.date.startsWith(filterMonth) : true;
        return matchSearch && matchType && matchPro && matchMonth;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [movements, search, filterType, filterProfessional, filterMonth, currentUser]);

  const stats = useMemo(() => {
    const currentMonth = filteredMovements;
    const entries = currentMonth.filter(m => m.type === 'Elogio' || m.type === 'Sugestão' || m.type === 'Entrada').length;
    const discharges = currentMonth.filter(m => m.type === 'Alta' || m.type === 'Reclamação' || m.type === 'Denúncia').length;
    const absentees = currentMonth.filter(m => m.type === 'Absenteísmo').length;
    const activePatients = patients.filter(p => p.status === 'Ativo').length;
    return { entries, discharges, activePatients, absentees, total: currentMonth.length };
  }, [filteredMovements, patients]);

  const handleSave = async (data: Omit<Movement, 'id' | 'createdAt' | 'deletedAt'>) => {
    try {
      const patient = patients.find(p => p.id === data.patientId);
      
      if (editingMovement) {
        // Logica para ajuste de contador de absenteísmo se o tipo mudar
        if (patient && editingMovement.type !== data.type) {
          let newCount = patient.absenteeismCount || 0;
          if (editingMovement.type === 'Absenteísmo') newCount--;
          if (data.type === 'Absenteísmo') newCount++;
          
          await PatientService.updatePatient(patient.id, { 
            absenteeismCount: Math.max(0, newCount)
          });
        }
        await MovementService.updateMovement(editingMovement.id, data);
      } else {
        await MovementService.addMovement(data);
        
        // Se for um novo absenteísmo, incrementa o contador e se >= 3 altera para alta/vaga perdida
        if (data.type === 'Absenteísmo' && patient) {
          const newCount = (patient.absenteeismCount || 0) + 1;
          const updates: Partial<Patient> = { absenteeismCount: newCount };
          
          if (newCount >= 3) {
            alert(`ATENÇÃO: O(A) cidadão(ã) ${patient.name} atingiu 3 marcações de absenteísmo e perderá a vaga de atendimento (situação cadastral alterada automaticamente para Alta/Resolvido).`);
            updates.status = 'Alta';
          }
          
          await PatientService.updatePatient(patient.id, updates);
        }
      }

      // Se for uma movimentação de ALTA, atualiza o status do cidadão
      if (data.type === 'Alta') {
        if (patient) {
          await PatientService.updatePatient(patient.id, { 
            status: 'Alta',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.email
          });
        }
      } 
      // Se for uma ENTRADA ou positiva, garante que o cidadão esteja ATIVO de contato
      else if (data.type === 'Entrada') {
        if (patient) {
          await PatientService.updatePatient(patient.id, { 
            status: 'Ativo',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.email
          });
        }
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving movement:', error);
      alert('Erro ao registrar protocolo. Verifique suas credenciais.');
    }
  };

  const handleDelete = async (id: string) => {
    const movement = movements.find(m => m.id === id);
    if (!movement) return;

    if (window.confirm('Deseja realmente enviar esta manifestação de ouvidoria para a lixeira?')) {
      try {
        await MovementService.softDeleteMovement(id);
        
        const patient = patients.find(p => p.id === movement.patientId);
        
        // Se a movimentação sendo apagada for de ALTA, o paciente deve voltar para ATIVO
        if (movement.type === 'Alta' && patient) {
          await PatientService.updatePatient(patient.id, { 
            status: 'Ativo',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.email
          });
        }

        // Se apagar um absenteísmo, decrementa o contador
        if (movement.type === 'Absenteísmo' && patient) {
          const newCount = Math.max(0, (patient.absenteeismCount || 0) - 1);
          await PatientService.updatePatient(patient.id, { 
            absenteeismCount: newCount
          });
        }
      } catch (error: any) {
        console.error('Error deleting movement:', error);
        let msg = 'Erro ao excluir manifestação.';
        try {
          const errData = JSON.parse(error.message);
          if (errData.error.includes('permission')) {
            msg += ' Permissão insuficiente no banco.';
          }
        } catch (e) {}
        alert(msg);
      }
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
          <h2 className="text-2xl font-black text-[#064e3b] tracking-tight">
            {activeTab === 'movements' ? 'Manifestações e Protocolos' : 'Histórico de Pesquisas NPS'}
          </h2>
          <p className="text-sm font-medium text-gray-500">
            {activeTab === 'movements' 
              ? 'Histórico de reclamações, elogios, denúncias e registros de ouvidoria' 
              : 'Resultados em tempo real das pesquisas de satisfação e manifestações por setor'}
          </p>
        </div>
        {canCreate && activeTab === 'movements' && (
          <button 
            onClick={() => { setEditingMovement(null); setIsModalOpen(true); }}
            className="bg-[#064e3b] text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-[#053d2e] shadow-lg shadow-emerald-900/10 transition-all active:scale-95"
          >
            <Plus size={20} />
            Nova Manifestação
          </button>
        )}
      </div>

      {/* Tabs Selector */}
      <div className="flex border-b border-gray-150 gap-2">
        <button
          onClick={() => setActiveTab('movements')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'movements'
              ? 'border-[#064e3b] text-[#064e3b]'
              : 'border-transparent text-gray-450 hover:text-gray-700'
          }`}
        >
          Manifestações Ouvidoria
        </button>
        <button
          onClick={() => setActiveTab('nps')}
          className={`pb-3 px-4 text-xs font-black uppercase tracking-wider border-b-2 transition-all ${
            activeTab === 'nps'
              ? 'border-[#064e3b] text-[#064e3b]'
              : 'border-transparent text-gray-450 hover:text-gray-700'
          }`}
        >
          Avaliações de Setores (Pesquisas)
        </button>
      </div>

      {activeTab === 'nps' ? (
        <EvaluationList 
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          selectedYear={selectedYear}
          setSelectedYear={setSelectedYear}
        />
      ) : (
        <>
          {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card title="Positivos / Entradas" value={stats.entries.toString()} subtitle="Elogios e Sugestões" icon={Plus} />
        <Card title="Altas / Críticas" value={stats.discharges.toString()} subtitle="Resoluções e Demandas" icon={ClipboardList} />
        <Card title="Ocor. Absenteísmo" value={stats.absentees.toString()} subtitle="Total absenteísmo" colorClass="text-red-600" icon={AlertCircle} />
        <Card title="Cidadãos Ativos" value={stats.activePatients.toString()} subtitle="Base de contato atual" icon={Users} />
        <Card title="Total Manifestações" value={stats.total.toString()} subtitle="No período filtrado" icon={Clock} />
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text" 
              placeholder="Nome ou identificação (CPF)..."
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
              onChange={e => {
                const val = e.target.value;
                setFilterMonth(val);
                if (setSelectedMonth && setSelectedYear && val) {
                  const parts = val.split('-');
                  if (parts.length === 2) {
                    setSelectedMonth(Number(parts[1]) - 1);
                    setSelectedYear(Number(parts[0]));
                  }
                }
              }}
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
              <option value="">Todos os Setores</option>
              {availableProfessionals.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <select 
              value={filterType}
              onChange={e => setFilterType(e.target.value as any)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium appearance-none"
            >
              <option value="">Todos os Tipos de Registros</option>
              <option value="Reclamação">Reclamação</option>
              <option value="Denúncia">Denúncia</option>
              <option value="Sugestão">Sugestão</option>
              <option value="Elogio">Elogio</option>
              <option value="Solicitação">Solicitação</option>
              <option value="Absenteísmo">Absenteísmo</option>
              <option value="Atendimento">Atendimento / Ocorrência Geral</option>
              <option value="Entrada">Entrada</option>
              <option value="Alta">Alta / Resolução</option>
              <option value="Transferência">Transferência de Setor</option>
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
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Data Registro</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Tipo</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Cidadão / Manifestante</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Assunto / Tema</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Setor Demandado</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Relato / Trâmite</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-20 text-center text-gray-400">
                    <ClipboardList size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold">Nenhuma manifestação no período</p>
                    <p className="text-xs">Registre uma nova ocorrência de ouvidoria clicando no botão acima</p>
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
                       <p className="text-[10px] font-bold text-[#064e3b]">{m.responsibleProfessional || '-'}</p>
                       <p className="text-[9px] text-gray-400">Setores vincl.: {m.professionals.join(', ') || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                       <p className="text-xs text-gray-500 max-w-[200px] truncate" title={m.observations}>{m.observations || '-'}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        {canEdit && (
                          <button 
                            onClick={() => { setEditingMovement(m); setIsModalOpen(true); }}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all" 
                            title="Editar"
                          >
                            <Edit size={16} />
                          </button>
                        )}
                        {canDelete && (
                          <button 
                            onClick={() => handleDelete(m.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" 
                            title="Excluir"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
        </>
      )}

      <MovementFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleSave} 
        patients={patients}
        availableProfessionals={availableProfessionals}
        editingMovement={editingMovement}
      />
    </motion.div>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [currentView, setCurrentView] = useState<'dashboard' | 'form' | 'reports' | 'movements' | 'professionals' | 'users' | 'profile' | 'trash' | 'municipalities' | 'diagnoses'>('dashboard');

  const menuItems = [
    { id: 'dashboard' as Page, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'reports' as Page, label: 'Relatórios', icon: FileText },
    { id: 'new-form' as Page, label: 'Novo Formulário', icon: PlusCircle, isNewForm: true },
    { id: 'movements' as Page, label: 'Histórico', icon: ListOrdered },
    { id: 'professionals' as Page, label: 'Gestão de Setores', icon: Settings }
  ];
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [diagnoses, setDiagnoses] = useState<Diagnosis[]>([]);
  const [forms, setForms] = useState<EvaluationForm[]>([]);
  const [evaluations, setEvaluations] = useState<SectorEvaluation[]>([]);
  const [isPatientMode, setIsPatientMode] = useState(false);

  // Global selected month and year for cross-page synchronization
  const [globalSelectedMonth, setGlobalSelectedMonth] = useState<number>(new Date().getMonth()); // 0-indexed (0 = Jan, 11 = Dec)
  const [globalSelectedYear, setGlobalSelectedYear] = useState<number>(new Date().getFullYear());

  // States for customizable branding logos
  const [loadedLogos, setLoadedLogos] = useState<ClinicLogos>({});
  const [isLogoModalOpen, setIsLogoModalOpen] = useState(false);

  useEffect(() => {
    if (currentPage === 'new-form') {
      setCurrentView('form');
    } else if (currentPage === 'movements') {
      setCurrentView('list');
    } else {
      setCurrentView(currentPage as any);
    }
  }, [currentPage]);

  useEffect(() => {
    // Detect ?mode=paciente
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'paciente') {
      setIsPatientMode(true);
    }
  }, []);

  // Subscribe to real-time customizable logo settings
  useEffect(() => {
    const unsubscribeLogos = LogoService.subscribeToLogos((data) => {
      setLoadedLogos(data);
    });
    return () => unsubscribeLogos();
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const user = await UserService.getCurrentUser();
        if (user) {
          setCurrentUser(user);
          setIsLoggedIn(true);
        } else {
          // Profile not found in Firestore
          setIsLoggedIn(false);
        }
      } else {
        setIsLoggedIn(false);
        setCurrentUser(null);
      }
      setIsInitialized(true);
    });

    return () => unsubscribeAuth();
  }, []);

  useEffect(() => {
    if (!isLoggedIn && !isPatientMode) return;

    let unsubscribePatients = () => {};
    let unsubscribeMovements = () => {};
    let unsubscribePros = () => {};
    let unsubscribeMunis = () => {};
    let unsubscribeDiagnoses = () => {};
    let unsubscribeForms = () => {};
    let unsubscribeEvals = () => {};

    if (isLoggedIn) {
      unsubscribePatients = PatientService.subscribeToPatients(setPatients);
      unsubscribeMovements = MovementService.subscribeToMovements(setMovements);
      unsubscribePros = SectorService.subscribeToSectors((sectorList) => {
        const mappedPros: Professional[] = sectorList.map(s => ({
          id: s.id,
          name: s.name,
          area: 'Equipe',
          status: s.active ? 'Active' : 'Inactive',
          createdAt: new Date().toISOString()
        }));
        setProfessionals(mappedPros);
      });
      unsubscribeMunis = MunicipalityService.subscribeToMunicipalities(setMunicipalities);
      unsubscribeDiagnoses = DiagnosisService.subscribeToDiagnoses(setDiagnoses);
      unsubscribeForms = SurveyService.subscribeToForms(setForms);
      unsubscribeEvals = SurveyService.subscribeToEvaluations(setEvaluations);
    } else if (isPatientMode) {
      unsubscribePros = SectorService.subscribeToSectors((sectorList) => {
        const mappedPros: Professional[] = sectorList.map(s => ({
          id: s.id,
          name: s.name,
          area: 'Equipe',
          status: s.active ? 'Active' : 'Inactive',
          createdAt: new Date().toISOString()
        }));
        setProfessionals(mappedPros);
      });
    }

    return () => {
      unsubscribePatients();
      unsubscribeMovements();
      unsubscribePros();
      unsubscribeMunis();
      unsubscribeDiagnoses();
      unsubscribeForms();
      unsubscribeEvals();
    };
  }, [isLoggedIn, isPatientMode]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    setIsLoggedIn(true);
  };

  const handleLogout = async () => {
    await UserService.logout();
    setIsLoggedIn(false);
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const canAccess = (page: Page): boolean => {
    if (!currentUser) return false;
    if (currentUser.accessType === 'Administrador') return true;
    
    switch (page) {
      case 'dashboard': return true;
      case 'profile': return true;
      case 'patients': return true;
      case 'movements': return true;
      case 'new-form': return true;
      case 'reports': return currentUser.accessType === 'Coordenação' || currentUser.accessType === 'Administrador';
      case 'professionals': return currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação' || currentUser.accessType === 'Recepção';
      case 'municipalities': return currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação' || currentUser.accessType === 'Recepção';
      case 'diagnoses': return currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação' || currentUser.accessType === 'Recepção';
      case 'trash': return currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação';
      case 'users': return currentUser.accessType === 'Administrador' || currentUser.accessType === 'Coordenação';
      default: return false;
    }
  };

  if (isPatientMode) {
    return <PatientSurveyPage availableSectors={professionals.filter(p => p.status === 'Active').map(p => p.name)} />;
  }

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
        <p className="text-indigo-600 font-black uppercase tracking-widest text-[#01402E] text-xs">Carregando Ouvidoria...</p>
      </div>
    );
  }

  if (!isLoggedIn || !currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
       {/* Sidebar - Desktop */}
      <motion.aside 
        animate={{ width: sidebarCollapsed ? 80 : 256 }}
        className={`bg-white border-r border-slate-200 hidden lg:flex flex-col fixed h-full z-40 transition-all ${sidebarCollapsed ? 'items-center px-1.5 py-5' : 'p-6'}`}
      >
        {/* Header App Brand with Custom Branding Logos */}
        <div className={`flex flex-col mb-8 ${sidebarCollapsed ? 'items-center justify-center' : 'w-full'}`}>
          {!sidebarCollapsed ? (
            <div className="flex flex-col items-center text-center space-y-4 w-full bg-slate-50/50 p-4 rounded-3xl border border-slate-100">
              <div className="flex items-center justify-center bg-white p-2 rounded-3xl shadow-sm border border-slate-100/80 w-24 h-24">
                {loadedLogos.ouvidoria ? (
                  <img src={loadedLogos.ouvidoria} alt="Ouvidoria" className="w-full h-full object-contain rounded-2xl shrink-0" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-16 h-16 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-2xl flex items-center justify-center text-white font-black text-xl shrink-0 shadow-sm">
                    P
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center">
                <span className="font-extrabold text-[#01402E] tracking-tight text-xs uppercase leading-snug max-w-[180px] block">Policlínica Bernardo Félix da Silva</span>
                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1.5 block">Ouvidoria e Satisfação</span>
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm text-white font-black text-xl overflow-hidden p-1 border border-slate-150">
              {loadedLogos.ouvidoria ? (
                <img src={loadedLogos.ouvidoria} alt="O" className="w-full h-full object-contain rounded-lg" referrerPolicy="no-referrer" />
              ) : (
                <span className="text-emerald-700 font-extrabold text-lg">P</span>
              )}
            </div>
          )}
        </div>

        {/* Navigation list */}
        <nav className="space-y-1.5 flex-1 overflow-y-auto pr-1">
          {menuItems.map((item) => {
            const isHistoryItem = item.label === 'Histórico';
            const isActive = isHistoryItem ? (currentView === 'list') : (currentPage === item.id);
            return (
              canAccess(item.id) && (
                <SidebarItem 
                  key={item.id}
                  icon={item.icon} 
                  label={item.label} 
                  active={isActive} 
                  onClick={() => {
                    if (isHistoryItem) {
                      setCurrentView('list');
                      setCurrentPage('movements' as Page);
                    } else {
                      setCurrentPage(item.id);
                    }
                  }}
                  collapsed={sidebarCollapsed}
                  isNewForm={item.isNewForm}
                  isHistory={isHistoryItem}
                />
              )
            );
          })}

          {canAccess('users') && (
            <SidebarItem 
              icon={Users} 
              label="Gerenciar Equipe" 
              active={currentPage === 'users'} 
              onClick={() => setCurrentPage('users')}
              collapsed={sidebarCollapsed}
            />
          )}


        </nav>

        {/* Call to action "Divulgar Pesquisa" and User Info */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          
          {/* Share Survey CTA */}
          <button
            onClick={() => setIsShareModalOpen(true)}
            className={`w-full py-3 px-4 rounded-2xl bg-[#effaf6] border border-emerald-100 hover:bg-[#d8f3e7] text-[#01402E] transition-all font-black text-xs uppercase tracking-wider flex items-center gap-2 justify-center cursor-pointer ${
              sidebarCollapsed ? 'p-3' : ''
            }`}
            title="Divulgar Pesquisa de Satisfação"
          >
            <QrCode size={16} className="text-emerald-600" />
            {!sidebarCollapsed && <span>Divulgar Pesquisa</span>}
          </button>

          {/* User Institution Profile Section */}
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-2.5xl border border-gray-100">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#01402E] border border-emerald-100/40 font-extrabold flex items-center justify-center text-sm shrink-0 uppercase overflow-hidden">
                {currentUser?.photoUrl ? (
                  <img 
                    src={currentUser.photoUrl} 
                    alt={currentUser.name} 
                    className="w-full h-full object-cover" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  currentUser?.name.charAt(0) || 'P'
                )}
              </div>
              <div className="flex flex-col truncate">
                <span className="text-xs font-black text-gray-800 leading-snug">Policlínica</span>
                <span className="text-[10px] text-gray-400 font-bold truncate">{currentUser?.email || 'poli.ouvidoria@gmail.com'}</span>
              </div>
            </div>
          ) : (
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-[#01402E] border border-emerald-100/40 font-black flex items-center justify-center text-lg uppercase shadow-sm overflow-hidden">
              {currentUser?.photoUrl ? (
                <img 
                  src={currentUser.photoUrl} 
                  alt={currentUser.name} 
                  className="w-full h-full object-cover" 
                  referrerPolicy="no-referrer"
                />
              ) : (
                currentUser?.name.charAt(0) || 'P'
              )}
            </div>
          )}

          {/* Settings trigger for branding logos */}
          <button
            onClick={() => setIsLogoModalOpen(true)}
            className={`w-full flex items-center gap-3 py-2 px-4 rounded-xl text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-all font-black text-xs uppercase tracking-wider cursor-pointer ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
            title="Personalizar Logotipos"
          >
            <Settings size={16} className="text-slate-500" />
            {!sidebarCollapsed && <span>Personalizar Marcas</span>}
          </button>

          {/* Sair Button */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 py-2 px-4 rounded-xl text-red-500 hover:bg-red-50 hover:text-red-700 transition-all font-black text-xs uppercase tracking-wider cursor-pointer ${
              sidebarCollapsed ? 'justify-center' : ''
            }`}
          >
            <LogOut size={16} />
            {!sidebarCollapsed && <span>Sair</span>}
          </button>
        </div>
      </motion.aside>

      <LogoManagerModal isOpen={isLogoModalOpen} onClose={() => setIsLogoModalOpen(false)} />

      {/* Main Content */}
      <div className={`flex-1 flex flex-col transition-all lg:ml-64 ${sidebarCollapsed ? 'lg:!ml-20' : ''}`}>
        <Header 
          user={currentUser} 
          onLogout={handleLogout} 
          onProfile={() => setCurrentPage('profile')}
          sidebarCollapsed={sidebarCollapsed}
          setSidebarCollapsed={setSidebarCollapsed}
        />
        
        <main className="p-4 md:p-8 max-w-7xl mx-auto w-full">
          <AnimatePresence mode="wait">
            
            {currentPage === 'dashboard' && (
              <Dashboard 
                key="dashboard"
                selectedMonth={globalSelectedMonth}
                setSelectedMonth={setGlobalSelectedMonth}
                selectedYear={globalSelectedYear}
                setSelectedYear={setGlobalSelectedYear}
              />
            )}
            {currentView === 'form' && (
              <motion.div
                key="new-form"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <NewFormPage 
                  patients={patients}
                  currentUser={currentUser}
                  availableSectors={professionals.filter(p => p.status === 'Active').map(p => p.name)}
                  availableDiagnoses={diagnoses.filter(d => d.status === 'Active').map(d => d.name)}
                  availableCities={municipalities.filter(m => m.status === 'Active').map(m => m.name)}
                  onNavigateToHistory={() => setCurrentPage('movements')}
                />
              </motion.div>
            )}
            {currentPage === 'patients' && (
              <PatientsPage 
                key="patients" 
                patients={patients} 
                currentUser={currentUser}
                availableCities={municipalities.filter(m => m.status === 'Active').map(m => m.name)}
                availableProfessionals={professionals.filter(p => p.status === 'Active').map(p => p.name)}
                availableDiagnoses={diagnoses.filter(d => d.status === 'Active').map(d => d.name)}
                onReload={() => {}} 
              />
            )}
            {currentPage === 'movements' && currentView === 'list' && (
              <motion.div
                key="evaluation-list"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
                className="w-full"
              >
                <EvaluationList 
                  selectedMonth={globalSelectedMonth}
                  setSelectedMonth={setGlobalSelectedMonth}
                  selectedYear={globalSelectedYear}
                  setSelectedYear={setGlobalSelectedYear}
                />
              </motion.div>
            )}
            {currentPage === 'movements' && currentView !== 'list' && (
              <MovementsPage 
                key="movements" 
                movements={movements} 
                patients={patients} 
                currentUser={currentUser}
                availableProfessionals={professionals.filter(p => p.status === 'Active').map(p => p.name)}
                onReload={() => {}} 
                selectedMonth={globalSelectedMonth}
                setSelectedMonth={setGlobalSelectedMonth}
                selectedYear={globalSelectedYear}
                setSelectedYear={setGlobalSelectedYear}
              />
            )}
            {currentPage === 'reports' && canAccess('reports') && (
              <ReportsPage 
                forms={forms}
                evaluations={evaluations}
                currentUser={currentUser} 
                availableSectors={professionals.filter(p => p.status === 'Active').map(p => p.name)}
                selectedMonth={globalSelectedMonth + 1}
                setSelectedMonth={(month: number) => setGlobalSelectedMonth(month - 1)}
                selectedYear={globalSelectedYear}
                setSelectedYear={setGlobalSelectedYear}
              />
            )}
            {currentPage === 'professionals' && canAccess('professionals') && (
              <SectorsPage currentUser={currentUser} />
            )}
            {currentPage === 'municipalities' && canAccess('municipalities') && (
              <MunicipalitiesPage />
            )}
            {currentPage === 'diagnoses' && canAccess('diagnoses') && (
              <DiagnosesPage />
            )}
            {currentPage === 'users' && canAccess('users') && (
              <UsersPage onReload={() => {}} />
            )}
            {currentPage === 'trash' && canAccess('trash') && (
              <TrashPage currentUser={currentUser} />
            )}
            {currentPage === 'profile' && (
              <ProfilePage user={currentUser} onUpdate={(updated) => setCurrentUser(updated)} />
            )}
          </AnimatePresence>
        </main>

        <ShareSurveyModal 
          isOpen={isShareModalOpen} 
          onClose={() => setIsShareModalOpen(false)} 
        />
      </div>
    </div>
  );
}

const LoginPage = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const user = await UserService.loginWithGoogle();
      if (user) {
        onLogin(user);
      } else {
        setError('Acesso negado');
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao entrar com Google');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-10 rounded-[2.5rem] shadow-2xl shadow-blue-900/5 w-full max-w-md border border-blue-50"
      >
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="w-20 h-20 bg-[#1e40af] rounded-3xl flex items-center justify-center mb-6 shadow-xl shadow-blue-900/30 transform -rotate-3 hover:rotate-0 transition-transform">
            <UserSquare2 className="text-white" size={40} />
          </div>
          <h2 className="text-3xl font-black text-[#1e40af] tracking-tight">OuvePoli</h2>
          <p className="text-blue-500 font-bold uppercase text-[10px] tracking-[0.2em] mt-2">Acesso Restrito</p>
        </div>
        
        <div className="flex flex-col items-center gap-6">
          {error && (
            <div className="w-full bg-red-50 text-red-600 p-4 rounded-xl text-xs font-bold flex flex-col gap-2 border border-red-100">
              <div className="flex items-center gap-2 text-center justify-center w-full">
                <AlertCircle size={16} />
                {error}
              </div>
            </div>
          )}

          <div className="text-center space-y-2 mb-4">
            <p className="text-gray-500 font-medium px-4 text-sm">
              Acesse o sistema utilizando sua conta autorizada pelo Google.
            </p>
          </div>

          <button 
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-[#1e40af] text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest hover:bg-[#1d4ed8] shadow-xl shadow-blue-900/20 transition-all active:scale-95 flex items-center justify-center gap-4 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" className="w-6 h-6 p-1 bg-white rounded-full" alt="G" referrerPolicy="no-referrer" />
                Entrar com Google
              </>
            )}
          </button>
          
          <div className="pt-4 text-center">
             <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-relaxed">
               Acesso exclusivo para profissionais<br/>previamente cadastrados pela administração
             </p>
          </div>
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

