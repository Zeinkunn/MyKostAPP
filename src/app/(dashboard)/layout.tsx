import { getCurrentSession } from '@/lib/auth';
import { redirect } from 'next/navigation';
import OwnerSidebar from '@/components/layouts/OwnerSidebar';
import AdminBottomNav from '@/components/layouts/AdminBottomNav';
import PenghuniBottomNav from '@/components/layouts/PenghuniBottomNav';
import Header from '@/components/layouts/Header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();

  if (!session) {
    redirect('/login');
  }

  const isPenghuni = session.role === 'PENGHUNI';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Desktop Sidebar for Owner / Admin */}
      {!isPenghuni && <OwnerSidebar />}

      {/* Main Content Area */}
      <div className={isPenghuni ? 'w-full pb-20' : 'lg:pl-64 w-full pb-20 lg:pb-8'}>
        <Header user={session} />
        <main className="p-4 md:p-6 max-w-7xl mx-auto">{children}</main>
      </div>

      {/* Mobile Bottom Nav based on Role */}
      {isPenghuni ? <PenghuniBottomNav /> : <AdminBottomNav />}
    </div>
  );
}
