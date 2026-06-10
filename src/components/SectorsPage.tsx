import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Loader2, 
  Building2, 
  Check, 
  X, 
  Database,
  Trash2,
  Pencil,
  ShieldAlert,
  AlertTriangle,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Sector, User } from '../types';
import { SectorService } from '../services/SectorService';

interface SectorsPageProps {
  currentUser: User | null;
}

interface SectorRowProps {
  key?: any;
  sector: Sector;
  onToggleActive: (id: string, currentActive: boolean) => Promise<void>;
  onUpdateName: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNotify: (msg: string, type: 'success' | 'error' | 'info') => void;
}

const SectorRow = ({ sector, onToggleActive, onUpdateName, onDelete, onNotify }: SectorRowProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(sector.name);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(false);
  const editInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      setTimeout(() => {
        editInputRef.current?.focus();
        editInputRef.current?.select();
      }, 100);
    }
  }, [isEditing]);

  const handleSaveEdit = async () => {
    if (!editName.trim()) return;
    if (editName.trim() === sector.name) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onUpdateName(sector.id, editName.trim());
      onNotify('Setor atualizado com sucesso!', 'success');
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving updated name:', error);
      onNotify('Erro ao atualizar nome do setor.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async () => {
    setToggling(true);
    try {
      await onToggleActive(sector.id, sector.active);
      onNotify(`Setor ${sector.active ? 'desativado' : 'ativado'} com sucesso!`, 'success');
    } catch (error) {
      console.error('Error toggling status:', error);
      onNotify('Erro ao alterar status do setor.', 'error');
    } finally {
      setToggling(false);
    }
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(sector.id);
      onNotify('Setor excluído com sucesso!', 'success');
    } catch (error) {
      console.error('Error deleting:', error);
      onNotify('Erro ao excluir setor.', 'error');
      setDeleting(false);
      setIsDeleting(false);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className={`py-4 px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-300 ${
        sector.active ? 'bg-white' : 'bg-slate-50/50 opacity-80'
      }`}
    >
      {/* Left part: Indicator, text, inline input */}
      <div className="flex items-center gap-3.5 min-w-0 flex-1">
        {/* Sphere status indicator dot */}
        <div 
          className={`w-3 h-3 rounded-full shrink-0 shadow-xs transition-colors duration-300 ${
            sector.active ? 'bg-emerald-500 ring-2 ring-emerald-500/15' : 'bg-slate-300 ring-2 ring-slate-300/10'
          }`} 
        />

        {isEditing ? (
          <div className="flex items-center gap-2 flex-1 max-w-lg" onClick={(e) => e.stopPropagation()}>
            <input
              ref={editInputRef}
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              disabled={saving}
              className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 transition-all shadow-xs"
              placeholder="Digite o novo nome..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveEdit();
                if (e.key === 'Escape') {
                  setIsEditing(false);
                  setEditName(sector.name);
                }
              }}
            />
            <button
              onClick={handleSaveEdit}
              disabled={saving || !editName.trim()}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md shadow-blue-500/10 shrink-0"
              title="Salvar Alteração"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setEditName(sector.name);
              }}
              disabled={saving}
              className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-xl transition-all shrink-0"
              title="Cancelar"
            >
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0 flex-wrap">
            <span className={`font-bold text-sm md:text-base tracking-tight truncate ${
              sector.active ? 'text-slate-800' : 'text-slate-400 line-through'
            }`}>
              {sector.name}
            </span>
            {!sector.active && (
              <span className="px-2 py-0.5 text-[9px] font-black uppercase rounded-lg bg-slate-200 text-slate-600 border border-slate-300/50 tracking-wider shadow-2xs select-none">
                INATIVO
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
        {isDeleting ? (
          <div className="flex items-center gap-2 bg-rose-50 border border-rose-100 px-3 py-1.5 rounded-xl transition-all animate-pulse">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-700">Excluir?</span>
            <button
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-colors shadow-xs shadow-rose-500/20"
            >
              {deleting ? '...' : 'Confirmar'}
            </button>
            <button
              onClick={() => setIsDeleting(false)}
              disabled={deleting}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            {/* Status Switcher Button */}
            <button
              onClick={handleToggle}
              disabled={toggling || isEditing}
              className={`p-1.5 rounded-xl transition-all border ${
                sector.active 
                  ? 'text-amber-600 border-amber-100 bg-amber-50/40 hover:bg-amber-50 hover:border-amber-250' 
                  : 'text-emerald-600 border-emerald-100 bg-emerald-50/40 hover:bg-emerald-50 hover:border-emerald-250'
              }`}
              title={sector.active ? 'Desativar setor' : 'Ativar setor'}
            >
              {toggling ? (
                <Loader2 size={15} className="animate-spin" />
              ) : sector.active ? (
                <X size={15} />
              ) : (
                <Check size={15} />
              )}
            </button>

            {/* Inline editing button */}
            <button
              onClick={() => setIsEditing(true)}
              disabled={isEditing}
              className="p-1.5 text-blue-500 hover:text-blue-600 bg-blue-50/20 hover:bg-blue-50/50 border border-blue-50/40 hover:border-blue-100 rounded-xl transition-all shrink-0"
              title="Editar"
            >
              <Pencil size={14} />
            </button>

            {/* Inline deletion confirmation trigger */}
            <button
              onClick={() => setIsDeleting(true)}
              disabled={isEditing}
              className="p-1.5 text-rose-500 hover:text-rose-600 bg-rose-50/20 hover:bg-rose-50/50 border border-rose-50/40 hover:border-rose-100 rounded-xl transition-all shrink-0"
              title="Excluir"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const SectorsPage = ({ currentUser }: SectorsPageProps) => {
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [sectorName, setSectorName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [populating, setPopulating] = useState(false);

  // Administrative Clear States
  const [confirmKeyword, setConfirmKeyword] = useState('');
  const [isClearModalOpen, setIsClearModalOpen] = useState(false);
  const [clearingDb, setClearingDb] = useState(false);

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

  const inputRef = useRef<HTMLInputElement>(null);

  // Check if admin by access type or specific developer/admin email
  const isAdminUser = currentUser?.accessType === 'Administrador' || currentUser?.email === 'gerlianemagalhaes79@gmail.com';

  useEffect(() => {
    const unsubscribe = SectorService.subscribeToSectors((data) => {
      setSectors(data);
      setLoading(false);
    }, () => {
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (isFormOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isFormOpen]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectorName.trim()) return;

    setSubmitting(true);
    try {
      await SectorService.addSector(sectorName.trim());
      setSectorName('');
      setIsFormOpen(false);
      triggerNotification('Novo setor cadastrado com sucesso!', 'success');
    } catch (error) {
      console.error('Error adding sector:', error);
      triggerNotification('Erro ao cadastrar novo setor.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    await SectorService.updateSector(id, !currentActive);
  };

  const handleUpdateName = async (id: string, newName: string) => {
    await SectorService.updateSectorName(id, newName);
  };

  const handleDeleteSector = async (id: string) => {
    await SectorService.deleteSector(id);
  };

  const handlePopulateDefaults = async () => {
    setPopulating(true);
    try {
      await SectorService.populateDefaultSectors();
      triggerNotification('Setores padrão populados com sucesso!', 'success');
    } catch (error) {
      console.error('Error populating default sectors:', error);
      triggerNotification('Erro ao popular setores padrão.', 'error');
    } finally {
      setPopulating(false);
    }
  };

  // Perform whole database records delete of surveys/evaluations and forms
  const handleClearDatabase = async () => {
    setClearingDb(true);
    try {
      await SectorService.clearEvaluationsAndForms();
      triggerNotification('Toda a memória de pesquisas e formulários foi limpa com sucesso!', 'success');
      setIsClearModalOpen(false);
      setConfirmKeyword('');
    } catch (error) {
      console.error('Error clearing database:', error);
      triggerNotification('Erro ao realizar a limpeza do banco de dados.', 'error');
    } finally {
      setClearingDb(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3 }}
      className="w-full relative"
    >
      {/* Toast Notification Container */}
      <AnimatePresence>
        {toast.show && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 border max-w-sm w-full ${
              toast.type === 'success' 
                ? 'bg-emerald-600 text-white border-emerald-500' 
                : toast.type === 'error' 
                ? 'bg-rose-600 text-white border-rose-500' 
                : 'bg-slate-600 text-white border-slate-500'
            }`}
          >
            <div className="bg-white/10 p-2 rounded-xl">
              {toast.type === 'success' ? <Check size={18} /> : toast.type === 'error' ? <X size={18} /> : <Info size={18} />}
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold leading-tight">{toast.message}</p>
            </div>
            <button 
              onClick={() => setToast(prev => ({ ...prev, show: false }))}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden font-sans space-y-6">
        
        {/* Header Block Section */}
        <div className="p-6 md:p-8 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 id="main-title" className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Building2 className="text-blue-500 shrink-0" size={24} />
              Gestão de Setores
            </h2>
            <p className="text-sm font-semibold text-slate-500 leading-relaxed">
              Adicione ou ative/desative os setores da policlínica.
            </p>
          </div>

          {/* Action buttons on the right side */}
          <div className="flex items-center gap-3 self-start sm:self-center">
            {/* Standard Populating Trigger */}
            {sectors.length === 0 && !loading && (
              <button
                id="btn-populate"
                onClick={handlePopulateDefaults}
                disabled={populating}
                className="px-4 py-2.5 rounded-xl bg-slate-100 font-bold text-slate-600 hover:bg-slate-200 transition-colors flex items-center gap-2 text-xs md:text-sm disabled:opacity-50"
              >
                {populating ? (
                  <Loader2 className="animate-spin text-slate-500" size={16} />
                ) : (
                  <Database size={15} />
                )}
                Popular Padrão
              </button>
            )}

            {/* Adding action button */}
            {!isFormOpen && (
              <button
                id="btn-new-sector"
                onClick={() => setIsFormOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center gap-2 text-xs md:text-sm active:scale-95"
              >
                <Plus size={16} />
                Novo Setor
              </button>
            )}
          </div>
        </div>

        {/* Floating Form Area */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden bg-slate-50 border-b border-slate-200/60"
            >
              <div className="p-6 md:p-8">
                <form onSubmit={handleSubmit} className="space-y-4 max-w-xl mx-auto">
                  <div className="space-y-2">
                    <label id="input-label" className="block text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Nome do Setor
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-450"
                      placeholder="Ex: Farmácia, Almoxarifado..."
                      value={sectorName}
                      onChange={(e) => setSectorName(e.target.value)}
                      disabled={submitting}
                    />
                  </div>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      id="btn-cancel"
                      onClick={() => {
                        setIsFormOpen(false);
                        setSectorName('');
                      }}
                      className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition-colors"
                      disabled={submitting}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      id="btn-submit"
                      className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-wider shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50"
                      disabled={submitting || !sectorName.trim()}
                    >
                      {submitting ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} />
                      )}
                      Cadastrar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sectors Interactive List Section */}
        <div className="px-6 md:px-8 pb-4">
          {loading ? (
            <div id="loader-wrapper" className="py-16 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-600" size={36} />
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest animate-pulse">Carregando setores...</span>
              </div>
            </div>
          ) : sectors.length === 0 ? (
            <div id="empty-state" className="py-16 text-center">
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-2xl flex items-center justify-center mx-auto border border-dashed border-slate-300">
                  <Building2 size={24} />
                </div>
                <div className="space-y-1">
                  <p className="font-extrabold text-slate-700 text-base">Nenhum setor cadastrado.</p>
                  <p className="text-xs font-medium text-slate-400">Comece adicionando setores manualmente ou populando a lista com os padrões.</p>
                </div>
              </div>
            </div>
          ) : (
            <div id="sectors-list" className="border border-slate-100 rounded-2xl bg-white overflow-hidden divide-y divide-slate-100 shadow-2xs">
              <AnimatePresence initial={false}>
                {sectors.map((sector) => (
                  <SectorRow
                    key={sector.id}
                    sector={sector}
                    onToggleActive={handleToggleActive}
                    onUpdateName={handleUpdateName}
                    onDelete={handleDeleteSector}
                    onNotify={triggerNotification}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* Informative Warning Yellow Banner */}
        <div className="px-6 md:px-8 pb-4">
          <div className="bg-amber-50 rounded-2xl p-6 border border-amber-100 flex gap-4">
            <div className="text-amber-500 shrink-0">
              <AlertTriangle size={24} />
            </div>
            <div className="space-y-1">
              <h4 className="font-black text-sm text-amber-800 uppercase tracking-wide">Atenção</h4>
              <p className="text-xs text-amber-700/90 font-medium leading-relaxed">
                Setores desativados não aparecerão no formulário de Nova Avaliação para evitar novos lançamentos, mas os registros antigos desses setores continuarão visíveis no histórico e dashboard.
              </p>
            </div>
          </div>
        </div>

        {/* Danger Administrative Clearance Panel */}
        {isAdminUser && (
          <div className="px-6 md:px-8 pb-8">
            <div className="bg-rose-50/50 rounded-2xl p-6 border border-rose-100 space-y-4">
              <div className="flex gap-4">
                <div className="text-rose-500 shrink-0">
                  <ShieldAlert size={26} />
                </div>
                <div className="space-y-1 flex-1">
                  <h4 className="font-black text-sm text-rose-800 uppercase tracking-wide">Perigo: Limpeza do Banco de Dados</h4>
                  <p className="text-xs text-rose-700/90 font-medium leading-relaxed">
                    Esta ação apagará permanentemente toda a memória de pesquisas, formulários e classificações por setores. Ideal para começar a usar a ferramenta oficialmente após a conclusão da etapa de testes.
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-4 max-w-2xl bg-white p-4 rounded-xl border border-rose-100 text-slate-800">
                <div className="flex-1 space-y-1">
                  <span className="block text-[10px] font-black uppercase text-slate-400 tracking-wider">Confirmação de Segurança</span>
                  <input
                    type="text"
                    value={confirmKeyword}
                    onChange={(e) => setConfirmKeyword(e.target.value)}
                    placeholder="Digite APAGAR para prosseguir"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/25 focus:border-rose-500 transition-all"
                  />
                </div>
                <button
                  type="button"
                  disabled={confirmKeyword !== 'APAGAR'}
                  onClick={() => setIsClearModalOpen(true)}
                  className={`px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all duration-300 self-end ${
                    confirmKeyword === 'APAGAR'
                      ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/25 active:scale-97 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  }`}
                >
                  Zerar Histórico de Pesquisas
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Immersive Red Confirmation Modal Wrapper (Replaces browser alert/confirm) */}
      <AnimatePresence>
        {isClearModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: 'spring', duration: 0.3 }}
              className="bg-white rounded-3xl border border-rose-100 max-w-md w-full shadow-2xl p-6 md:p-8 space-y-6 text-center"
            >
              <div className="w-16 h-16 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                <ShieldAlert size={36} />
              </div>

              <div className="space-y-2">
                <h3 className="text-xl font-black text-rose-800 tracking-tight">Tem certeza absoluta?</h3>
                <p className="text-sm text-slate-500 font-semibold leading-relaxed">
                  Esta operação é **irreversível**. Todos os formulários salvos e históricos de avaliações serão apagados para sempre. Deseja mesmo continuar?
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={() => {
                    setIsClearModalOpen(false);
                    setConfirmKeyword('');
                  }}
                  disabled={clearingDb}
                  className="w-full py-3 order-2 sm:order-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleClearDatabase}
                  disabled={clearingDb}
                  className="w-full py-3 order-1 sm:order-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md shadow-rose-550/20 flex items-center justify-center gap-2"
                >
                  {clearingDb ? (
                    <>
                      <Loader2 size={16} className="animate-spin text-white" />
                      Apagando...
                    </>
                  ) : (
                    'Sim, apagar tudo'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
