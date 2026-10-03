# CHANGELOG-FIX — Laporan Perbaikan Menyeluruh MyKostAPP

**Tanggal**: 3 Oktober 2026  
**Branch Kerja**: `dev`  
**Engineer**: Senior Full-Stack Engineer  
**Status**: Selesai Menyeluruh (Fase 1, 2, 3, dan 4)

---

## 📋 Ringkasan Perubahan per Fase

### 🛠️ FASE 1 — Bug yang Merusak Fitur (Commit: `a5daa85`)
1. **1.1 Perbaikan Serialisasi Desimal di `/owner/laporan`**:
   - Memodifikasi query Prisma di `src/app/(dashboard)/owner/laporan/page.tsx` dari `include` penuh menjadi `select` eksplisit.
   - Mengonversi semua field `Decimal` Prisma (`jumlah`, `denda`, `harga_sewa_disepakati`, `deposit_awal`, `potongan_deposit`) menjadi `Number()` murni dan field `DateTime` ke string ISO sebelum dikirim ke Client Component `ExportExcelButton`.
   - Menyesuaikan tipe props `ExportExcelButton.tsx` agar tidak memicu runtime serialization error Next.js.
2. **1.2 Perbaikan Cetak Kwitansi & Akses Tagihan di `/penghuni/tagihan/[id]`**:
   - Memisahkan tombol "Unduh / Cetak Kwitansi" yang sebelumnya menggunakan `onClick` di Server Component ke dalam client component baru `src/components/PrintButton.tsx`.
   - Menambahkan verifikasi kepemilikan tagihan (IDOR Protection): jika pengguna adalah `PENGHUNI` dan bukan penyewa tagihan tersebut, sistem memicu `notFound()`.
   - Menambahkan aturan `@media print` pada `src/app/globals.css` agar header, bottom nav, dan tombol aksi otomatis disembunyikan saat mencetak kwitansi.
   - Mengoptimalkan query Prisma dengan `select` spesifik.
3. **1.3 Perbaikan Navigasi & Alur Logout**:
   - Membuat komponen client `src/components/LogoutButton.tsx` yang memanggil `POST /api/auth/logout` lalu mengarahkan ke `/login`.
   - Memasang `LogoutButton` di halaman profil Owner (`/owner/profil`), profil Penghuni (`/penghuni/profil`), dan sidebar desktop (`OwnerSidebar.tsx`).
   - Membuat sumber navigasi bersama `src/components/layouts/navItems.ts` untuk menghindari inkonsistensi rute.
   - Menambahkan item "Penghuni" dan "Lainnya" pada `AdminBottomNav.tsx` untuk perangkat seluler.
   - Membuat halaman `/owner/menu/page.tsx` agar seluruh menu pengelola kost (Penghuni, Tagihan, Laporan, Properti, Kelola User, Pengaturan, Log) dapat diakses dengan mudah di smartphone.
4. **1.4 Onboarding Atomik & Proteksi Kontrak Ganda**:
   - Membuat endpoint baru `POST /api/onboarding` yang menjalankan seluruh alur (reuse/update/create Penghuni, validasi tidak ada kontrak aktif, create Kontrak, update Kamar ke `TERISI`, dan generate Tagihan pertama) dalam satu `prisma.$transaction`.
   - Pengiriman WhatsApp aktivasi dipindahkan setelah transaksi database selesai sukses.
   - Memperbarui halaman `owner/penghuni/page.tsx` untuk memanggil endpoint onboarding terpadu ini.
   - Memperketat validasi `POST /api/kontrak` dengan Zod: verifikasi tanggal_selesai > tanggal_mulai, nominal positif, dan pencegahan kontrak aktif ganda.
