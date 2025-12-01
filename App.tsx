
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Settings as SettingsIcon, AlertCircle, Loader2, Sparkles, History, Image as ImageIcon, ShieldAlert, AlertTriangle } from 'lucide-react';
import { analyzeWorkImage } from './services/geminiService';
import SettingsModal from './components/SettingsModal';
import HistoryModal from './components/HistoryModal';
import ReportCard from './components/ReportCard';
import { AppSettings, AppState, AnalysisResult, HistoryItem } from './types';

// Default Settings
const DEFAULT_SETTINGS: AppSettings = {
  whatsappNumber: "",
  emailAddress: "",
  spreadsheetUrl: "",
  googleScriptUrl: "",
  autoSaveToCloud: false
};

const SESSION_KEY = 'laporKerjaLastSession';
const HISTORY_KEY = 'laporKerjaHistory';
const MAX_HISTORY_ITEMS = 5;
const MAX_FILE_SIZE_MB = 10;
const MIN_IMAGE_DIMENSION = 400; // Minimum pixel dimension to reject thumbnails

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  
  // Modals State
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  
  // Data State
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [reportResult, setReportResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  
  // UI State
  const [dragActive, setDragActive] = useState(false);
  const [showRestoreToast, setShowRestoreToast] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load Settings, History, and Restore Session on Mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('laporKerjaSettings');
    if (savedSettings) {
      setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
    }

    const savedHistory = localStorage.getItem(HISTORY_KEY);
    if (savedHistory) {
      try {
        setHistoryItems(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
      }
    }

    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      setShowRestoreToast(true);
    }
  }, []);

  const saveSettings = (newSettings: AppSettings) => {
    setSettings(newSettings);
    localStorage.setItem('laporKerjaSettings', JSON.stringify(newSettings));
  };

  const handleRestoreSession = () => {
    const savedSession = localStorage.getItem(SESSION_KEY);
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        setSelectedImage(sessionData.image);
        setReportResult(sessionData.result);
        setAppState(AppState.SUCCESS);
      } catch (e) {
        console.error("Failed to restore session", e);
      }
    }
    setShowRestoreToast(false);
  };

  const clearSession = () => {
    localStorage.removeItem(SESSION_KEY);
    setShowRestoreToast(false);
  };

  const saveToHistory = (image: string, result: AnalysisResult) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      image,
      result,
      savedAt: Date.now()
    };

    const updatedHistory = [newItem, ...historyItems].slice(0, MAX_HISTORY_ITEMS);
    setHistoryItems(updatedHistory);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    
    localStorage.setItem(SESSION_KEY, JSON.stringify({ image, result }));
  };

  const deleteHistoryItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = historyItems.filter(item => item.id !== id);
    setHistoryItems(updated);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
  };

  const loadHistoryItem = (item: HistoryItem) => {
    setSelectedImage(item.image);
    setReportResult(item.result);
    setAppState(AppState.SUCCESS);
    setHistoryOpen(false);
  };

  const validateImageDimensions = async (file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(img.src);
        if (img.width < MIN_IMAGE_DIMENSION || img.height < MIN_IMAGE_DIMENSION) {
          reject(`Resolusi gambar terlalu rendah (${img.width}x${img.height}px). \n\nSistem menolak gambar yang terlihat seperti Thumbnail atau unduhan Google. Harap gunakan foto asli dari kamera.`);
        } else {
          resolve();
        }
      };
      img.onerror = () => reject("File gambar rusak atau tidak valid.");
    });
  };

  const compressImage = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          const MAX_DIM = 1280;
          if (width > MAX_DIM || height > MAX_DIM) {
            if (width > height) {
              height *= MAX_DIM / width;
              width = MAX_DIM;
            } else {
              width *= MAX_DIM / height;
              height = MAX_DIM;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          resolve(compressedBase64);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    let file: File | null = null;
    
    if ('dataTransfer' in e) {
       e.preventDefault();
       setDragActive(false);
       if (e.dataTransfer.files && e.dataTransfer.files[0]) {
         file = e.dataTransfer.files[0];
       }
    } else {
       if (e.target.files && e.target.files[0]) {
         file = e.target.files[0];
       }
    }

    if (!file) return;

    if (!file.type.match(/image\/(jpeg|png|webp)/)) {
      setErrorMsg("Mohon upload file gambar (JPG, PNG, WEBP).");
      setAppState(AppState.ERROR);
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setErrorMsg(`Ukuran file terlalu besar (Max ${MAX_FILE_SIZE_MB}MB).`);
      setAppState(AppState.ERROR);
      return;
    }

    try {
      setAppState(AppState.ANALYZING);
      setIsCompressing(true);
      
      // Step 1: Client-Side Integrity Check (Low Resolution / Thumbnail)
      await validateImageDimensions(file);

      // Step 2: Compression
      const compressedImage = await compressImage(file);
      setSelectedImage(compressedImage);
      setIsCompressing(false);

      // Step 3: AI Analysis (Deep Integrity Check)
      const result = await analyzeWorkImage(compressedImage);

      // SECURITY CHECK: Handle Rejected Images from AI
      if (result.isRejected) {
        setErrorMsg(result.rejectionReason || "Gambar terdeteksi bukan foto lapangan asli.");
        setAppState(AppState.ERROR);
        // Do not save to history
        return;
      }

      setReportResult(result);
      saveToHistory(compressedImage, result);
      setAppState(AppState.SUCCESS);

    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : String(err);
      // Determine if it's a validation error or system error
      if (msg.includes("Resolusi") || msg.includes("Thumbnail")) {
         setErrorMsg(msg);
      } else {
         setErrorMsg("Gagal menganalisis gambar. Pastikan koneksi internet stabil.");
      }
      setAppState(AppState.ERROR);
      setIsCompressing(false);
    }
  };

  const handleReset = () => {
    setAppState(AppState.IDLE);
    setSelectedImage(null);
    setReportResult(null);
    setErrorMsg(null);
    clearSession();
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans text-slate-900 selection:bg-brand-500/30">
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-white/70 border-b border-slate-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-tr from-brand-600 to-brand-400 p-2 rounded-xl shadow-lg shadow-brand-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-slate-900 to-slate-700 bg-clip-text text-transparent">
              LaporKerja<span className="text-brand-600">.AI</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setHistoryOpen(true)}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900 relative"
              title="Riwayat"
            >
              <History className="w-5 h-5" />
            </button>
            <button 
              onClick={() => setSettingsOpen(true)}
              className="p-2.5 hover:bg-slate-100 rounded-xl transition-all text-slate-500 hover:text-slate-900"
              title="Pengaturan"
            >
              <SettingsIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 py-8 sm:px-6 sm:py-12">
        
        {showRestoreToast && appState === AppState.IDLE && (
          <div className="mb-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-lg shadow-slate-200/50 flex items-center justify-between animate-slide-up">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-full">
                <History className="w-4 h-4" />
              </div>
              <p className="text-sm font-medium text-slate-700">Kembalikan laporan terakhir?</p>
            </div>
            <div className="flex items-center gap-2">
               <button 
                 onClick={clearSession}
                 className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 rounded-lg transition"
               >
                 Abaikan
               </button>
               <button 
                 onClick={handleRestoreSession}
                 className="px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition"
               >
                 Kembalikan
               </button>
            </div>
          </div>
        )}

        {appState === AppState.IDLE && (
          <div className="max-w-xl mx-auto mt-8 animate-fade-in">
             <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-slate-900 mb-4 tracking-tight leading-tight">
                  Buat Laporan Kerja <br/>
                  <span className="text-brand-600">Dalam Hitungan Detik</span>
                </h1>
                <p className="text-slate-500 text-lg">
                  Ambil foto pekerjaan, AI akan menganalisis progress dan membuatkan laporan lengkap untuk Anda.
                </p>
             </div>

             <div 
               className={`relative group`}
               onDragEnter={handleDrag}
               onDragLeave={handleDrag}
               onDragOver={handleDrag}
               onDrop={handleImageSelect}
             >
                <div className={`
                    border-3 border-dashed rounded-[2rem] p-10 text-center transition-all duration-300 ease-out
                    ${dragActive 
                      ? 'border-brand-500 bg-brand-50/50 scale-[1.02]' 
                      : 'border-slate-200 bg-white hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/5'
                    }
                `}>
                    {/* Hidden Inputs */}
                    <input 
                      ref={fileInputRef}
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleImageSelect}
                    />
                    <input 
                      ref={cameraInputRef}
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      className="hidden" 
                      onChange={handleImageSelect}
                    />
                    
                    <div className="w-20 h-20 bg-gradient-to-tr from-brand-100 to-brand-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                      <Camera className="w-8 h-8 text-brand-600" />
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 mb-6">Mulai Laporan</h3>
                    
                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        {/* Camera Button */}
                        <button 
                            onClick={() => cameraInputRef.current?.click()}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white px-6 py-3.5 rounded-xl font-semibold transition-all shadow-lg shadow-brand-600/20 active:scale-95"
                        >
                            <Camera className="w-5 h-5" />
                            Ambil Foto
                        </button>

                        {/* Gallery Button */}
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 px-6 py-3.5 rounded-xl font-semibold transition-all shadow-sm active:scale-95"
                        >
                            <ImageIcon className="w-5 h-5" />
                            Pilih Galeri
                        </button>
                    </div>
                    
                    <p className="mt-6 text-slate-400 text-sm">
                        Atau drag & drop gambar ke sini (Max 10MB)
                    </p>
                </div>
             </div>
          </div>
        )}

        {(appState === AppState.ANALYZING) && (
          <div className="max-w-xl mx-auto mt-20 text-center animate-fade-in">
             <div className="relative w-24 h-24 mx-auto mb-8">
                <div className="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-brand-500 rounded-full border-t-transparent animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-8 h-8 text-brand-500 animate-pulse" />
                </div>
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2">
               {isCompressing ? 'Mengompresi Gambar...' : 'Menganalisis Pekerjaan...'}
             </h2>
             <p className="text-slate-500">AI sedang memverifikasi keaslian foto dan membuat laporan.</p>
          </div>
        )}

        {appState === AppState.SUCCESS && reportResult && selectedImage && (
          <ReportCard 
            imageSrc={selectedImage}
            result={reportResult}
            settings={settings}
            onReset={handleReset}
          />
        )}

        {appState === AppState.ERROR && (
          <div className="max-w-md mx-auto mt-20 text-center animate-scale-in">
             <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-red-100 shadow-xl border border-red-200">
                 <ShieldAlert className="w-10 h-10 text-red-600" />
             </div>
             <h2 className="text-2xl font-bold text-slate-800 mb-2">Validasi Gambar Gagal</h2>
             <div className="bg-red-50 p-4 rounded-xl border border-red-100 mb-8 mx-4">
                 <div className="flex items-start gap-3 text-left">
                     <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                     <p className="text-slate-700 text-sm leading-relaxed font-medium">
                       {errorMsg || "Gagal memproses permintaan."}
                     </p>
                 </div>
             </div>
             <button 
               onClick={handleReset}
               className="bg-slate-900 text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-slate-800 transition shadow-lg w-full sm:w-auto"
             >
               Upload Foto Baru
             </button>
          </div>
        )}

      </main>

      <SettingsModal 
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        currentSettings={settings}
        onSave={saveSettings}
      />

      <HistoryModal
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={historyItems}
        onSelect={loadHistoryItem}
        onDelete={deleteHistoryItem}
      />
      
      <footer className="py-8 text-center text-slate-400 text-sm">
        <p>&copy; {new Date().getFullYear()} LaporKerja AI. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default App;
