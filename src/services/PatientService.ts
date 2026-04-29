import { 
  collection, 
  doc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy,
  where,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Patient } from '../types';

export const PatientService = {
  getPatients: async (): Promise<Patient[]> => {
    const PATH = 'pacientes';
    try {
      const q = query(collection(db, PATH), where('deletedAt', '==', null), orderBy('name', 'asc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as Patient);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PATH);
      return [];
    }
  },

  subscribeToPatients: (callback: (patients: Patient[]) => void) => {
    const PATH = 'pacientes';
    const q = query(collection(db, PATH), where('deletedAt', '==', null), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Patient));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PATH);
    });
  },

  subscribeToDeletedPatients: (callback: (patients: Patient[]) => void) => {
    const PATH = 'pacientes';
    const q = query(collection(db, PATH), where('deletedAt', '!=', null), orderBy('deletedAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as Patient));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PATH);
    });
  },

  addPatient: async (patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'>): Promise<Patient> => {
    const PATH = 'pacientes';
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const newPatient: Patient = {
      ...patient,
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null
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

  softDeletePatient: async (id: string): Promise<void> => {
    const PATH = 'pacientes';
    try {
      await updateDoc(doc(db, PATH, id), {
        deletedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, PATH);
      throw error;
    }
  },

  restorePatient: async (id: string): Promise<void> => {
    const PATH = 'pacientes';
    try {
      await updateDoc(doc(db, PATH, id), {
        deletedAt: null,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, PATH);
      throw error;
    }
  },

  deletePatientPermanently: async (id: string): Promise<void> => {
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
