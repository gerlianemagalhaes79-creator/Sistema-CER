import { Patient } from '../types';

const STORAGE_KEY = 'cer_patients_data';

export const PatientService = {
  getPatients: (): Patient[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  savePatients: (patients: Patient[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(patients));
  },

  addPatient: (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Patient => {
    const patients = PatientService.getPatients();
    const newPatient: Patient = {
      ...patient,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    patients.push(newPatient);
    PatientService.savePatients(patients);
    return newPatient;
  },

  updatePatient: (id: string, updates: Partial<Patient>): Patient => {
    const patients = PatientService.getPatients();
    const index = patients.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Patient not found');
    
    const updatedPatient = {
      ...patients[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    patients[index] = updatedPatient;
    PatientService.savePatients(patients);
    return updatedPatient;
  },

  deletePatient: (id: string) => {
    const patients = PatientService.getPatients();
    const filtered = patients.filter(p => p.id !== id);
    PatientService.savePatients(filtered);
  },

  calculateAge: (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    
    return age;
  }
};
