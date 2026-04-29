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
  role: string; // e.g., 'Médico', 'Secretária'
  accessType: AccessType;
  status: 'Active' | 'Inactive';
  password?: string;
  createdAt: string;
}

export type MovementType = 'Entrada' | 'Alta' | 'Transferência' | 'Mudança de profissional' | 'Atualização cadastral';

export interface Movement {
  id: string;
  patientId: string;
  patientName: string;
  medicalRecordNumber: string;
  diagnoses: string[];
  professionals: string[];
  type: MovementType;
  date: string;
  observations?: string;
  createdAt: string;
  createdBy?: string; // email of the user who created it
}

export type PatientStatus = 'Ativo' | 'Alta' | 'Investigação' | 'Espera';

export interface Patient {
  id: string;
  name: string;
  medicalRecordNumber: string;
  birthDate: string;
  gender: 'M' | 'F' | 'Outro';
  city: string;
  diagnoses: string[];
  professionals: string[];
  status: PatientStatus;
  entryDate: string;
  dischargeDate?: string;
  observations?: string;
  createdAt: string;
  updatedAt: string;
  updatedBy?: string; // email of the user who last updated it
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

export const PROFESSIONALS = [
  'Dr. Silva (Fisioterapeuta)',
  'Dra. Santos (Fonoaudióloga)',
  'Dr. Oliveira (Terapeuta Ocupacional)',
  'Dra. Lima (Psicóloga)',
  'Dr. Costa (Assistente Social)',
  'Dra. Pereira (Médica Fisiatra)'
];

export const DIAGNOSES = [
  'AVC',
  'Paralisia Cerebral',
  'Autismo (TEA)',
  'Atraso no Desenvolvimento Neuropsicomotor',
  'Síndrome de Down',
  'Traumatismo Cranioencefálico',
  'Lesão Medular',
  'Microcefalia'
];
