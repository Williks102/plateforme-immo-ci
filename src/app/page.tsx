import Link from 'next/link';
import { db } from '@/lib/db';
import { ListingCard } from '@/components/ListingCard';
import Navbar from '@/components/Navbar';

export const revalidate = 60;

async function getRecentListings() {
  try {
    const result = await db.query(
      `SELECT id, title, prix_nuitee, commune, quartier, avg_rating, review_count,
              photos[1] as cover_photo, is_verified
       FROM v_published_listings
       ORDER BY is_verified DESC, created_at DESC
       LIMIT 8`
    );
    return result.rows;
  } catch {
    return [];
  }
}

export default async function Home() {
  const listings = await getRecentListings();

  return (
    <main className="min-h-screen bg-gray-50">
      <Navbar />

      <section className="bg-gradient-to-br from-orange-500 to-orange-700 text-white py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h1 className="text-3xl font-bold mb-3">
            Trouvez votre hébergement en Côte d'Ivoire
          </h1>
          <p className="text-orange-100 mb-6">
            Locations saisonnières, appartements et villas à Abidjan
          </p>
          <Link
            href="/recherche"
            className="inline-block bg-white text-orange-600 font-semibold px-8 py-3 rounded-xl hover:bg-orange-50 transition-colors"
          >
            Rechercher un bien
          </Link>
        </div>
      </section>

      <section className="max-w-6xl mx-auto px-4 py-10">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Dernières annonces</h2>
        {listings.length === 0 ? (
          <p className="text-gray-500 text-center py-12">Aucune annonce disponible pour le moment.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {listings.map((l: Record<string, unknown>) => (
              <ListingCard key={l.id as string} {...(l as unknown as Parameters<typeof ListingCard>[0])} />
            ))}
          </div>
        )}
        <div className="text-center mt-8">
          <Link href="/recherche" className="text-orange-600 font-medium hover:underline">
            Voir toutes les annonces →
          </Link>
        </div>
      </section>

      <section className="bg-orange-50 border-t py-10 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vous êtes propriétaire ?</h2>
          <p className="text-gray-600 mb-4">
            Publiez votre bien gratuitement et commencez à recevoir des réservations.
          </p>
          <Link
            href="/biens/nouveau"
            className="inline-block bg-orange-600 text-white font-semibold px-6 py-3 rounded-xl hover:bg-orange-700 transition-colors"
          >
            Publier mon bien
          </Link>
        </div>
      </section>
    </main>
  );
}
