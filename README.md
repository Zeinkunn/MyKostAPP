# MyKost — Aplikasi Manajemen Kost Modern PWA

**MyKost** adalah sistem manajemen kost berbasis Progressive Web App (PWA) *full-stack* yang dibangun menggunakan **Next.js 15 (App Router)**, **Tailwind CSS v4**, **Supabase (PostgreSQL)** via **Prisma ORM v6**, **Cloudflare R2 Storage (S3 API)**, dan **Fonnte WhatsApp API**.

Aplikasi ini mengintegrasikan seluruh operasional kamar, kontrak sewa, tagihan bulanan, pembayaran tunai & transfer, verifikasi bukti bayar, serta komplain fasilitas dalam satu sistem untuk 3 peran pengguna: **Owner**, **Admin**, dan **Penghuni**.

---

## 🌟 Fitur Utama

### 🏢 Panel Pengelola (Owner & Admin)
- **Dashboard Real-Time**: Statistik okupansi kamar, pendapatan bulanan (pokok + denda), piutang tertunggak, dan komplain aktif.
- **Manajemen Properti & Kamar**: CRUD kamar dengan proteksi nomor kamar unik per properti (`@@unique([properti_id, nomor_kamar])`).
- **Onboarding Atomik Terpadu (`/api/onboarding`)**: Pendaftaran penghuni, binding kamar (`TERISI` kondisional anti-race condition), pembuatan kontrak sewa, pembuatan tagihan pertama, dan pengiriman tautan aktivasi WhatsApp via transaksi tunggal.
- **Checkout Aman (`/api/checkout`)**: Pengecekan tunggakan tagihan dan pembayaran pending, validasi potongan deposit (`<= deposit_awal`), dan pelepasan kamar ke status `KOSONG` secara atomik.
- **Manajemen Tagihan & Pembayaran**:
  - Penyesuaian manual tagihan & denda dengan pencatatan alasan wajib ke Audit Log (`PATCH /api/tagihan`).
  - Pencatatan pembayaran tunai instan terverifikasi lunas (`POST /api/pembayaran/tunai`).
  - Verifikasi pembayaran transfer via thumbnail dan fullscreen preview bukti bayar.
- **Laporan Keuangan Excel**: Ekspor data laporan bulanan ke format spreadsheet `.xlsx` menggunakan `exceljs`.
- **Manajemen User & Reset Sandi**: Penambahan pengelola baru (Admin/Owner) serta reset sandi Admin oleh Owner (`PATCH /api/users`).
- **Pengaturan Sistem Dinamis**: Konfigurasi mode denda (`HARIAN` / `TETAP`), tarif denda, batas reminder (H-X), dan template WhatsApp kustom.
- **Audit Trail Paginasi**: Pelacakan aktivitas pengelola (`/api/log`) dengan paginasi dan tombol muat lebih banyak.

### 📱 Panel Penghuni (Mobile PWA)
- **Beranda Interaktif**: Sapaan personal dengan nama penghuni langsung dari session, informasi kamar aktif, hitung mundur sisa sewa, dan preview tagihan aktif.
- **Aktivasi Akun Berbasis Token WhatsApp**: Pendaftaran akun aman dengan validasi token sekali pakai (`AktivasiToken`) bertaut nomor HP resmi di kontrak.
- **Lupa & Reset Kata Sandi Mandiri**: Pengiriman token reset via WhatsApp dan form pengaturan kata sandi baru yang otomatis mencabut seluruh sesi aktif (`token_version`).
- **Rincian Tagihan & Kwitansi Digital**: Halaman cetak kwitansi resmi (@media print CSS khusus menyembunyikan header/navigasi) dengan proteksi IDOR kepemilikan.
- **Unggah Bukti Bayar & Pengaduan**: Validasi berkas berbasis magic bytes (JPEG/PNG/WebP), nama berkas acak UUID, pembatasan 3 foto, serta penyajian gambar aman melalui presigned URL berumur pendek (`/api/files?key=...`).
- **Paginasi Notifikasi**: Pelacakan notifikasi in-app dengan paginasi dan tombol muat lebih banyak.

---

## 🏗️ Arsitektur & Keamanan Sistem

1. **Role-Based Access Control (RBAC)**:
   - Edge Middleware (`src/middleware.ts`) untuk redirect kilat rute dashboard jika cookie sesi tidak ada.
   - Server Component Layout guards (`owner/layout.tsx`, `penghuni/layout.tsx`, dan sub-layout Owner-only untuk `users`, `log`, `pengaturan`).
   - Helper API terstandar `requireAuthApi()` dan `requireRoleApi([Role])` dengan `handleApiError` yang menyembunyikan error mentah database pada status 500.
2. **Session Revocation (`token_version`)**:
   - Kolom `token_version` pada model `User` disertakan dalam JWT session.
   - Sesi lama di semua perangkat langsung kedaluwarsa seketika kata sandi diubah atau direset.
3. **Penyimpanan Media & Cloudflare R2**:
   - Berkas diunggah dengan nama acak `crypto.randomUUID()` dan diverifikasi melalui *magic bytes*.
   - Tidak ada fallback penyimpanan lokal pada environment produksi (`NODE_ENV === 'production'`).
   - Berkas disajikan via endpoint otorisasi `GET /api/files?key=...` yang menghasilkan presigned URL sementara (15 menit).
4. **Service Worker & PWA Hardening**:
   - Versi cache `mykost-cache-v2` dengan instalasi toleran per berkas.
   - Strategi *Network-Only* untuk seluruh rute `/api/*` dan navigasi dashboard (mencegah kebocoran data terautentikasi ke cache publik).
   - Fallback navigasi offline ke `/offline.html` statis dan respons JSON `{ error: 'offline' }` 503 untuk API.
   - Pembersihan otomatis cache browser saat pengguna keluar melalui `LogoutButton`.

---

## 🛠️ Tech Stack

| Komponen | Teknologi |
| :--- | :--- |
| **Framework** | Next.js 15 (App Router, React 19, Server Components) |
| **Styling** | Tailwind CSS v4 + Lucide React Icons |
| **Database & ORM** | PostgreSQL (Supabase) + Prisma ORM v6 |
| **Media Storage** | Cloudflare R2 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`) |
| **Autentikasi** | Session Cookie JWT via `jose` + `bcryptjs` |
| **WhatsApp Gateway** | Fonnte WhatsApp API |
| **Validasi Skema** | Zod v3 |
| **Laporan** | ExcelJS |
| **Pengujian & Linting** | Vitest + ESLint 9 |

---

## 🚀 Setup & Instalasi Lokal

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/Zeinkunn/MyKostAPP.git
cd MyKostAPP
git checkout dev
npm install
```

### 2. Konfigurasi Environment Variables (`.env`)
Salin contoh environment:
```bash
cp .env.example .env
```
Pastikan variabel berikut terisi dengan benar di `.env`:
```env
# Koneksi Database Supabase
# DATABASE_URL: Pooler port 6543 (transaction mode) untuk runtime query
DATABASE_URL="postgresql://postgres.xxx:PASSWORD@aws-0-region.pooler.supabase.com:6543/postgres?pgbouncer=true"

# DIRECT_URL: Direct/Session port 5432 untuk sinkronisasi skema DDL via npx prisma db push
DIRECT_URL="postgresql://postgres.xxx:PASSWORD@aws-0-region.supabase.com:5432/postgres"

# JWT Secret: Minimal 32 karakter acak (jangan gunakan placeholder contoh)
# Generate via: openssl rand -hex 32
JWT_SECRET="589302f913d78bda4d860e1c87a91afe77308977a5bae502a46c2f38b97e3537"

# Cloudflare R2 Storage (S3 API)
R2_ACCOUNT_ID="your-cloudflare-account-id"
R2_ACCESS_KEY_ID="your-r2-access-key-id"
R2_SECRET_ACCESS_KEY="your-r2-secret-access-key"
R2_BUCKET_NAME="mykost"
R2_PUBLIC_DOMAIN="https://your-r2-domain.dev"

# Fonnte WhatsApp API Token
FONNTE_API_TOKEN="your-fonnte-api-token"

# Cron Secret Token
CRON_SECRET="your-secure-cron-secret-token"
```

### 3. Pengecekan Duplikasi, Sinkronisasi Skema & Seed
Proyek ini mengadopsi alur tunggal berbasis **`prisma db push`** (tidak menggunakan `prisma migrate`):
```bash
# Periksa data duplikat sebelum penerapan unique constraint
npx tsx scripts/check-duplicates.ts

# Sinkronisasikan skema Prisma langsung ke database Supabase
npx prisma db push

# Jalankan seeder database (idempotent, password bcrypt terenkripsi, tanggal dinamis)
npx tsx prisma/seed.ts
```

### 4. Menjalankan Pengujian & Server Lokal
```bash
# Jalankan test suite unit Vitest
npm test

# Jalankan linter ESLint
npm run lint

# Verifikasi kompilasi TypeScript
npx tsc --noEmit

# Jalankan server development
npm run dev
```
Buka browser pada **`http://localhost:3000`**.

---

## 🔑 Kredensial Akun Default (Hasil Seeder)

| Role | Email / Nomor HP | Kata Sandi |
| :--- | :--- | :--- |
| **Owner** | `owner@mykost.com` | `password123` |
| **Admin** | `admin@mykost.com` | `password123` |
| **Penghuni** | `dimas@gmail.com` / `081234567890` | `password123` |

---

## 📡 Daftar Endpoint API

