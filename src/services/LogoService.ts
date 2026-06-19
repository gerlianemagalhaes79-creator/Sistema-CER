import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

export interface ClinicLogos {
  ouvidoria?: string;    // Base64 string of the ombudsman logo
  policlinica?: string;  // Base64 string of the policlinic logo
  consorcio?: string;    // Base64 string of the consortium logo
}

export const LogoService = {
  getLogosOnce: async (): Promise<ClinicLogos> => {
    const PATH = 'settings/logos';
    try {
      const docRef = doc(db, 'settings', 'logos');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as ClinicLogos;
      }
      return {};
    } catch (error) {
      console.warn("Using fallback/empty default logos due to connection error:", error);
      return {};
    }
  },

  subscribeToLogos: (callback: (logos: ClinicLogos) => void) => {
    const docRef = doc(db, 'settings', 'logos');
    return onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        callback(snap.data() as ClinicLogos);
      } else {
        callback({});
      }
    }, (error) => {
      // Treat silently or warn since we fallback graceful
      console.warn("Could not subscribe to logos (may be network/permission/missing template):", error);
      callback({});
    });
  },

  saveLogos: async (logos: ClinicLogos): Promise<void> => {
    const PATH = 'settings/logos';
    try {
      const docRef = doc(db, 'settings', 'logos');
      await setDoc(docRef, logos);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, PATH);
    }
  }
};
