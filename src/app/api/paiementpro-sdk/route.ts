import { NextResponse } from 'next/server';

const UPSTREAM =
  'https://www.paiementpro.net/webservice/onlinepayment/js/paiementpro.v1.0.2.js';

// Proxy du SDK PaiementPro servi depuis notre propre domaine ('self' dans la CSP).
//
// Pourquoi un proxy ?
// Le SDK v1.0.2 déclare PaiementPro avec `class` ou `let` au top-level d'un script
// classique. Ces déclarations vont dans le "global lexical scope" — partagé entre
// scripts classiques, mais inaccessible depuis un ES module (window/globalThis restent
// indéfinis). La seule solution sans 'unsafe-eval' est d'envelopper le SDK dans une
// IIFE qui partage le scope avec le code du SDK, puis d'assigner window.PaiementPro
// avant la fermeture de l'IIFE.
export async function GET() {
  try {
    const upstream = await fetch(UPSTREAM, {
      next: { revalidate: 86400 }, // cache CDN 24h côté serveur
    });

    if (!upstream.ok) {
      console.error('[paiementpro-sdk proxy] upstream', upstream.status);
      return new NextResponse('// SDK unavailable', {
        status: 503,
        headers: { 'Content-Type': 'application/javascript' },
      });
    }

    const sdkCode = await upstream.text();

    // On enveloppe le code SDK dans une IIFE.
    // • Si le SDK déclare class/let PaiementPro au top-level → visible dans l'IIFE
    //   → window.PaiementPro est assigné par notre ligne d'export.
    // • Si le SDK assigne lui-même window.PaiementPro → déjà disponible, notre
    //   ligne d'export est redondante mais inoffensive.
    const wrapped = [
      ';(function(){',
      sdkCode,
      ';if(typeof PaiementPro!=="undefined"&&!window.PaiementPro)window.PaiementPro=PaiementPro;',
      '})();',
    ].join('\n');

    return new NextResponse(wrapped, {
      headers: {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    });
  } catch (err) {
    console.error('[paiementpro-sdk proxy] fetch error', err);
    return new NextResponse('// SDK unavailable', {
      status: 503,
      headers: { 'Content-Type': 'application/javascript' },
    });
  }
}
