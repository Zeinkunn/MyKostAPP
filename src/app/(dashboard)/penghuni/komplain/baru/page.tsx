'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import NextImage from 'next/image';
import { ArrowLeft, Camera, Send, CheckCircle2, Image as ImageIcon, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function AjukanKomplainBaruPage() {
  const router = useRouter();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [kategori, setKategori] = useState('AC / Pendingin Ruangan');
  const [deskripsi, setDeskripsi] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const incomingFiles = Array.from(e.target.files);
    const remainingSlots = 3 - selectedFiles.length;
    if (remainingSlots <= 0) {
      alert('Maksimal 3 foto yang dapat dilampirkan.');
      e.target.value = '';
      return;
    }

    const filesToProcess = incomingFiles.slice(0, remainingSlots);
    setCompressing(true);
    try {
      const processedFiles: File[] = [];
      const newPreviews: string[] = [];

      for (const file of filesToProcess) {
        try {
          const compressedFile = await imageCompression(file, {
            maxSizeMB: 0.8,
            maxWidthOrHeight: 1200,
            useWebWorker: true,
          });
          processedFiles.push(compressedFile);
          newPreviews.push(URL.createObjectURL(compressedFile));
        } catch {
          processedFiles.push(file);
          newPreviews.push(URL.createObjectURL(file));
        }
      }

      setSelectedFiles((prev) => [...prev, ...processedFiles]);
      setPreviewUrls((prev) => [...prev, ...newPreviews]);
    } finally {
      setCompressing(false);
      e.target.value = '';
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
    setPreviewUrls((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed);
      return prev.filter((_, idx) => idx !== index);
    });
  };

  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deskripsi.trim()) {
      alert('Tuliskan rincian keluhan atau kerusakan fasilitas!');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('kategori', kategori);
      formData.append('deskripsi', deskripsi.trim());
      for (const file of selectedFiles) {
        formData.append('foto', file);
      }

      const res = await fetch('/api/pengaduan', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/penghuni/komplain');
        }, 1800);
      } else {
        const data = await res.json();
        alert(data.error || 'Gagal mengirim komplain');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-5">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Batal</span>
      </button>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Ajukan Perbaikan / Komplain</h1>
          <p className="text-xs text-slate-500 mt-1">
            Isi detail kerusakan fasilitas agar tim teknisi pengelola kost segera memperbaiki.
          </p>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-slate-900 text-base">Laporan Komplain Dikirim!</h3>
            <p className="text-xs text-slate-500">
              Tim pengelola akan segera meninjau dan memproses laporan Anda. Mengalihkan...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="font-semibold text-slate-700">Kategori Kerusakan / Fasilitas</label>
              <select
                value={kategori}
                onChange={(e) => setKategori(e.target.value)}
                className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="AC / Pendingin Ruangan">AC / Pendingin Ruangan</option>
                <option value="Kamar Mandi / Pipa Air">Kamar Mandi / Pipa Air</option>
                <option value="Kelistrikan & Lampu">Kelistrikan & Lampu</option>
                <option value="Kasur & Lemari">Kasur & Lemari</option>
                <option value="WiFi & Jaringan Internet">WiFi & Jaringan Internet</option>
                <option value="Kebersihan Area Umum">Kebersihan Area Umum</option>
                <option value="Lain-lain">Lain-lain</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-slate-700">Deskripsi Keluhan</label>
              <textarea
                required
                rows={4}
                value={deskripsi}
                onChange={(e) => setDeskripsi(e.target.value)}
                placeholder="Jelaskan detail kerusakan (cth. AC di kamar 204 bocor air menetes sejak tadi malam)..."
                className="w-full px-3.5 py-2.5 mt-1 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            {/* Hidden Input Elements */}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            <div>
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-700">
                  Lampirkan Foto Masalah (Opsional, Maks. 3 Foto)
                </label>
                <span className="text-[11px] text-slate-400 font-medium">
                  {selectedFiles.length}/3 foto
                </span>
              </div>

              {previewUrls.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5 mt-2">
                  {previewUrls.map((url, idx) => (
                    <div
                      key={idx}
                      className="relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square"
                    >
                      <NextImage
                        src={url}
                        alt={`Preview Kerusakan ${idx + 1}`}
                        width={160}
                        height={160}
                        unoptimized
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoveFile(idx)}
                        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-slate-900/75 text-white flex items-center justify-center hover:bg-rose-600 transition-colors"
                        aria-label="Hapus foto"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {compressing && (
                <p className="text-[11px] text-blue-600 font-semibold mt-2">
                  Mengompresi foto...
                </p>
              )}

              {selectedFiles.length < 3 && (
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-4 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl bg-slate-50 hover:bg-blue-50/50 transition-all text-center space-y-1 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Camera className="w-4 h-4" />
                    </div>
                    <p className="font-bold text-slate-800">Kamera HP</p>
                    <p className="text-[10px] text-slate-400">Foto Langsung</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="p-4 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 transition-all text-center space-y-1 group"
                  >
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-4 h-4" />
                    </div>
                    <p className="font-bold text-slate-800">Galeri / Screenshot</p>
                    <p className="text-[10px] text-slate-400">Pilih hingga {3 - selectedFiles.length} foto</p>
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || compressing || !deskripsi.trim()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span>Mengirim...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Kirim Laporan Komplain</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