5. **1.5 Hardening Alur Checkout (`/api/checkout`)**:
   - Memvalidasi kontrak berstatus `AKTIF` (menolak jika status bukan aktif dengan status 400).
   - Memvalidasi nilai `potongan_deposit` (harus angka valid, >= 0, dan <= `deposit_awal`).
   - Menggabungkan pengecekan tunggakan tagihan dan pembayaran berstatus `PENDING` dalam satu transaksi atomik.
   - Hanya mengubah kamar ke status `KOSONG` jika status saat ini `TERISI`.
6. **1.6 Hardening Alur Pembayaran (`/api/pembayaran`)**:
   - `POST`: Mengabaikan `jumlah_dibayar` dari request client; server menghitung nominal riil (`tagihan.jumlah + tagihan.denda`).
   - Menolak pembayaran jika tagihan sudah berstatus `LUNAS` atau sudah memiliki pembayaran berstatus `PENDING`.
   - `PUT`: Membatasi status verifikasi hanya `DISETUJUI` atau `DITOLAK`. Hanya pembayaran berstatus `PENDING` yang dapat diproses (status lain mengembalikan 409 Conflict). Menjalankan update tagihan ke `LUNAS` dan pencatatan audit log dalam transaksi database.

---

### 🛡️ FASE 2 — Keamanan & PWA Hardening (Commit: `5673b43`)
1. **2.1 Pencegahan Kebocoran Data (Data Leakage) & Standarisasi Galat**:
   - `GET /api/kamar`: Untuk role `PENGHUNI`, seluruh data kontrak dan penyewa disaring sepenuhnya; hanya mengembalikan field publik unit kamar (nomor, tipe, harga sewa, fasilitas, status, properti).
   - `GET /api/pengaduan`: Menyaring `catatan_internal` untuk role `PENGHUNI`. Label UI di panel owner diperjelas: "Catatan Internal (tidak terlihat penghuni)".
   - Membuat helper `src/lib/errors.ts` (`handleApiError`) untuk menyembunyikan pesan galat mentah database/Prisma ke pengguna pada status 500.
2. **2.2 Registrasi Berbasis Token & Alur Lupa Sandi**:
   - Menambahkan model `AktivasiToken` (SHA-256 token hash, expiry 7 hari, status single-use `used_at`).
   - Pendaftaran akun penghuni (`POST /api/auth/register`) wajib menyertakan token aktivasi yang valid dan mencocokkan nomor WhatsApp terdaftar.
   - Menangani race condition pendaftaran dengan respons 409 Conflict.
   - Membuat endpoint `POST /api/auth/forgot-password` dan `POST /api/auth/reset-password` serta UI `src/app/(auth)/reset-password/page.tsx`.
   - Menambahkan fitur Reset Kata Sandi Admin oleh Owner via `PATCH /api/users`.
3. **2.3 Kontrol Akses Halaman (RBAC)**:
   - Membuat Server Component Layouts: `src/app/(dashboard)/owner/layout.tsx` (`requireRole([OWNER, ADMIN])`) dan `src/app/(dashboard)/penghuni/layout.tsx` (`requireRole([PENGHUNI])`).
   - Membuat sub-layout proteksi khusus Owner: `owner/users/layout.tsx`, `owner/log/layout.tsx`, dan `owner/pengaturan/layout.tsx`.
   - Membuat `src/middleware.ts` ringan pada Edge Runtime untuk redirect pengguna tanpa cookie sesi ke `/login`.
4. **2.4 Keamanan Berkas Media & Cloudflare R2**:
   - `src/lib/r2.ts`: Memvalidasi *magic bytes* (JPEG: `FF D8 FF`, PNG: `89 50 4E 47`, WebP: `RIFF...WEBP`) langsung dari buffer berkas; ekstensi diambil dari deteksi berkas dan nama berkas diacak menggunakan `crypto.randomUUID()`.
   - Menghapus fallback penyimpanan lokal pada environment produksi (`NODE_ENV === 'production'`).
   - Menyimpan object key di database dan menyajikan berkas melalui signed URL berumur pendek (15 menit) via endpoint terotorisasi `GET /api/files?key=...`.
   - Helper `getFileDisplayUrl` di `src/lib/utils.ts` menyediakan fallback kompatibilitas data lama (URL penuh).
