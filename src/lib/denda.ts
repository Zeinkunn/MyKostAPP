export type DendaModeType = 'HARIAN' | 'TETAP';

export function hitungDenda(
  mode: DendaModeType,
  rate: number,
  hariTerlambat: number
): number {
  if (hariTerlambat <= 0) return 0;
  if (mode === 'HARIAN') {
    return rate * hariTerlambat;
  }
  return rate;
}
