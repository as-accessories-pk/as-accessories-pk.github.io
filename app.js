
/* AS Accessories — Supabase + WhatsApp Store */

const WHATSAPP_NUMBERS = ['923017065486', '923051563579'];

const SUPABASE_URL = 'https://efsfyntcnbmsqpvnzjvs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_ELItVgiM2Yqq38m3MUcOhQ_vhdnZNRx';

const supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

const defaultProducts = [
 {id:'1',name:'Classic Steel Chronograph',category:'Men',price:22999,tag:'BESTSELLER',image:'https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=80',desc:'Black dial · Stainless steel'},
 {id:'2',name:'Automatic Heritage Watch',category:'Men',price:34999,tag:'PREMIUM',image:'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?auto=format&fit=crop&w=700&q=80',desc:'Refined finish · Everyday wear'},
 {id:'3',name:'Rose Gold Elegance',category:'Women',price:18999,tag:'NEW',image:'https://images.unsplash.com/photo-1547996160-81dfa63595aa?auto=format&fit=crop&w=700&q=80',desc:'Rose gold tone · Minimal dial'},
 {id:'4',name:'Active Smartwatch Pro',category:'Smartwatch',price:12999,tag:'SMART',image:'https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=700&q=80',desc:'Fitness features · Modern design'},
 {id:'5',name:'Blue Dial Statement',category:'Men',price:26999,tag:'POPULAR',image:'https://images.unsplash.com/photo-1539874754764-5a96559165b0?auto=format&fit=crop&w=700&q=80',desc:'Blue dial · Gold accents'},
 {id:'6',name:'Petite Silver Classic',category:'Women',price:16999,tag:'CLASSIC',image:'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?auto=format&fit=crop&w=700&q=80',desc:'Slim profile · Silver finish'},
 {id:'7',name:'Urban Digital Smartwatch',category:'Smartwatch',price:9999,tag:'SMART',image:'https://images.unsplash.com/photo-1579586337278-3befd40fd17a?auto=format&fit=crop&w=700&q=80',desc:'Daily tracking · Sleek strap'},
 {id:'8',name:'Midnight Black Dress Watch',category:'Men',price:19999,tag:'TIMELESS',image:'https://images.unsplash.com/photo-1524592094714-0f0654e20314?auto=format&fit=crop&w=700&q=80',desc:'Black finish · Versatile style'}
];

const PRODUCT_STORAGE_KEY = 'timezone_products_v1';

function loadLocalProducts() {
  try {
    const saved = localStorage.getItem(PRODUCT_STORAGE_KEY);
    return saved ? JSON.parse(saved) : defaultProducts.map(p => ({...p}));
  } catch (e) {
    return defaultProducts.map(p => ({...p}));
  }
}

let products = loadLocalProducts();
let cart = [];
let activeFilter = 'All';

const $ = s => document.querySelector(s);
const money = n => 'Rs. ' + Number(n || 0).toLocaleString('en-PK');

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  })[ch]);
}

function normalizeProduct(p) {
  const images = [p.image_url || p.image, p.image_url_2, p.image_url_3, p.image_url_4]
    .map(u => String(u || '').trim())
    .filter(Boolean);

  return {
    id: String(p.id),
    name: p.name || 'Watch',
    category: p.category || 'Men',
    price: Number(p.price) || 0,
    tag: p.tag || 'AS ACCESSORIES',
    image: images[0] || '',
    images,
    desc: p.description || p.desc || ''
  };
}

async function loadSupabaseProducts() {
  if (!supabaseClient) {
    console.warn('Supabase library not loaded. Using saved products.');
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    if (Array.isArray(data) && data.length > 0) {
      products = data.map(normalizeProduct);
    } else {
      products = loadLocalProducts();
      console.info('Supabase products table is empty. Showing local products.');
    }

    renderProducts();
    renderCart();
    productsReady = true;
    route();
  } catch (error) {
    console.error('Could not load Supabase products:', error.message);
    products = loadLocalProducts();
    renderProducts();
    renderCart();
    productsReady = true;
    route();
    toast('Showing saved products; online loading failed.');
  }
}

