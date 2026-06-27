import Link from 'next/link';
import { EmailAuthForm } from '@/components/EmailAuthForm';

export default function InscriptionPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <Link href="/" className="text-2xl font-bold text-orange-600">ImmoCI</Link>
          <p className="text-gray-500 mt-1">Créez votre compte</p>
        </div>
        <EmailAuthForm defaultTab="register" />
      </div>
    </main>
  );
}
