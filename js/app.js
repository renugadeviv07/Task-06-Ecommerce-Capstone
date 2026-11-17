import { fetchProducts } from './api.js';
import { read, write, getCart, saveCart, getUsers, saveUsers, getSession, saveSession, clearSession, getOrders, saveOrders, getCustomProducts, saveCustomProducts } from './store.js';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const money = value => `$${Number(value || 0).toFixed(2)}`;
const FALLBACK_IMAGE = 'https://placehold.co/400x400/f1eee5/68736d?text=ShopSmart';
const state = { products: [], category: 'all', query: '', sort: 'featured', authMode: 'login', currentView: 'home' };
const els = {
  cartBadge: $('#cart-badge'), featured: $('#featured-grid'), shop: $('#shop-grid'), categories: $('#category-filters'), search: $('#search-input'), sort: $('#sort-select'), result: $('#result-count'), notice: $('#api-notice'), cartLines: $('#cart-lines'), subtotal: $('#cart-subtotal'), shipping: $('#cart-shipping'), total: $('#cart-total'), orders: $('#orders-list'), adminProducts: $('#admin-products'), authDialog: $('#auth-dialog'), productDialog: $('#product-dialog'), checkoutDialog: $('#checkout-dialog'), toast: $('#toast')
};

function toast(message) {
  els.toast.textContent = message;
  els.toast.classList.add('show');
  window.clearTimeout(toast.timer);
  toast.timer = window.setTimeout(() => els.toast.classList.remove('show'), 2600);
}
function safeText(value) { return String(value ?? ''); }
function allProducts() { const merged = new Map(state.products.map(product => [product.id, product])); getCustomProducts().forEach(product => merged.set(product.id, product)); return [...merged.values()]; }
function updateCartBadge() { els.cartBadge.textContent = getCart().reduce((sum, item) => sum + item.quantity, 0); }
function getSessionUser() { return getSession(); }
function isAdmin() { return getSessionUser()?.role === 'admin'; }

