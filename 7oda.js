const video = document.getElementById("cheeseVideo");
const playBtn = document.getElementById("playBtn");
const soundBtn = document.getElementById("soundBtn");

const playIcon = playBtn.querySelector("i");
const soundIcon = soundBtn.querySelector("i");

// Play / Pause
playBtn.addEventListener("click", () => {
  if (video.paused) {
    video.play();

    playIcon.classList.remove("fa-play");
    playIcon.classList.add("fa-pause");
  } else {
    video.pause();

    playIcon.classList.remove("fa-pause");
    playIcon.classList.add("fa-play");
  }
});

// Sound ON / OFF
soundBtn.addEventListener("click", () => {
  video.muted = !video.muted;

  if (video.muted) {
    soundIcon.classList.remove("fa-volume-high");
    soundIcon.classList.add("fa-volume-xmark");
  } else {
    soundIcon.classList.remove("fa-volume-xmark");
    soundIcon.classList.add("fa-volume-high");

    // تشغيل الفيديو لو كان واقف
    video.play();

    playIcon.classList.remove("fa-play");
    playIcon.classList.add("fa-pause");
  }
});
// --- PRODUCT DATA: loaded from the shared source (Supabase) via products-api.js ---
let productsData = [];

// --- APPLICATION STATE ---
let cart = [];
let favorites = [];
// حفظ اختيار الوزن الحالي لكل منتج
const selectedVariants = {};

window.addEventListener("DOMContentLoaded", async () => {
  updateCartUI();
  try {
    productsData = await ProductsAPI.fetchProducts();
  } catch (err) {
    console.error("Failed to load products", err);
    document.getElementById("product-grid").innerHTML =
      '<p class="col-span-full py-12 text-center text-brand-mutedBrown">تعذر تحميل المنتجات حالياً، حاول مرة أخرى لاحقاً.</p>';
    return;
  }
  renderProducts(productsData);
});

// VIEW SWITCHING (Live Store vs Design System Showcase)
function switchView(viewName) {
  const appView = document.getElementById("app-view");
  const dsView = document.getElementById("ds-view");
  const appBtn = document.getElementById("view-app-btn");
  const dsBtn = document.getElementById("view-ds-btn");

  if (viewName === "app") {
    appView.classList.remove("hidden");
    dsView.classList.add("hidden");

    appBtn.className =
      "px-3 py-1 text-xs rounded-md font-bold transition-all bg-brand-gold text-brand-charcoal shadow";
    dsBtn.className =
      "px-3 py-1 text-xs rounded-md font-medium text-stone-300 hover:text-white transition-all";
  } else {
    appView.classList.add("hidden");
    dsView.classList.remove("hidden");

    dsBtn.className =
      "px-3 py-1 text-xs rounded-md font-bold transition-all bg-brand-gold text-brand-charcoal shadow";
    appBtn.className =
      "px-3 py-1 text-xs rounded-md font-medium text-stone-300 hover:text-white transition-all";
  }
}

