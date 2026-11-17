const KEYS = { cart: 'shopsmart_cart_v1', users: 'shopsmart_users_v1', session: 'shopsmart_session_v1', orders: 'shopsmart_orders_v1', custom: 'shopsmart_custom_products_v1' };

export function read(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
export function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { return false; }
}
export const getCart = () => read(KEYS.cart, []);
export const saveCart = cart => write(KEYS.cart, cart);
export const getUsers = () => read(KEYS.users, []);
export const saveUsers = users => write(KEYS.users, users);
export const getSession = () => read(KEYS.session, null);
export const saveSession = session => write(KEYS.session, session);
export const clearSession = () => localStorage.removeItem(KEYS.session);
export const getOrders = () => read(KEYS.orders, []);
export const saveOrders = orders => write(KEYS.orders, orders);
export const getCustomProducts = () => read(KEYS.custom, []);
export const saveCustomProducts = products => write(KEYS.custom, products);
export const storageKeys = KEYS;
