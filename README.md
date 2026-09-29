# MyKost — Aplikasi Manajemen Kost PWA

**MyKost** adalah aplikasi manajemen kost berbasis Progressive Web App (PWA) *full-stack* yang dibangun menggunakan **Next.js 16 (App Router)**, **Tailwind CSS v4.3**, **Supabase (PostgreSQL)** via **Prisma ORM**, **Cloudflare R2 Storage (S3 API)**, dan **Fonnte WhatsApp API**.

Aplikasi ini mengintegrasikan seluruh operasional kamar, kontrak sewa, tagihan bulanan, verifikasi pembayaran, serta pengaduan/maintenance dalam satu *codebase* responsif untuk 3 peran pengguna: **Owner**, **Admin**, dan **Penghuni**.

---

## 🌟 Fitur Utama

### 🏢 Panel Pengelola (Owner & Admin)
- **Dashboard Real-Time**: Statistik persentase okupansi kamar, pendapatan bulanan terverifikasi lunas, piutang tertunggak, dan komplain aktif.
- **Manajemen Properti & Kamar**: CRUD unit kamar, tipe sewa, harga, fasilitas, dan toggle status (`KOSONG`, `TERISI`, `MAINTENANCE`).
- **Alur Onboarding Penghuni (6.1)**: Pendaftaran penghuni & kontrak sewa terpadu, otomatis mengubah status kamar jadi `TERISI`, generate tagihan pertama, dan mengirim instruksi aktivasi via WhatsApp.
- **Manajemen Tagihan & Auto-Generator**: Pembuatan invoice otomatis bulanan, penyesuaian harga & denda keterlambatan dinamis.
- **Verifikasi Pembayaran**: Peninjauan bukti transfer dengan modal preview foto, tombol *Approve* / *Reject*, dan konfirmasi otomatis ke WA penghuni.
- **Laporan Keuangan & Audit Trail**: Ringkasan kas lunas vs piutang, cetak laporan, dan log aktivitas pengelola.
- **Manajemen User & Pengaturan**: Penambahan pengelola baru (Owner/Admin) dan penyesuaian denda & template WA.

### 📱 Panel Penghuni (Mobile PWA)
- **Beranda Interaktif**: Ringkasan kamar aktif, hitung mundur sisa hari sewa, dan preview tagihan bulan ini.
- **Daftar Tagihan & Kwitansi Read-Only**: Halaman rincian tagihan belum lunas vs kwitansi digital sah lunas (tanpa tombol bayar) yang dapat diunduh/dicetak.
- **Upload Bukti Pembayaran**: Pengambilan foto resi transfer langsung dari kamera HP (`capture="environment"`) dengan kompresi gambar otomatis client-side sebelum diunggah ke Cloudflare R2.
- **Pengaduan & Maintenance (6.3)**: Pengajuan keluhan kerusakan fasilitas (+ foto) dengan pelacakan status (`BARU` → `DIPROSES` → `SELESAI`).
- **Profil & Kontrak Digital**: Akses rincian kontrak sewa digital, data pribadi, dan pusat bantuan.

---

## 🛠️ Tech Stack & Library

| Komponen | Teknologi |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Server Components, Server Actions) |
| **Styling** | Tailwind CSS v4.3 + Lucide React Icons |
| **Database & ORM** | Supabase (PostgreSQL) + Prisma ORM v6 |
| **Media Storage** | Cloudflare R2 (S3-compatible API via `@aws-sdk/client-s3`) |
| **Autentikasi** | Auth Session RBAC (`bcryptjs` + `jose`) |
| **WhatsApp Provider** | Fonnte WhatsApp API (`api.fonnte.com`) |
| **Client Compression**| `browser-image-compression` |
| **PWA & Offline** | Web App Manifest (`manifest.json`) + Service Worker (`sw.js`) |

---

## 🚀 Cara Menginstall & Menjalankan Proyek

### 1. Clone Repository
```bash
git clone https://github.com/Zeinkunn/MyKostAPP.git
cd MyKostAPP
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Konfigurasi Environment Variables (`.env`)
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Isi kredensial di dalam file `.env`:
```env
# Supabase PostgreSQL connection
DATABASE_URL="postgresql://postgres.xxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:PASSWORD@aws-0-region.supabase.com:5432/postgres"

# JWT Secret Key
JWT_SECRET="ganti-dengan-32-karakter-secret-key"

# Cloudflare R2 Storage (S3-compatible)
R2_ACCOUNT_ID="account-id-cloudflare-anda"
R2_ACCESS_KEY_ID="access-key-id-r2-anda"
R2_SECRET_ACCESS_KEY="secret-access-key-r2-anda"
R2_BUCKET_NAME="mykost"
R2_PUBLIC_DOMAIN="https://domain-public-r2-anda.dev"

# Fonnte WhatsApp API Token
FONNTE_API_TOKEN="token-fonnte-wa-anda"

# Cron Secret Token
CRON_SECRET="secret-token-untuk-endpoint-cron"
```

### 4. Push Database Schema & Seed Data
```bash
# Push Prisma schema to Supabase database
npx prisma db push

# Seed data awal (Owner, Admin, Properti, Kamar, Penghuni, Kontrak, & Tagihan)
npx tsx prisma/seed.ts
```

### 5. Jalankan Server Development
```bash
npm run dev
```
Buka **`http://localhost:3000`** di browser Anda.

---

## 🔑 Kredensial Akses Default (Development)

- **Owner**: `owner@mykost.com` (Password: `password123`)
- **Admin**: `admin@mykost.com` (Password: `password123`)
- **Penghuni**: `dimas@gmail.com` atau No HP `081234567890` (Password: `password123`)

---

## 📄 Lisensi
[MIT License](LICENSE) — Dikembangkan untuk efisiensi operasional manajemen kost di Indonesia.