### 🔐 Autentikasi & Akun
- `POST /api/auth/login`: Autentikasi dengan rate limiter bersama berbasis database (`LoginAttempt`) dan normalisasi identifier.
- `POST /api/auth/register`: Pendaftaran penghuni dengan verifikasi token aktivasi WhatsApp sekali pakai.
- `POST /api/auth/logout`: Pencabutan cookie sesi dan instruksi purge cache PWA.
- `POST /api/auth/forgot-password`: Permintaan tautan reset sandi via WhatsApp.
- `POST /api/auth/reset-password`: Reset kata sandi dengan token WA dan penambahan `token_version`.
- `GET /api/users`: Mendapatkan daftar pengelola kost (Owner only).
- `POST /api/users`: Menambahkan user pengelola baru (Owner only).
- `PUT /api/users`: Memperbarui profil akun sendiri secara sinkron ke tabel User & Penghuni.
- `PATCH /api/users`: Reset kata sandi akun Admin oleh Owner.
- `PUT /api/users/password`: Mengubah kata sandi mandiri dan memperbarui `token_version`.

### 🛏️ Operasional Kost
- `POST /api/onboarding`: Onboarding sewa atomik (tenant reuse, kontrak baru, tagihan ke-1, update kamar `KOSONG` -> `TERISI` via `updateMany`, kirim WA).
- `POST /api/checkout`: Penyelesaian sewa terverifikasi (bebas tunggakan tagihan dan pembayaran pending, pelepasan status kamar `TERISI` -> `KOSONG`).
- `GET /api/kamar`, `POST /api/kamar`, `PUT /api/kamar`, `DELETE /api/kamar`: Kelola kamar (field tenant disaring untuk role Penghuni).
- `GET /api/properti`, `POST /api/properti`: Kelola properti kost.
- `GET /api/kontrak`, `POST /api/kontrak`: Kelola kontrak sewa kamar dengan pencegahan *double booking*.
- `GET /api/penghuni`, `POST /api/penghuni`: Kelola data penghuni kost.

### 💰 Tagihan & Pembayaran
- `GET /api/tagihan`: Mengambil daftar tagihan sewa.
- `POST /api/tagihan`: Menghasilkan tagihan bulanan otomatis untuk kontrak aktif.
- `PATCH /api/tagihan`: Menyesuaikan nominal pokok atau denda tagihan (wajib alasan ke audit log).
- `GET /api/pembayaran`, `POST /api/pembayaran`: Unggah bukti transfer sewa (nominal dihitung dari server = pokok + denda).
- `PUT /api/pembayaran`: Verifikasi pembayaran (`DISETUJUI` / `DITOLAK`) dengan notifikasi WA otomatis.
- `POST /api/pembayaran/tunai`: Pencatatan pembayaran tunai langsung di tempat oleh Owner/Admin.
- `GET /api/files?key=...`: Pengambilan berkas bukti bayar/komplain terproteksi otorisasi via presigned URL.

### 🛠️ Sistem, Notifikasi & Audit
- `GET /api/pengaduan`, `POST /api/pengaduan`, `PUT /api/pengaduan`: Komplain kerusakan fasilitas (maksimal 3 foto berkas).
- `GET /api/pengaturan`, `PUT /api/pengaturan`: Konfigurasi mode denda (`HARIAN` / `TETAP`), batas reminder, dan template WA.
- `GET /api/notifikasi`, `PUT /api/notifikasi`: In-app notification dengan paginasi.
- `GET /api/log`: Log audit aktivitas pengelola dengan paginasi.
- `GET /api/cron/tagihan`: Cron job harian (01:00 UTC / 08:00 WIB) untuk auto-generate tagihan awal bulan, kalkulasi denda, dan reminder WA anti-spam (jeda 24 jam).

---

## ⏰ Cara Kerja Cron Otomatis (Vercel Cron)

Sistem cron dikonfigurasikan pada `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/tagihan",
      "schedule": "0 1 * * *"
    }
  ]
}
```
1. **Jadwal Eksekusi**: Berjalan setiap hari pukul `01:00 UTC` (`08:00 WIB` waktu Jakarta).
2. **Keamanan**: Wajib menyertakan header `Authorization: Bearer <CRON_SECRET>`. Permintaan tanpa secret akan langsung ditolak (401 Unauthorized / *fail-closed*).
3. **Zona Waktu**: Seluruh penentuan "hari ini" dan perhitungan selisih hari jatuh tempo menggunakan zona waktu **Asia/Jakarta** (`Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' })`).
4. **Auto-Generate Awal Bulan**: Setiap tanggal 1 WIB, cron secara otomatis membuat tagihan periode baru untuk seluruh kontrak aktif.
5. **Skema Denda**: Menghitung denda secara dinamis berdasarkan pengaturan database:
   - `HARIAN`: `denda_per_hari * hari_terlambat`
   - `TETAP`: nominal flat `denda_per_hari` satu kali.
6. **Anti-Spam 24 Jam**: Reminder WhatsApp hanya dikirim jika tagihan berada dalam jendela `H - batas_reminder_hari` dan belum pernah diingatkan dalam kurun waktu 24 jam terakhir (`terakhir_diingatkan_at`).

---

## 📄 Lisensi
[MIT License](LICENSE) — Dikembangkan untuk efisiensi dan keamanan operasional manajemen kost di Indonesia.
