import { Role } from '@prisma/client';

export interface FileAccessMetadata {
  userFotoUrl?: string | null;
  paymentUserIds?: string[];
  complaintUserIds?: string[];
  isRoomPhoto?: boolean;
}

/**
 * Pure authorization check function for accessing files.
 * OWNER and ADMIN have access to all files (including any user's avatar).
 * PENGHUNI can only access their own avatar, own payments, own complaints, and room photos.
 */
export function canAccessFile(
  role: Role | string,
  userId: string,
  key: string,
  meta: FileAccessMetadata
): boolean {
  // OWNER and ADMIN are authorized for all files
  if (role === Role.OWNER || role === Role.ADMIN || role === 'OWNER' || role === 'ADMIN') {
    return true;
  }

  if (role === Role.PENGHUNI || role === 'PENGHUNI') {
    // 1. Tenant's own avatar
    if (meta.userFotoUrl && meta.userFotoUrl === key) {
      return true;
    }

    // 2. Tenant's own payment proof
    if (meta.paymentUserIds && meta.paymentUserIds.includes(userId)) {
      return true;
    }

    // 3. Tenant's own complaint photo
    if (meta.complaintUserIds && meta.complaintUserIds.includes(userId)) {
      return true;
    }

    // 4. Room photo (public to tenants)
    if (meta.isRoomPhoto) {
      return true;
    }
  }

  return false;
}
