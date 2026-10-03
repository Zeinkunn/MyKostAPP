export function normalizePhone(input: string): string {
  if (!input) return '';
  // Remove all non-digit characters
  let cleaned = input.trim().replace(/\D/g, '');
  
  // Format to standard 08xxxxxxxxxx
  if (cleaned.startsWith('62')) {
    cleaned = '0' + cleaned.substring(2);
  } else if (cleaned.startsWith('8')) {
    cleaned = '0' + cleaned;
  }
  
  return cleaned;
}