5. **2.5 Autentikasi & Revokasi Sesi**:
   - Rate limit login dipindahkan ke tabel database `LoginAttempt` (kunci gabungan `clientIp:normalizedIdentifier`) dengan pembersihan otomatis entri kedaluwarsa.
   - Normalisasi identifier login: email lowercase & trim; nomor telepon distandarisasi via `normalizePhone`.
   - Menambahkan kolom `token_version` pada model `User` dan disertakan dalam payload JWT. Sesi aktif di semua perangkat langsung dibatalkan seketika pengguna mengubah atau mereset kata sandi.
   - Menolak `JWT_SECRET` jika masih bernilai placeholder default contoh.
   - `src/lib/fonnte.ts`: Gagal dan mencatat log error pada production jika token WhatsApp tidak diset.
6. **2.6 Service Worker & PWA Hardening**:
   - `public/sw.js`: Menghapus `/globals.css` dari precache. Instalasi toleran dengan try-catch per berkas.
   - Menaikkan versi cache ke `mykost-cache-v2`.
   - Kebijakan *Network-Only* untuk semua rute `/api/*` dan navigasi dashboard (tidak ada data autentikasi yang tersimpan di cache publik).
   - Fallback offline navigasi ke halaman statis `public/offline.html` dan respons JSON 503 `{ error: 'offline' }` untuk API.
   - Pembersihan cache saat logout di `LogoutButton.tsx`.
   - `manifest.json`: Menambahkan `id: "/"`, `scope: "/"`, `lang: "id"`, dan ikon `maskable`.
   - `src/app/layout.tsx`: Menghapus `maximumScale: 1` agar memenuhi standar aksesibilitas WCAG.
   - `next.config.mjs`: Mempersempit `images.remotePatterns` dan menyuntikkan security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, CSP).

---

### ⚡ FASE 3 — Integritas Data & Logika Bisnis (Commit: `b37293f`)
1. **3.1 Skema Basis Data & Konfigurasi Supabase**:
   - Menambahkan constraint unik `@@unique([kontrak_id, periode])` pada tabel `Tagihan`.
   - Menambahkan constraint unik `@@unique([properti_id, nomor_kamar])` pada tabel `Kamar`.
   - Menambahkan indeks performa:
     - `Tagihan`: `@@index([status, jatuh_tempo])`
     - `Kontrak`: `@@index([status])`
     - `Pembayaran`: `@@index([status_verifikasi])`
     - `Pengaduan`: `@@index([status])`
     - `LogAktivitas`: `@@index([timestamp(sort: Desc)])`
   - Menambahkan field verifikasi pada `Pembayaran`: `diverifikasi_oleh (String?)`, `diverifikasi_at (DateTime?)`.
   - Menambahkan konfigurasi dinamis pada `Pengaturan`: `denda_mode (HARIAN | TETAP)`, `batas_reminder_hari (Int, default 3)`.
   - Menambahkan field anti-spam pada `Tagihan`: `terakhir_diingatkan_at (DateTime?)`.
   - Menambahkan konfigurasi `directUrl = env("DIRECT_URL")` di `prisma/schema.prisma` untuk mengatasi deadlock pada PgBouncer Supabase port 6543 saat migrasi/db push.
2. **3.2 Pencegahan Race Condition Kontrak**:
   - Menggunakan `updateMany({ where: { id: kamar_id, status: 'KOSONG' }, data: { status: 'TERISI' } })` pada `/api/onboarding` dan `/api/kontrak`.
   - Jika baris terdampak 0, transaksi otomatis dibatalkan dengan respons `409 Conflict` ("Kamar baru saja dipesan oleh transaksi lain").
   - Menerapkan pola kondisional serupa pada `/api/checkout` (hanya mengubah ke `KOSONG` jika status saat ini `TERISI`).