function productCard(p) {
  const href = '#product/' + encodeURIComponent(p.id);
  return `<article class="product-card">
    <a class="product-link img-link" href="${href}" aria-label="View ${escapeHTML(p.name)}">
      <div class="product-image">
        <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy">
        <span class="tag">${escapeHTML(p.tag)}</span>
      </div>
    </a>
    <div class="product-info">
      <h3><a class="product-link" href="${href}">${escapeHTML(p.name)}</a></h3>
      <p>${escapeHTML(p.desc)}</p>
      <div class="price">${money(p.price)}</div>
      <button class="add-btn" data-add="${escapeHTML(p.id)}">＋ Add to Cart</button>
    </div>
  </article>`;
}

function renderProducts() {
  const search = $('#searchInput');
  const sortSelect = $('#sortSelect');
  if (!$('#productGrid') || !search || !sortSelect) return;

  const q = search.value.trim().toLowerCase();

  let list = products.filter(p =>
    (activeFilter === 'All' || p.category === activeFilter) &&
    (p.name + ' ' + p.category + ' ' + p.desc).toLowerCase().includes(q)
  );

  if (sortSelect.value === 'low') list.sort((a,b) => a.price - b.price);
  if (sortSelect.value === 'high') list.sort((a,b) => b.price - a.price);

  $('#productGrid').innerHTML = list.map(productCard).join('');
  $('#emptyState').hidden = list.length > 0;

  document.querySelectorAll('.filter').forEach(button =>
    button.classList.toggle('active', button.dataset.filter === activeFilter)
  );
}

