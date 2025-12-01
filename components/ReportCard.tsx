import React, { useState, useEffect } from 'react';
import { Send, Mail, FileSpreadsheet, CheckCircle2, RotateCcw, Loader2, Sparkles, Share2, Copy, CloudUpload, Link as LinkIcon, FileText, Download, MapPin, Edit3, Save, RefreshCw } from 'lucide-react';
import { AnalysisResult, AppSettings } from '../types';
import { jsPDF } from 'jspdf';

interface ReportCardProps {
  imageSrc: string;
  result: AnalysisResult;
  settings: AppSettings;
  onReset: () => void;
}

const ReportCard: React.FC<ReportCardProps> = ({ imageSrc, result, settings, onReset }) => {
  const [loadingAction, setLoadingAction] = useState<'whatsapp' | 'email' | 'spreadsheet' | 'share' | 'copy' | 'cloud' | 'pdf' | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const [publicUrl, setPublicUrl] = useState<string | null>(null);
  
  // Location State
  const [location, setLocation] = useState<string>(result.location || '');
  const [isEditingLocation, setIsEditingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  const detectLocation = () => {
    if (navigator.geolocation) {
        setIsLocating(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude.toFixed(5);
                const long = position.coords.longitude.toFixed(5);
                const loc = `Lat: ${lat}, Long: ${long}`;
                setLocation(loc);
                setIsLocating(false);
            },
            (err) => {
                console.warn("Geolocation error:", err);
                setIsLocating(false);
                // Don't alert here to avoid annoyance on auto-load, only on manual refresh
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    } else {
        console.warn("Geolocation not supported");
    }
  };

  // Auto-detect location on mount if empty
  useEffect(() => {
    if (!location) {
        detectLocation();
    }
  }, []); 

  // Auto-Save to Cloud Effect
  useEffect(() => {
    if (settings.autoSaveToCloud && settings.googleScriptUrl && !publicUrl) {
        const runAutoSave = async () => {
            try {
                // Show 'cloud' loading state on the button to give feedback
                setLoadingAction('cloud');
                await performCloudUpload();
                console.log("Auto-save to cloud successful");
            } catch (e) {
                console.warn("Auto-save failed", e);
                // We don't alert here to avoid disrupting the user flow, just log it
            } finally {
                setLoadingAction(null);
            }
        };
        runAutoSave();
    }
  }, []); // Run once on mount
  
  const generateReportText = (urlOverride?: string) => {
    const activeUrl = urlOverride || publicUrl;
    
    // Create Maps link if location looks like coordinates
    let locationText = location || '(Lokasi belum diisi)';
    if (location.includes('Lat:') && location.includes('Long:')) {
        // Extract lat long for link
        try {
            const parts = location.match(/Lat: ([-\d.]+), Long: ([-\d.]+)/);
            if (parts && parts.length === 3) {
                locationText += `\n🔗 Maps: https://maps.google.com/?q=${parts[1]},${parts[2]}`;
            }
        } catch (e) {}
    }

    let text = `*LAPORAN PEKERJAAN HARIAN*
📅 Waktu: ${result.timestamp}
📍 Lokasi: ${locationText}

*Status Pekerjaan*
📊 Progress: ${result.completionPercentage}%
📝 Ringkasan: ${result.summary}

*Detail Teknis*
${result.details.map(d => `- ${d}`).join('\n')}

*Rekomendasi*
💡 ${result.recommendations}`;

    if (activeUrl) {
        text += `\n\n🖼️ *Link Foto Lapangan:*\n${activeUrl}`;
    }

    return text.trim();
  };

  const base64ToFile = async (base64: string, filename: string): Promise<File> => {
    const res = await fetch(base64);
    const blob = await res.blob();
    return new File([blob], filename, { type: blob.type });
  };

  // Internal helper to handle upload logic
  const performCloudUpload = async (): Promise<string | null> => {
    // Return existing URL if available
    if (publicUrl) return publicUrl;
    if (!settings.googleScriptUrl) return null;

    try {
        const payload = {
            image: imageSrc.split(',')[1],
            mimeType: "image/jpeg",
            filename: `Laporan_${result.timestamp.replace(/[\/\s:,]/g, '-')}.jpg`,
            report: {
                ...result,
                location: location,
                generatedAt: new Date().toISOString()
            }
        };

        const response = await fetch(settings.googleScriptUrl, {
            method: 'POST',
            redirect: 'follow',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8', 
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server returned ${response.status}`);
        }

        const text = await response.text();
        let generatedUrl = "(Link Foto tersedia di Google Drive Kantor)";
        
        try {
            const json = JSON.parse(text);
            if (json.url) generatedUrl = json.url;
            else if (json.imageUrl) generatedUrl = json.imageUrl;
            else if (json.fileUrl) generatedUrl = json.fileUrl;
            else if (json.link) generatedUrl = json.link;
        } catch (e) {
            console.log("Response was not JSON, using default success message");
        }

        setPublicUrl(generatedUrl);
        return generatedUrl;
    } catch (error) {
        console.error("Internal upload error", error);
        throw error;
    }
  };

  const handlePdfDownload = async () => {
    if (loadingAction) return;
    setLoadingAction('pdf');

    try {
        await new Promise(resolve => setTimeout(resolve, 500)); 
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const margin = 15;
        const safeWidth = pageWidth - (margin * 2);
        let currentY = 20;

        // 1. Header
        doc.setFontSize(18);
        doc.setTextColor(14, 165, 233); 
        doc.text("LAPORAN PEKERJAAN HARIAN", margin, currentY);
        
        currentY += 10;
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Waktu: ${result.timestamp}`, margin, currentY);
        doc.text(`Progress: ${result.completionPercentage}%`, pageWidth - margin, currentY, { align: 'right' });

        currentY += 5;
        doc.text(`Lokasi: ${location || '-'}`, margin, currentY);

        // 2. Image
        currentY += 10;
        const imgType = imageSrc.includes('image/png') ? 'PNG' : 'JPEG';
        const imgProps = doc.getImageProperties(imageSrc);
        const imgHeight = (imgProps.height * safeWidth) / imgProps.width;
        
        const maxHeight = 120;
        let finalH = imgHeight;
        let finalW = safeWidth;
        
        if (imgHeight > maxHeight) {
            finalH = maxHeight;
            finalW = (imgProps.width * maxHeight) / imgProps.height;
        }

        const xOffset = margin + ((safeWidth - finalW) / 2);
        doc.addImage(imageSrc, imgType, xOffset, currentY, finalW, finalH);
        
        currentY += finalH + 15;

        // 3. Content
        doc.setTextColor(0);
        
        // Ringkasan
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text("Ringkasan Eksekutif", margin, currentY);
        currentY += 7;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        const summaryLines = doc.splitTextToSize(result.summary, safeWidth);
        doc.text(summaryLines, margin, currentY);
        currentY += (summaryLines.length * 5) + 5;

        // Detail
        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text("Detail Teknis", margin, currentY);
        currentY += 7;

        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        result.details.forEach(det => {
            const bullet = `• ${det}`;
            const lines = doc.splitTextToSize(bullet, safeWidth);
            
            if (currentY + (lines.length * 5) > doc.internal.pageSize.getHeight() - 20) {
                doc.addPage();
                currentY = 20;
            }

            doc.text(lines, margin, currentY);
            currentY += (lines.length * 6);
        });
        currentY += 5;

        // Rekomendasi
        if (currentY + 20 > doc.internal.pageSize.getHeight() - 20) {
             doc.addPage();
             currentY = 20;
        }

        doc.setFont(undefined, 'bold');
        doc.setFontSize(12);
        doc.text("Rekomendasi", margin, currentY);
        currentY += 7;
        
        doc.setFont(undefined, 'normal');
        doc.setFontSize(11);
        const recLines = doc.splitTextToSize(result.recommendations, safeWidth);
        doc.text(recLines, margin, currentY);

        // Footer
        const pageHeight = doc.internal.pageSize.getHeight();
        doc.setFontSize(8);
        doc.setTextColor(150);
        doc.text("Generated by LaporKerja AI", pageWidth / 2, pageHeight - 10, { align: 'center' });

        const safeDate = result.timestamp.replace(/[\/\s:,]/g, '-');
        doc.save(`Laporan_${safeDate}.pdf`);

    } catch (err) {
        console.error("PDF Generation Error", err);
        alert("Gagal membuat PDF. Pastikan gambar valid.");
    } finally {
        setLoadingAction(null);
    }
  };

  const handleCloudUpload = async () => {
    if (loadingAction) return;
    
    if (!settings.googleScriptUrl) {
        alert("Mohon isi 'URL Google Apps Script' di menu Pengaturan (ikon Gear) terlebih dahulu untuk mengaktifkan fitur ini.");
        return;
    }

    setLoadingAction('cloud');
    try {
        await performCloudUpload();
        await new Promise(resolve => setTimeout(resolve, 800)); 
        alert("✅ Data Berhasil Disimpan ke Cloud!\n\nLaporan dan Foto telah dikirim ke Spreadsheet/Drive kantor.");
    } catch (error) {
        console.error("Cloud upload error", error);
        alert("Gagal menghubungi Google Script. \n\nPastikan URL benar dan Script di-deploy sebagai Web App dengan akses 'Anyone'.");
    } finally {
        setLoadingAction(null);
    }
  };

  const handleNativeShare = async () => {
    if (loadingAction) return;
    setLoadingAction('share');
    try {
      const safeDate = result.timestamp.replace(/[\/\s:,]/g, '-');
      const file = await base64ToFile(imageSrc, `Laporan-Kerja-${safeDate}.jpg`);
      
      const shareData = {
        files: [file],
        title: 'Laporan Kerja Harian',
        text: generateReportText(),
      };

      if (navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData);
      } else {
        alert("Browser Anda tidak mendukung berbagi gambar secara langsung. Silakan gunakan tombol Kirim Teks di bawah.");
      }
    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error("Share failed", error);
        alert("Gagal membagikan laporan. Coba lagi.");
      }
    } finally {
      setLoadingAction(null);
    }
  };

  const handleWhatsApp = async () => {
    if (loadingAction) return;
    setLoadingAction('whatsapp');
    
    let urlOverride = publicUrl;
    if (settings.googleScriptUrl && !publicUrl) {
        try {
            urlOverride = await performCloudUpload();
        } catch (e) {
            console.warn("Auto-upload for WA failed, continuing without link", e);
        }
    }

    try {
        const blob = await (await fetch(imageSrc)).blob();
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ]);
    } catch (e) {
        console.log("Clipboard image copy failed", e);
    }

    const text = encodeURIComponent(generateReportText(urlOverride || undefined));
    const url = `https://wa.me/${settings.whatsappNumber}?text=${text}`;
    
    window.open(url, '_blank');
    
    setTimeout(() => {
        alert("✅ Foto telah disalin ke Clipboard.\n\nSilakan 'PASTE' (Tempel) di chat WhatsApp.");
    }, 500);

    setLoadingAction(null);
  };

  const handleEmail = async () => {
    if (loadingAction) return;
    setLoadingAction('email');

    // 1. Try to upload to cloud first if configured (best experience for links)
    let urlOverride = publicUrl;
    if (settings.googleScriptUrl && !publicUrl) {
        try {
            urlOverride = await performCloudUpload();
        } catch (e) {
             console.warn("Auto-upload for Email failed", e);
        }
    }

    // 2. Try to copy image to clipboard (fallback for attachment)
    let clipboardSuccess = false;
    try {
        const blob = await (await fetch(imageSrc)).blob();
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ]);
        clipboardSuccess = true;
    } catch (e) {
        console.log("Clipboard image copy failed", e);
    }

    // 3. Open Email Client
    const subject = encodeURIComponent(`Laporan Kerja - ${result.timestamp}`);
    const body = encodeURIComponent(generateReportText(urlOverride || undefined));
    window.location.href = `mailto:${settings.emailAddress}?subject=${subject}&body=${body}`;
    
    // 4. Feedback
    setTimeout(() => {
        if (clipboardSuccess) {
            alert("✅ Foto telah disalin ke Clipboard.\n\nSilakan 'PASTE' (Tempel) di badan email Anda.");
        } else if (!urlOverride && !settings.googleScriptUrl) {
             alert("⚠️ Info: Foto tidak dapat dilampirkan otomatis.\n\nSilakan 'PASTE' manual atau isi 'Google Apps Script URL' di pengaturan agar Link Foto muncul.");
        }
    }, 500);

    setLoadingAction(null);
  };

  const handleSpreadsheet = async () => {
    if (loadingAction) return;
    setLoadingAction('spreadsheet');
    try {
      await navigator.clipboard.writeText(generateReportText());
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (settings.spreadsheetUrl) {
        window.open(settings.spreadsheetUrl, '_blank');
      } else {
        alert("URL Spreadsheet belum diatur di menu Pengaturan.");
      }
    } catch (err) {
      console.error("Failed to copy", err);
      alert("Gagal menyalin laporan ke clipboard.");
    } finally {
      setLoadingAction(null);
    }
  };

  const handleCopy = async () => {
    if (loadingAction) return;
    setLoadingAction('copy');
    try {
      await navigator.clipboard.writeText(generateReportText());
      setCopySuccess(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (err) {
      console.error("Failed to copy", err);
      alert("Gagal menyalin laporan.");
    } finally {
      setLoadingAction(null);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  const handleSendReport = () => {
    if (settings.whatsappNumber) {
        handleWhatsApp();
    } else if (settings.emailAddress) {
        handleEmail();
    } else if (settings.spreadsheetUrl) {
        handleSpreadsheet();
    } else {
        alert("Silakan atur Nomor WhatsApp atau Email Kantor di menu Pengaturan (ikon Gear di pojok kanan atas).");
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-slide-up border border-white/50 ring-1 ring-black/5">
      
      {/* Header Image Section */}
      <div className="relative h-72 group">
        <div className="absolute inset-0 bg-gray-900">
          <img 
            src={imageSrc} 
            alt="Work Evidence" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition-opacity duration-500"
          />
        </div>
        
        {/* Overlay Content */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent flex flex-col justify-end p-8">
          <div className="flex justify-between items-end animate-fade-in">
            <div>
              <div className="flex items-center gap-2 mb-2">
                 <div className="bg-green-500/20 backdrop-blur-md border border-green-500/30 text-green-300 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" /> AI Analysis
                 </div>
                 <span className="text-gray-400 text-xs font-medium">{result.timestamp}</span>
              </div>
              <h2 className="text-4xl font-bold text-white tracking-tight">
                {result.completionPercentage}% <span className="text-lg font-normal text-gray-300">Selesai</span>
              </h2>
            </div>
            
            {/* Circular Progress Indicator */}
            <div className="hidden sm:block">
              <svg className="w-16 h-16 transform -rotate-90">
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-gray-700" />
                <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={175} strokeDashoffset={175 - (175 * result.completionPercentage) / 100} className="text-brand-500 transition-all duration-1000 ease-out" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Content Body */}
      <div className="p-8 space-y-6 bg-gradient-to-b from-white to-gray-50">
        
        {/* Summary */}
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ringkasan Eksekutif</h3>
          <p className="text-gray-800 text-lg leading-relaxed font-medium">{result.summary}</p>
        </div>

        {/* Details & Recommendation Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-brand-600" /> 
              Detail Teknis
            </h4>
            <ul className="space-y-3">
              {result.details.map((detail, idx) => (
                <li key={idx} className="text-sm text-gray-600 flex items-start gap-3">
                  <div className="mt-1.5 w-1.5 h-1.5 bg-brand-400 rounded-full flex-shrink-0" />
                  <span className="leading-snug">{detail}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-brand-50/50 p-6 rounded-2xl border border-brand-100/50 hover:bg-brand-50 transition-colors">
            <h4 className="font-bold text-brand-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-brand-600" />
              Rekomendasi AI
            </h4>
            <p className="text-sm text-brand-800 leading-relaxed italic">
              "{result.recommendations}"
            </p>
          </div>
        </div>
        
        {/* Location Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex items-start gap-3 w-full">
                <div className="p-2 bg-white rounded-xl border border-slate-200 shadow-sm shrink-0">
                    <MapPin className="w-5 h-5 text-brand-600" />
                </div>
                <div className="w-full">
                    <div className="flex justify-between items-center mb-1">
                        <h4 className="font-bold text-slate-700 text-sm">Lokasi Pekerjaan</h4>
                        {isLocating && <span className="text-[10px] text-brand-500 animate-pulse">Mencari GPS...</span>}
                    </div>
                    
                    {isEditingLocation ? (
                        <div className="flex gap-2 w-full mt-2 animate-fade-in">
                            <input 
                                type="text" 
                                value={location} 
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Masukkan nama tempat / alamat..."
                                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                                autoFocus
                            />
                            <div className="flex gap-1">
                                <button 
                                    onClick={detectLocation}
                                    type="button"
                                    title="Refresh GPS"
                                    className="bg-slate-200 text-slate-600 p-2 rounded-lg hover:bg-slate-300 transition"
                                >
                                    <RefreshCw className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
                                </button>
                                <button 
                                    onClick={() => setIsEditingLocation(false)}
                                    className="bg-brand-600 text-white p-2 rounded-lg hover:bg-brand-700 transition"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-slate-600 leading-snug break-all">
                                {location || (isLocating ? 'Sedang mendeteksi...' : 'Lokasi belum diatur')}
                            </p>
                            <button 
                                onClick={() => setIsEditingLocation(true)}
                                className="ml-4 text-xs font-semibold text-brand-600 hover:text-brand-800 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 whitespace-nowrap"
                            >
                                <Edit3 className="w-3 h-3" />
                                {location ? 'Ubah' : 'Input Manual'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-6 border-t border-gray-200">
          <p className="text-center text-xs font-semibold text-gray-400 uppercase tracking-widest mb-6">Aksi Laporan</p>
          
          <div className="space-y-4">
            
            {/* Primary Actions Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 {/* PDF Download */}
                 <button 
                  onClick={handlePdfDownload}
                  disabled={loadingAction !== null}
                  className={`w-full relative flex items-center justify-center gap-3 p-4 rounded-2xl transition-all duration-300 shadow-lg shadow-red-500/10 transform hover:-translate-y-1 ${
                    loadingAction === 'pdf' 
                      ? 'bg-slate-800 text-white cursor-wait' 
                      : 'bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white'
                  }`}
                >
                  {loadingAction === 'pdf' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileText className="w-5 h-5" />}
                  <div className="text-left leading-none">
                    <span className="block font-bold text-sm">Unduh PDF</span>
                    <span className="block text-[10px] text-white/80 font-normal mt-1">Laporan Resmi</span>
                  </div>
                </button>

                 {/* Native Share */}
                <button 
                  onClick={handleNativeShare}
                  disabled={loadingAction !== null}
                  className={`w-full relative flex items-center justify-center gap-3 p-4 rounded-2xl transition-all duration-300 shadow-lg shadow-slate-500/20 transform hover:-translate-y-1 ${
                    loadingAction === 'share' 
                      ? 'bg-slate-800 text-white cursor-wait' 
                      : 'bg-gradient-to-r from-slate-800 to-slate-700 hover:from-slate-700 hover:to-slate-600 text-white'
                  }`}
                >
                  {loadingAction === 'share' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Share2 className="w-5 h-5" />}
                  <div className="text-left leading-none">
                    <span className="block font-bold text-sm">Bagikan</span>
                    <span className="block text-[10px] text-slate-400 font-normal mt-1">Via Menu HP</span>
                  </div>
                </button>

                {/* Cloud Upload */}
                 <button 
                  onClick={handleCloudUpload}
                  disabled={loadingAction !== null || !!publicUrl}
                  className={`w-full relative flex items-center justify-center gap-3 p-4 rounded-2xl transition-all duration-300 shadow-lg ${
                    publicUrl
                      ? 'bg-green-600 text-white shadow-green-500/20 cursor-default'
                      : loadingAction === 'cloud' 
                      ? 'bg-orange-600 text-white cursor-wait'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-500/20 hover:-translate-y-1'
                  }`}
                >
                  {loadingAction === 'cloud' ? (
                     <Loader2 className="w-5 h-5 animate-spin" />
                  ) : publicUrl ? (
                     <CheckCircle2 className="w-5 h-5" />
                  ) : (
                     <CloudUpload className="w-5 h-5" />
                  )}
                  <div className="text-left leading-none">
                    <span className="block font-bold text-sm">{publicUrl ? 'Terupload' : 'Simpan Cloud'}</span>
                    <span className="block text-[10px] text-white/80 font-normal mt-1">{publicUrl ? 'Data Tersimpan' : 'Ke Google Script'}</span>
                  </div>
                </button>
            </div>

            {/* Secondary Actions: Direct Links (Text Only) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              
              {/* WhatsApp */}
              <button 
                onClick={handleWhatsApp}
                disabled={loadingAction !== null}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  loadingAction === 'whatsapp' 
                  ? 'bg-green-50 border-green-500 text-green-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-green-400 hover:bg-green-50 hover:text-green-700'
                }`}
              >
                {loadingAction === 'whatsapp' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {loadingAction === 'whatsapp' ? '...' : 'WhatsApp'}
                </span>
              </button>

              {/* Email */}
              <button 
                onClick={handleEmail}
                disabled={loadingAction !== null}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  loadingAction === 'email' 
                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                {loadingAction === 'email' ? <Loader2 className="w-5 h-5 animate-spin" /> : <Mail className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {loadingAction === 'email' ? '...' : 'Email'}
                </span>
              </button>

              {/* Spreadsheet */}
              <button 
                onClick={handleSpreadsheet}
                disabled={loadingAction !== null}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  loadingAction === 'spreadsheet' 
                  ? 'bg-purple-50 border-purple-500 text-purple-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                {loadingAction === 'spreadsheet' ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileSpreadsheet className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {loadingAction === 'spreadsheet' ? '...' : 'Salin Data'}
                </span>
              </button>

              {/* Copy Text */}
              <button 
                onClick={handleCopy}
                disabled={loadingAction !== null}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  loadingAction === 'copy' || copySuccess
                  ? 'bg-slate-50 border-slate-500 text-slate-700' 
                  : 'bg-white border-gray-200 text-gray-600 hover:border-slate-400 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                {loadingAction === 'copy' || copySuccess ? (copySuccess ? <CheckCircle2 className="w-5 h-5 text-green-600"/> : <Loader2 className="w-5 h-5 animate-spin" />) : <Copy className="w-5 h-5" />}
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  {loadingAction === 'copy' ? '...' : copySuccess ? 'Tersalin' : 'Salin Teks'}
                </span>
              </button>
            </div>
            
            {/* Primary Submit Button */}
            <button 
              onClick={handleSendReport}
              disabled={loadingAction !== null}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-brand-500/30 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 mb-4"
            >
              {loadingAction === 'whatsapp' || loadingAction === 'email' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
              <span className="text-lg">Kirim Laporan</span>
            </button>

            <button 
              onClick={onReset}
              className="w-full flex items-center justify-center gap-2 p-3 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-all text-sm font-medium"
            >
              <RotateCcw className="w-4 h-4" />
              Buat Laporan Baru
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportCard;