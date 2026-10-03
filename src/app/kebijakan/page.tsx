import Link from 'next/link';
import { ArrowLeft, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';

export default function KebijakanPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Beranda</span>
        </Link>

        {/* Draft Notice Banner */}
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 flex items-start gap-3 shadow-xs">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs text-amber-900 leading-relaxed">
            <p className="font-bold text-amber-950 uppercase tracking-wider text-[11px]">
              Dokumen Draft Sementara
            </p>
            <p className="mt-0.5">
              Draft — ganti dengan teks resmi sebelum rilis publik. Halaman ini berfungsi sebagai
              placeholder ketentuan hukum, lisensi, dan privasi aplikasi MyKost.
            </p>
          </div>
        </div>

        {/* Content Card */}
        <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-xs space-y-6 text-xs text-slate-600 leading-relaxed">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900">
                Kebijakan & Ketentuan Layanan MyKost
              </h1>
              <p className="text-[11px] text-slate-400">Versi 1.0 (Draft) • Terakhir diperbarui Oktober 2026</p>
            </div>
          </div>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-800">1. Ketentuan Umum</h2>
            <p>
              Aplikasi MyKost disediakan untuk mempermudah administrasi sewa menyewa properti kost
              antara pengelola (Owner/Admin) dan penghuni (Penghuni). Dengan menggunakan aplikasi
              ini, pengguna setuju untuk mematuhi seluruh peraturan yang berlaku.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-800">2. Privasi & Keamanan Data</h2>
            <p>
              Data pribadi seperti Nomor Induk Kependudukan (NIK) dan nomor telepon hanya disimpan
              untuk keperluan verifikasi identitas resmi dan komunikasi operasional sewa. Nomor KTP
              disamarkan pada antarmuka pengguna demi melindungi privasi.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-800">3. Pembayaran & Pembatalan</h2>
            <p>
              Pembayaran tagihan sewa bulanan diverifikasi secara manual atau otomatis oleh pengelola
              kost. Bukti transfer yang diunggah wajib merupakan dokumen asli yang sah. Keterlambatan
              pembayaran dapat dikenakan denda sesuai kebijakan properti.
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-bold text-slate-800">4. Tata Tertib Penghuni</h2>
            <p>
              Penghuni wajib menjaga kebersihan kamar, merawat fasilitas bersama, serta menjaga
              keamanan lingkungan kost. Pelanggaran berat dapat mengakibatkan pemutusan kontrak sewa
              sepihak sesuai kesepakatan tertulis.
            </p>
          </section>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>© 2026 MyKost Management System</span>
            <span className="flex items-center gap-1 text-emerald-600 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" /> Terverifikasi Sistem
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