3. **3.3 Cron Tagihan, Denda Dinamis & Anti-Spam 24 Jam**:
   - Memperbarui `/api/cron/tagihan`:
     - Seluruh komparasi tanggal menggunakan zona waktu **Asia/Jakarta**.
     - Pembuatan tagihan bulanan otomatis setiap tanggal 1 awal bulan waktu Jakarta.
     - Perhitungan denda sesuai `denda_mode`: `HARIAN` (`denda_per_hari * hari_terlambat`) atau `TETAP` (flat nominal satu kali).
     - Menggunakan template pesan WhatsApp dari database secara dinamis.
     - Proteksi anti-spam: Pengingat hanya dikirim jika dalam jendela `H - batas_reminder_hari` dan belum pernah diingatkan dalam 24 jam terakhir.
   - Mengonfigurasi `vercel.json` dengan jadwal cron `0 1 * * *` (01:00 UTC = 08:00 WIB).
4. **3.4 Pembayaran Tunai & Penyesuaian Tagihan**:
   - Membuat endpoint `POST /api/pembayaran/tunai` untuk mencatat pembayaran tunai langsung di tempat oleh Owner/Admin (otomatis status `DISETUJUI`, `diverifikasi_oleh = session.id`, tagihan -> `LUNAS` via transaksi atomik).
   - Menambahkan endpoint `PATCH /api/tagihan` untuk penyesuaian pokok sewa atau denda dengan kewajiban mengisi alasan yang dicatat ke audit log.
   - Menambahkan tombol aksi "Bayar Tunai" dan "Sesuaikan" beserta modal interaktif di `/owner/tagihan`.

---

### 🎨 FASE 4 — UX, Tooling & Kerapian Akhir
1. **4.1 Profil Penghuni & Owner**:
   - Mengonversi `/owner/profil/edit` dan `/penghuni/profil/edit` menjadi Server Component yang memuat nilai sesi awal di server lalu meneruskannya ke `EditProfileForm.tsx` (menghilangkan *flash of empty form*).
   - Sinkronisasi perubahan profil penghuni ke tabel `User` dan `Penghuni` secara atomik dalam transaksi `prisma.$transaction`.
   - Menampilkan sapaan nama penghuni langsung dari sesi di `/penghuni/beranda` (`Halo, {user.nama}! 👋`).
2. **4.2 Paginasi Endpoint**:
   - Menambahkan paginasi halaman (default limit 20, max 50) pada `GET /api/log` dan `GET /api/notifikasi`.
   - Mengintegrasikan tombol "Muat Lebih Banyak" pada UI log aktivitas owner dan daftar notifikasi.
3. **4.3 Tooling, Pengujian & CI Pipeline**:
   - Mengonfigurasi `eslint.config.mjs` berbasis ESLint 9 flat config yang kompatibel dengan Next.js 15.
   - Menghapus dependency yang tidak terpakai dari `package.json`: `@hookform/resolvers`, `react-hook-form`, `date-fns`.
   - Mengonfigurasi Vitest (`vitest.config.mjs`) dan menulis 16 unit test kritis pada `tests/critical.test.ts` (normalisasi telepon, kalkulasi denda, token hashing, dan deteksi magic bytes). Seluruh test lolos 100%.
   - Membuat workflow GitHub Actions `.github/workflows/ci.yml` yang menjalankan `npm ci`, `npx tsc --noEmit`, `npm run lint`, `npm test`, dan `npm run build`.
4. **4.4 Idempotensi Seeder & Dokumentasi**:
   - Memperbarui `prisma/seed.ts` agar 100% idempotent menggunakan `upsert` pada User, Properti, Kamar, Penghuni, Kontrak, Tagihan, dan Pengaturan.
   - Menghitung tanggal sewa dan jatuh tempo secara dinamis relatif terhadap waktu seeder berjalan.
   - Menggunakan hashing bcrypt terenkripsi untuk seluruh password akun seeder.
   - Memperbarui dokumentasi `README.md` secara lengkap.