// PRODUCT CATALOG RENDERER
function renderProducts(items) {
  const grid = document.getElementById("product-grid");
  grid.innerHTML = "";

  if (items.length === 0) {
    grid.innerHTML = `
      <div class="col-span-full py-12 text-center text-brand-mutedBrown">
        <i class="fa-solid fa-cheese text-4xl text-stone-300 mb-3"></i>
        <p>لا توجد منتجات متطابقة مع التصنيف المختار.</p>
      </div>
    `;
    return;
  }

  items.forEach((product) => {
    const isFav = favorites.includes(product.id);
    const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
    const selectedIndex = hasVariants
      ? Math.min(selectedVariants[product.id] ?? 0, product.variants.length - 1)
      : 0;
    const selectedVariant = hasVariants ? product.variants[selectedIndex] : null;
    const displayPrice = selectedVariant ? selectedVariant.price : product.price;
    const displayWeight = selectedVariant ? selectedVariant.weight : product.weight;
    const displayImage = selectedVariant ? selectedVariant.image : product.image;

    if (hasVariants) {
      selectedVariants[product.id] = selectedIndex;
    }

    const card = document.createElement("div");
    card.className =
      (product.available === false ? "opacity-70 " : "") + "bg-brand-bgCard rounded-3xl border border-brand-border overflow-hidden shadow-card hover:shadow-hover hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between group";

    card.innerHTML = `
      <div>
        <!-- Image & Badge Layer -->
        <div class="relative h-52 overflow-hidden bg-stone-100">
          <img
            id="product-image-${product.id}"
            src="${displayImage}"
            alt="${product.name}"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          >

          <!-- Badge -->
          <span class="absolute top-3 right-3 bg-brand-charcoal/80 backdrop-blur-md text-brand-gold text-[10px] font-black px-3 py-1 rounded-full shadow-sm">
            ${product.badge}
          </span>

          <!-- Favorite Toggle Button -->
          <button onclick="toggleFavorite('${product.id}')" class="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md hover:bg-white text-brand-charcoal flex items-center justify-center transition-all shadow-sm">
            <i class="${isFav ? "fa-solid text-red-500" : "fa-regular"} fa-heart text-sm"></i>
          </button>

          <!-- Quick View Trigger -->
          <button onclick="openProductModal('${product.id}')" class="absolute bottom-3 left-3 bg-white/90 hover:bg-white text-brand-charcoal font-bold text-xs px-3 py-1.5 rounded-xl shadow-md transition-all opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0">
            <i class="fa-solid fa-eye ml-1"></i> نظرة سريعة
          </button>
        </div>

        <!-- Card Body Content -->
        <div class="p-5 space-y-3">
          <div class="flex items-center justify-between gap-2 text-xs text-brand-mutedBrown">
            <div class="flex items-center gap-2 flex-wrap">
              ${
                hasVariants
                  ? product.variants.map((variant, index) => `
                    <button
                      type="button"
                      id="variant-${product.id}-${index}"
                      onclick="selectProductVariant('${product.id}', ${index})"
                      class="px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${
                        index === selectedIndex
                          ? "bg-brand-gold text-brand-charcoal border-brand-gold"
                          : "bg-white text-brand-charcoal border-brand-border hover:border-brand-gold"
                      }"
                    >
                      ${variant.weight}
                    </button>
                  `).join("")
                  : `
                    <span class="bg-brand-bgLight px-2 py-0.5 rounded font-semibold">
                      ${displayWeight}
                    </span>
                  `
              }
            </div>

            <div class="${product.reviewsCount > 0 ? "flex" : "hidden"} items-center gap-1 text-amber-500 font-bold shrink-0">
              <i class="fa-solid fa-star text-[10px]"></i>
              <span>${product.rating}</span>
              <span class="text-stone-400 font-normal">(${product.reviewsCount})</span>
            </div>
          </div>

          <h3 onclick="openProductModal('${product.id}')" class="font-black text-brand-charcoal text-base sm:text-lg hover:text-brand-gold cursor-pointer transition-colors leading-snug">
            ${product.name}
          </h3>

          <p class="text-xs text-brand-mutedBrown line-clamp-2 leading-relaxed">
            ${product.description}
          </p>
        </div>
      </div>

      <!-- Card Action & Price Footer -->
      <div class="p-5 pt-0 flex items-center justify-between border-t border-brand-border/40 mt-3 pt-3">
        <div>
          <span class="text-xs text-stone-400 block font-semibold">السعر</span>
          <span id="product-price-${product.id}" class="text-lg font-black text-brand-charcoal">
            ${displayPrice}
            <span class="text-xs font-bold text-brand-gold">ج.م</span>
          </span>
        </div>

        ${product.available === false
          ? `<span class="bg-stone-200 text-stone-500 font-bold px-4 py-2.5 rounded-xl text-xs">غير متاح حالياً</span>`
          : `<button onclick="addSelectedVariantToCart('${product.id}')" class="bg-brand-gold hover:bg-brand-goldHover text-brand-charcoal font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2 text-xs">
          <i class="fa-solid fa-cart-plus"></i>
          <span>أضف للسلة</span>
        </button>`}
      </div>
    `;

    grid.appendChild(card);
  });
}

// تغيير الوزن في كارت المنتج
function selectProductVariant(productId, variantIndex) {
  const product = productsData.find((p) => p.id === productId);
  if (!product || !product.variants || !product.variants[variantIndex]) return;

  selectedVariants[productId] = variantIndex;
  const variant = product.variants[variantIndex];

  const image = document.getElementById(`product-image-${productId}`);
  const price = document.getElementById(`product-price-${productId}`);

  if (image) image.src = variant.image;
  if (price) {
    price.innerHTML = `${variant.price} <span class="text-xs font-bold text-brand-gold">ج.م</span>`;
  }

  product.variants.forEach((_, index) => {
    const button = document.getElementById(`variant-${productId}-${index}`);
    if (!button) return;

    button.classList.toggle("bg-brand-gold", index === variantIndex);
    button.classList.toggle("text-brand-charcoal", true);
    button.classList.toggle("border-brand-gold", index === variantIndex);
    button.classList.toggle("bg-white", index !== variantIndex);
    button.classList.toggle("border-brand-border", index !== variantIndex);
  });
}

