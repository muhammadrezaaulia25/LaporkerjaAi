
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeWorkImage = async (base64Image: string): Promise<AnalysisResult> => {
  try {
    // Strip the prefix if present (data:image/jpeg;base64,)
    const cleanBase64 = base64Image.split(',')[1] || base64Image;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: cleanBase64
            }
          },
          {
            text: `Anda adalah supervisor teknis senior dengan kemampuan forensik digital. 
            
            Tugas UTAMA Anda adalah memverifikasi keaslian foto sebelum menganalisisnya.
            
            Langkah 1: CEK INTEGRITAS DAN KEASLIAN GAMBAR
            Analisis apakah gambar ini adalah foto lapangan ASLI yang diambil oleh kamera HP pekerja, ATAU apakah ini gambar manipulasi/dari internet.
            
            TOLAK GAMBAR (isRejected: true) JIKA:
            - Terlihat seperti 'Stock Photo' (pencahayaan studio terlalu sempurna, model berpose tidak wajar, terlalu bersih).
            - Terdapat Watermark (Shutterstock, Getty, Alamy, tulisan 'Copyright').
            - Terlihat seperti Screenshot Google Images (ada tombol 'X', panah carousel, bar pencarian, atau UI browser).
            - Gambar berupa diagram teknis, kartun, ilustrasi 3D, atau render CAD (bukan foto nyata).
            - Gambar memiliki resolusi sangat rendah atau artefak kompresi parah (pixelated) khas thumbnail unduhan.
            
            Langkah 2: JIKA GAMBAR ASLI, LAKUKAN ANALISIS KERJA
            1. Perkirakan persentase penyelesaian (0-100%).
            2. Buat ringkasan teknis formal (Bahasa Indonesia).
            3. Sebutkan 3 detail teknis.
            4. Berikan rekomendasi.
            
            Kembalikan response dalam format JSON.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isRejected: { type: Type.BOOLEAN, description: "Set true if image is fake, stock photo, google image screenshot, or illustration" },
            rejectionReason: { type: Type.STRING, description: "Reason why image is rejected (e.g., 'Terdeteksi UI Google Images', 'Gambar Stock Photo')" },
            completionPercentage: { type: Type.NUMBER, description: "Estimated completion percentage 0-100" },
            summary: { type: Type.STRING, description: "Technical summary in Indonesian" },
            details: { 
              type: Type.ARRAY, 
              items: { type: Type.STRING },
              description: "List of 3 technical details observed"
            },
            recommendations: { type: Type.STRING, description: "One recommendation for next step" }
          },
          required: ["isRejected", "completionPercentage", "summary", "details", "recommendations"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    const data = JSON.parse(text);

    return {
      ...data,
      timestamp: new Date().toLocaleString('id-ID'),
      location: '' // Initialize empty, will be filled by UI/GPS
    };

  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw error;
  }
};
