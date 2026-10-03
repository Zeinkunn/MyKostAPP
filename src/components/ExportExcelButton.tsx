'use client';

import { FileSpreadsheet, Printer } from 'lucide-react';
import ExcelJS from 'exceljs';

export interface SerializedPaymentItem {
  id: string;
  tanggal_bayar: string;
  metode: string;
  jumlah_dibayar: number;
  tagihan: {
    periode: string;
    kontrak: {
      kamar: { nomor_kamar: string };
      penghuni: { nama: string };
    };
  };
}

export interface SerializedUnpaidBillItem {
  id: string;
  periode: string;
  jumlah: number;
  denda: number;
  jatuh_tempo: string;
  kontrak: {
    kamar: { nomor_kamar: string };
    penghuni: { nama: string };
  };
}

interface ExportExcelButtonProps {
  approvedPayments: SerializedPaymentItem[];
  unpaidBills: SerializedUnpaidBillItem[];
}

export default function ExportExcelButton({ approvedPayments, unpaidBills }: ExportExcelButtonProps) {
  const handleExportExcel = async () => {
    const workbook = new ExcelJS.Workbook();

    // Worksheet 1: Approved Payments
    const wsIncome = workbook.addWorksheet('Pemasukan Lunas');
    wsIncome.columns = [
      { header: 'No', key: 'No', width: 8 },
      { header: 'Tanggal Bayar', key: 'Tanggal Bayar', width: 18 },
      { header: 'Kamar', key: 'Kamar', width: 12 },
      { header: 'Penghuni', key: 'Penghuni', width: 25 },
      { header: 'Periode', key: 'Periode', width: 15 },
      { header: 'Metode', key: 'Metode', width: 20 },
      { header: 'Jumlah Dibayar (Rp)', key: 'Jumlah Dibayar (Rp)', width: 22 },
    ];

    approvedPayments.forEach((p, idx) => {
      wsIncome.addRow({
        No: idx + 1,
        'Tanggal Bayar': new Date(p.tanggal_bayar).toLocaleDateString('id-ID'),
        Kamar: p.tagihan.kontrak.kamar.nomor_kamar,
        Penghuni: p.tagihan.kontrak.penghuni.nama,
        Periode: p.tagihan.periode,
        Metode: p.metode,
        'Jumlah Dibayar (Rp)': Number(p.jumlah_dibayar),
      });
    });

    // Worksheet 2: Unpaid Bills
    const wsPiutang = workbook.addWorksheet('Piutang Tertunggak');
    wsPiutang.columns = [
      { header: 'No', key: 'No', width: 8 },
      { header: 'Kamar', key: 'Kamar', width: 12 },
      { header: 'Penghuni', key: 'Penghuni', width: 25 },
      { header: 'Periode', key: 'Periode', width: 15 },
      { header: 'Tagihan Pokok (Rp)', key: 'Tagihan Pokok (Rp)', width: 20 },
      { header: 'Denda (Rp)', key: 'Denda (Rp)', width: 18 },
      { header: 'Total Piutang (Rp)', key: 'Total Piutang (Rp)', width: 22 },
      { header: 'Jatuh Tempo', key: 'Jatuh Tempo', width: 18 },
    ];

    unpaidBills.forEach((b, idx) => {
      wsPiutang.addRow({
        No: idx + 1,
        Kamar: b.kontrak.kamar.nomor_kamar,
        Penghuni: b.kontrak.penghuni.nama,
        Periode: b.periode,
        'Tagihan Pokok (Rp)': Number(b.jumlah),
        'Denda (Rp)': Number(b.denda),
        'Total Piutang (Rp)': Number(b.jumlah) + Number(b.denda),
        'Jatuh Tempo': new Date(b.jatuh_tempo).toLocaleDateString('id-ID'),
      });
    });

    // Generate buffer & trigger client-side download
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Laporan_Keuangan_MyKost_${new Date().toISOString().split('T')[0]}.xlsx`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handlePrint}
        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
      >
        <Printer className="w-4 h-4" />
        <span>Cetak</span>
      </button>

      <button
        onClick={handleExportExcel}
        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
      >
        <FileSpreadsheet className="w-4 h-4" />
        <span>Export Excel</span>
      </button>
    </div>
  );
}
