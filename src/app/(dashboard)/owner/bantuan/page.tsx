import Link from 'next/link';
import { ArrowLeft, ShieldQuestion, BookOpen } from 'lucide-react';
import FaqAccordion, { FaqItem } from '@/components/FaqAccordion';

const OWNER_FAQS: FaqItem[] = [
  {
    category: 'Onboarding Penghuni',
    question: 'Bagaimana alur pendaftaran (onboarding) penghuni baru?',
    answer:
      'Buka menu Penghuni, klik "Tambah Penghuni / Onboarding", lalu pilih kamar KOSONG, masukkan data penghuni (nama, no. HP, NIK KTP, tanggal mulai, dan harga sewa). Sistem akan memproses pendaftaran secara atomik: kamar otomatis diubah menjadi TERISI, kontrak aktif dibuat, dan tagihan bulan pertama diterbitkan.',
  },
  {
    category: 'Verifikasi Pembayaran',
    question: 'Bagaimana cara memeriksa dan memverifikasi bukti transfer?',
    answer:
      'Masuk ke menu Tagihan / Pembayaran, pilih pembayaran berstatus PENDING. Klik bukti transfer untuk melihat gambar asli dengan aman via URL privat bertanda tangan digital. Anda dapat memilih "Setujui" (tagihan langsung menjadi LUNAS) atau "Tolak" (disertai alasan penolakan).',
  },
  {
    category: 'Komplain & Perbaikan',
    question: 'Bagaimana menangani komplain kerusakan fasilitas dari penghuni?',
    answer:
      'Buka menu Komplain untuk melihat daftar tiket masuk. Anda dapat mengubah status komplain menjadi "Diproses" saat teknisi mulai bekerja, menambahkan catatan internal (hanya terlihat oleh pengelola), dan menyelesaikan komplain saat perbaikan selesai.',
  },
  {
    category: 'Checkout & Deposit',
    question: 'Bagaimana prosedur checkout penghuni dan pemotongan deposit?',
    answer:
      'Buka detail kontrak penghuni yang ingin keluar, lalu klik "Proses Checkout". Sistem akan memastikan seluruh tagihan dan pembayaran pending telah beres. Masukkan jumlah potongan deposit bila ada kerusakan inventaris (maksimal sebesar deposit awal). Setelah checkout berhasil, status kamar otomatis kembali menjadi KOSONG.',
  },
  {
    category: 'Pengaturan Denda',
    question: 'Apa perbedaan antara denda Mode HARIAN dan Mode TETAP?',
    answer:
      'Mode HARIAN mengalikan nominal denda dengan jumlah hari keterlambatan sejak lewat tanggal jatuh tempo. Mode TETAP hanya mengenakan nominal denda satu kali (flat) tanpa memperhitungkan lama hari keterlambatan. Pengaturan ini dapat disesuaikan di menu Pengaturan Sistem.',
  },
  {
    category: 'Otomasi Pesan WhatsApp',
    question: 'Kapan pengingat tagihan WhatsApp otomatis dikirimkan ke penghuni?',
    answer:
      'Sistem menjalankan tugas cron otomatis setiap hari pukul 08:00 WIB (01:00 UTC). Pesan WhatsApp dikirimkan saat tagihan memasuki rentang H-N hari sebelum jatuh tempo, pada hari H, dan saat terlambat, dengan proteksi anti-spam cooldown 24 jam.',
  },
  {
    category: 'Keamanan Akses',
    question: 'Bagaimana cara menambah akun admin tambahan untuk pengelola?',
    answer:
      'Hanya akun ber-role OWNER yang dapat mengakses menu "Kelola User & Peran" di /owner/users. OWNER dapat menambahkan akun pengelola baru dengan role ADMIN atau OWNER serta mereset kata sandi staf pengelola bila diperlukan.',
  },
];

export default function OwnerBantuanPage() {
  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/owner/profil"
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          title="Kembali ke Profil"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Panduan Manajemen
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Pusat Bantuan Pengelola</h1>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-tr from-slate-900 to-blue-950 rounded-2xl p-5 text-white shadow-xs space-y-2 relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-600/30 backdrop-blur-xs">
            <BookOpen className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-base font-bold">Panduan Operasional MyKost</h2>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Temukan pedoman lengkap mengenai alur sewa, verifikasi transaksi pembayaran, manajemen
          kamar, checkout penghuni, dan konfigurasi denda otomatis.
        </p>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <ShieldQuestion className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Topik Tanya Jawab Pengelola
          </h3>
        </div>
        <FaqAccordion items={OWNER_FAQS} />
      </div>

      {/* Footer support */}
      <div className="pt-2 text-center text-xs text-slate-400">
        <p>MyKost Enterprise System • Sistem Pengelolaan Properti Kost Terpadu</p>
      </div>
    </div>
  );
}
