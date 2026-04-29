import { 
  collection, 
  doc, 
  addDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  orderBy,
  onSnapshot,
  setDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, auth } from '../lib/firebase';
import { Movement } from '../types';
import { PatientService } from './PatientService';

export const MovementService = {
  getMovements: async (): Promise<Movement[]> => {
    const PATH = 'movimentacoes';
    try {
      const q = query(collection(db, PATH), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Movement));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PATH);
      return [];
    }
  },

  subscribeToMovements: (callback: (movements: Movement[]) => void) => {
    const PATH = 'movimentacoes';
    const q = query(collection(db, PATH), orderBy('date', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Movement)));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PATH);
    });
  },

  addMovement: async (movement: Omit<Movement, 'id' | 'createdAt'>): Promise<Movement> => {
    const PATH = 'movimentacoes';
    const id = crypto.randomUUID();
    const newMovement: Movement = {
      ...movement,
      id,
      createdAt: new Date().toISOString(),
      createdBy: auth.currentUser?.email || 'unknown'
    };
    
    try {
      await setDoc(doc(db, PATH, id), newMovement);

      // SIDE EFFECT: If type is 'Alta', update patient status
      if (movement.type === 'Alta') {
        await PatientService.updatePatient(movement.patientId, { 
          status: 'Alta',
          dischargeDate: movement.date 
        });
      }

      return newMovement;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, PATH);
      throw error;
    }
  },

  deleteMovement: async (id: string): Promise<void> => {
    const PATH = 'movimentacoes';
    try {
      await deleteDoc(doc(db, PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, PATH);
      throw error;
    }
  }
};
