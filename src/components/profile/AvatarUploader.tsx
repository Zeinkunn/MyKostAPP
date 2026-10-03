'use client';

import { useState, useRef } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { getFileDisplayUrl } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface AvatarUploaderProps {
  initialFotoUrl?: string | null;
  nama: string;
  variant?: 'penghuni' | 'owner';
}

export default function AvatarUploader({
  initialFotoUrl,
  nama,
  variant = 'penghuni',
}: AvatarUploaderProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(initialFotoUrl || null);
  const [cacheBust, setCacheBust] = useState<number>(() => Date.now());
  const [uploading, setUploading] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const initialLetter = (nama || 'U').charAt(0).toUpperCase();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setErrorToast(null);

    try {
      // 1. Client-side compression to <= 0.5 MB
      const options = {
        maxSizeMB: 0.5,
        maxWidthOrHeight: 800,
        useWebWorker: true,
      };

      let compressedFile: File;
      try {
        compressedFile = await imageCompression(file, options);
      } catch (compErr) {
        console.warn('Kompresi browser gagal, menggunakan file asli:', compErr);
        compressedFile = file;
      }

      // 2. Upload to server
      const formData = new FormData();
      formData.append('foto', compressedFile, file.name);

      const res = await fetch('/api/users/foto', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal mengunggah foto profil');
      }

      setFotoUrl(data.foto_url);
      setCacheBust(Date.now());
      router.refresh();
    } catch (err: any) {
      setErrorToast(err.message || 'Gagal memproses foto');
      setTimeout(() => setErrorToast(null), 4000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const rawDisplaySrc = getFileDisplayUrl(fotoUrl);
  const displaySrc = rawDisplaySrc
    ? `${rawDisplaySrc}${rawDisplaySrc.includes('?') ? '&' : '?'}t=${cacheBust}`
    : '';

  if (variant === 'owner') {
    return (
      <div className="relative group">
        {/* Error notification */}
        {errorToast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl shadow-lg animate-in fade-in">
            {errorToast}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          disabled={uploading}
        />

        {/* 104px avatar with gradient border */}
        <div className="w-[104px] h-[104px] rounded-full p-1 bg-gradient-to-tr from-blue-600 to-indigo-500 shadow-md">
          {displaySrc ? (
            <img
              src={displaySrc}
              alt={`Foto Profil ${nama}`}
              className="w-full h-full object-cover rounded-full bg-slate-100"
            />
          ) : (
            <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center text-3xl font-bold text-blue-600 select-none">
              {initialLetter}
            </div>
          )}
        </div>

        {/* Camera trigger */}
        <button
          type="button"
          aria-label="Ubah foto profil"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="absolute bottom-0.5 right-0.5 w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md active:scale-95 hover:bg-blue-700 transition-all cursor-pointer disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="w-4 h-4 animate-spin text-white" />
          ) : (
            <Camera className="w-4 h-4 text-white" />
          )}
        </button>
      </div>
    );
  }

  // Variant: penghuni (96px)
  return (
    <div className="relative">
      {errorToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-rose-600 text-white text-xs font-semibold rounded-xl shadow-lg animate-in fade-in">
          {errorToast}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={uploading}
      />

      <div className="w-24 h-24 rounded-full overflow-hidden shadow-md relative bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-3xl font-bold select-none">
        {displaySrc ? (
          <img
            src={displaySrc}
            alt={`Foto Profil ${nama}`}
            className="w-full h-full object-cover rounded-full"
          />
        ) : (
          <span>{initialLetter}</span>
        )}
      </div>

      <button
        type="button"
        aria-label="Ubah foto profil"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-blue-600 text-white shadow-md flex items-center justify-center hover:bg-blue-700 transition-transform active:scale-95 cursor-pointer disabled:opacity-50"
      >
        {uploading ? (
          <Loader2 className="w-4 h-4 animate-spin text-white" />
        ) : (
          <Camera className="w-4 h-4 text-white" />
        )}
      </button>
    </div>
  );
}
