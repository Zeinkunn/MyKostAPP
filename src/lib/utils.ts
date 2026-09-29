import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRupiah(amount: any): string {
  const numericAmount = typeof amount === 'object' && amount !== null
    ? parseFloat(amount.toString())
    : typeof amount === 'string'
    ? parseFloat(amount)
    : Number(amount || 0);

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(isNaN(numericAmount) ? 0 : numericAmount);
}

export function formatDateIndonesian(dateInput: Date | string): string {
  if (!dateInput) return '-';
  const date = new Date(dateInput);
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export function getStatusBadgeStyle(status: string) {
  switch ((status || '').toUpperCase()) {
    case 'KOSONG':
    case 'LUNAS':
    case 'SELESAI':
    case 'DISETUJUI':
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    case 'TERISI':
    case 'PENDING':
    case 'DIPROSES':
    case 'SEBAGIAN':
    case 'BOOKING':
      return 'bg-amber-100 text-amber-800 border-amber-300';
    case 'MAINTENANCE':
    case 'BELUM_BAYAR':
    case 'TERLAMBAT':
    case 'DITOLAK':
    case 'DIBATALKAN':
    case 'BARU':
      return 'bg-rose-100 text-rose-800 border-rose-300';
    default:
      return 'bg-slate-100 text-slate-800 border-slate-300';
  }
}
