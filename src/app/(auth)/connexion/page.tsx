import { OTPForm } from '@/components/OTPForm';

export default function ConnexionPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">ImmoCI</h1>
          <p className="text-gray-500 mt-1">Connectez-vous avec votre numéro</p>
        </div>
        <OTPForm redirectTo="/" />
      </div>
    </main>
  );
}
