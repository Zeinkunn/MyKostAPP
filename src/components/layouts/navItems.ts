import {
  LayoutDashboard,
  Building2,
  BedDouble,
  Users,
  Receipt,
  CheckCircle2,
  BarChart3,
  MessageSquareWarning,
  UserCog,
  Settings,
  History,
  LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  description?: string;
}

export const ownerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/owner/dashboard', icon: LayoutDashboard, description: 'Ringkasan performa dan okupansi' },
  { label: 'Properti', href: '/owner/properti', icon: Building2, description: 'Manajemen gedung properti' },
  { label: 'Kamar', href: '/owner/kamar', icon: BedDouble, description: 'Daftar unit dan status kamar' },
  { label: 'Penghuni', href: '/owner/penghuni', icon: Users, description: 'Onboarding dan kontrak sewa' },
  { label: 'Tagihan', href: '/owner/tagihan', icon: Receipt, description: 'Invoice bulanan dan denda sewa' },
  { label: 'Verifikasi Bayar', href: '/owner/verifikasi', icon: CheckCircle2, description: 'Tinjau bukti transfer pembayaran' },
  { label: 'Laporan Keuangan', href: '/owner/laporan', icon: BarChart3, description: 'Kas lunas, piutang, & export Excel' },
  { label: 'Pengaduan', href: '/owner/pengaduan', icon: MessageSquareWarning, description: 'Keluhan kerusakan fasilitas kamar' },
  { label: 'Kelola User', href: '/owner/users', icon: UserCog, description: 'Akun pengelola Owner & Admin' },
  { label: 'Pengaturan', href: '/owner/pengaturan', icon: Settings, description: 'Harga default, denda, & template WA' },
  { label: 'Log Aktivitas', href: '/owner/log', icon: History, description: 'Audit trail riwayat aksi sistem' },
];
