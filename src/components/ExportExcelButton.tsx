'use client';

import { FileSpreadsheet, Printer } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExportExcelButtonProps {
  approvedPayments: Array<{
    id: string;
    tanggal_bayar: string | Date;
    metode: string;
    jumlah_dibayar: number | string;
    tagihan: {
      periode: string;
      kontrak: {
        kamar: { nomor_kamar: string };
        penghuni: { nama: string };
      };
    };
  }>;
  unpaidBills: Array<{
    id: string;
    periode: string;
    jumlah: number | string;
    denda: number | string;
    jatuh_tempo: string | Date;
    kontrak: {
      kamar: { nomor_kamar: string };
      penghuni: { nama: string };
    };
  }>;
}

export default function ExportExcelButton({ approvedPayments, unpaidBills }: ExportExcelButtonProps) {
  const handleExportExcel = () => {
    // Worksheet 1: Approved Payments
    const incomeData = approvedPayments.map((p, idx) => ({
      No: idx + 1,
      'Tanggal Bayar': new Date(p.tanggal_bayar).toLocaleDateString('id-ID'),
      Kamar: p.tagihan.kontrak.kamar.nomor_kamar,
      Penghuni: p.tagihan.kontrak.penghuni.nama,
      Periode: p.tagihan.periode,
      Metode: p.metode,
      'Jumlah Dibayar (Rp)': Number(p.jumlah_dibayar),
    }));

    // Worksheet 2: Unpaid Bills
    const piutangData = unpaidBills.map((b, idx) => ({
      No: idx + 1,
      Kamar: b.kontrak.kamar.nomor_kamar,
      Penghuni: b.kontrak.penghuni.nama,
      Periode: b.periode,
      'Tagihan Pokok (Rp)': Number(b.jumlah),
      'Denda (Rp)': Number(b.denda),
      'Total Piutang (Rp)': Number(b.jumlah) + Number(b.denda),
      'Jatuh Tempo': new Date(b.jatuh_tempo).toLocaleDateString('id-ID'),
    }));

    const workbook = XLSX.utils.book_new();

    const wsIncome = XLSX.utils.json_to_sheet(incomeData);
    XLSX.utils.book_append_sheet(workbook, wsIncome, 'Pemasukan Lunas');

    const wsPiutang = XLSX.utils.json_to_sheet(piutangData);
    XLSX.utils.book_append_sheet(workbook, wsPiutang, 'Piutang Tertunggak');

    XLSX.writeFile(workbook, `Laporan_Keuangan_MyKost_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePrint}
        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5"
      >
        <Printer className="w-4 h-4" />
        <span>Cetak</span>
      </button>

      <button
        onClick={handleExportExcel}
        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>Export Excel</span>
      </button>
    </div>
  );
}
