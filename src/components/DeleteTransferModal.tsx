import React, { useState } from 'react';
import { X, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';

interface DeleteTransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (action: 'delete' | 'transfer', targetId?: string) => void;
  title: string;
  description: string;
  options: { id: string; name: string }[];
  targetLabel: string;
}

export default function DeleteTransferModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  options,
  targetLabel
}: DeleteTransferModalProps) {
  const [action, setAction] = useState<'delete' | 'transfer'>('delete');
  const [selectedTargetId, setSelectedTargetId] = useState<string>('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
              <AlertTriangle size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <p className="text-slate-600 leading-relaxed">
            {description}
          </p>

          <div className="space-y-3">
            <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${action === 'delete' ? 'border-rose-500 bg-rose-50' : 'border-slate-200 hover:border-slate-300'}`}>
              <input 
                type="radio" 
                name="action" 
                value="delete" 
                checked={action === 'delete'} 
                onChange={() => setAction('delete')}
                className="mt-1 w-4 h-4 text-rose-600 focus:ring-rose-500"
              />
              <div>
                <span className={`block font-bold ${action === 'delete' ? 'text-rose-700' : 'text-slate-700'}`}>Excluir tudo</span>
                <span className="block text-sm text-slate-500 mt-1">Excluir permanentemente todos os produtos vinculados.</span>
              </div>
            </label>

            <label className={`flex items-start gap-3 p-4 rounded-2xl border-2 cursor-pointer transition-all ${action === 'transfer' ? 'border-primary bg-primary/5' : 'border-slate-200 hover:border-slate-300'}`}>
              <input 
                type="radio" 
                name="action" 
                value="transfer" 
                checked={action === 'transfer'} 
                onChange={() => setAction('transfer')}
                className="mt-1 w-4 h-4 text-primary focus:ring-primary"
              />
              <div className="w-full">
                <span className={`block font-bold ${action === 'transfer' ? 'text-primary-dark' : 'text-slate-700'}`}>Transferir produtos</span>
                <span className="block text-sm text-slate-500 mt-1 mb-3">Mover os produtos para outr{targetLabel === 'Marca' ? 'a' : 'o'} {targetLabel.toLowerCase()}.</span>
                
                {action === 'transfer' && (
                  <select 
                    value={selectedTargetId}
                    onChange={(e) => setSelectedTargetId(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 outline-none text-slate-700"
                  >
                    <option value="">Selecione {targetLabel === 'Marca' ? 'a' : 'o'} {targetLabel.toLowerCase()}...</option>
                    {options.map(opt => (
                      <option key={opt.id} value={opt.id}>{opt.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </label>
          </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={() => onConfirm(action, selectedTargetId)}
            disabled={action === 'transfer' && !selectedTargetId}
            className={`px-6 py-2.5 text-white font-bold rounded-xl transition-all flex items-center gap-2 ${
              action === 'delete' 
                ? 'bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20' 
                : 'bg-primary hover:bg-primary-dark shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed'
            }`}
          >
            {action === 'delete' ? (
              <><Trash2 size={18} /> Excluir Tudo</>
            ) : (
              <><ArrowRight size={18} /> Transferir e Excluir</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
