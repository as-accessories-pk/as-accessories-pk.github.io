
/* Time Zone — Supabase + WhatsApp Store */

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
  return {
    id: String(p.id),
    name: p.name || 'Watch',
    category: p.category || 'Men',
    price: Number(p.price) || 0,
    tag: p.tag || 'TIME ZONE',
    image: p.image_url || p.image || '',
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
  } catch (error) {
    console.error('Could not load Supabase products:', error.message);
    products = loadLocalProducts();
    renderProducts();
    renderCart();
    toast('Showing saved products; online loading failed.');
  }
}

function productCard(p) {
  return `<article class="product-card">
    <div class="product-image">
      <img src="${escapeHTML(p.image)}" alt="${escapeHTML(p.name)}" loading="lazy">
      <span class="tag">${escapeHTML(p.tag)}</span>
    </div>
    <div class="product-info">
      <h3>${escapeHTML(p.name)}</h3>
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

function addToCart(id) {
  id = String(id);
  if (!products.some(p => p.id === id)) return;

  const item = cart.find(x => x.id === id);
  if (item) item.qty++;
  else cart.push({id, qty:1});

  renderCart();
  toast('Added to your cart');
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

function orderCart() {
  if (!cart.length) {
    toast('Your cart is empty');
    return;
  }

  const lines = cart.map(item => {
    const p = products.find(product => product.id === item.id);
    return p ? `• ${p.name} x${item.qty} — ${money(p.price * item.qty)}` : '';
  }).filter(Boolean).join('\n');

  const total = cart.reduce((sum, item) => {
    const p = products.find(product => product.id === item.id);
    return sum + (p ? item.qty * p.price : 0);
  }, 0);

  const message = `Hello Time Zone! I'd like to place an order:\n\n${lines}\n\nSubtotal: ${money(total)}\n\nPlease confirm availability, delivery charges and payment options.\nName:\nDelivery address:`;
  openWhatsAppMessage(message);
}

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
$('#checkoutBtn').addEventListener('click', orderCart);
$('#searchToggle').addEventListener('click', () => {
  $('#searchInput').focus();
  $('#products').scrollIntoView({behavior:'smooth'});
});
$('#searchInput').addEventListener('input', renderProducts);
$('#sortSelect').addEventListener('change', renderProducts);
$('#menuToggle').addEventListener('click', () => $('#nav').classList.toggle('open'));

$('#whatsappBtn').addEventListener('click', () =>
  openWhatsAppMessage('Hello Time Zone! I would like to ask about your watches.')
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
loadSupabaseProducts();
