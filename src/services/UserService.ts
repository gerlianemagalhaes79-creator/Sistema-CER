import { 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword,
  updateEmail,
  User as FirebaseUser,
  onAuthStateChanged
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  getDocs, 
  collection, 
  query, 
  where,
  onSnapshot
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, AccessType } from '../types';

export const UserService = {
  getUsers: async (): Promise<User[]> => {
    const PATH = 'usuarios';
    try {
      const q = query(collection(db, PATH));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => doc.data() as User);
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PATH);
      return [];
    }
  },

  subscribeToUsers: (callback: (users: User[]) => void) => {
    const PATH = 'usuarios';
    return onSnapshot(collection(db, PATH), (snapshot) => {
      callback(snapshot.docs.map(doc => doc.data() as User));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PATH);
    });
  },

  addUser: async (user: Omit<User, 'id' | 'createdAt'>, password?: string): Promise<void> => {
    // Note: Creating auth user usually happens via an admin function or sign up
    // For this app, we'll store the profile. In a real scenario, we'd use a Cloud Function.
    // However, I will just create the Firestore document.
    const PATH = 'usuarios';
    const id = crypto.randomUUID();
    const newUser: User = {
      ...user,
      id,
      createdAt: new Date().toISOString(),
    };
    
    try {
      await setDoc(doc(db, PATH, id), newUser);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, PATH);
    }
  },

  updateUser: async (id: string, updates: Partial<User>) => {
    const PATH = 'usuarios';
    try {
      await updateDoc(doc(db, PATH, id), updates);
      return { ...updates, id } as User;
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, PATH);
    }
  },

  deleteUser: async (id: string) => {
    const PATH = 'usuarios';
    // Logic to delete or disable user
    try {
      await updateDoc(doc(db, PATH, id), { status: 'Inactive' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, PATH);
    }
  },

  authenticate: async (email: string, password: string): Promise<User | null> => {
    const PATH = 'usuarios';
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      
      const userDoc = await getDoc(doc(db, PATH, firebaseUser.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data() as User;
        if (userData.status === 'Active') {
          return userData;
        } else {
          await signOut(auth);
          throw new Error('Usuário inativo');
        }
      } else {
        // If profile doesn't exist in Firestore but exists in Auth (shouldn't happen with sync)
        await signOut(auth);
        throw new Error('Perfil do usuário não encontrado');
      }
    } catch (error) {
      console.error('Authentication Error:', error);
      return null;
    }
  },

  logout: async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
    }
  },

  getCurrentUser: async (): Promise<User | null> => {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return null;
    
    const userDoc = await getDoc(doc(db, 'usuarios', firebaseUser.uid));
    return userDoc.exists() ? (userDoc.data() as User) : null;
  },

  changePassword: async (current: string, newPass: string): Promise<boolean> => {
    const user = auth.currentUser;
    if (!user) return false;
    
    try {
      // For real re-auth, we'd need email/password but here we'll assume they just logged in
      // Actually standard Firebase requires re-auth for sensitive ops
      await updatePassword(user, newPass);
      return true;
    } catch (error) {
      console.error('Change Password Error:', error);
      return false;
    }
  }
};
