export enum AccessType {
  Administrador = 'Administrador',
  Coordenação = 'Coordenação',
  Profissional = 'Profissional',
  Recepção = 'Recepção'
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: string; // e.g., 'Ouvidor Geral', 'Atendente'
  accessType: AccessType;
  status: 'Active' | 'Inactive';
  password?: string;
  createdAt: string;
}

export type ManifestationType = 'Reclamação' | 'Sugestão' | 'Elogio' | 'Solicitação' | 'Denúncia';
export type EntryChannel = 'Presencial' | 'Telefone' | 'E-mail' | 'Urna' | 'Internet' | 'Outro';
export type ManifestationStatus = 'Pendente' | 'Em Análise' | 'Respondido' | 'Arquivado';
export type SatisfactionLevel = 'Muito Satisfeito' | 'Satisfeito' | 'Regular' | 'Insatisfeito';

// A single Ombudsperson Ticket / Manifestation
export interface Movement {
  id: string;
  patientId: string;                 // Mapped to Cidadão ID (can be 'anonymous')
  patientName: string;               // Mapped to Cidadão Name or 'Anônimo'
  medicalRecordNumber: string;       // CPS / SUS Card / Document
  diagnoses: string[];               // Mapped to Selected Themes/Subjects (Assuntos, e.g. "Demora no atendimento")
  professionals: string[];           // Mapped to Target Sectors involved (e.g. "Recepção")
  responsibleProfessional?: string;   // The specific area/sector lead or assigned Ouvidor
  type: any;                         // We'll keep this as any or cast so it complies with original references, but we will use ManifestationType in UI/handlers!
  date: string;                      // Occurrence date
  observations?: string;             // Detailed description of the issue / occurrence description
  response?: string;                 // Official response / Parecer da Ouvidoria
  responseDate?: string;             // Date of response registration
  respondedBy?: string;              // Email of user who responded
  satisfaction?: SatisfactionLevel;  // Satisfaction evaluation rating
  createdAt: string;
  createdBy?: string;                // creator user email
  deletedAt?: string | null;
}

// Map Movement alias for easier code migration
export type MovementType = ManifestationType;

// We map Cidadão (Citizen) to the Patient schema to reuse database hooks/service names cleanly, while refactoring displays!
export type PatientStatus = 'Ativo' | 'Bloqueado' | 'Alta';

export interface Patient {
  id: string;
  name: string;                      // Citizen Name
  medicalRecordNumber: string;       // CNS (Cartão SUS) or CPF
  birthDate: string;
  gender: 'M' | 'F' | 'Outro';
  city: string;                      // Municipality
  diagnoses: string[];               // Recurrent complaints / Preferred contact methods
  professionals: string[];           // Visited clinics/sectors
  status: PatientStatus;
  entryDate: string;                 // Date of first contact/registration
  observations?: string;             // Specific citizen observations (contact notes etc)
  createdAt: string;
  updatedAt: string;
  updatedBy?: string;
  deletedAt?: string | null;
  absenteeismCount?: number;         // Used to count pending complaints!
  dischargeDate?: string;
}

// Rename map aliases for high professional design
export type Citizen = Patient;
export type Manifestation = Movement;

export interface Professional {
  id: string;
  name: string;                      // Sector/Area Name (e.g. "Enfermagem")
  area: string;                      // Responsible Coordinator
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Sector {
  id: string;
  name: string;
  active: boolean;
  createdAt?: any;
}

export interface Municipality {
  id: string;
  name: string;
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export interface Diagnosis {
  id: string;
  name: string;                      // Complaint Theme / Diagnosis Name
  status: 'Active' | 'Inactive';
  createdAt: string;
}

export const CITIES = [
  'Aracati',
  'Fortaleza',
  'Icapuí',
  'Itaiçaba',
  'Jaguaruana',
  'Palhano',
  'Beberibe',
  'Fortim',
  'Russas'
];

export const SECTORS = [
  'Diretoria Geral / Consórcio',
  'Corpo Clínico (Médicos)',
  'Equipe de Enfermagem',
  'Fisioterapia e Reabilitação',
  'Recepção e Atendimento Principal',
  'Serviço Social',
  'SAD / Ambulatório',
  'Higienização e Conservação',
  'Sistemas de Informação (TI)'
];

export const SUBJECTS = [
  'Demora no acolhimento/recepção',
  'Tempo de espera para agendamentos',
  'Conduta e ética profissional',
  'Informações desencontradas',
  'Limpeza e climatização do ambiente',
  'Falta de acessibilidade',
  'Tratamento humanizado',
  'Problemas com entrega de resultados/exames',
  'Agradecimento por atendimento prestado',
  'Sugestão de sinalização e infraestrutura'
];

export interface EvaluationForm {
  id: string;
  npsScore: number;
  generalComment: string;
  source: 'patient' | 'physical';
  createdAt: string | any;
  date?: any; // data da visita
  createdByName?: string; // nome do atendente
  createdBy?: string; // UID
  observation?: string; // observação geral
  recommendationScore?: number; // nota NPS de recomendação
  patientName?: string; // nome do paciente se identificado
  patientPhone?: string; // telefone do paciente se informado
}

export interface SectorEvaluation {
  id: string;
  formId: string;
  sector: string;
  rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'Ótimo' | 'Não informou';
  comment: string;
  observation?: string; // comentário específico do setor
  createdAt: string | any;
}

