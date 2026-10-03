import { requireRole } from '@/lib/rbac';
import { Role } from '@prisma/client';
import Link from 'next/link';
import { ownerNavItems } from '@/components/layouts/navItems';
import LogoutButton from '@/components/LogoutButton';
import { ChevronRight, User } from 'lucide-react';

export default async function OwnerMenuPage() {
  const user = await requireRole([Role.OWNER, Role.ADMIN]);

  return (
    <div className="max-w-md mx-auto space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-slate-900">Menu Pengelola</h1>
        <p className="text-xs text-slate-500">
          Akses seluruh modul operasional dan pengaturan kost.
        </p>
      </div>

      {/* Profil Shortcut */}
      <Link
        href="/owner/profil"
        className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-sm">
            {user.nama ? user.nama.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div>
            <h2 className="font-bold text-sm text-slate-900">{user.nama}</h2>
            <p className="text-xs text-slate-500">{user.email} ({user.role})</p>
          </div>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-400" />
      </Link>

      {/* All Navigation Items */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs divide-y divide-slate-100 overflow-hidden text-xs">
        {ownerNavItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="p-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{item.label}</p>
                  {item.description && (
                    <p className="text-[11px] text-slate-400 font-normal">{item.description}</p>
                  )}
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          );
        })}
      </div>

      {/* Logout Button */}
      <div>
        <LogoutButton variant="profile" />
      </div>
    </div>
  );
}
