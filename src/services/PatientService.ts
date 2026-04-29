import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Patient } from '../types';

export const PatientService = {
  getPatients: async (): Promise<Patient[]> => {
    const PATH = 'pacientes';
    try {
      const q = query(collection(db, PATH), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Patient));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PATH);
      return [];
    }
  },

  subscribeToPatients: (callback: (patients: Patient[]) => void) => {
    const PATH = 'pacientes';
    const q = query(collection(db, PATH), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Patient)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PATH);
    });
  },

  addPatient: async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'>): Promise<Patient> => {
    const PATH = 'pacientes';
    const id = crypto.randomUUID();
    const newPatient: Patient = {
      ...patient,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    try {
      await setDoc(doc(db, PATH, id), newPatient);
      return newPatient;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, PATH);
      throw error;
    }
  },

  updatePatient: async (id: string, updates: Partial<Patient>): Promise<void> => {
    const PATH = 'pacientes';
    const updatedData = {
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: auth.currentUser?.email || 'unknown'
    };
    
    try {
      await updateDoc(doc(db, PATH, id), updatedData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, PATH);
      throw error;
    }
  },

  deletePatient: async (id: string): Promise<void> => {
    const PATH = 'pacientes';
    try {
      await deleteDoc(doc(db, PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, PATH);
      throw error;
    }
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
