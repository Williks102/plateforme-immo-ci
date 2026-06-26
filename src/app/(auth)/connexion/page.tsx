import { EmailAuthForm } from '@/components/EmailAuthForm';

interface Props {
  searchParams: Promise<{ redirect?: string }>;
}

export default async function ConnexionPage({ searchParams }: Props) {
  const { redirect } = await searchParams;
  // N'utiliser le redirect que s'il commence par / (protection open-redirect)
  const redirectTo = redirect?.startsWith('/') ? redirect : undefined;

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">ImmoCI</h1>
          <p className="text-gray-500 mt-1">Locations en Côte d'Ivoire</p>
        </div>
        <EmailAuthForm redirectTo={redirectTo} />
      </div>
    </main>
  );
}
