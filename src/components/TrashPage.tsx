import React, { useState, useEffect } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  Search,
  User as UserIcon,
  MessageSquare,
  Calendar,
  AlertCircle,
  FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Patient, Movement, User } from '../types';
import { PatientService } from '../services/PatientService';
import { MovementService } from '../services/MovementService';

export const TrashPage = ({ currentUser }: { currentUser: User }) => {
  const [deletedPatients, setDeletedPatients] = useState<Patient[]>([]);
  const [deletedMovements, setDeletedMovements] = useState<Movement[]>([]);
  const [activeTab, setActiveTab] = useState<'patients' | 'movements'>('patients');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsubscribePatients = PatientService.subscribeToDeletedPatients(setDeletedPatients);
    const unsubscribeMovements = MovementService.subscribeToDeletedMovements(setDeletedMovements);

    return () => {
      unsubscribePatients();
      unsubscribeMovements();
    };
  }, []);

  const handleRestorePatient = async (p: Patient) => {
    if (window.confirm(`Deseja restaurar o cadastro de "${p.name}"?`)) {
      try {
        await PatientService.restorePatient(p.id);
      } catch (error: any) {
        console.error('Error restoring citizen:', error);
        let msg = 'Erro ao restaurar cidadão.';
        try {
          const errData = JSON.parse(error.message);
          if (errData.error.includes('permission')) {
            msg += ' Permissão insuficiente.';
          }
        } catch (e) {}
        alert(msg);
      }
    }
  };

  const handleDeletePatientPermanently = async (p: Patient) => {
    if (window.confirm(`AVISO: Esta ação é definitiva. Deseja excluir permanentemente o cadastro de "${p.name}"?`)) {
      try {
        await PatientService.deletePatientPermanently(p.id);
      } catch (error: any) {
        console.error('Error deleting citizen permanently:', error);
        let msg = 'Erro ao excluir permanentemente.';
        try {
          const errData = JSON.parse(error.message);
          if (errData.error.includes('permission')) {
            msg += ' Permissão insuficiente.';
          }
        } catch (e) {}
        alert(msg);
      }
    }
  };

  const handleRestoreMovement = async (m: Movement) => {
    if (window.confirm(`Deseja restaurar esta manifestação protocolada como "${m.patientName}"?`)) {
      try {
        await MovementService.restoreMovement(m.id);
        
        // Se restaurar uma ALTA/Resolvido, o cidadão deve voltar para o status correspondente
        if (m.type === 'Alta' || m.type === 'Respondido') {
          await PatientService.updatePatient(m.patientId, { 
            status: 'Ativo',
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser.email
          });
        }

        // Se restaurar um chamado pendente, atualiza o contador de reclamações/andamentos
        const patients = await PatientService.getPatients();
        const patient = patients.find(p => p.id === m.patientId);
        if (patient) {
          const newCount = (patient.absenteeismCount || 0) + 1;
          await PatientService.updatePatient(patient.id, { 
            absenteeismCount: newCount 
          });
        }
      } catch (error: any) {
        console.error('Error restoring manifestation:', error);
        let msg = 'Erro ao restaurar manifestação.';
        try {
          const errData = JSON.parse(error.message);
          if (errData.error.includes('permission')) {
            msg += ' Permissão insuficiente.';
          }
        } catch (e) {}
        alert(msg);
      }
    }
  };

  const handleDeleteMovementPermanently = async (m: Movement) => {
    if (window.confirm(`AVISO: Esta ação é definitiva. Deseja excluir permanentemente esta manifestação?`)) {
      try {
        await MovementService.deleteMovementPermanently(m.id);
      } catch (error: any) {
        console.error('Error deleting manifestation permanently:', error);
        let msg = 'Erro ao excluir permanentemente.';
        try {
          const errData = JSON.parse(error.message);
          if (errData.error.includes('permission')) {
            msg += ' Permissão insuficiente.';
          }
        } catch (e) {}
        alert(msg);
      }
    }
  };

  const filteredPatients = deletedPatients.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) || 
    p.medicalRecordNumber.includes(search)
  );

  const filteredMovements = deletedMovements.filter(m => 
    m.patientName.toLowerCase().includes(search.toLowerCase()) || 
    m.medicalRecordNumber.includes(search) ||
    m.observations?.toLowerCase().includes(search.toLowerCase()) ||
    m.type.toLowerCase().includes(search.toLowerCase())
  );

  const isOldEnough = (deletedAt: string) => {
    const deletedDate = new Date(deletedAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - deletedDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 3;
  };

  const StatusColumn = ({ deletedAt }: { deletedAt: string }) => {
    const oldEnough = isOldEnough(deletedAt);
    return (
      <div className="flex flex-col items-center">
        <p className="text-[11px] font-bold text-gray-500 font-sans">
          {new Date(deletedAt).toLocaleDateString('pt-BR')}
        </p>
        {oldEnough ? (
          <span className="text-[8px] font-black uppercase text-red-500 tracking-tighter font-sans">Pronto para limpeza</span>
        ) : (
          <span className="text-[8px] font-black uppercase text-amber-500 tracking-tighter font-sans">Carência (3 dias)</span>
        )}
      </div>
    );
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#064e3b] tracking-tight">Lixeira de Ouvidoria</h2>
          <p className="text-sm font-medium text-gray-500 italic flex items-center gap-2 font-sans">
            <AlertCircle size={14} className="text-amber-500" />
            Itens removidos (restauração disponível dentro do período de carência).
          </p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit font-sans">
        <button 
          onClick={() => setActiveTab('patients')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'patients' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manifestantes ({deletedPatients.length})
        </button>
        <button 
          onClick={() => setActiveTab('movements')}
          className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${activeTab === 'movements' ? 'bg-white shadow-sm text-emerald-700' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Manifestações / Protocolos ({deletedMovements.length})
        </button>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar na lixeira..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-100 bg-gray-50 focus:ring-2 focus:ring-emerald-500 transition-all outline-none text-sm font-medium"
          />
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 font-sans">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">Informação</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Data Exclusão</th>
                <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {activeTab === 'patients' ? (
                filteredPatients.map(p => (
                  <tr key={p.id} className="hover:bg-red-50/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                          <UserIcon size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{p.name}</p>
                          <p className="text-[10px] font-medium text-gray-400">CNS/CPF: {p.medicalRecordNumber} | Cidade: {p.city}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusColumn deletedAt={p.deletedAt!} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleRestorePatient(p)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Restaurar"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeletePatientPermanently(p)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir Permanentemente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                filteredMovements.map(m => (
                  <tr key={m.id} className="hover:bg-red-50/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                          <MessageSquare size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{m.type} - {m.patientName}</p>
                          <p className="text-[10px] font-medium text-gray-400">CNS/CPF: {m.medicalRecordNumber} | Desc: {m.observations?.substring(0, 40)}...</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <StatusColumn deletedAt={m.deletedAt!} />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button 
                          onClick={() => handleRestoreMovement(m)}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                          title="Restaurar"
                        >
                          <RotateCcw size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteMovementPermanently(m)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir Permanentemente"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
              {((activeTab === 'patients' && filteredPatients.length === 0) || 
                (activeTab === 'movements' && filteredMovements.length === 0)) && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                    Nenhum item encontrado na lixeira.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
