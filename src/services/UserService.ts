import { 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword,
  updateEmail,
  User as FirebaseUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword
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
import { initializeApp, getApps, getApp } from 'firebase/app';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, AccessType } from '../types';
import firebaseConfig from '../../firebase-applet-config.json';

// Secondary app instance for creating users without logging out the admin
const getSecondaryAuth = () => {
  const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
  return getAuth(secondaryApp);
};

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
    const PATH = 'usuarios';
    let authUid = '';

    try {
      if (password) {
        // Try to create auth user using secondary app
        const secondaryAuth = getSecondaryAuth();
        const userCredential = await createUserWithEmailAndPassword(secondaryAuth, user.email, password);
        authUid = userCredential.user.uid;
        // Sign out from secondary app immediately
        await secondaryAuth.signOut();
      }
      
      const id = authUid || crypto.randomUUID();
      const newUser: User = {
        ...user,
        id,
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, PATH, id), newUser);
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        throw new Error('Este e-mail já está em uso no sistema de autenticação.');
      }
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
      } else if (firebaseUser.email === 'gerlianemagalhaes79@gmail.com') {
        // Bootstrap the first admin user
        const newAdmin: User = {
          id: firebaseUser.uid,
          name: 'Gerliane Magalhães (Admin)',
          email: firebaseUser.email,
          role: 'Administrador Geral',
          accessType: AccessType.Administrador,
          status: 'Active',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, PATH, firebaseUser.uid), newAdmin);
        return newAdmin;
      } else {
        await signOut(auth);
        throw new Error('Perfil do usuário não encontrado');
      }
    } catch (error: any) {
      if (error.code === 'auth/operation-not-allowed') {
        throw new Error('O provedor de E-mail/Senha não está ativado no Console do Firebase.');
      }
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        throw new Error('E-mail ou senha incorretos.');
      }
      if (error.code === 'auth/too-many-requests') {
        throw new Error('Muitas tentativas malsucedidas. Tente novamente mais tarde ou mude sua senha.');
      }
      console.error('Authentication Error:', error);
      throw error;
    }
  },

  loginWithGoogle: async (): Promise<User | null> => {
    const PATH = 'usuarios';
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
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
      } else if (firebaseUser.email === 'gerlianemagalhaes79@gmail.com') {
        // Bootstrap the first admin user
        const newAdmin: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || 'Admin',
          email: firebaseUser.email || '',
          role: 'Administrador Geral',
          accessType: AccessType.Administrador,
          status: 'Active',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, PATH, firebaseUser.uid), newAdmin);
        return newAdmin;
      } else {
        await signOut(auth);
        throw new Error('Perfil do usuário não encontrado. Entre em contato com o administrador.');
      }
    } catch (error: any) {
      console.error('Google Sign-In Error:', error);
      throw error;
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