// إضافة الاختيار الحالي للسلة
function addSelectedVariantToCart(productId) {
  const product = productsData.find((p) => p.id === productId);
  if (!product || product.available === false) return;

  if (!product.variants || product.variants.length === 0) {
    addToCart(productId);
    return;
  }

  const variantIndex = selectedVariants[productId] ?? 0;
  const variant = product.variants[variantIndex];
  const cartId = `${product.id}-${variant.weight}`;
  const existing = cart.find((item) => item.cartId === cartId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      ...product,
      cartId,
      price: variant.price,
      weight: variant.weight,
      image: variant.image,
      quantity: 1,
    });
  }

  updateCartUI();
  openCartDrawer();
}

// CATEGORY FILTERING LOGIC
function filterCategory(btnElement, categoryKey) {
  document.querySelectorAll(".cat-filter-btn").forEach((btn) => {
    btn.className =
      "cat-filter-btn bg-brand-bgCard hover:bg-stone-100 text-brand-charcoal font-semibold px-4 py-2 rounded-xl text-sm whitespace-nowrap border border-brand-border transition-all";
  });
  btnElement.className =
    "cat-filter-btn active bg-brand-charcoal text-white font-bold px-4 py-2 rounded-xl text-sm whitespace-nowrap transition-all";

  if (categoryKey === "all") {
    renderProducts(productsData);
  } else {
    const filtered = productsData.filter((p) => p.category === categoryKey);
    renderProducts(filtered);
  }
}

function filterProducts(categoryKey) {
  const targetBtn = Array.from(
    document.querySelectorAll(".cat-filter-btn"),
  ).find((b) => b.getAttribute("onclick").includes(categoryKey));
  if (targetBtn) {
    filterCategory(targetBtn, categoryKey);
  }
  document.getElementById("products").scrollIntoView({ behavior: "smooth" });
}

// PRODUCT DETAILS MODAL MODAL LOGIC
function openProductModal(productId) {
  const product = productsData.find((p) => p.id === productId);
  if (!product) return;

  const hasVariants = Array.isArray(product.variants) && product.variants.length > 0;
  const selectedIndex = hasVariants
    ? Math.min(selectedVariants[product.id] ?? 0, product.variants.length - 1)
    : 0;

  if (hasVariants) selectedVariants[product.id] = selectedIndex;

  const modalContent = document.getElementById("modal-content-body");

  modalContent.innerHTML = `
    <div class="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
      <div class="rounded-2xl overflow-hidden border border-brand-border h-64 md:h-80">
        <img
          id="modal-product-image"
          src="${hasVariants ? product.variants[selectedIndex].image : product.image}"
          class="w-full h-full object-cover"
          alt="${product.name}"
        >
      </div>

      <div class="space-y-4">
        <span class="bg-brand-goldLight text-brand-charcoal text-xs font-bold px-2.5 py-1 rounded-full">
          ${product.categoryLabel}
        </span>

        <h2 class="text-2xl font-black text-brand-charcoal">${product.name}</h2>

        <div id="modal-product-price" class="text-xl font-black text-brand-gold">
          ${hasVariants ? product.variants[selectedIndex].price : product.price} ج.م
          <span id="modal-product-weight" class="text-xs text-stone-400 font-normal">
            / ${hasVariants ? product.variants[selectedIndex].weight : product.weight}
          </span>
        </div>

        ${
          hasVariants
            ? `
              <div class="space-y-2">
                <span class="text-xs font-bold text-brand-charcoal block">اختار الوزن:</span>
                <div class="flex flex-wrap gap-2">
                  ${product.variants.map((variant, index) => `
                    <button
                      type="button"
                      id="modal-variant-${product.id}-${index}"
                      onclick="selectModalVariant('${product.id}', ${index})"
                      class="px-4 py-2 rounded-xl border text-xs font-bold transition-all ${
                        index === selectedIndex
                          ? "bg-brand-gold text-brand-charcoal border-brand-gold"
                          : "bg-white text-brand-charcoal border-brand-border hover:border-brand-gold"
                      }"
                    >
                      ${variant.weight}
                    </button>
                  `).join("")}
                </div>
              </div>
            `
            : ""
        }

        <p class="text-xs text-brand-mutedBrown leading-relaxed">${product.description}</p>

        <div class="space-y-2">
          <span class="text-xs font-bold text-brand-charcoal block">المكونات الرئيسية:</span>
          <div class="flex flex-wrap gap-1.5">
            ${product.ingredients.map((ing) => `<span class="bg-stone-100 text-stone-700 text-[11px] px-2.5 py-1 rounded-lg">${ing}</span>`).join("")}
          </div>
        </div>

        <div class="pt-4 flex items-center gap-3">
          <button
            onclick="addSelectedVariantToCart('${product.id}'); closeProductModal();"
            class="flex-1 bg-brand-gold hover:bg-brand-goldHover text-brand-charcoal font-bold py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 shadow-md"
          >
            <i class="fa-solid fa-cart-plus"></i> أضف للسلة الآن
          </button>
        </div>
      </div>
    </div>
  `;

  const modal = document.getElementById("product-modal");
  modal.classList.remove("hidden");
}

