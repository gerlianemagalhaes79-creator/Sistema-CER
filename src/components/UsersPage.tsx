import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  UserCog, 
  UserPlus, 
  Search, 
  User as UserIcon, 
  Shield, 
  Check, 
  X, 
  Loader2, 
  Info,
  Trash2,
  ToggleLeft,
  ToggleRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  setDoc,
  deleteDoc
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';

// Local Interface to match Firestore "profiles" collection structure directly
interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'operator' | 'admin';
  active: boolean;
}

// Utility function to merge Tailwind classes similar to "cn"
function cn(...classes: (string | boolean | undefined | null)[]) {
  return classes.filter(Boolean).join(' ');
}

export const UsersPage = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Registration Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [roleValue, setRoleValue] = useState<'operator' | 'admin'>('operator');
  const [submitting, setSubmitting] = useState(false);

  // Search filter
  const [search, setSearch] = useState('');

  // Inline deletion confirmation tracking
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  // Toast Notification State
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'success'
  });

  // Load registered users from "profiles" collection in real time
  useEffect(() => {
    const PATH = 'profiles';
    const q = query(collection(db, PATH), orderBy('name', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedProfiles: Profile[] = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || '',
          email: data.email || '',
          role: data.role || 'operator',
          active: data.active !== undefined ? data.active : true
        } as Profile;
      });
      setProfiles(fetchedProfiles);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching profiles in real-time:', error);
      handleFirestoreError(error, OperationType.LIST, PATH);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Toast auto-hide logic
  useEffect(() => {
    if (toast.show) {
      const timer = setTimeout(() => {
        setToast(prev => ({ ...prev, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast.show]);

  const triggerNotification = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({
      show: true,
      message,
      type
    });
  };

  // Submit profile creation to Firestore "profiles"
  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      triggerNotification('Por favor, informe o Nome Completo.', 'error');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      triggerNotification('Por favor, informe um e-mail válido.', 'error');
      return;
    }

    setSubmitting(true);
    const PATH = 'profiles';
    try {
      // Check if email already registered
      const isEmailTaken = profiles.some(p => p.email.toLowerCase() === email.trim().toLowerCase());
      if (isEmailTaken) {
        throw new Error('Este e-mail já possui um perfil cadastrado.');
      }

      const tempId = `id_${Date.now()}`;
      const newProfile: Omit<Profile, 'id'> = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role: roleValue,
        active: true
      };

      await setDoc(doc(db, PATH, tempId), newProfile);

      // Clear form & close
      setName('');
      setEmail('');
      setRoleValue('operator');
      setIsFormOpen(false);

      triggerNotification('Perfil de membro da equipe criado com sucesso!', 'success');
    } catch (err: any) {
      console.error('Error adding profile:', err);
      triggerNotification(err.message || 'Erro ao cadastrar novo perfil no banco de dados.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Switch Active / Inactive status in real time via Firestore
  const handleToggleStatus = async (profile: Profile) => {
    const PATH = 'profiles';
    try {
      await updateDoc(doc(db, PATH, profile.id), {
        active: !profile.active
      });
      triggerNotification(
        `Membro ${profile.name} foi ${!profile.active ? 'ativado' : 'desativado'} com sucesso!`, 
        'success'
      );
    } catch (error) {
      console.error('Error updating profile status:', error);
      triggerNotification('Erro de conexão ao alternar status do membro no banco de dados.', 'error');
    }
  };

  // Toggle role in real-time between operator and admin via Firestore
  const handleToggleRole = async (profile: Profile) => {
    const PATH = 'profiles';
    const nextRole = profile.role === 'admin' ? 'operator' : 'admin';
    const roleText = nextRole === 'admin' ? 'Administrador' : 'Operador (Ouvidoria)';
    
    try {
      await updateDoc(doc(db, PATH, profile.id), {
        role: nextRole
      });
      triggerNotification(
        `Cargo de ${profile.name} alterado para ${roleText} com sucesso!`,
        'success'
      );
    } catch (error) {
      console.error('Error updating profile role:', error);
      triggerNotification('Erro de conexão ao alterar cargo do membro no banco de dados.', 'error');
    }
  };

  // Safe deletion via Firestore
  const handleConfirmDelete = async (id: string) => {
    const PATH = 'profiles';
    setDeletingInProgress(true);
    try {
      await deleteDoc(doc(db, PATH, id));
      triggerNotification('Perfil de usuário excluído permanentemente do banco de dados!', 'success');
      setDeletingUserId(null);
    } catch (error) {
      console.error('Error deleting profile document:', error);
      triggerNotification('Erro de conexão ao excluir perfil de usuário do banco de dados.', 'error');
    } finally {
      setDeletingInProgress(false);
    }
  };

  // Search filter computing (case-insensitive on name and email)
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      const term = search.toLowerCase().trim();
      if (!term) return true;
      return (
        p.name.toLowerCase().includes(term) || 
        p.email.toLowerCase().includes(term)
      );
    });
  }, [profiles, search]);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full relative space-y-6"
    >
      {/* Toast Notification Box */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={cn(
              "fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border max-w-sm w-full transition-all duration-300",
              toast.type === 'success' ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-600/10' :
              toast.type === 'error' ? 'bg-rose-600 text-white border-rose-500 shadow-rose-600/10' :
              'bg-slate-600 text-white border-slate-500'
            )}
          >
            <div className="bg-white/10 p-2 rounded-xl shrink-0">
              {toast.type === 'success' ? (
                <Check size={18} />
              ) : toast.type === 'error' ? (
                <X size={18} />
              ) : (
                <Info size={18} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight break-words">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="text-white/70 hover:text-white transition-colors shrink-0"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-sans space-y-6">
        
        {/* Header Block Section */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 id="main-title" className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <UserCog className="text-blue-600 shrink-0" size={26} />
              Gestão de Usuários
            </h2>
            <p className="text-sm font-semibold text-slate-500 leading-relaxed">
              Controle de acessos e cargos da ouvidoria.
            </p>
          </div>

          {/* Action button on the right side */}
          <div className="self-start sm:self-center">
            <button
              id="btn-new-user"
              onClick={() => setIsFormOpen(!isFormOpen)}
              className={cn(
                "px-5 py-3 rounded-xl font-extrabold text-xs md:text-sm shadow-md transition-all flex items-center gap-2 active:scale-95 cursor-pointer",
                isFormOpen 
                  ? "bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-none border border-slate-200" 
                  : "bg-blue-600 text-white hover:bg-blue-700 hover:shadow-blue-500/10"
              )}
            >
              <UserPlus size={18} />
              Novo Usuário
            </button>
          </div>
        </div>

        {/* Collapsible Sanfona Registration Form */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden bg-slate-50 border-b border-slate-200/50"
            >
              <div className="p-6 md:p-8 space-y-6">
                <form onSubmit={handleCreateProfile} className="space-y-4 max-w-4xl mx-auto">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Nome Completo
                      </label>
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="João Silva"
                        disabled={submitting}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        E-mail
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="joao@policlinica.com"
                        disabled={submitting}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
                      />
                    </div>

                    {/* Cargo / Selection */}
                    <div className="space-y-2">
                      <label className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">
                        Cargo
                      </label>
                      <select
                        value={roleValue}
                        onChange={(e) => setRoleValue(e.target.value as 'operator' | 'admin')}
                        disabled={submitting}
                        className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer appearance-none"
                      >
                        <option value="operator">Operador (Ouvidoria)</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

                  {/* Submit Button aligned to the right */}
                  <div className="flex items-center justify-end pt-2">
                    <button
                      type="submit"
                      disabled={submitting || !name.trim() || !email.trim()}
                      className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs md:text-sm font-bold tracking-wide shadow-sm transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer"
                    >
                      {submitting ? (
                        <Loader2 size={16} className="animate-spin text-white" />
                      ) : (
                        <Check size={16} />
                      )}
                      Criar Perfil
                    </button>
                  </div>
                </form>

                {/* Secure Information Box */}
                <div className="max-w-4xl mx-auto">
                  <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 flex gap-4">
                    <div className="text-amber-500 shrink-0">
                      <Shield size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-black text-xs text-amber-800 uppercase tracking-wider">Aviso de Acesso</h4>
                      <p className="text-xs text-amber-700/90 font-semibold leading-relaxed">
                        Nota: Criar um perfil aqui autoriza o acesso. O usuário deverá utilizar o mesmo e-mail para fazer login via Google ou solicitar redefinição de senha para o primeiro acesso.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Searching filter panel */}
        <div className="px-6 md:px-8">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar equipe por nome ou e-mail..."
              className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all placeholder:text-slate-450"
            />
          </div>
        </div>

        {/* Responsive Table Area */}
        <div className="px-6 md:px-8 pb-8">
          {loading ? (
            <div className="py-20 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-600 font-bold" size={36} />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest animate-pulse">Carregando membros da equipe...</span>
              </div>
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50">
              <div className="max-w-xs mx-auto space-y-3">
                <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-dashed border-slate-300">
                  <UserIcon size={22} />
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-700 text-sm">Nenhum perfil encontrado.</p>
                  <p className="text-xs font-medium text-slate-400">Verifique os termos buscados ou adicione um novo membro à equipe.</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200">
                      <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest">Usuário</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest">Cargo</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-450 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {filteredProfiles.map((p) => {
                      const isUserAdmin = p.role === 'admin';
                      
                      return (
                        <motion.tr 
                          key={p.id}
                          layout
                          className="hover:bg-slate-50/65 transition-colors group"
                        >
                          {/* User Column */}
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              {/* Decorative Circle Icon */}
                              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200/60 flex items-center justify-center text-slate-700 font-bold shrink-0 shadow-3xs">
                                <UserIcon size={16} />
                              </div>
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-slate-800 truncate tracking-tight">{p.name}</p>
                                <p className="text-xs text-slate-400 font-medium truncate">{p.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Status Badge Column */}
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border transition-all duration-300",
                              p.active 
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100" 
                                : "bg-slate-100 text-slate-400 border-slate-200/50"
                            )}>
                              {p.active ? 'Ativo' : 'Inativo'}
                            </span>
                          </td>

                          {/* Role with Icon Column (Dynamically styled: indigo/purple for Admin, orange/amber for Operator) */}
                          <td className="px-6 py-4">
                            <span className={cn(
                              "px-2.5 py-1 rounded-xl text-xs font-bold border flex items-center gap-1.5 w-fit transition-all duration-300",
                              isUserAdmin 
                                ? "bg-indigo-50 text-indigo-600 border-indigo-150/40" 
                                : "bg-amber-50 text-amber-600 border-amber-150/40"
                            )}>
                              {isUserAdmin ? (
                                <Shield size={13} className="text-indigo-600 shrink-0" />
                              ) : (
                                <UserIcon size={13} className="text-amber-500 shrink-0" />
                              )}
                              {isUserAdmin ? 'Administrador' : 'Operador (Ouvidoria)'}
                            </span>
                          </td>

                          {/* Actions Column (Fades in smoothly on row hover) */}
                          <td className="px-6 py-4 text-right">
                            <div className="opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-200 flex items-center justify-end gap-2">
                              {deletingUserId === p.id ? (
                                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 px-2 py-1 rounded-xl transition-all animate-pulse">
                                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 scale-95">Deletar?</span>
                                  <button
                                    onClick={() => handleConfirmDelete(p.id)}
                                    disabled={deletingInProgress}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white text-[9px] font-black uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                                  >
                                    Confirmar
                                  </button>
                                  <button
                                    onClick={() => setDeletingUserId(null)}
                                    disabled={deletingInProgress}
                                    className="p-0.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                                  >
                                    <X size={12} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  {/* Alternar Cargo (UserCog) */}
                                  <button
                                    onClick={() => handleToggleRole(p)}
                                    className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-slate-200/40 hover:border-indigo-100 rounded-xl transition-all cursor-pointer"
                                    title="Alternar Cargo (Admin / Operador)"
                                  >
                                    <UserCog size={15} />
                                  </button>

                                  {/* Toggle Active Switcher (ToggleLeft / ToggleRight) */}
                                  <button
                                    onClick={() => handleToggleStatus(p)}
                                    className={cn(
                                      "p-1.5 border rounded-xl transition-all cursor-pointer",
                                      p.active 
                                        ? "text-emerald-500 bg-emerald-50/40 border-emerald-100 hover:border-emerald-250 hover:bg-emerald-50" 
                                        : "text-slate-400 bg-slate-50 border-slate-200 hover:border-slate-350 hover:bg-slate-100"
                                    )}
                                    title={p.active ? 'Desativar Membro' : 'Ativar Membro'}
                                  >
                                    {p.active ? (
                                      <ToggleRight size={16} />
                                    ) : (
                                      <ToggleLeft size={16} />
                                    )}
                                  </button>

                                  {/* Delete safe trigger */}
                                  <button
                                    onClick={() => setDeletingUserId(p.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 rounded-xl transition-all cursor-pointer"
                                    title="Remover Membro"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