---

## 🗄️ Migrasi Database yang Telah Diterapkan

1. **Model Baru**:
   - `AktivasiToken`: Token aktivasi akun dan reset kata sandi via WhatsApp.
   - `LoginAttempt`: Rate limiting login bersama berbasis IP + identifier.
2. **Kolom Baru**:
   - `User.token_version`: Pelacakan versi sesi untuk revokasi instan.
   - `Tagihan.terakhir_diingatkan_at`: Pelacakan cooldown pengingat WhatsApp 24 jam.
   - `Pembayaran.diverifikasi_oleh`: ID user pengelola yang memverifikasi.
   - `Pembayaran.diverifikasi_at`: Waktu verifikasi pembayaran.
   - `Pengaturan.denda_mode`: Enum `HARIAN` atau `TETAP`.
   - `Pengaturan.batas_reminder_hari`: Batas hari mulai reminder sewa.
3. **Unique Constraints Baru**:
   - `Tagihan`: `@@unique([kontrak_id, periode])`
   - `Kamar`: `@@unique([properti_id, nomor_kamar])`
4. **Indeks Baru**:
   - `Tagihan(status, jatuh_tempo)`
   - `Kontrak(status)`
   - `Pembayaran(status_verifikasi)`
   - `Pengaduan(status)`
   - `LogAktivitas(timestamp DESC)`

---

## 🔍 Hasil Pengecekan Data Duplikat Sebelum Penerapan Unique Constraint

Skrip `scripts/check-duplicates.ts` dijalankan sebelum skema baru diterapkan:
```
🔍 Memulai pengecekan duplikasi data di database...

--- 1. Memeriksa Tagihan ([kontrak_id, periode]) ---
✅ Tagihan: Tidak ada duplikasi pada (kontrak_id, periode).

--- 2. Memeriksa Kamar ([properti_id, nomor_kamar]) ---
✅ Kamar: Tidak ada duplikasi pada (properti_id, nomor_kamar).

======================================================
🎉 HASIL: Basis data bersih. Aman untuk menerapkan unique constraints!
======================================================
```
*Catatan*: Database saat ini bersih dari duplikasi. Unique constraint berhasil diterapkan tanpa konflik data.

---

## 🔑 Variabel Environment Baru (`.env`)

| Variabel | Keterangan | Wajib? |
| :--- | :--- | :--- |
| `DIRECT_URL` | URL koneksi langsung PostgreSQL Supabase (port 5432) untuk DDL/migrasi Prisma | **Wajib** |
| `FONNTE_API_TOKEN` | Token API Fonnte WhatsApp Gateway | **Wajib** (prod) |
| `CRON_SECRET` | Token Bearer otentikasi Vercel Cron (`0 1 * * *`) | **Wajib** |
| `JWT_SECRET` | Kunci rahasia minimal 32 karakter acak (placeholder contoh ditolak) | **Wajib** |

---

## 📌 Langkah Manual untuk Administrator / Pengembang

1. **Pastikan `DIRECT_URL` Terpasang di Hosting**:
   - Di Vercel / Cloudflare Pages / Railway, tambahkan environment variable `DIRECT_URL` yang mengarah ke port `5432` Supabase (bukan port PgBouncer `6543`).
2. **Set `CRON_SECRET` di Vercel Dashboard**:
   - Pastikan nilai `CRON_SECRET` di Vercel Environment Variables sama dengan yang digunakan di scheduler Vercel Cron.
3. **Jalankan Verifikasi Sebelum Rilis**:
   ```bash
   npx tsc --noEmit
   npm run lint
   npm test
   npm run build
   ```
   Seluruh perintah di atas terkonfirmasi **0 error** dan siap untuk dideploy.
