
import React, { useState, useEffect } from 'react';
import { X, Save, Settings as SettingsIcon, Database } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSettings: AppSettings;
  onSave: (settings: AppSettings) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, currentSettings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(currentSettings);

  useEffect(() => {
    setFormData(currentSettings);
  }, [currentSettings, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-700 animate-scale-in">
        
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-800 bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="bg-brand-600/20 p-2 rounded-xl">
              <SettingsIcon className="w-5 h-5 text-brand-400" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">Pengaturan Kantor</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
          
          <div className="space-y-1">
            <label className="block text-xs font-medium text-brand-400 uppercase tracking-wider ml-1">
              Nomor WhatsApp Kantor
            </label>
            <div className="relative group">
              <input
                type="text"
                name="whatsappNumber"
                value={formData.whatsappNumber}
                onChange={handleChange}
                placeholder="628..."
                className="w-full px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-inner"
              />
            </div>
            <p className="text-xs text-slate-500 ml-1">Gunakan kode negara (contoh: 628123...)</p>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-brand-400 uppercase tracking-wider ml-1">
              Email Kantor
            </label>
            <div className="relative group">
              <input
                type="email"
                name="emailAddress"
                value={formData.emailAddress}
                onChange={handleChange}
                placeholder="laporan@kantor.com"
                className="w-full px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-brand-400 uppercase tracking-wider ml-1">
              URL Spreadsheet
            </label>
            <div className="relative group">
              <input
                type="url"
                name="spreadsheetUrl"
                value={formData.spreadsheetUrl}
                onChange={handleChange}
                placeholder="https://docs.google.com/..."
                className="w-full px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-medium text-brand-400 uppercase tracking-wider ml-1">
               URL Google Apps Script (Opsional)
            </label>
            <div className="relative group">
              <input
                type="url"
                name="googleScriptUrl"
                value={formData.googleScriptUrl || ''}
                onChange={handleChange}
                placeholder="https://script.google.com/..."
                className="w-full px-5 py-3.5 bg-slate-800 border border-slate-700 rounded-2xl text-white placeholder-slate-500 focus:ring-2 focus:ring-brand-500 focus:border-transparent outline-none transition-all shadow-inner"
              />
            </div>
          </div>

          {/* Supabase Section */}
          <div className="border-t border-slate-800 pt-4 mt-4 space-y-4">
             <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-green-400" />
                <h3 className="text-sm font-bold text-white">Database Supabase (Opsional)</h3>
             </div>
             
             <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400 ml-1">
                   Supabase Project URL
                </label>
                <input
                    type="text"
                    name="supabaseUrl"
                    value={formData.supabaseUrl || ''}
                    onChange={handleChange}
                    placeholder="https://xyz.supabase.co"
                    className="w-full px-5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                />
             </div>

             <div className="space-y-1">
                <label className="block text-xs font-medium text-slate-400 ml-1">
                   Supabase Anon Key
                </label>
                <input
                    type="password"
                    name="supabaseKey"
                    value={formData.supabaseKey || ''}
                    onChange={handleChange}
                    placeholder="eyJhbGciOi..."
                    className="w-full px-5 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-600 focus:ring-2 focus:ring-green-500 outline-none text-sm"
                />
             </div>
             <p className="text-[10px] text-slate-500">
               Isi ini untuk menyimpan laporan ke database Supabase dan mendapatkan link gambar permanen.
             </p>
          </div>

          {/* Auto Save Toggle */}
          <div className="flex items-center justify-between py-2 px-1 border-t border-slate-800 mt-2 pt-4">
            <div className="space-y-0.5">
              <label className="text-sm font-medium text-white">Simpan Otomatis</label>
              <p className="text-xs text-slate-500">Upload ke Cloud/DB setelah analisis</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input 
                type="checkbox" 
                name="autoSaveToCloud"
                checked={formData.autoSaveToCloud || false}
                onChange={(e) => setFormData(prev => ({ ...prev, autoSaveToCloud: e.target.checked }))}
                className="sr-only peer" 
              />
              <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-brand-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600"></div>
            </label>
          </div>

          <div className="pt-4">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white font-semibold py-3.5 rounded-2xl transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-brand-900/50"
            >
              <Save className="w-5 h-5" />
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;