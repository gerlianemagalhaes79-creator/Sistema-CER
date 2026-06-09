import React, { useState } from 'react';
import { 
  X, 
  Copy, 
  QrCode, 
  Share2, 
  Download, 
  CheckCircle2, 
  Monitor, 
  Printer, 
  Smartphone,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ShareSurveyProps {
  isOpen: boolean;
  onClose: () => void;
  surveyUrl?: string;
}

export const ShareSurveyModal = ({ isOpen, onClose, surveyUrl }: ShareSurveyProps) => {
  const [copied, setCopied] = useState(false);
  const actualUrl = `${window.location.protocol}//${window.location.host}?mode=paciente`;

  const handleCopy = () => {
    navigator.clipboard.writeText(actualUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPlaque = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Imprimir Placa de Avaliação</title>
            <style>
              body {
                font-family: 'Helvetica Neue', Arial, sans-serif;
                text-align: center;
                color: #01402E;
                padding: 40px;
                background-color: #F0FDF4;
                margin: 0;
              }
              .card {
                background: white;
                border-radius: 30px;
                padding: 50px;
                max-width: 500px;
                margin: 40px auto;
                box-shadow: 0 20px 40px rgba(1, 64, 46, 0.08);
                border: 4px solid #10b981;
              }
              h1 {
                font-size: 26px;
                font-weight: 900;
                margin-top: 10px;
                margin-bottom: 8px;
                text-transform: uppercase;
                letter-spacing: -0.5px;
              }
              h2 {
                font-size: 14px;
                color: #047857;
                font-weight: 700;
                margin-bottom: 35px;
                text-transform: uppercase;
                letter-spacing: 1.5px;
                line-height: 1.4;
              }
              .qr-container {
                background: #f8fafc;
                padding: 24px;
                border-radius: 24px;
                display: inline-block;
                margin-bottom: 25px;
                border: 2px solid #e2e8f0;
              }
              .qr-image {
                width: 220px;
                height: 220px;
                display: block;
              }
              .instruction {
                font-size: 15px;
                color: #374151;
                font-weight: bold;
                margin-top: 20px;
                line-height: 1.6;
                padding: 0 10px;
              }
              .sub-instruction {
                font-size: 11px;
                color: #9ca3af;
                margin-top: 25px;
                font-weight: 800;
                text-transform: uppercase;
                letter-spacing: 1px;
              }
              @media print {
                body {
                  background: white;
                  padding: 0;
                }
                .card {
                  box-shadow: none;
                  border: none;
                  margin: 10px auto;
                  padding: 20px;
                }
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>POLICLÍNICA BERNARDO FÉLIX</h1>
              <h2>Sua opinião importa!<br/>Ajude-nos a aprimorar nosso atendimento.</h2>
              <div class="qr-container">
                <img class="qr-image" src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(actualUrl)}" alt="QR Code" />
              </div>
              <p class="instruction">Aponte a câmera do seu celular para o QR Code acima e responda a nossa Pesquisa de Satisfação de forma 100% anônima e rápida.</p>
              <div class="sub-instruction">Canal de Ouvidoria Integrado • Policlínica Bernardo Félix da Silva</div>
            </div>
            <script>
              window.onload = function() {
                setTimeout(function() {
                  window.print();
                }, 500);
              }
            </script>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-[#01402E]/20 backdrop-blur-sm"
        />

        {/* Modal Panel */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl border border-emerald-50 overflow-hidden"
        >
          {/* Header */}
          <div className="p-8 pb-4 flex justify-between items-center bg-gray-50/50">
            <div>
              <p className="text-[10px] font-black text-emerald-800/50 uppercase tracking-widest leading-none">Divulgação de Ouvidoria</p>
              <h3 className="text-2xl font-black text-[#01402E] tracking-tight mt-1">Divulgar Pesquisa Pública</h3>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 hover:bg-white rounded-xl transition-colors text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="p-8 space-y-6">
            
            {/* Visual Callout */}
            <div className="bg-emerald-50/40 p-5 rounded-2xl border border-emerald-100/50 flex gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Share2 size={22} />
              </div>
              <div>
                <h4 className="text-sm font-extrabold text-emerald-950 leading-snug">Colete Feedbacks via QR-Code</h4>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                  Disponibilize o QR-Code impresso ou configure em um terminal/totem de atendimento na sala de espera para permitir manifestações anônimas instantâneas dos cidadãos.
                </p>
              </div>
            </div>

            {/* Link & Copy Box */}
            <div className="space-y-2">
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest ml-1">Link Público do Formulário</label>
              <div className="flex gap-2">
                <div className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold text-gray-500 font-mono truncate select-all flex items-center">
                  {actualUrl}
                </div>
                <button
                  onClick={handleCopy}
                  className={`px-5 py-3 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all ${
                    copied 
                      ? 'bg-emerald-600 text-white' 
                      : 'bg-[#01402E] hover:bg-emerald-950 text-white active:scale-95'
                  }`}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 size={14} /> Copiado!
                    </>
                  ) : (
                    <>
                      <Copy size={14} /> Copiar
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* QR-Code Section */}
            <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-gray-50/50 rounded-2xl border border-gray-100">
              {/* Dynamic QR Code from api.qrserver.com */}
              <div className="bg-white p-4 rounded-xl shadow-md border border-gray-100 relative shrink-0">
                <div className="w-32 h-32 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden relative">
                  <img 
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(actualUrl)}`}
                    alt="QR Code da Ouvidoria"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              </div>

              {/* Action columns */}
              <div className="flex-1 space-y-4">
                <h5 className="font-extrabold text-[#01402E] text-sm leading-tight">Painel de Códigos Rápidos</h5>
                <p className="text-xs text-gray-500 font-medium">Este QR Code é dinâmico e scaneável. Qualquer resposta enviada por esse canal alimentará o painel administrativo de forma instantânea.</p>

                <div className="flex flex-wrap gap-2 pt-1">
                  <button
                    onClick={handlePrintPlaque}
                    className="px-4 py-2 bg-emerald-600 border border-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 transition-all flex items-center gap-1.5 active:scale-95 shadow-xs"
                  >
                    <Printer size={14} /> Imprimir Placa
                  </button>
                  <a
                    href={actualUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:text-emerald-800 hover:bg-emerald-50 hover:border-emerald-100 transition-all flex items-center gap-1.5 active:scale-95"
                  >
                    <ExternalLink size={14} /> Testar Canal <span className="text-[10px] text-gray-400">↗</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Totem & Physical setup tips */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-gray-50 p-4 rounded-xl text-center space-y-1">
                <Smartphone size={18} className="mx-auto text-emerald-600" />
                <p className="text-[10px] font-black uppercase text-[#01402E]">Móbile</p>
                <p className="text-[9px] text-gray-400 font-semibold leading-relaxed">Células e Tablets</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl text-center space-y-1">
                <Monitor size={18} className="mx-auto text-emerald-600" />
                <p className="text-[10px] font-black uppercase text-[#01402E]">Totem Físico</p>
                <p className="text-[9px] text-gray-400 font-semibold leading-relaxed">Terminal Dedicado</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-xl text-center space-y-1">
                <Printer size={18} className="mx-auto text-emerald-600" />
                <p className="text-[10px] font-black uppercase text-[#01402E]">Fôlder</p>
                <p className="text-[9px] text-gray-400 font-semibold leading-relaxed">Impressos na Recepção</p>
              </div>
            </div>

          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