function selectModalVariant(productId, variantIndex) {
  const product = productsData.find((p) => p.id === productId);
  if (!product || !product.variants || !product.variants[variantIndex]) return;

  selectedVariants[productId] = variantIndex;
  const variant = product.variants[variantIndex];

  const image = document.getElementById("modal-product-image");
  const price = document.getElementById("modal-product-price");
  const weight = document.getElementById("modal-product-weight");

  if (image) image.src = variant.image;
  if (price) {
    price.innerHTML = `${variant.price} ج.م <span id="modal-product-weight" class="text-xs text-stone-400 font-normal">/ ${variant.weight}</span>`;
  }

  product.variants.forEach((_, index) => {
    const button = document.getElementById(`modal-variant-${productId}-${index}`);
    if (!button) return;

    button.classList.toggle("bg-brand-gold", index === variantIndex);
    button.classList.toggle("border-brand-gold", index === variantIndex);
    button.classList.toggle("bg-white", index !== variantIndex);
    button.classList.toggle("border-brand-border", index !== variantIndex);
  });
}

function closeProductModal() {
  document.getElementById("product-modal").classList.add("hidden");
}

// CART STATE MANAGEMENT LOGIC
function addToCart(productId) {
  const product = productsData.find((p) => p.id === productId);
  if (!product || product.available === false) return;

  // المنتجات العادية التي ليس لها أوزان متعددة
  const cartId = product.id;
  const existing = cart.find((item) => item.cartId === cartId);

  if (existing) {
    existing.quantity += 1;
  } else {
    cart.push({
      ...product,
      cartId,
      quantity: 1,
    });
  }

  updateCartUI();
  openCartDrawer();
}

function updateCartQuantity(cartId, delta) {
  const item = cart.find((i) => (i.cartId ?? i.id) === cartId);
  if (!item) return;

  item.quantity += delta;

  if (item.quantity <= 0) {
    cart = cart.filter((i) => (i.cartId ?? i.id) !== cartId);
  }

  updateCartUI();
}