function showView(name) {
  if (name === 'admin' && !isAdmin()) { toast('Sign in with the demo admin account to open the admin workspace.'); openAuth(); return; }
  if (name === 'orders' && !getSessionUser()) { toast('Please sign in to view your orders.'); openAuth(); return; }
  state.currentView = name;
  $$('.view').forEach(view => view.classList.toggle('active', view.id === `view-${name}`));
  $$('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.view === name));
  $('.main-nav').classList.remove('open');
  if (name === 'cart') renderCart();
  if (name === 'orders') renderOrders();
  if (name === 'admin') renderAdmin();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function productCard(product) {
  const card = document.createElement('article'); card.className = 'product-card';
  const imageWrap = document.createElement('div'); imageWrap.className = 'product-image-wrap';
  const image = document.createElement('img'); image.src = product.image || FALLBACK_IMAGE; image.alt = safeText(product.title); image.loading = 'lazy'; image.onerror = () => { image.src = FALLBACK_IMAGE; }; imageWrap.append(image);
  const category = document.createElement('p'); category.className = 'product-category'; category.textContent = product.category || 'New arrival';
  const title = document.createElement('h3'); title.textContent = product.title;
  const desc = document.createElement('p'); desc.className = 'product-desc'; desc.textContent = product.description || 'A thoughtful find for everyday living.';
  const bottom = document.createElement('div'); bottom.className = 'product-bottom';
  const price = document.createElement('span'); price.className = 'product-price'; price.textContent = money(product.price);
  const rating = document.createElement('span'); rating.className = 'product-rating'; rating.textContent = `★ ${product.rating?.rate ?? 'New'}`; bottom.append(price, rating);
  const add = document.createElement('button'); add.className = 'add-button'; add.type = 'button'; add.textContent = 'ADD TO CART'; add.addEventListener('click', () => addToCart(product));
  card.append(imageWrap, category, title, desc, bottom, add); return card;
}
function renderGrid(target, products) { target.replaceChildren(...products.map(productCard)); }
function renderFeatured() { renderGrid(els.featured, allProducts().slice(0, 4)); }
function renderCategories() {
  const categories = [...new Set(allProducts().map(p => p.category).filter(Boolean))].sort();
  els.categories.replaceChildren();
  [['all', 'All products'], ...categories.map(c => [c, c])].forEach(([value, label]) => {
    const button = document.createElement('button'); button.className = `filter-chip${state.category === value ? ' selected' : ''}`; button.type = 'button'; button.dataset.category = value; button.textContent = label; els.categories.append(button);
  });
}
function visibleProducts() {
  let products = allProducts().filter(product => (state.category === 'all' || product.category === state.category) && `${product.title} ${product.description || ''} ${product.category || ''}`.toLowerCase().includes(state.query));
  products = [...products];
  if (state.sort === 'name') products.sort((a,b) => a.title.localeCompare(b.title));
  if (state.sort === 'low') products.sort((a,b) => a.price - b.price);
  if (state.sort === 'high') products.sort((a,b) => b.price - a.price);
  if (state.sort === 'rating') products.sort((a,b) => (b.rating?.rate || 0) - (a.rating?.rate || 0));
  return products;
}
function renderShop() { const products = visibleProducts(); renderGrid(els.shop, products); els.result.textContent = `${products.length} product${products.length === 1 ? '' : 's'} found`; }
function addToCart(product) {
  const cart = getCart(); const found = cart.find(item => item.id === product.id && item.title === product.title);
  if (found) found.quantity += 1; else cart.push({ id: product.id, title: product.title, price: Number(product.price), image: product.image || FALLBACK_IMAGE, quantity: 1 });
  saveCart(cart); updateCartBadge(); toast(`${product.title} added to your cart.`);
}
function changeQuantity(id, title, delta) {
  const cart = getCart().map(item => item.id === id && item.title === title ? { ...item, quantity: item.quantity + delta } : item).filter(item => item.quantity > 0);
  saveCart(cart); renderCart(); updateCartBadge();
}
function removeCartItem(id, title) { saveCart(getCart().filter(item => !(item.id === id && item.title === title))); renderCart(); updateCartBadge(); toast('Item removed from cart.'); }
function renderCart() {
  const cart = getCart(); els.cartLines.replaceChildren();
  if (!cart.length) { const empty = document.createElement('div'); empty.className = 'empty-panel'; empty.innerHTML = '<h2>Your cart is taking a little break.</h2><p>Explore the collection and add something you love.</p>'; const button = document.createElement('button'); button.className = 'button button-dark'; button.textContent = 'Browse products'; button.addEventListener('click', () => showView('shop')); empty.append(button); els.cartLines.append(empty); }
  cart.forEach(item => {
    const row = document.createElement('article'); row.className = 'cart-line'; const img = document.createElement('img'); img.src = item.image || FALLBACK_IMAGE; img.alt = item.title; img.onerror = () => { img.src = FALLBACK_IMAGE; };
    const details = document.createElement('div'); const title = document.createElement('h3'); title.textContent = item.title; const price = document.createElement('p'); price.textContent = money(item.price); const controls = document.createElement('div'); controls.className = 'quantity-controls';
    const minus = document.createElement('button'); minus.textContent = '−'; minus.setAttribute('aria-label', `Decrease ${item.title} quantity`); minus.addEventListener('click', () => changeQuantity(item.id,item.title,-1)); const qty = document.createElement('span'); qty.textContent = item.quantity; const plus = document.createElement('button'); plus.textContent = '+'; plus.setAttribute('aria-label', `Increase ${item.title} quantity`); plus.addEventListener('click', () => changeQuantity(item.id,item.title,1)); controls.append(minus,qty,plus);
    const remove = document.createElement('button'); remove.className = 'remove-button'; remove.textContent = 'Remove'; remove.addEventListener('click', () => removeCartItem(item.id,item.title)); details.append(title,price,controls,remove); const lineTotal = document.createElement('b'); lineTotal.textContent = money(item.price * item.quantity); row.append(img,details,lineTotal); els.cartLines.append(row);
  });
  const subtotal = cart.reduce((sum,item) => sum + item.price * item.quantity,0); const shipping = subtotal === 0 || subtotal >= 50 ? 0 : 5.99;
  els.subtotal.textContent = money(subtotal); els.shipping.textContent = shipping ? money(shipping) : 'Free'; els.total.textContent = money(subtotal + shipping); $('#checkout-button').disabled = !cart.length;
}
function renderOrders() {
  const user = getSessionUser(); const orders = getOrders().filter(order => order.email === user.email); els.orders.replaceChildren();
  if (!orders.length) { const empty = document.createElement('div'); empty.className = 'empty-panel'; empty.textContent = 'No orders yet. Your completed demo checkouts will appear here.'; els.orders.append(empty); return; }
  orders.slice().reverse().forEach(order => { const card = document.createElement('article'); card.className = 'order-card'; const info = document.createElement('div'); const heading = document.createElement('h3'); heading.textContent = `Order ${order.id}`; const desc = document.createElement('p'); desc.textContent = `${new Date(order.date).toLocaleString()} · ${order.items.length} item(s) · ${order.status}`; info.append(heading,desc); const total = document.createElement('b'); total.className = 'order-total'; total.textContent = money(order.total); card.append(info,total); els.orders.append(card); });
}
function renderAdmin() {
  const products = allProducts(); $('#admin-product-count').textContent = products.length; $('#admin-order-count').textContent = getOrders().length; els.adminProducts.replaceChildren();
  products.forEach(product => { const row = document.createElement('tr'); const productCell = document.createElement('td'); const wrap = document.createElement('div'); wrap.className = 'admin-product'; const img = document.createElement('img'); img.src = product.image || FALLBACK_IMAGE; img.alt = ''; const name = document.createElement('b'); name.textContent = product.title; wrap.append(img,name); productCell.append(wrap); const category = document.createElement('td'); category.textContent = product.category || '—'; const price = document.createElement('td'); price.textContent = money(product.price); const actions = document.createElement('td');
    const edit = document.createElement('button'); edit.className = 'table-action'; edit.textContent = 'Edit'; edit.addEventListener('click', () => openProductForm(product)); actions.append(edit);
    const custom = getCustomProducts().some(item => item.id === product.id);
    const del = document.createElement('button'); del.className = 'table-action delete'; del.textContent = 'Delete'; del.disabled = !custom; del.title = custom ? 'Delete this custom product' : 'External API products cannot be deleted from the API'; del.addEventListener('click', () => deleteProduct(product.id)); actions.append(del); row.append(productCell,category,price,actions); els.adminProducts.append(row);
  });
}
function openAuth() { $('#auth-error').textContent = ''; $('#auth-title').textContent = state.authMode === 'login' ? 'Sign in' : 'Create account'; $('#auth-subtitle').textContent = state.authMode === 'login' ? 'Sign in to save your cart and view orders.' : 'Create a customer account for this demo store.'; $('#name-field').hidden = state.authMode === 'login'; $('#auth-submit').textContent = state.authMode === 'login' ? 'Sign in' : 'Create account'; $('#switch-auth').textContent = state.authMode === 'login' ? 'Create an account' : 'Already have an account? Sign in'; els.authDialog.showModal(); }
function updateAccountButton() { const user = getSessionUser(); $('#account-button').textContent = user ? `Hi, ${user.name.split(' ')[0]} · Sign out` : 'Sign in'; $('.admin-nav').hidden = !isAdmin(); }
function handleAuth(event) {
  event.preventDefault(); const email = $('#auth-email').value.trim().toLowerCase(); const password = $('#auth-password').value; const error = $('#auth-error'); error.textContent = '';
  if (state.authMode === 'login') {
    if (email === 'admin@shopsmart.demo' && password === 'admin123') { saveSession({ name: 'Store Admin', email, role: 'admin' }); }
    else { const user = getUsers().find(item => item.email === email && item.password === password); if (!user) { error.textContent = 'Email or password is incorrect. Create an account or use the demo admin details.'; return; } saveSession({ name: user.name, email: user.email, role: 'customer' }); }
    els.authDialog.close(); updateAccountButton(); toast('You are signed in.'); if (isAdmin()) showView('admin');
  } else {
    const name = $('#auth-name').value.trim(); if (!name) { error.textContent = 'Please enter your name.'; return; }
    if (email === 'admin@shopsmart.demo' || getUsers().some(user => user.email === email)) { error.textContent = 'An account with this email already exists.'; return; }
    const users = getUsers(); users.push({ name, email, password }); saveUsers(users); saveSession({ name, email, role: 'customer' }); els.authDialog.close(); updateAccountButton(); toast('Account created successfully.');
  }
}
function openProductForm(product = null) {
  $('#product-form').reset(); $('#product-error').textContent = ''; $('#product-dialog-title').textContent = product ? 'Edit product' : 'Add product'; $('#edit-product-id').value = product?.id ?? ''; $('#product-name').value = product?.title ?? ''; $('#product-category').value = product?.category ?? 'electronics'; $('#product-price').value = product?.price ?? ''; $('#product-image').value = product?.image ?? ''; $('#product-description').value = product?.description ?? ''; els.productDialog.showModal();
}
function saveProduct(event) {
  event.preventDefault(); const idValue = $('#edit-product-id').value; const custom = getCustomProducts(); const product = { id: idValue ? Number(idValue) : Date.now(), title: $('#product-name').value.trim(), category: $('#product-category').value, price: Number($('#product-price').value), image: $('#product-image').value.trim() || FALLBACK_IMAGE, description: $('#product-description').value.trim(), rating: { rate: 0, count: 0 } };
  if (!product.title || !Number.isFinite(product.price) || product.price <= 0 || !product.description) { $('#product-error').textContent = 'Enter a name, valid price and description.'; return; }
  const index = custom.findIndex(item => item.id === product.id); if (index >= 0) custom[index] = product; else custom.push(product); saveCustomProducts(custom); els.productDialog.close(); renderAdmin(); renderCategories(); renderShop(); renderFeatured(); toast(idValue ? 'Product updated.' : 'Product added.');
}
function deleteProduct(id) { if (!window.confirm('Delete this custom product from your local store?')) return; saveCustomProducts(getCustomProducts().filter(item => item.id !== id)); renderAdmin(); renderCategories(); renderShop(); renderFeatured(); toast('Product deleted.'); }
function checkout(event) {
  event.preventDefault(); const cart = getCart(); if (!cart.length) return; const user = getSessionUser(); const email = $('#delivery-email').value.trim().toLowerCase();
  const subtotal = cart.reduce((sum,item) => sum + item.price * item.quantity,0); const shipping = subtotal >= 50 ? 0 : 5.99;
  const orders = getOrders(); orders.push({ id: `SS-${Date.now().toString().slice(-7)}`, email, customer: $('#delivery-name').value.trim(), address: $('#delivery-address').value.trim(), items: cart, total: subtotal + shipping, date: new Date().toISOString(), status: 'Demo order placed' }); saveOrders(orders); saveCart([]); els.checkoutDialog.close(); $('#checkout-form').reset(); updateCartBadge(); renderCart(); toast('Your demo order has been placed!'); if (user?.email === email) showView('orders'); else showView('home');
}

$$('[data-view]').forEach(button => button.addEventListener('click', () => showView(button.dataset.view)));
$('#account-button').addEventListener('click', () => { if (getSessionUser()) { clearSession(); updateAccountButton(); showView('home'); toast('You have signed out.'); } else { state.authMode = 'login'; openAuth(); } });
$('#switch-auth').addEventListener('click', () => { state.authMode = state.authMode === 'login' ? 'register' : 'login'; openAuth(); });
$('#auth-form').addEventListener('submit', handleAuth);
$('#product-form').addEventListener('submit', saveProduct);
$('#checkout-form').addEventListener('submit', checkout);
$('#add-product-button').addEventListener('click', () => openProductForm());
$('#checkout-button').addEventListener('click', () => { if (!getSessionUser()) { toast('Sign in before checkout.'); state.authMode = 'login'; openAuth(); return; } $('#delivery-name').value = getSessionUser().name; $('#delivery-email').value = getSessionUser().email; els.checkoutDialog.showModal(); });
$('#search-input').addEventListener('input', event => { state.query = event.target.value.trim().toLowerCase(); renderShop(); });
$('#sort-select').addEventListener('change', event => { state.sort = event.target.value; renderShop(); });
els.categories.addEventListener('click', event => { const button = event.target.closest('[data-category]'); if (!button) return; state.category = button.dataset.category; renderCategories(); renderShop(); });
$('#home-categories').addEventListener('click', event => { const button = event.target.closest('[data-home-category]'); if (!button) return; state.category = button.dataset.homeCategory; renderCategories(); renderShop(); showView('shop'); });
$('#menu-toggle').addEventListener('click', () => $('.main-nav').classList.toggle('open'));

async function init() {
  updateCartBadge(); updateAccountButton();
  try { const result = await fetchProducts(); state.products = result.products; els.notice.hidden = true; }
  catch (error) { console.error(error); const cached = read('shopsmart_api_products_v1', null); state.products = cached?.products || []; els.notice.hidden = false; els.notice.textContent = state.products.length ? 'Live product service is unavailable. Showing saved catalogue data.' : 'Could not load products. Check your internet connection and refresh the page.'; }
  renderCategories(); renderShop(); renderFeatured();
}
init();
