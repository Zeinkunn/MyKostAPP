'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Camera, Upload, ArrowLeft, CheckCircle, Image as ImageIcon } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function UploadBuktiBayarPage() {
  const router = useRouter();
  const params = useParams();
  const tagihanId = params.id as string;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metode, setMetode] = useState('Transfer Bank');
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setCompressing(true);

      try {
        // Client-side image compression
        const options = {
          maxSizeMB: 0.8,
          maxWidthOrHeight: 1200,
          useWebWorker: true,
        };
        const compressedFile = await imageCompression(file, options);
        setSelectedFile(compressedFile);
        setPreviewUrl(URL.createObjectURL(compressedFile));
      } catch (err) {
        console.error('Compression error:', err);
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } finally {
        setCompressing(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      alert('Pilih foto bukti pembayaran terlebih dahulu!');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('tagihan_id', tagihanId);
      formData.append('metode', metode);
      formData.append('bukti', selectedFile);

      const res = await fetch('/api/pembayaran', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push(`/penghuni/tagihan/${tagihanId}`);
        }, 2000);
      } else {
        const errorData = await res.json();
        alert(errorData.error || 'Gagal mengunggah bukti bayar');
      }
    } catch (err) {
      console.error(err);
      alert('Terjadi kesalahan koneksi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Batal</span>
      </button>

      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Upload Bukti Pembayaran</h1>
          <p className="text-xs text-slate-500 mt-1">
            Ambil foto resi transfer atau bukti bayar menggunakan kamera HP Anda.
          </p>
        </div>

        {success ? (
          <div className="p-6 text-center space-y-3">
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto" />
            <h3 className="font-bold text-slate-900 text-base">Bukti Bayar Berhasil Dikirim!</h3>
            <p className="text-xs text-slate-500">
              Admin akan segera memverifikasi pembayaran Anda. Mengalihkan kembali...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-700">Metode Pembayaran</label>
              <select
                value={metode}
                onChange={(e) => setMetode(e.target.value)}
                className="w-full px-3.5 py-2.5 mt-1 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Transfer BCA">Transfer BCA</option>
                <option value="Transfer Mandiri">Transfer Mandiri</option>
                <option value="Transfer BRI">Transfer BRI</option>
                <option value="Tunai ke Pengelola">Tunai ke Pengelola</option>
                <option value="QRIS / E-Wallet">QRIS / E-Wallet</option>
              </select>
            </div>

            {/* Camera Input Button / Image Preview */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Foto Resi / Bukti Transfer</label>

              <div className="relative border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center bg-slate-50 hover:bg-slate-100 transition-colors">
                {previewUrl ? (
                  <div className="space-y-2">
                    <img
                      src={previewUrl}
                      alt="Preview Bukti"
                      className="max-h-56 mx-auto rounded-xl object-contain shadow-sm"
                    />
                    <p className="text-[11px] text-emerald-700 font-semibold">
                      {compressing ? 'Mengompresi gambar...' : 'Foto siap dikirim'}
                    </p>
                  </div>
                ) : (
                  <div className="py-6 space-y-2">
                    <Camera className="w-8 h-8 text-blue-600 mx-auto" />
                    <p className="text-xs font-semibold text-slate-800">
                      Ambil Foto via Kamera atau Galeri HP
                    </p>
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
              disabled={loading || compressing || !selectedFile}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <span>Mengirim...</span>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Kirim Bukti Pembayaran</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
