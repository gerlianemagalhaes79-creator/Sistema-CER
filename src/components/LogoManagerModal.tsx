import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Check, Loader2, Upload, Trash2 } from 'lucide-react';
import { LogoService, ClinicLogos } from '../services/LogoService';

interface LogoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogoManagerModal = ({ isOpen, onClose }: LogoManagerModalProps) => {
  const [logos, setLogos] = useState<ClinicLogos>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    
    // Subscribe to live logo configuration
    const unsubscribe = LogoService.subscribeToLogos((data) => {
      setLogos(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (type: keyof ClinicLogos, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        // Max dimension 160px keeps it extremely sharp for headers but ultra-lightweight for Firestore limit (1MB)
        const MAX_DIM = 160;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Keep transparent background by exporting as PNG
          const base64 = canvas.toDataURL('image/png', 0.85);
          
          setLogos(prev => ({
            ...prev,
            [type]: base64
          }));
        }
      };
      if (event.target?.result) {
        img.src = event.target.result as string;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemove = (type: keyof ClinicLogos) => {
    setLogos(prev => {
      const copy = { ...prev };
      delete copy[type];
      return copy;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Sanitize standard payload - remove undefined to prevent Firestore serialization crashes
      const cleanData: ClinicLogos = {};
      if (logos.ouvidoria) cleanData.ouvidoria = logos.ouvidoria;
      if (logos.policlinica) cleanData.policlinica = logos.policlinica;
      if (logos.consorcio) cleanData.consorcio = logos.consorcio;

      await LogoService.saveLogos(cleanData);
      setSuccessMsg('Logotipos atualizados com sucesso!');
      setTimeout(() => {
        setSuccessMsg('');
        onClose();
      }, 1500);
    } catch (err: any) {
      console.error(err);
      const errMsg = err?.message || JSON.stringify(err);
      alert(`Erro ao salvar os logotipos: ${errMsg}. Verifique sua conexão.`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[9999] animate-fade-in" id="id_logo_manager_overlay">
      <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-100 w-full max-w-xl overflow-hidden flex flex-col" id="id_logo_manager_box">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">Personalização de Logotipos</h3>
            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Selecione as imagens reais da sua galeria</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-6 flex-1 overflow-y-auto max-h-[70vh]">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="animate-spin text-emerald-600" size={32} />
              <p className="text-xs uppercase font-bold text-gray-500 tracking-widest">Carregando marcas...</p>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Logo Item 1 */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-gray-150 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">1. Logotipo da Ouvidoria</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Aparece na tela de pesquisa e nos relatórios</span>
                  </div>
                  {logos.ouvidoria && (
                    <button 
                      type="button" 
                      onClick={() => handleRemove('ouvidoria')}
                      className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                      title="Remover logotipo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {logos.ouvidoria ? (
                      <img src={logos.ouvidoria} alt="Ouvidoria" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={20} />
                    )}
                  </div>
                  <div className="flex-1 relative">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <Upload size={14} />
                      {logos.ouvidoria ? 'Substituir' : 'Selecionar da Galeria'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange('ouvidoria', e)} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Logo Item 2 */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-gray-150 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">2. Logotipo da Policlínica</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Logo oficial da Policlínica Bernardo Félix</span>
                  </div>
                  {logos.policlinica && (
                    <button 
                      type="button" 
                      onClick={() => handleRemove('policlinica')}
                      className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                      title="Remover logotipo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {logos.policlinica ? (
                      <img src={logos.policlinica} alt="Policlínica" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={20} />
                    )}
                  </div>
                  <div className="flex-1 relative">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <Upload size={14} />
                      {logos.policlinica ? 'Substituir' : 'Selecionar da Galeria'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange('policlinica', e)} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Logo Item 3 */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-gray-150 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider block">3. Logotipo do Consórcio</span>
                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Consórcio que gerencia a Policlínica</span>
                  </div>
                  {logos.consorcio && (
                    <button 
                      type="button" 
                      onClick={() => handleRemove('consorcio')}
                      className="p-1.5 hover:bg-red-50 text-red-500 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
                      title="Remover logotipo"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-xl border-2 border-dashed border-slate-200 bg-white flex items-center justify-center p-1 overflow-hidden shrink-0">
                    {logos.consorcio ? (
                      <img src={logos.consorcio} alt="Consórcio" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    ) : (
                      <ImageIcon className="text-slate-300" size={20} />
                    )}
                  </div>
                  <div className="flex-1 relative">
                    <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:border-slate-300 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm hover:shadow-md transition-all cursor-pointer">
                      <Upload size={14} />
                      {logos.consorcio ? 'Substituir' : 'Selecionar da Galeria'}
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={(e) => handleFileChange('consorcio', e)} 
                        className="hidden" 
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Success Notification */}
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-black uppercase text-center rounded-xl animate-bounce">
                  {successMsg}
                </div>
              )}

            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-100 bg-slate-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || loading}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={14} />
                Salvando...
              </>
            ) : (
              <>
                <Check size={14} />
                Salvar Alterações
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};
