import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

export class ApiAuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = 'ApiAuthError';
    this.status = status;
  }
}

export class ConflictError extends Error {
  status: number;
  constructor(message = 'Data telah diproses atau terjadi konflik perubahan bersamaan') {
    super(message);
    this.name = 'ConflictError';
    this.status = 409;
  }
}

export function handleApiError(error: unknown, fallbackMessage = 'Terjadi kesalahan pada server') {
  if (error instanceof ApiAuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ConflictError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof ZodError) {
    const message = error.issues.map((e) => e.message).join(', ');
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