function removeFromCart(cartId) {
  cart = cart.filter((i) => (i.cartId ?? i.id) !== cartId);
  updateCartUI();
}

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );


  // Update Badge Counters
  document.getElementById("cart-badge-count").innerText = totalItems;
  document.getElementById("mobile-cart-badge").innerText = totalItems;
  document.getElementById("cart-drawer-item-count").innerText =
    `${totalItems} منتجات`;

  // Update Amounts
  document.getElementById("cart-subtotal").innerText = `${subtotal} ج.م`;
  document.getElementById("cart-total").innerText = `${total} ج.م`;

  // Render Items List in Cart Drawer
  const itemsContainer = document.getElementById("cart-items-container");
  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="text-center py-12 space-y-3 text-stone-400">
        <i class="fa-solid fa-basket-shopping text-4xl text-stone-300"></i>
        <p class="text-sm font-semibold">سلة المشتريات فارغة حالياً</p>
        <button onclick="closeCartDrawer()" class="bg-brand-gold text-brand-charcoal text-xs font-bold px-4 py-2 rounded-xl">تصفح الأجبان الآن</button>
      </div>
    `;
    return;
  }

  itemsContainer.innerHTML = cart
    .map(
      (item) => `
        <div class="flex items-center gap-3 p-3 bg-white rounded-2xl border border-brand-border">
          <img src="${item.image}" class="w-16 h-16 rounded-xl object-cover" alt="${item.name}">

          <div class="flex-grow space-y-1">
            <h4 class="font-bold text-xs text-brand-charcoal line-clamp-1">${item.name}</h4>
            <div class="text-[11px] text-stone-400">${item.weight}</div>
            <div class="text-xs text-brand-gold font-bold">${item.price} ج.م</div>

            <div class="flex items-center gap-2 pt-1">
              <button onclick="updateCartQuantity('${item.cartId ?? item.id}', -1)" class="w-6 h-6 rounded-lg bg-stone-100 text-brand-charcoal font-bold flex items-center justify-center text-xs hover:bg-stone-200">-</button>
              <span class="text-xs font-bold">${item.quantity}</span>
              <button onclick="updateCartQuantity('${item.cartId ?? item.id}', 1)" class="w-6 h-6 rounded-lg bg-stone-100 text-brand-charcoal font-bold flex items-center justify-center text-xs hover:bg-stone-200">+</button>
            </div>
          </div>

          <button onclick="removeFromCart('${item.cartId ?? item.id}')" class="text-stone-400 hover:text-red-500 text-xs p-2">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      `,
    )
    .join("");
}

// WHATSAPP CART COMPILER & SENDER
function sendCartToWhatsApp() {
  if (cart.length === 0) {
    alert("السلة فارغة! يرجى إضافة منتجات أولاً قبل الطلب.");
    return;
  }

  let message = `مرحباً قنديل ميكس 🧀✨%0A%0Aأرغب في تسجيل طلب جديد:%0A`;

  cart.forEach((item, index) => {
    message += `${index + 1}. *${item.name}* - الوزن: ${item.weight} - العدد: (${item.quantity}) - السعر: ${item.price * item.quantity} ج.م%0A`;
  });

  const subtotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const total = subtotal + 30;

  message += `%0A*الإجمالي الفرعي:* ${subtotal} ج.م`;
  message += `%0A*المبلغ الإجمالي:* ${total} ج.م%0A`;
  message += `%0Aيرجى تأكيد الطلب وتحديد عنوان التوصيل. شكراً!`;

  const whatsappURL = `https://wa.me/201551561092?text=${message}`;
  window.open(whatsappURL, "_blank");
}

// FAVORITES LOGIC
function toggleFavorite(productId) {
  if (favorites.includes(productId)) {
    favorites = favorites.filter((id) => id !== productId);
  } else {
    favorites.push(productId);
  }

  const favBadge = document.getElementById("fav-count");
  if (favorites.length > 0) {
    favBadge.innerText = favorites.length;
    favBadge.classList.remove("hidden");
  } else {
    favBadge.classList.add("hidden");
  }

  renderProducts(productsData);
}

// DRAWER & MENU UI TOGGLES
function openCartDrawer() {
  const overlay = document.getElementById("cart-drawer-overlay");
  const drawer = document.getElementById("cart-drawer");
  overlay.classList.remove("opacity-0", "pointer-events-none");
  drawer.classList.remove("-translate-x-full");
}

function closeCartDrawer() {
  const overlay = document.getElementById("cart-drawer-overlay");
  const drawer = document.getElementById("cart-drawer");
  overlay.classList.add("opacity-0", "pointer-events-none");
  drawer.classList.add("-translate-x-full");
}

function toggleMobileMenu() {
  const menu = document.getElementById("mobile-menu");
  if (menu) menu.classList.toggle("hidden");
}

function toggleFavoritesModal() {
  if (favorites.length === 0) {
    alert(
      "قائمة المفضلة فارغة حالياً. اضغط على أيقونة القلب على المنتجات لتعديل المفضلة.",
    );
  } else {
    const favProducts = productsData.filter((p) => favorites.includes(p.id));
    renderProducts(favProducts);
    document.getElementById("products").scrollIntoView({ behavior: "smooth" });
  }
}

function toggleSearchModal() {
  const query = prompt("أدخل اسم الميكس أو المكون الذي تبحث عنه:");
  if (query) {
    const filtered = productsData.filter(
      (p) => p.name.includes(query) || p.description.includes(query),
    );
    renderProducts(filtered);
    document.getElementById("products").scrollIntoView({ behavior: "smooth" });
  }
}
