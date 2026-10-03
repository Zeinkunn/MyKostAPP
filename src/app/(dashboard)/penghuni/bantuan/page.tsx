import Link from 'next/link';
import { ArrowLeft, HelpCircle, LifeBuoy, MessageSquare } from 'lucide-react';
import FaqAccordion, { FaqItem } from '@/components/FaqAccordion';
import { prisma } from '@/lib/prisma';
import { normalizePhone } from '@/lib/phone';

const TENANT_FAQS: FaqItem[] = [
  {
    category: 'Pembayaran Sewa',
    question: 'Bagaimana cara melakukan pembayaran tagihan sewa?',
    answer:
      'Masuk ke menu Tagihan di navigasi bawah, pilih tagihan yang berstatus BELUM BAYAR, lalu klik "Bayar Sekarang". Anda dapat mengunggah bukti transfer bank atau struk pembayaran. Pengelola akan memverifikasi bukti tersebut dalam 1x24 jam kerja.',
  },
  {
    category: 'Masa Sewa',
    question: 'Bagaimana cara mengajukan perpanjangan masa sewa kamar?',
    answer:
      'Buka menu Profil Saya, lalu pada kartu "Masa Sewa Berjalan" klik tombol "Perpanjang →". Pengajuan Anda akan otomatis dikirimkan sebagai notifikasi kepada pengelola kost. Pengajuan dibatasi maksimal 1 kali setiap 7 hari.',
  },
  {
    category: 'Keluhan & Fasilitas',
    question: 'Bagaimana alur melaporkan kerusakan fasilitas kamar?',
    answer:
      'Buka menu Komplain di navigasi bawah, pilih kamar Anda, lalu klik "Buat Komplain Baru". Isi rincian masalah, kategori kendala (mis. Listrik, Air, AC, Pintu), dan lampirkan foto kendala. Status penanganan dapat dipantau langsung secara real-time.',
  },
  {
    category: 'Denda & Keterlambatan',
    question: 'Kapan denda keterlambatan mulai dihitung?',
    answer:
      'Denda dihitung otomatis oleh sistem jika pembayaran belum diverifikasi setelah melewati tanggal jatuh tempo yang tertera pada invoice tagihan Anda. Besaran denda mengacu pada aturan denda harian atau tetap yang ditentukan oleh pengelola.',
  },
  {
    category: 'Tata Tertib',
    question: 'Apa saja tata tertib umum penghuni MyKost?',
    answer:
      'Penghuni wajib menjaga ketenangan bersama terutama di atas pukul 22:00 WIB, dilarang merokok di dalam kamar ber-AC, dilarang mengubah instalasi listrik tanpa izin pengelola, dan menjaga kebersihan area bersama.',
  },
];

export default async function PenghuniBantuanPage() {
  const settings = await prisma.pengaturan.findUnique({
    where: { id: 'default' },
    select: { kontak_pengelola_wa: true },
  });

  let waUrl: string | null = null;
  if (settings?.kontak_pengelola_wa) {
    const normalized = normalizePhone(settings.kontak_pengelola_wa);
    const intlDigits = normalized.startsWith('0') ? `62${normalized.slice(1)}` : normalized;
    const textMsg = encodeURIComponent('Halo Pengelola MyKost, saya penghuni ingin menanyakan perihal kost.');
    waUrl = `https://wa.me/${intlDigits}?text=${textMsg}`;
  }

  return (
    <div className="max-w-md mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/penghuni/profil"
          className="p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          title="Kembali ke Profil"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Pusat Bantuan
            </span>
          </div>
          <h1 className="text-xl font-bold text-slate-900">Bantuan &amp; FAQ Penghuni</h1>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl p-5 text-white shadow-xs space-y-2 relative overflow-hidden">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
            <LifeBuoy className="w-5 h-5 text-white" />
          </div>
          <h2 className="text-base font-bold">Ada pertanyaan seputar kost?</h2>
        </div>
        <p className="text-xs text-blue-50/90 leading-relaxed">
          Temukan jawaban cepat untuk pertanyaan umum seputar sewa kamar, metode pembayaran,
          pengajuan perpanjangan, dan pelaporan kendala di bawah ini.
        </p>
      </div>

      {/* WhatsApp Manager Contact Action Card (Rendered only when filled) */}
      {waUrl && (
        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-xs">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-xs">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Hubungi Pengelola Kost</span>
            </div>
            <p className="text-[11px] text-emerald-700/90 mt-0.5 truncate">
              Chat langsung via WhatsApp resmi pengelola
            </p>
          </div>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all shrink-0 flex items-center gap-1.5"
          >
            <span>Hubungi WA</span>
          </a>
        </div>
      )}

      {/* FAQ Accordion List */}
      <div className="space-y-3">
        <div className="flex items-center gap-1.5 px-1">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Pertanyaan yang Sering Diajukan
          </h3>
        </div>
        <FaqAccordion items={TENANT_FAQS} />
      </div>

      {/* Footer support */}
      <div className="pt-2 text-center text-xs text-slate-400">
        <p>Aplikasi MyKost Penghuni • Butuh bantuan mendesak hubungi langsung pengelola kost</p>
      </div>
    </div>
  );
}
