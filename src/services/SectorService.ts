import { 
  collection, 
  doc, 
  updateDoc, 
  deleteDoc,
  query, 
  onSnapshot,
  orderBy,
  serverTimestamp,
  addDoc,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Sector } from '../types';

export const SectorService = {
  subscribeToSectors: (callback: (sectors: Sector[]) => void, onError?: (err: any) => void) => {
    const PATH = 'sectors';
    const q = query(collection(db, PATH), orderBy('name', 'asc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          name: data.name,
          active: data.active ?? true,
          createdAt: data.createdAt
        } as Sector;
      }));
    }, (error) => {
      if (onError) onError(error);
      handleFirestoreError(error, OperationType.LIST, PATH);
    });
  },

  addSector: async (name: string): Promise<void> => {
    const PATH = 'sectors';
    try {
      const colRef = collection(db, PATH);
      await addDoc(colRef, {
        name,
        active: true,
        createdAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, PATH);
    }
  },

  updateSector: async (id: string, active: boolean): Promise<void> => {
    const PATH = 'sectors';
    try {
      const docRef = doc(db, PATH, id);
      await updateDoc(docRef, { active });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, PATH);
    }
  },

  updateSectorName: async (id: string, name: string): Promise<void> => {
    const PATH = 'sectors';
    try {
      const docRef = doc(db, PATH, id);
      await updateDoc(docRef, { name });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, PATH);
    }
  },

  deleteSector: async (id: string): Promise<void> => {
    const PATH = 'sectors';
    try {
      await deleteDoc(doc(db, PATH, id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, PATH);
    }
  },

  populateDefaultSectors: async (): Promise<void> => {
    const PATH = 'sectors';
    const defaults = [
      "Portaria/Segurança", 
      "Recepção Geral", 
      "Triagem", 
      "Consultas Médicas", 
      "Consultas Multiprofissionais", 
      "Realização de Exames", 
      "Laboratório", 
      "Entrega de Exames", 
      "CER", 
      "Ambiente", 
      "Limpeza", 
      "Higiene e Organização dos Banheiros"
    ];
    try {
      for (const name of defaults) {
        const colRef = collection(db, PATH);
        await addDoc(colRef, {
          name,
          active: true,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, PATH);
    }
  },

  clearEvaluationsAndForms: async (): Promise<void> => {
    try {
      const formsSnapshot = await getDocs(collection(db, 'forms'));
      const evalsSnapshot = await getDocs(collection(db, 'evaluations'));
      
      const allDocs = [
        ...formsSnapshot.docs,
        ...evalsSnapshot.docs
      ];
      
      if (allDocs.length === 0) return;
      
      const BATCH_SIZE = 400;
      for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        const chunk = allDocs.slice(i, i + BATCH_SIZE);
        
        chunk.forEach(docSnap => {
          batch.delete(docSnap.ref);
        });
        
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'forms_and_evaluations');
    }
  }
};
