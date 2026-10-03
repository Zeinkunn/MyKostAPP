'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Camera, Upload, ArrowLeft, CheckCircle, Image as ImageIcon, CreditCard, Copy, Check } from 'lucide-react';
import imageCompression from 'browser-image-compression';

export default function UploadBuktiBayarPage() {
  const router = useRouter();
  const params = useParams();
  const tagihanId = params.id as string;

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [metode, setMetode] = useState('Transfer Bank');
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [success, setSuccess] = useState(false);
  const [bankInfo, setBankInfo] = useState<{
    bank_nama?: string;
    bank_no_rekening?: string;
    bank_atas_nama?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/pengaturan')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.bank_no_rekening) {
          setBankInfo(data);
        }
      })
      .catch((err) => console.error('Gagal memuat info bank:', err));
  }, []);

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
            Ambil foto dari kamera langsung atau pilih screenshot dari galeri HP Anda.
          </p>
        </div>

        {bankInfo && bankInfo.bank_no_rekening && (
          <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                  Transfer ke Rekening Pengelola
                </span>
              </div>
              {bankInfo.bank_nama && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-600 text-white">
                  {bankInfo.bank_nama}
                </span>
              )}
            </div>

            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-100">
              <div>
                <span className="text-[11px] text-slate-400 block font-medium">Nomor Rekening</span>
                <span className="text-sm font-bold text-slate-900 font-mono select-all">
                  {bankInfo.bank_no_rekening}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (bankInfo.bank_no_rekening) {
                    navigator.clipboard.writeText(bankInfo.bank_no_rekening);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2500);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin</span>
                  </>
                )}
              </button>
            </div>

            {bankInfo.bank_atas_nama && (
              <p className="text-[11px] text-slate-500 font-medium px-1">
                Atas Nama: <strong className="text-slate-800">{bankInfo.bank_atas_nama}</strong>
              </p>
            )}
          </div>
        )}

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
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Image Preview or Selector */}
            <div className="space-y-3">
              <label className="text-xs font-semibold text-slate-700">Foto Resi / Bukti Transfer</label>

              {previewUrl ? (
                <div className="border-2 border-dashed border-emerald-300 rounded-2xl p-4 text-center bg-emerald-50/40 space-y-2">
                  <img
                    src={previewUrl}
                    alt="Preview Bukti"
                    className="max-h-56 mx-auto rounded-xl object-contain shadow-sm"
                  />
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    {compressing ? 'Mengompresi foto...' : 'Foto siap dikirim'}
                  </p>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="text-xs text-blue-600 font-semibold hover:underline"
                  >
                    Ganti Foto / Screenshot Lain
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl bg-slate-50 hover:bg-blue-50/50 transition-all text-center space-y-2 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Kamera HP</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Foto Langsung</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="p-5 border-2 border-dashed border-slate-300 hover:border-emerald-500 rounded-2xl bg-slate-50 hover:bg-emerald-50/50 transition-all text-center space-y-2 group"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Galeri / Screenshot</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Pilih dari HP</p>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || compressing || !selectedFile}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-xl shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 mt-2"
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
