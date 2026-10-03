import { NextResponse } from 'next/server';
import { ApiAuthError } from './rbac';
import { ZodError } from 'zod';

export function handleApiError(error: unknown, fallbackMessage = 'Terjadi kesalahan pada server') {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    const message = error.errors.map((e) => e.message).join(', ');
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (error instanceof Error) {
    const msg = error.message;
    const isClientError =
      msg.includes('tidak ditemukan') ||
      msg.includes('wajib diisi') ||
      msg.includes('sudah terdaftar') ||
      msg.includes('sedang tidak tersedia') ||
      msg.includes('Checkout ditolak') ||
      msg.includes('tidak valid') ||
      msg.includes('masih memiliki kontrak') ||
      msg.includes('sudah memiliki');

    if (isClientError) {
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  // Log raw technical errors on server, hide internal DB/Prisma message from client
  console.error('[API_INTERNAL_ERROR]:', error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}
