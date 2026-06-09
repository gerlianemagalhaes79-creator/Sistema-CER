import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where,
  onSnapshot,
  setDoc,
  orderBy,
  writeBatch
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { EvaluationForm, SectorEvaluation } from '../types';

export const SurveyService = {
  ensureAnonymousAuth: async (): Promise<void> => {
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }
    } catch (error) {
      console.error("Erro na autenticação anônima do paciente em segundo plano:", error);
    }
  },

  submitSurvey: async (
    npsScore: number, 
    generalComment: string, 
    sectorRatings: { sector: string; rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim'; comment?: string }[],
    source: 'patient' | 'physical' = 'patient'
  ): Promise<void> => {
    // Ensure we are authenticated (e.g., anonymously)
    await SurveyService.ensureAnonymousAuth();

    const formId = crypto.randomUUID();
    const createdAt = new Date().toISOString();

    const batch = writeBatch(db);

    // 1. Prepare Form document
    const formRef = doc(db, 'forms', formId);
    const form: EvaluationForm = {
      id: formId,
      npsScore,
      generalComment,
      source,
      createdAt
    };
    batch.set(formRef, form);

    // 2. Prepare each Sector Evaluation document
    for (const item of sectorRatings) {
      const evalId = crypto.randomUUID();
      const sectorEvalRef = doc(db, 'evaluations', evalId);
      const sectorEval: SectorEvaluation = {
        id: evalId,
        formId,
        sector: item.sector,
        rating: item.rating,
        comment: item.comment || '',
        createdAt
      };
      batch.set(sectorEvalRef, sectorEval);
    }

    // 3. Commit atomically
    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'submit_survey');
      throw error;
    }
  },

  subscribeToForms: (callback: (forms: EvaluationForm[]) => void) => {
    const q = query(collection(db, 'forms'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as EvaluationForm));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'forms');
    });
  },

  subscribeToEvaluations: (callback: (evaluations: SectorEvaluation[]) => void) => {
    const q = query(collection(db, 'evaluations'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as SectorEvaluation));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'evaluations');
    });
  }
};