function toast(message) {
  const el = $('#toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 2300);
}

function addToCart(id, qty = 1, silent = false) {
  id = String(id);
  if (!products.some(p => p.id === id)) return;

  const item = cart.find(x => x.id === id);
  if (item) item.qty += qty;
  else cart.push({id, qty});

  renderCart();
  if (!silent) toast('Added to your cart');
}

function changeQty(id, delta) {
  id = String(id);
  const item = cart.find(x => x.id === id);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(x => x.id !== id);
  renderCart();
}

function removeItem(id) {
  id = String(id);
  cart = cart.filter(x => x.id !== id);
  renderCart();
}

function renderCart() {
  const count = cart.reduce((sum, item) => sum + item.qty, 0);
  const total = cart.reduce((sum, item) => {
    const p = products.find(product => product.id === item.id);
    return sum + (p ? item.qty * p.price : 0);
  }, 0);

  $('#cartCount').textContent = count;
  $('#drawerCount').textContent = count;
  $('#cartTotal').textContent = money(total);

  const validItems = cart.filter(item => products.some(p => p.id === item.id));

  $('#cartItems').innerHTML = validItems.length
    ? validItems.map(item => {
        const p = products.find(product => product.id === item.id);
        return `<div class="cart-item">
          <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}">
          <div>
            <h4>${escapeHTML(p.name)}</h4>
            <p>${money(p.price)}</p>
            <div class="qty-controls">
              <button data-qty="${escapeHTML(p.id)}" data-delta="-1" aria-label="Decrease quantity">−</button>
              <span>${item.qty}</span>
              <button data-qty="${escapeHTML(p.id)}" data-delta="1" aria-label="Increase quantity">+</button>
            </div>
          </div>
          <button class="remove-btn" data-remove="${escapeHTML(p.id)}">Remove</button>
        </div>`;
      }).join('')
    : '<p style="color:#777;font-size:13px;padding:25px 0">Your cart is empty. Explore the collection and add a watch you love.</p>';
}

function openCart() {
  $('#cartDrawer').classList.add('open');
  $('#overlay').classList.add('open');
  $('#cartDrawer').setAttribute('aria-hidden', 'false');
}

function closeCart() {
  $('#cartDrawer').classList.remove('open');
  $('#overlay').classList.remove('open');
  $('#cartDrawer').setAttribute('aria-hidden', 'true');
}

function chooseWhatsAppNumber() {
  const choice = window.prompt(
    'Choose WhatsApp contact:\n1. +92 301 7065486\n2. +92 305 1563579\n\nEnter 1 or 2:', '1'
  );
  if (choice === '1') return WHATSAPP_NUMBERS[0];
  if (choice === '2') return WHATSAPP_NUMBERS[1];
  return null;
}

function whatsappUrl(number, message) {
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

function openWhatsAppMessage(message) {
  const number = chooseWhatsAppNumber();
  if (number) window.open(whatsappUrl(number, message), '_blank', 'noopener');
}

const CUSTOMER_KEY = 'as_customer_v1';

function cartSummary() {
  const rows = cart.map(item => {
    const p = products.find(product => product.id === item.id);
    return p ? { name: p.name, qty: item.qty, line: p.price * item.qty } : null;
  }).filter(Boolean);
  const total = rows.reduce((sum, r) => sum + r.line, 0);
  return { rows, total };
}

function loadCustomer() {
  try { return JSON.parse(localStorage.getItem(CUSTOMER_KEY)) || {}; }
  catch (e) { return {}; }
}

function saveCustomer(d) {
  try {
    localStorage.setItem(CUSTOMER_KEY, JSON.stringify({
      name: d.name, phone: d.phone, city: d.city, address: d.address
    }));
  } catch (e) {}
}

function openCheckout() {
  const { rows, total } = cartSummary();
  if (!rows.length) {
    toast('Your cart is empty');
    return;
  }

  $('#checkoutSummary').innerHTML =
    rows.map(r => `<div><span>${escapeHTML(r.name)} × ${r.qty}</span><span>${money(r.line)}</span></div>`).join('') +
    `<div class="as-sum-total"><span>Subtotal</span><span>${money(total)}</span></div>`;

  const saved = loadCustomer();
  const fields = { custName: 'name', custPhone: 'phone', custCity: 'city', custAddress: 'address' };
  Object.keys(fields).forEach(id => {
    const el = $('#' + id);
    if (!el.value) el.value = saved[fields[id]] || '';
  });

  $('#checkoutError').textContent = '';
  $('#checkoutModal').classList.add('open');
  $('#custName').focus();
}

function closeCheckout() {
  $('#checkoutModal').classList.remove('open');
}

function buildOrderMessage(d) {
  const { rows, total } = cartSummary();
  const lines = rows.map(r => `• ${r.name} x${r.qty} — ${money(r.line)}`).join('\n');

  return `Hello AS Accessories! I'd like to place an order:\n\n${lines}\n\nSubtotal: ${money(total)}\n\n` +
    `*Delivery details*\nName: ${d.name}\nPhone: ${d.phone}\nCity: ${d.city}\nAddress: ${d.address}` +
    (d.notes ? `\nNotes: ${d.notes}` : '') +
    `\n\nPlease confirm availability, delivery charges and payment options.`;
}

function submitOrder(event) {
  event.preventDefault();

  const d = {
    name: $('#custName').value.trim(),
    phone: $('#custPhone').value.trim(),
    city: $('#custCity').value.trim(),
    address: $('#custAddress').value.trim(),
    notes: $('#custNotes').value.trim()
  };

  const digits = d.phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) {
    $('#checkoutError').textContent = 'Please enter a valid phone number, e.g. 0300 1234567.';
    $('#custPhone').focus();
    return;
  }
  if (d.address.length < 8) {
    $('#checkoutError').textContent = 'Please enter your complete delivery address.';
    $('#custAddress').focus();
    return;
  }
  if (!cartSummary().rows.length) {
    closeCheckout();
    toast('Your cart is empty');
    return;
  }

  const picked = document.querySelector('input[name="waNumber"]:checked');
  const number = WHATSAPP_NUMBERS[picked ? Number(picked.value) : 0] || WHATSAPP_NUMBERS[0];

  window.open(whatsappUrl(number, buildOrderMessage(d)), '_blank', 'noopener');
  saveCustomer(d);
  closeCheckout();
  closeCart();
  toast('Opening WhatsApp…');
}

/* ---------- Product page (#product/ID) ---------- */
const BASE_TITLE = document.title;
let productsReady = !supabaseClient;
let ppQty = 1;
let ppShownId = null;
let wasProductPage = false;
let listScrollY = 0;
let ppImgIndex = 0;

function productImages(p) {
  if (p.images && p.images.length) return p.images;
  return p.image ? [p.image] : [];
}

function showPPImage(p, i) {
  const imgs = productImages(p);
  if (!imgs.length) return;
  ppImgIndex = ((i % imgs.length) + imgs.length) % imgs.length;
  const img = $('#ppImage');
  img.src = imgs[ppImgIndex];
  img.alt = imgs.length > 1 ? `${p.name} - photo ${ppImgIndex + 1}` : p.name;
  document.querySelectorAll('#ppThumbs button').forEach((b, k) =>
    b.classList.toggle('active', k === ppImgIndex)
  );
}

function currentProductId() {
  const m = location.hash.match(/^#product\/(.+)$/);
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}

function productUrl(p) {
  return location.origin + location.pathname + '#product/' + encodeURIComponent(p.id);
}

function setPPQty(n) {
  ppQty = Math.max(1, Math.min(10, n));
  $('#ppQty').textContent = ppQty;
}

function renderProductPage(id) {
  const p = products.find(x => x.id === id);
  const body = $('#ppBody');
  const missing = $('#ppMissing');

  if (!p) {
    body.hidden = true;
    missing.hidden = false;
    $('#ppMissingText').textContent = productsReady
      ? 'Sorry, this product is not available any more.'
      : 'Loading product…';
    document.title = BASE_TITLE;
    ppShownId = null;
    return;
  }

  body.hidden = false;
  missing.hidden = true;

  if (ppShownId !== p.id) {
    ppImgIndex = 0;
    setPPQty(1);
    window.scrollTo(0, 0);
    ppShownId = p.id;
  }

  const imgs = productImages(p);
  if (ppImgIndex >= imgs.length) ppImgIndex = 0;
  $('#ppThumbs').innerHTML = imgs.length > 1
    ? imgs.map((src, k) => `<button type="button" data-pp-img="${k}" aria-label="Photo ${k + 1}"><img src="${escapeHTML(src)}" alt="" loading="lazy"></button>`).join('')
    : '';
  $('#ppThumbs').hidden = imgs.length < 2;
  $('#ppPrev').hidden = imgs.length < 2;
  $('#ppNext').hidden = imgs.length < 2;
  showPPImage(p, ppImgIndex);
  $('#ppTag').textContent = p.tag;
  $('#ppCategory').textContent = p.category;
  $('#ppName').textContent = p.name;
  $('#ppPrice').textContent = money(p.price);
  $('#ppDesc').textContent = p.desc;

  const others = products.filter(x => x.id !== p.id);
  const related = others.filter(x => x.category === p.category)
    .concat(others.filter(x => x.category !== p.category))
    .slice(0, 4);
  $('#ppRelated').innerHTML = related.map(productCard).join('');
  $('#ppRelatedWrap').hidden = related.length === 0;

  document.title = `${p.name} | AS Accessories`;
}

function route() {
  const id = currentProductId();
  const page = $('#productPage');
  const main = document.querySelector('main');

  if (id !== null) {
    if (!wasProductPage) listScrollY = window.scrollY;
    wasProductPage = true;
    main.hidden = true;
    page.hidden = false;
    renderProductPage(id);
    return;
  }

  page.hidden = true;
  main.hidden = false;
  document.title = BASE_TITLE;
  ppShownId = null;

  if (wasProductPage) {
    wasProductPage = false;
    const target = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (target) target.scrollIntoView();
    else window.scrollTo(0, listScrollY);
  }
}

async function shareProduct(p) {
  const url = productUrl(p);
  try {
    if (navigator.share) {
      await navigator.share({ title: `${p.name} | AS Accessories`, text: p.name, url });
      return;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return;
  }
  try {
    await navigator.clipboard.writeText(url);
    toast('Product link copied');
  } catch (e) {
    window.prompt('Copy this product link:', url);
  }
}

function pagedProduct() {
  return products.find(x => x.id === currentProductId());
}

window.addEventListener('hashchange', route);
$('#ppPrev').addEventListener('click', () => { const p = pagedProduct(); if (p) showPPImage(p, ppImgIndex - 1); });
$('#ppNext').addEventListener('click', () => { const p = pagedProduct(); if (p) showPPImage(p, ppImgIndex + 1); });
$('#ppThumbs').addEventListener('click', event => {
  const btn = event.target.closest('[data-pp-img]');
  const p = pagedProduct();
  if (btn && p) showPPImage(p, Number(btn.dataset.ppImg));
});

let ppTouchX = null;
$('#ppStage').addEventListener('touchstart', event => {
  ppTouchX = event.changedTouches[0].clientX;
}, { passive: true });
$('#ppStage').addEventListener('touchend', event => {
  if (ppTouchX === null) return;
  const dx = event.changedTouches[0].clientX - ppTouchX;
  ppTouchX = null;
  const p = pagedProduct();
  if (p && Math.abs(dx) > 40) showPPImage(p, ppImgIndex + (dx < 0 ? 1 : -1));
}, { passive: true });

$('#ppMinus').addEventListener('click', () => setPPQty(ppQty - 1));
$('#ppPlus').addEventListener('click', () => setPPQty(ppQty + 1));
$('#ppAdd').addEventListener('click', () => {
  const p = pagedProduct();
  if (p) { addToCart(p.id, ppQty); }
});
$('#ppBuy').addEventListener('click', () => {
  const p = pagedProduct();
  if (!p) return;
  if (!cart.some(item => item.id === p.id)) addToCart(p.id, ppQty, true);
  openCheckout();
});
$('#ppShare').addEventListener('click', () => {
  const p = pagedProduct();
  if (p) shareProduct(p);
});

document.addEventListener('click', event => {
  const add = event.target.closest('[data-add]');
  if (add) addToCart(add.dataset.add);

  const qty = event.target.closest('[data-qty]');
  if (qty) changeQty(qty.dataset.qty, Number(qty.dataset.delta));

  const remove = event.target.closest('[data-remove]');
  if (remove) removeItem(remove.dataset.remove);

  const filter = event.target.closest('[data-filter]');
  if (filter) {
    activeFilter = filter.dataset.filter;
    renderProducts();
    $('#products').scrollIntoView({behavior:'smooth'});
  }

  const link = event.target.closest('[data-filter-link]');
  if (link) {
    activeFilter = link.dataset.filterLink;
    renderProducts();
    $('#nav').classList.remove('open');
  }
});

$('#cartToggle').addEventListener('click', openCart);
$('#closeCart').addEventListener('click', closeCart);
$('#overlay').addEventListener('click', closeCart);
$('#checkoutBtn').addEventListener('click', openCheckout);
$('#checkoutForm').addEventListener('submit', submitOrder);
$('#closeCheckout').addEventListener('click', closeCheckout);
$('#checkoutModal').addEventListener('click', event => {
  if (event.target === $('#checkoutModal')) closeCheckout();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeCheckout();
});
$('#searchToggle').addEventListener('click', () => {
  if (currentProductId() !== null) {
    location.hash = '#products';
    route();
  }
  $('#searchInput').focus();
  $('#products').scrollIntoView({behavior:'smooth'});
});
$('#searchInput').addEventListener('input', renderProducts);
$('#sortSelect').addEventListener('change', renderProducts);
$('#menuToggle').addEventListener('click', () => $('#nav').classList.toggle('open'));

$('#whatsappBtn').addEventListener('click', () =>
  openWhatsAppMessage('Hello AS Accessories! I would like to ask about your watches.')
);

$('#newsletterForm').addEventListener('submit', event => {
  event.preventDefault();
  $('#newsletterMsg').textContent =
    'Thank you! Newsletter sign-up is a demo here; connect an email service to collect subscribers.';
  $('#emailInput').value = '';
});

$('#year').textContent = new Date().getFullYear();
$('#topPhone').textContent = '+92 301 7065486 | +92 305 1563579';

renderProducts();
renderCart();
route();
loadSupabaseProducts();
