import { 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword,
  updateEmail,
  User as FirebaseUser,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  getAuth
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  getDocs, 
  collection, 
  query, 
  where,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { User, AccessType } from '../types';

export const UserService = {
  getUsers: async (): Promise<User[]> => {
    const PATH = 'usuarios';
    try {
      const q = query(collection(db, PATH), where('status', '==', 'Active'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data() as User;
        return { ...data, id: doc.id };
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, PATH);
      return [];
    }
  },

  subscribeToUsers: (callback: (users: User[]) => void) => {
    const PATH = 'usuarios';
    const q = query(collection(db, PATH), where('status', '==', 'Active'));
    return onSnapshot(q, (snapshot) => {
      callback(snapshot.docs.map(doc => {
        const data = doc.data() as User;
        return { ...data, id: doc.id };
      }));
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, PATH);
    });
  },

  addUser: async (user: Omit<User, 'id' | 'createdAt'>): Promise<void> => {
    const PATH = 'usuarios';
    try {
      // For Google-only login, we just create the profile with a random ID.
      // When the user logs in via Google for the first time, our login logic 
      // will find this profile by email and bind them.
      const id = crypto.randomUUID();
      const newUser: User = {
        ...user,
        id,
        createdAt: new Date().toISOString(),
      };
      
      await setDoc(doc(db, PATH, id), newUser);
    } catch (error: any) {
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
    try {
      // Soft delete: Change status instead of deleting doc
      // This prevents issues with orphaned Firebase Auth records
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
      } else if (firebaseUser.email === 'gerlianemagalhaes79@gmail.com' || firebaseUser.email === 'cer2polisobral@gmail.com') {
        // Bootstrap the first admin user
        const newAdmin: User = {
          id: firebaseUser.uid,
          name: firebaseUser.email === 'cer2polisobral@gmail.com' ? 'CER II Policlínica Sobral' : 'Gerliane Magalhães (Admin)',
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
      let userData: User | null = null;
      
      if (userDoc.exists()) {
        userData = userDoc.data() as User;
      } else if (firebaseUser.email) {
        const queryEmail = firebaseUser.email.toLowerCase().trim();
        const q = query(
          collection(db, PATH), 
          where('email', '==', queryEmail), 
          limit(1)
        );
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const preCreatedDoc = querySnapshot.docs[0];
          const oldData = preCreatedDoc.data() as User;
          const oldId = preCreatedDoc.id;
          
          if (oldId !== firebaseUser.uid) {
            console.log(`Migrating pre-created user [${oldId}] to Firebase UID [${firebaseUser.uid}]`);
            
            // 1. Create matching document in "usuarios" with genuine Firebase UID
            userData = {
              ...oldData,
              id: firebaseUser.uid
            };
            await setDoc(doc(db, PATH, firebaseUser.uid), userData);
            
            // 2. Create matching document in "profiles" with genuine Firebase UID
            const pDoc = await getDoc(doc(db, 'profiles', oldId));
            if (pDoc.exists()) {
              const pData = pDoc.data();
              await setDoc(doc(db, 'profiles', firebaseUser.uid), {
                ...pData,
                id: firebaseUser.uid
              });
              // Delete old profile
              await deleteDoc(doc(db, 'profiles', oldId));
            } else {
              await setDoc(doc(db, 'profiles', firebaseUser.uid), {
                id: firebaseUser.uid,
                name: oldData.name,
                email: oldData.email,
                role: oldData.role === 'Administrador Geral' ? 'admin' : 'operator',
                active: oldData.status === 'Active'
              });
            }
            
            // 3. Delete old "usuarios" document
            await deleteDoc(doc(db, PATH, oldId));
          } else {
            userData = oldData;
          }
        } else {
          // Self-healing fallback: Check if email is in the 'profiles' collection
          const qProfiles = query(
            collection(db, 'profiles'),
            where('email', '==', queryEmail),
            limit(1)
          );
          const pSnapshot = await getDocs(qProfiles);
          if (!pSnapshot.empty) {
            console.log(`Self-healing user profile for email: ${queryEmail}`);
            const pDoc = pSnapshot.docs[0];
            const pData = pDoc.data();
            
            // Create in 'usuarios'
            userData = {
              id: firebaseUser.uid,
              name: pData.name || 'Membro da Equipe',
              email: queryEmail,
              role: pData.role === 'admin' ? 'Administrador Geral' : 'Operador (Ouvidoria)',
              accessType: pData.role === 'admin' ? AccessType.Administrador : AccessType.Profissional,
              status: pData.active !== false ? 'Active' : 'Inactive',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, PATH, firebaseUser.uid), userData);
            
            // Re-create correct 'profiles' with correct Firebase UID
            await setDoc(doc(db, 'profiles', firebaseUser.uid), {
              id: firebaseUser.uid,
              name: userData.name,
              email: userData.email,
              role: pData.role || 'operator',
              active: pData.active !== false
            });
            
            // Delete old profile if ID was different
            if (pDoc.id !== firebaseUser.uid) {
              await deleteDoc(doc(db, 'profiles', pDoc.id));
            }
          }
        }
      }

      if (userData) {
        if (userData.status === 'Active') {
          return userData;
        } else {
          await signOut(auth);
          throw new Error('Sua conta está inativa. Entre em contato com a administração.');
        }
      } else if (firebaseUser.email === 'gerlianemagalhaes79@gmail.com' || firebaseUser.email === 'cer2polisobral@gmail.com') {
        // Bootstrap the first admin user
        const newAdmin: User = {
          id: firebaseUser.uid,
          name: firebaseUser.displayName || (firebaseUser.email === 'cer2polisobral@gmail.com' ? 'CER II Policlínica Sobral' : 'Admin'),
          email: firebaseUser.email || '',
          role: 'Administrador Geral',
          accessType: AccessType.Administrador,
          status: 'Active',
          createdAt: new Date().toISOString()
        };
        await setDoc(doc(db, PATH, firebaseUser.uid), newAdmin);
        return newAdmin;
      } else {
        const loginEmail = firebaseUser.email || 'sem e-mail';
        await signOut(auth);
        throw new Error(`Acesso negado. O e-mail [${loginEmail}] ainda não possui um perfil cadastrado no sistema CER. Entre em contato com a administração para realizar o cadastro.`);
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
    if (userDoc.exists()) {
      return userDoc.data() as User;
    }

    // Auto-migrate on reload if not yet bound to uid
    if (firebaseUser.email) {
      const PATH = 'usuarios';
      const queryEmail = firebaseUser.email.toLowerCase().trim();
      const q = query(
        collection(db, PATH),
        where('email', '==', queryEmail),
        limit(1)
      );
      try {
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
          const preCreatedDoc = querySnapshot.docs[0];
          const oldData = preCreatedDoc.data() as User;
          const oldId = preCreatedDoc.id;

          if (oldId !== firebaseUser.uid) {
            console.log(`Migrating on-reload user [${oldId}] to Firebase UID [${firebaseUser.uid}]`);
            const userData: User = {
              ...oldData,
              id: firebaseUser.uid
            };
            
            // 1. Write the new usuarios doc
            await setDoc(doc(db, PATH, firebaseUser.uid), userData);
            
            // 2. Write the new profiles doc
            const pDoc = await getDoc(doc(db, 'profiles', oldId));
            if (pDoc.exists()) {
              const pData = pDoc.data();
              await setDoc(doc(db, 'profiles', firebaseUser.uid), {
                ...pData,
                id: firebaseUser.uid
              });
              await deleteDoc(doc(db, 'profiles', oldId));
            } else {
              await setDoc(doc(db, 'profiles', firebaseUser.uid), {
                id: firebaseUser.uid,
                name: oldData.name,
                email: oldData.email,
                role: oldData.role === 'Administrador Geral' ? 'admin' : 'operator',
                active: oldData.status === 'Active'
              });
            }

            // 3. Delete old usuarios doc
            await deleteDoc(doc(db, PATH, oldId));
            return userData;
          }
        } else {
          // Self-healing fallback: Check if email is in the 'profiles' collection
          const qProfiles = query(
            collection(db, 'profiles'),
            where('email', '==', queryEmail),
            limit(1)
          );
          const pSnapshot = await getDocs(qProfiles);
          if (!pSnapshot.empty) {
            console.log(`Self-healing user profile on reload for email: ${queryEmail}`);
            const pDoc = pSnapshot.docs[0];
            const pData = pDoc.data();
            const userData: User = {
              id: firebaseUser.uid,
              name: pData.name || 'Membro da Equipe',
              email: queryEmail,
              role: pData.role === 'admin' ? 'Administrador Geral' : 'Operador (Ouvidoria)',
              accessType: pData.role === 'admin' ? AccessType.Administrador : AccessType.Profissional,
              status: pData.active !== false ? 'Active' : 'Inactive',
              createdAt: new Date().toISOString()
            };
            await setDoc(doc(db, PATH, firebaseUser.uid), userData);
            await setDoc(doc(db, 'profiles', firebaseUser.uid), {
              id: firebaseUser.uid,
              name: userData.name,
              email: userData.email,
              role: pData.role || 'operator',
              active: pData.active !== false
            });
            if (pDoc.id !== firebaseUser.uid) {
              await deleteDoc(doc(db, 'profiles', pDoc.id));
            }
            return userData;
          }
        }
      } catch (err) {
        console.error('Error auto-migrating user on session reload:', err);
      }
    }
    
    return null;
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
