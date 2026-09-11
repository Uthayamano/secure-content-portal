import { redirect } from 'next/navigation';
import { getServerAuthSession } from '@/lib/auth';
import ViewerCatalogClient from './ViewerCatalogClient';

export default async function ViewerPage() {
  const session = await getServerAuthSession();

  if (!session || !session.user) {
    redirect('/login?callbackUrl=/viewer');
  }

  return <ViewerCatalogClient />;
}
