'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Send, CheckCircle2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function AjukanKomplainBaruPage() {
  const router = useRouter();
  const [kategori, setKategori] = useState('AC / Pendingin Ruangan');
  const [deskripsi, setDeskripsi] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCompressing(true);
      try {
        const compressedFile = await imageCompression(file, {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        });
        setSelectedFile(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } catch (err) {
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } finally {
        setCompressing(false);
      }
    }
  };

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
      if (selectedFile) {
        formData.append('foto', selectedFile);
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

            <div>
              <label className="font-semibold text-slate-700">Lampirkan Foto Masalah (Opsional)</label>
              <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors mt-1">
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Preview Kerusakan"
                      className="max-h-48 mx-auto rounded-xl object-contain shadow-sm"
                    />
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      {compressing ? 'Mengompresi foto...' : 'Foto terlampir'}
                    </p>
                  </div>
                ) : (
                  <div className="py-4 space-y-2">
                    <Camera className="w-7 h-7 text-blue-600 mx-auto" />
                    <p className="font-semibold text-slate-800">Ambil Foto Masalah</p>
                    <p className="text-[11px] text-slate-400">JPG, PNG (Maks 5MB)</p>
                  </div>
                )}

                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || compressing || !deskripsi.trim()}
              className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
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
