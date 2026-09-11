import { redirect } from 'next/navigation';
import { getServerAuthSession } from '@/lib/auth';
import AdminDashboardClient from './AdminDashboardClient';

export default async function AdminPage() {
  const session = await getServerAuthSession();

  if (!session || !session.user) {
    redirect('/login?callbackUrl=/admin');
  }

  if (session.user.role !== 'admin') {
    // Viewer trying to directly hit /admin in the browser
    redirect('/viewer');
  }

  return <AdminDashboardClient />;
}
