// Simule le service de compte (non connecté) : les tests ne dépendent pas du réseau et ne polluent pas la console.
export async function stubApi(page) {
  await page.setRequestInterception(true);
  page.on('request', (r) => {
    if (!r.url().startsWith('https://api.opengamingstudio.com/')) return r.continue();
    r.respond({ status: 401, contentType: 'application/json', headers: { 'access-control-allow-origin': r.headers().origin || '*', 'access-control-allow-credentials': 'true' }, body: '{"error":"non connecte"}' });
  });
}

// Erreur de console due à une réponse du service de compte simulée (401 attendu hors connexion).
export const isApi = (m) => (m.location()?.url || '').startsWith('https://api.opengamingstudio.com/');
