import { describe, it, expect } from 'vitest';
import { normalizePhone } from '@/lib/phone';
import { hitungDenda } from '@/lib/denda';
import { hashToken } from '@/lib/token';
import { detectImageFromBytes } from '@/lib/r2';

describe('1. Normalisasi Nomor Handphone (normalizePhone)', () => {
  it('harus mempertahankan format standar 08xxxxxxxxxx', () => {
    expect(normalizePhone('081234567890')).toBe('081234567890');
  });

  it('harus mengonversi awalan 62 menjadi 08', () => {
    expect(normalizePhone('6281234567890')).toBe('081234567890');
  });

  it('harus membersihkan karakter spasi, tanda tambah, dan tanda hubung (+62 812-3456-7890)', () => {
    expect(normalizePhone('+62 812-3456-7890')).toBe('081234567890');
  });

  it('harus menambahkan awalan 0 jika nomor diawali dengan angka 8', () => {
    expect(normalizePhone('81234567890')).toBe('081234567890');
  });

  it('harus mengembalikan string kosong jika input kosong', () => {
    expect(normalizePhone('')).toBe('');
  });
});

describe('2. Kalkulasi Denda Keterlambatan (hitungDenda)', () => {
  it('mode HARIAN: harus mengalikan tarif denda dengan jumlah hari terlambat', () => {
    const denda3Hari = hitungDenda('HARIAN', 50000, 3);
    expect(denda3Hari).toBe(150000);

    const denda5Hari = hitungDenda('HARIAN', 25000, 5);
    expect(denda5Hari).toBe(125000);
  });

  it('mode HARIAN: tidak boleh membebankan denda jika hari terlambat <= 0', () => {
    expect(hitungDenda('HARIAN', 50000, 0)).toBe(0);
    expect(hitungDenda('HARIAN', 50000, -2)).toBe(0);
  });

  it('mode TETAP: harus mengenakan tarif flat satu kali terlepas dari jumlah hari terlambat', () => {
    expect(hitungDenda('TETAP', 50000, 1)).toBe(50000);
    expect(hitungDenda('TETAP', 50000, 10)).toBe(50000);
    expect(hitungDenda('TETAP', 100000, 30)).toBe(100000);
  });

  it('mode TETAP: tidak boleh membebankan denda jika hari terlambat <= 0', () => {
    expect(hitungDenda('TETAP', 50000, 0)).toBe(0);
    expect(hitungDenda('TETAP', 50000, -1)).toBe(0);
  });
});

describe('3. Token Aktivasi & Reset (hashToken)', () => {
  it('harus menghasilkan hash SHA-256 sepanjang 64 karakter heksadesimal', () => {
    const rawToken = '4f8a3c2e1b9d7e5f0a2c4e6b8d0f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f';
    const hashed = hashToken(rawToken);
    expect(hashed).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hashed)).toBe(true);
  });

  it('harus bersifat deterministik (input yang sama menghasilkan hash yang identik)', () => {
    const token = 'sample-secret-token-12345';
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it('harus menghasilkan hash yang berbeda untuk token yang berbeda', () => {
    expect(hashToken('token-alpha')).not.toBe(hashToken('token-beta'));
  });
});

describe('4. Deteksi Magic Bytes Gambar (detectImageFromBytes)', () => {
  it('harus mengenali berkas JPEG asli (FF D8 FF)', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);
    const detected = detectImageFromBytes(jpegBuffer);
    expect(detected).toEqual({ ext: 'jpg', mime: 'image/jpeg' });
  });

  it('harus mengenali berkas PNG asli (89 50 4E 47 0D 0A 1A 0A)', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const detected = detectImageFromBytes(pngBuffer);
    expect(detected).toEqual({ ext: 'png', mime: 'image/png' });
  });

  it('harus mengenali berkas WebP asli (RIFF....WEBP)', () => {
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // 'RIFF'
      0x00, 0x00, 0x00, 0x00, // file size placeholder
      0x57, 0x45, 0x42, 0x50, // 'WEBP'
    ]);
    const detected = detectImageFromBytes(webpBuffer);
    expect(detected).toEqual({ ext: 'webp', mime: 'image/webp' });
  });

  it('harus menolak berkas teks atau palsu (mengembalikan null)', () => {
    const textBuffer = Buffer.from('Ini adalah berkas teks, bukan gambar asli.');
    expect(detectImageFromBytes(textBuffer)).toBeNull();

    const pdfBuffer = Buffer.from('%PDF-1.4 ...');
    expect(detectImageFromBytes(pdfBuffer)).toBeNull();

    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00');
    expect(detectImageFromBytes(exeBuffer)).toBeNull();
  });
});
