const API_URL = 'https://fakestoreapi.com/products';
const CACHE_KEY = 'shopsmart_api_products_v1';
const CACHE_TTL = 10 * 60 * 1000;

export async function fetchProducts(force = false) {
  if (!force) {
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (cached?.products?.length && Date.now() - cached.savedAt < CACHE_TTL) {
        return { products: cached.products, fromCache: true };
      }
    } catch { /* Ignore invalid cache and request fresh data. */ }
  }

  const response = await fetch(API_URL, { headers: { Accept: 'application/json' } });
  if (!response.ok) throw new Error(`Product service returned ${response.status}.`);
  const products = await response.json();
  if (!Array.isArray(products)) throw new Error('Unexpected product data received.');
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ products, savedAt: Date.now() })); } catch { /* Storage may be full or disabled. */ }
  return { products, fromCache: false };
}
