'use client';
import { useState } from 'react';

interface UserProfile {
  id:          string;
  full_name:   string;
  email:       string;
  phone:       string | null;
  role:        string;
  kyc_status:  string;
  created_at:  string;
}

interface Props {
  initialUser: UserProfile;
}

const roleLabel: Record<string, string> = {
  client:       'Client',
  proprietaire: 'Propriétaire',
  admin:        'Administrateur',
};

const kycLabel: Record<string, string> = {
  unverified:    'Non vérifié',
  id_submitted:  "En cours d'examen",
  verified:      'Vérifié',
  rejected:      'Rejeté',
};

export default function ProfilClient({ initialUser }: Props) {
  const [user,    setUser]    = useState<UserProfile>(initialUser);
  const [saving,  setSaving]  = useState(false);

  const [fullName, setFullName] = useState(initialUser.full_name ?? '');
  const [phone,    setPhone]    = useState(initialUser.phone ?? '');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword,     setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [infoMsg, setInfoMsg] = useState('');
  const [infoErr, setInfoErr] = useState('');
  const [pwdMsg,  setPwdMsg]  = useState('');
  const [pwdErr,  setPwdErr]  = useState('');

  const saveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setInfoMsg('');
    setInfoErr('');
    try {
      const res = await fetch('/api/profil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_name: fullName, phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setInfoMsg('Profil mis à jour avec succès.');
        setUser(prev => ({ ...prev, full_name: fullName, phone }));
      } else {
        setInfoErr(data.error ?? 'Erreur lors de la mise à jour.');
      }
    } catch {
      setInfoErr('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMsg('');
    setPwdErr('');
    if (newPassword !== confirmPassword) {
      setPwdErr('Les mots de passe ne correspondent pas.');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/profil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setPwdMsg('Mot de passe modifié avec succès.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setPwdErr(data.error ?? 'Erreur lors du changement de mot de passe.');
      }
    } catch {
      setPwdErr('Erreur réseau. Veuillez réessayer.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Mon profil</h1>

        {/* Infos lecture seule */}
        <div className="bg-white rounded-2xl shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-orange-700 font-bold text-xl">{user.email[0].toUpperCase()}</span>
            </div>
            <div>
              <p className="text-xs text-gray-400">
                Compte créé le {new Date(user.created_at).toLocaleDateString('fr-CI')}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-orange-100 text-orange-700 font-medium px-2 py-0.5 rounded-full">
                  {roleLabel[user.role] ?? user.role}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  user.kyc_status === 'verified'     ? 'bg-green-100 text-green-700' :
                  user.kyc_status === 'id_submitted' ? 'bg-yellow-100 text-yellow-700' :
                  user.kyc_status === 'rejected'     ? 'bg-red-100 text-red-700' :
                                                       'bg-gray-100 text-gray-600'
                }`}>
                  KYC : {kycLabel[user.kyc_status] ?? user.kyc_status}
                </span>
              </div>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-500">Email</p>
            <p className="font-medium text-gray-800">{user.email}</p>
          </div>
        </div>

        {/* Formulaire infos */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Informations personnelles</h2>
          <form onSubmit={saveInfo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet</label>
              <input
                type="text"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Votre nom complet"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="+225 07 00 00 00 00"
              />
            </div>
            {infoMsg && <p className="text-green-600 text-sm bg-green-50 rounded-xl px-3 py-2">{infoMsg}</p>}
            {infoErr && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{infoErr}</p>}
            <button
              type="submit"
              disabled={saving}
              className="w-full py-2.5 bg-orange-600 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-orange-700 transition-colors"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>

        {/* Formulaire mot de passe */}
        <div className="bg-white rounded-2xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-900 mb-4">Changer le mot de passe</h2>
          <form onSubmit={savePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                autoComplete="current-password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer le nouveau mot de passe</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                autoComplete="new-password"
              />
            </div>
            {pwdMsg && <p className="text-green-600 text-sm bg-green-50 rounded-xl px-3 py-2">{pwdMsg}</p>}
            {pwdErr && <p className="text-red-600 text-sm bg-red-50 rounded-xl px-3 py-2">{pwdErr}</p>}
            <button
              type="submit"
              disabled={saving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-2.5 bg-gray-800 text-white rounded-xl font-semibold disabled:opacity-50 hover:bg-gray-900 transition-colors"
            >
              {saving ? 'Enregistrement...' : 'Modifier le mot de passe'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
