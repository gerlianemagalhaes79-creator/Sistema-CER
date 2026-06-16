import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where,
  onSnapshot,
  setDoc,
  orderBy,
  writeBatch,
  Timestamp,
  limit
} from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { EvaluationForm, SectorEvaluation } from '../types';

// Safe date utility to handle both string and Firebase Timestamps seamlessly
export const safeISOString = (val: any): string => {
  if (!val) return new Date().toISOString();
  if (typeof val.toDate === 'function') {
    return val.toDate().toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  if (val.seconds !== undefined) {
    return new Date(val.seconds * 1000).toISOString();
  }
  return new Date(val).toISOString();
};

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
    sectorRatings: { sector: string; rating: 'Otimo' | 'Bom' | 'Regular' | 'Ruim' | 'Ótimo' | 'Não informou'; comment?: string }[],
    source: 'patient' | 'physical' = 'patient',
    customDate?: string,
    createdBy?: string,
    createdByName?: string,
    patientName?: string
  ): Promise<void> => {
    // Ensure we are authenticated (e.g., anonymously)
    await SurveyService.ensureAnonymousAuth();

    const formId = crypto.randomUUID();
    const now = new Date();
    
    // Parse customDate or use now
    let dateObj = now;
    if (customDate) {
      dateObj = new Date(customDate + 'T12:00:00.000Z');
      if (isNaN(dateObj.getTime())) {
        dateObj = now;
      }
    }

    const dateTimestamp = Timestamp.fromDate(dateObj);
    const createdAtTimestamp = Timestamp.fromDate(now);

    const batch = writeBatch(db);

    const finalCreatedBy = createdBy || auth.currentUser?.uid || 'anonymous';
    const finalCreatedByName = createdByName || (auth.currentUser?.isAnonymous ? 'Anônimo' : 'Colaborador');

    // 1. Prepare Form document
    const formRef = doc(db, 'forms', formId);
    const form = {
      id: formId,
      
      // New required structure
      date: dateTimestamp,
      createdAt: createdAtTimestamp,
      createdByName: finalCreatedByName,
      createdBy: finalCreatedBy,
      observation: generalComment,
      recommendationScore: npsScore,
      patientName: patientName || '',

      // For backwards compatibility with older reports page queries
      npsScore,
      generalComment,
      source,
    };
    batch.set(formRef, form);

    // Helpers to normalize accented enum values
    const mapRating = (r: string): 'Ótimo' | 'Bom' | 'Regular' | 'Ruim' | 'Não informou' => {
      if (r === 'Otimo' || r === 'Ótimo') return 'Ótimo';
      if (r === 'Bom') return 'Bom';
      if (r === 'Regular') return 'Regular';
      if (r === 'Ruim') return 'Ruim';
      return 'Não informou';
    };

    const mapOldRating = (r: string): 'Otimo' | 'Bom' | 'Regular' | 'Ruim' => {
      if (r === 'Ótimo' || r === 'Otimo') return 'Otimo';
      if (r === 'Bom') return 'Bom';
      if (r === 'Regular') return 'Regular';
      return 'Ruim';
    };

    // 2. Prepare each Sector Evaluation document
    for (const item of sectorRatings) {
      const evalId = crypto.randomUUID();
      const sectorEvalRef = doc(db, 'evaluations', evalId);
      
      const valRating = mapRating(item.rating);
      const valOldRating = mapOldRating(item.rating);

      const sectorEval = {
        id: evalId,
        formId,
        sector: item.sector,
        rating: valRating,               // Accent as requested
        observation: item.comment || '', // New field name requested
        createdAt: createdAtTimestamp,

        // Fallbacks for older dashboard views
        comment: item.comment || '',
        rating_legacy: valOldRating
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
      callback(snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id,
          createdAt: safeISOString(data.createdAt),
          npsScore: data.recommendationScore !== undefined ? data.recommendationScore : (data.npsScore || 0),
          generalComment: data.observation !== undefined ? data.observation : (data.generalComment || ''),
          source: data.source || 'physical',
        } as EvaluationForm;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'forms');
    });
  },

  subscribeToEvaluations: (callback: (evaluations: SectorEvaluation[]) => void) => {
    const q = query(collection(db, 'evaluations'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => {
        const data = doc.data();
        let mappedRating = data.rating;
        if (mappedRating === 'Ótimo') {
          mappedRating = 'Otimo';
        }
        return {
          ...data,
          id: doc.id,
          createdAt: safeISOString(data.createdAt),
          rating: mappedRating as any,
          comment: data.observation !== undefined ? data.observation : (data.comment || ''),
        } as SectorEvaluation;
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'evaluations');
    });
  }
};
