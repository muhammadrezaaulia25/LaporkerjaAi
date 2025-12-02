
import { createClient } from '@supabase/supabase-js';
import { AnalysisResult, AppSettings } from '../types';

export const uploadToSupabase = async (
  settings: AppSettings, 
  base64Image: string, 
  result: AnalysisResult
): Promise<string> => {
  if (!settings.supabaseUrl || !settings.supabaseKey) {
    throw new Error("Konfigurasi Supabase (URL & Key) belum diisi.");
  }

  const supabase = createClient(settings.supabaseUrl, settings.supabaseKey);
  const timestamp = Date.now();
  const fileName = `report_${timestamp}.jpg`;

  // 1. Convert Base64 to Blob
  const res = await fetch(base64Image);
  const blob = await res.blob();
  const file = new File([blob], fileName, { type: 'image/jpeg' });

  // 2. Upload Image to Storage Bucket 'work-images'
  // Pastikan bucket 'work-images' sudah dibuat di Supabase dan diset Public
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('work-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (uploadError) {
    throw new Error(`Gagal upload gambar: ${uploadError.message}`);
  }

  // 3. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('work-images')
    .getPublicUrl(fileName);

  // 4. Insert Data into Table 'reports'
  // Pastikan table 'reports' sudah dibuat di Supabase
  const { error: insertError } = await supabase
    .from('reports')
    .insert([
      {
        completion_percentage: result.completionPercentage,
        summary: result.summary,
        details: result.details, // Supabase akan handle array sebagai jsonb
        recommendations: result.recommendations,
        location: result.location || null,
        image_url: publicUrl,
        created_at: new Date().toISOString()
      }
    ]);

  if (insertError) {
    console.warn("Gambar terupload tapi gagal simpan database:", insertError.message);
    // Kita tidak throw error di sini agar user tetap dapat link gambar
  }

  return publicUrl;
};