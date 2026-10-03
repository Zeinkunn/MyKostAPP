'use client';

import { useState, useEffect } from 'react';
import { ArrowRight, Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface PerpanjangButtonProps {
  initialStatus?: 'PENDING' | 'DISETUJUI' | 'DITOLAK' | null;
}

export default function PerpanjangButton({ initialStatus }: PerpanjangButtonProps) {
  const [status, setStatus] = useState<'PENDING' | 'DISETUJUI' | 'DITOLAK' | null>(
    initialStatus ?? null
  );
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Synchronize on mount if initialStatus wasn't provided directly
  useEffect(() => {
    if (initialStatus === undefined) {
      let isMounted = true;
      fetch('/api/kontrak/perpanjangan')
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (isMounted && data?.pengajuan?.status) {
            setStatus(data.pengajuan.status);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    }
  }, [initialStatus]);

  const handlePerpanjang = async () => {
    if (loading || status === 'PENDING') return;
    setLoading(true);
    setToast(null);

    try {
      const res = await fetch('/api/kontrak/perpanjangan', {
        method: 'POST',
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setStatus('PENDING');
        }
        throw new Error(data.error || 'Gagal mengajukan perpanjangan sewa');
      }

      setStatus('PENDING');
      setToast({
        type: 'success',
        message: data.message || 'Pengajuan perpanjangan berhasil dikirim!',
      });
      setTimeout(() => setToast(null), 5000);
    } catch (err: any) {
      setToast({
        type: 'error',
        message: err.message || 'Terjadi kesalahan saat menghubungi server',
      });
      setTimeout(() => setToast(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative">
      {/* Toast Alert */}
      {toast && (
        <div
          role="alert"
          className={`fixed top-5 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[90%] p-3.5 rounded-2xl shadow-xl border flex items-start gap-2.5 text-xs animate-in fade-in slide-in-from-top-4 duration-300 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <span className="flex-1 font-medium leading-relaxed">{toast.message}</span>
        </div>
      )}

      {status === 'PENDING' ? (
        <span
          className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200/80 py-1 px-2.5 rounded-lg flex items-center gap-1.5 select-none"
          title="Pengajuan perpanjangan Anda sedang menunggu konfirmasi pengelola kost"
        >
          <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0 animate-pulse" />
          <span>Menunggu konfirmasi</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={handlePerpanjang}
          disabled={loading}
          className="text-xs font-bold text-blue-600 hover:text-blue-700 active:opacity-80 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 py-1 px-1.5 rounded-lg hover:bg-blue-50/60"
          title="Ajukan perpanjangan sewa kepada pengelola"
        >
          {loading ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Memproses...</span>
            </>
          ) : (
            <>
              <span>Perpanjang</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </>
          )}
        </button>
      )}
    </div>
  );
}
