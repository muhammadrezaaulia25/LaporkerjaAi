import React, { useState } from 'react';
import { X, Calendar, ChevronRight, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { HistoryItem } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string, e: React.MouseEvent) => void;
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, history, onSelect, onDelete }) => {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(id);
  };

  const executeDelete = (e: React.MouseEvent) => {
    if (confirmDeleteId) {
      onDelete(confirmDeleteId, e);
      setConfirmDeleteId(null);
    }
  };

  const cancelDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700 animate-scale-in flex flex-col max-h-[80vh] relative">
        
        {/* Delete Confirmation Overlay */}
        {confirmDeleteId && (
          <div className="absolute inset-0 z-50 bg-slate-900/95 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-slate-800 p-6 rounded-3xl border border-slate-700 w-full max-w-sm shadow-2xl animate-scale-in text-center">
              <div className="w-14 h-14 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5 border border-red-500/20">
                <AlertTriangle className="w-7 h-7" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Hapus Laporan?</h3>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                Laporan ini akan dihapus permanen dari memori perangkat dan tidak dapat dikembalikan.
              </p>
              
              <div className="flex gap-3">
                <button 
                  onClick={cancelDelete}
                  className="flex-1 py-3 px-4 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-sm font-medium transition border border-slate-600"
                >
                  Batal
                </button>
                <button 
                  onClick={executeDelete}
                  className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition shadow-lg shadow-red-900/20 flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-xl">
              <Clock className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">Riwayat Laporan</h2>
              <p className="text-xs text-slate-400">Disimpan secara lokal di perangkat ini</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List Content */}
        <div className="overflow-y-auto p-4 space-y-3 flex-1">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-500">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-slate-600" />
              </div>
              <p className="text-sm font-medium">Belum ada riwayat laporan.</p>
            </div>
          ) : (
            history.map((item) => (
              <div 
                key={item.id}
                onClick={() => onSelect(item)}
                className="group relative bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-blue-500/50 rounded-2xl p-3 flex items-center gap-4 cursor-pointer transition-all duration-300 hover:shadow-lg hover:shadow-blue-900/10"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-900 flex-shrink-0 border border-slate-600 relative">
                    <img src={item.image} alt="Thumbnail" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                    <div className="absolute bottom-1 right-1 text-[9px] font-bold text-white bg-black/40 px-1 rounded backdrop-blur-sm">
                        {item.result.completionPercentage}%
                    </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-blue-400 bg-blue-400/10 px-2 py-0.5 rounded-md truncate">
                      {item.result.timestamp.split(',')[0]}
                    </span>
                    <span className="text-[10px] text-slate-500">
                        {new Date(item.savedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                  <h4 className="text-sm font-semibold text-slate-200 line-clamp-1 group-hover:text-white transition-colors">
                    {item.result.summary}
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {item.result.details[0]}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 pl-2 border-l border-slate-700/50">
                    <button 
                        onClick={(e) => handleDeleteClick(item.id, e)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors z-20"
                        title="Hapus"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="p-1">
                        <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-blue-400 transition-colors" />
                    </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryModal;