const { client: db, configured, fromRow, toRow } = ProductsAPI;
const $ = (s) => document.querySelector(s);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const CATEGORIES = { gold: "جولد ✨", kiriclassic: "كلاسيك كيري 👑", whitecheese: "جبنة بيضة  🧀🤍", rumicheese: "جبنة رومي/تركي  🧀🤍", salad: "سلطات  🥗", sweet: "الحلو 🍬" };
const BUCKET = "product-images";
let products = [], view = "dashboard", search = "", draft = null;

function toast(msg, ok = true) {
  const t = $("#toast");
  t.textContent = msg; t.className = `fixed bottom-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-xl text-sm font-bold shadow-lg ${ok ? "bg-brand-charcoal text-white" : "bg-red-700 text-white"}`;
  clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.add("hidden"), 3500);
}
const show = (id) => ["#setup", "#login", "#app"].forEach((s) => $(s).classList.toggle("hidden", s !== id));

// ---------- Auth ----------
async function isAdmin(session) {
  if (!session) return false;
  const { data } = await db.from("admins").select("user_id").eq("user_id", session.user.id).maybeSingle();
  return !!data;
}
async function boot() {
  if (!configured) {
    const c = window.SUPABASE_CONFIG || {};
    $("#setup-msg").textContent = !window.supabase
      ? "تعذر تحميل مكتبة Supabase. تأكد من اتصال الإنترنت ثم أعد تحميل الصفحة."
      : !c.url || !c.anonKey
      ? "ملف supabase-config.js فاضي. الصق فيه رابط المشروع (url) والمفتاح العام (anon key) ثم أعد تحميل الصفحة."
      : "تعذر إنشاء الاتصال بـ Supabase. راجع الرابط والمفتاح في supabase-config.js.";
    return show("#setup");
  }
  const { data: { session } } = await db.auth.getSession();
  if (await isAdmin(session)) return enterApp();
  if (session) await db.auth.signOut();
  show("#login");
}
$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const err = $("#login-err"); err.textContent = "";
  const email = $("#l-email").value.trim(), password = $("#l-pass").value;
  if (!email || !password) return (err.textContent = "أدخل البريد الإلكتروني وكلمة المرور.");
  $("#login-btn").disabled = true;
  const { data, error } = await db.auth.signInWithPassword({ email, password });
  $("#login-btn").disabled = false;
  if (error) {
    const m = error.message || "";
    err.textContent = /invalid login credentials/i.test(m) ? "البريد أو كلمة المرور غير صحيحة."
      : /email not confirmed/i.test(m) ? "البريد الإلكتروني غير مفعّل. فعّل المستخدم من لوحة Supabase."
      : /api key|jwt/i.test(m) ? "مفتاح Supabase أو الرابط في supabase-config.js غير صحيح."
      : "تعذر تسجيل الدخول: " + m;
    return;
  }
  if (!(await isAdmin(data.session))) { await db.auth.signOut(); return (err.textContent = "هذا الحساب لا يملك صلاحية الإدارة."); }
  $("#l-pass").value = ""; enterApp();
});
$("#logout").addEventListener("click", async () => { await db.auth.signOut(); products = []; show("#login"); });

async function enterApp() { show("#app"); await loadProducts(); go("dashboard"); }
async function loadProducts() {
  const { data, error } = await db.from("products").select("*").order("sort_order").order("created_at");
  if (error) return toast("تعذر تحميل المنتجات: " + error.message, false);
  products = data.map(fromRow);
}

// ---------- Navigation ----------
function go(v, arg) {
  view = v; if (v === "add") draft = blank(); if (v === "edit") draft = structuredClone(arg);
  document.querySelectorAll(".nav a[data-view]").forEach((a) => a.classList.toggle("active", a.dataset.view === (v === "edit" ? "products" : v)));
  closeMenu(); $("#view").innerHTML = ({ dashboard, products: list, add: form, edit: form, settings })[v](); bind(v); scrollTo(0, 0);
}
const closeMenu = () => { $("#sidebar").classList.add("translate-x-full"); $("#scrim").classList.add("hidden"); };
$("#menu-btn").onclick = () => { $("#sidebar").classList.remove("translate-x-full"); $("#scrim").classList.remove("hidden"); };
$("#scrim").onclick = closeMenu;
document.querySelectorAll(".nav a[data-view]").forEach((a) => (a.onclick = () => go(a.dataset.view)));

// ---------- Views ----------
const priceText = (p) => { const n = p.variants.map((v) => v.price); const a = Math.min(...n), b = Math.max(...n); return a === b ? `${a} ج.م` : `${a} – ${b} ج.م`; };
function dashboard() {
  const av = products.filter((p) => p.available).length;
  const card = (n, l) => `<div class="bg-white border border-brand-border rounded-2xl p-5"><div class="text-3xl font-black">${n}</div><div class="text-sm text-brand-mutedBrown">${l}</div></div>`;
  return `<h1 class="text-2xl font-black mb-5">الرئيسية</h1><div class="grid grid-cols-1 sm:grid-cols-3 gap-3">${card(products.length, "إجمالي المنتجات")}${card(av, "منتجات متاحة")}${card(products.length - av, "منتجات غير متاحة")}</div>`;
}
function list() {
  const q = search.trim().toLowerCase();
  const rows = products.filter((p) => !q || p.name.toLowerCase().includes(q)).map((p) => `
    <li class="bg-white border border-brand-border rounded-2xl p-3 flex gap-3 items-center">
      <img src="${esc(p.image)}" alt="" class="w-16 h-16 rounded-xl object-cover bg-stone-100 shrink-0" onerror="this.style.opacity=.3">
      <div class="min-w-0 flex-1">
        <div class="font-black truncate">${esc(p.name)}</div>
        <div class="text-xs text-brand-mutedBrown">${priceText(p)} · ${p.variants.map((v) => esc(v.weight)).join("، ")}</div>
        <span class="inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${p.available ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"}">${p.available ? "متاح" : "غير متاح"}</span>
      </div>
      <div class="flex flex-col sm:flex-row gap-2 shrink-0">
        <button class="btn btn-ghost" data-edit="${esc(p.id)}"><i class="fa-solid fa-pen"></i><span class="hidden sm:inline">تعديل</span></button>
        <button class="btn btn-ghost text-red-700" data-del="${esc(p.id)}"><i class="fa-solid fa-trash"></i><span class="hidden sm:inline">حذف</span></button>
      </div></li>`).join("");
  return `<div class="flex flex-wrap items-center justify-between gap-3 mb-5"><h1 class="text-2xl font-black">المنتجات</h1>
    <div class="flex gap-2 w-full sm:w-auto"><input id="search" class="field" placeholder="ابحث باسم المنتج" value="${esc(search)}"><button class="btn btn-gold shrink-0" data-view-add><i class="fa-solid fa-plus"></i>إضافة</button></div></div>
    <ul class="space-y-3" id="plist">${rows || `<li class="text-center py-12 text-brand-mutedBrown">لا توجد منتجات. ابدأ بإضافة أول منتج.</li>`}</ul>`;
}
const blank = () => ({ id: null, name: "", description: "", category: "gold", image: "", available: true, ingredients: [], variants: [{ weight: "250 جرام", price: "", image: "" }] });

function imgField(id, label, url) {
  return `<div data-img="${id}"><label class="text-xs font-bold">${label}</label>
    <div class="flex items-center gap-3 mt-1"><img src="${esc(url)}" alt="" class="w-16 h-16 rounded-xl object-cover bg-stone-100 ${url ? "" : "hidden"}">
    <label class="btn btn-ghost cursor-pointer"><i class="fa-solid fa-upload"></i><span>رفع صورة</span><input type="file" accept="image/jpeg,image/png,image/webp" class="hidden"></label></div><p class="err"></p></div>`;
}
function variantRow(v, i) {
  return `<div class="border border-brand-border rounded-xl p-3 space-y-3 bg-brand-bgLight" data-variant="${i}">
    <div class="grid grid-cols-2 gap-3">
      <div><label class="text-xs font-bold">الوزن / الحجم</label><input class="field" data-f="weight" value="${esc(v.weight)}" placeholder="250 جرام"><p class="err"></p></div>
      <div><label class="text-xs font-bold">السعر (ج.م)</label><input class="field" data-f="price" inputmode="decimal" value="${esc(v.price)}"><p class="err"></p></div>
    </div>
    ${imgField("v" + i, "صورة هذا الحجم (اختياري)", v.image)}
    <button type="button" class="text-xs font-bold text-red-700" data-rm="${i}"><i class="fa-solid fa-trash"></i> حذف هذا الحجم</button></div>`;
}
function form() {
  const d = draft, editing = !!d.id;
  return `<h1 class="text-2xl font-black mb-5">${editing ? "تعديل المنتج" : "إضافة منتج"}</h1>
  <form id="pform" class="space-y-5 bg-white border border-brand-border rounded-2xl p-4 sm:p-6" novalidate>
    <div><label class="text-xs font-bold" for="f-name">اسم المنتج</label><input id="f-name" class="field" value="${esc(d.name)}"><p class="err" data-e="name"></p></div>
    <div><label class="text-xs font-bold" for="f-desc">الوصف</label><textarea id="f-desc" rows="3" class="field">${esc(d.description)}</textarea></div>
    <div class="grid sm:grid-cols-2 gap-4">
      <div><label class="text-xs font-bold" for="f-cat">التصنيف</label><select id="f-cat" class="field">${Object.entries(CATEGORIES).map(([k, l]) => `<option value="${k}" ${k === d.category ? "selected" : ""}>${esc(l)}</option>`).join("")}</select></div>
      <div><label class="text-xs font-bold" for="f-av">الحالة</label><select id="f-av" class="field"><option value="1" ${d.available ? "selected" : ""}>متاح</option><option value="0" ${d.available ? "" : "selected"}>غير متاح</option></select></div>
    </div>
    <div><label class="text-xs font-bold" for="f-ing">المكونات (افصل بينها بفاصلة)</label><input id="f-ing" class="field" value="${esc((d.ingredients || []).join("، "))}"></div>
    ${imgField("main", "الصورة الرئيسية", d.image)}<p class="err" data-e="image"></p>
    <div><div class="flex items-center justify-between mb-2"><h2 class="font-black">الأحجام والأسعار</h2><button type="button" class="btn btn-ghost" id="add-v"><i class="fa-solid fa-plus"></i>إضافة حجم</button></div>
      <div id="variants" class="space-y-3">${d.variants.map(variantRow).join("")}</div><p class="err" data-e="variants"></p></div>
    <div class="flex gap-2 justify-end"><button type="button" class="btn btn-ghost" id="cancel">إلغاء</button><button class="btn btn-gold" id="save">${editing ? "حفظ التعديلات" : "إضافة المنتج"}</button></div>
  </form>`;
}
function settings() {
  return `<h1 class="text-2xl font-black mb-5">الإعدادات</h1><div class="space-y-4">
  <form id="pw-form" class="bg-white border border-brand-border rounded-2xl p-5 space-y-3 max-w-sm" novalidate><h2 class="font-black">تغيير كلمة المرور</h2>
    <input id="pw" type="password" autocomplete="new-password" class="field" dir="ltr" placeholder="كلمة مرور جديدة (8 أحرف على الأقل)"><button class="btn btn-gold">تحديث</button></form>
  ${products.length ? "" : `<div class="bg-white border border-brand-border rounded-2xl p-5 max-w-sm space-y-3"><h2 class="font-black">استيراد المنتجات الحالية</h2><p class="text-sm text-brand-mutedBrown">قاعدة البيانات فارغة. استورد منتجات الموقع الحالية مرة واحدة.</p><button class="btn btn-gold" id="import">استيراد</button></div>`}</div>`;
}

// ---------- Bindings ----------
function bind(v) {
  if (v === "products") {
    $("#search").oninput = (e) => { search = e.target.value; const pos = e.target.selectionStart; $("#view").innerHTML = list(); bind("products"); const s = $("#search"); s.focus(); s.setSelectionRange(pos, pos); };
    document.querySelector("[data-view-add]").onclick = () => go("add");
    document.querySelectorAll("[data-edit]").forEach((b) => (b.onclick = () => go("edit", products.find((p) => p.id === b.dataset.edit))));
    document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = () => confirmDelete(products.find((p) => p.id === b.dataset.del))));
  }
  if (v === "add" || v === "edit") bindForm();
  if (v === "settings") {
    $("#pw-form").onsubmit = async (e) => {
      e.preventDefault(); const pw = $("#pw").value;
      if (pw.length < 8) return toast("كلمة المرور يجب ألا تقل عن 8 أحرف", false);
      const { error } = await db.auth.updateUser({ password: pw });
      error ? toast(error.message, false) : (toast("تم تحديث كلمة المرور"), ($("#pw").value = ""));
    };
    const imp = $("#import");
    if (imp) imp.onclick = async () => {
      imp.disabled = true;
      try {
        const seed = window.PRODUCTS_SEED;
        if (!seed || !seed.length) throw new Error("ملف products-seed.js غير موجود بجوار admin.html");
        const { error } = await db.from("products").insert(seed.map((p, i) => toRow({ ...p, variants: p.variants?.length ? p.variants : [{ weight: p.weight, price: p.price, image: p.image }], available: true, sortOrder: i })));
        if (error) throw error;
        await loadProducts(); toast(`تم استيراد ${seed.length} منتج`); go("products");
      } catch (e) { toast("فشل الاستيراد: " + e.message, false); imp.disabled = false; }
    };
  }
}
function syncDraft() {
  draft.name = $("#f-name").value; draft.description = $("#f-desc").value; draft.category = $("#f-cat").value;
  draft.available = $("#f-av").value === "1"; draft.ingredients = $("#f-ing").value.split(/[,،]/).map((s) => s.trim()).filter(Boolean);
  document.querySelectorAll("[data-variant]").forEach((el, i) => { draft.variants[i].weight = el.querySelector('[data-f="weight"]').value; draft.variants[i].price = el.querySelector('[data-f="price"]').value; });
}
function bindForm() {
  $("#cancel").onclick = () => go("products");
  $("#add-v").onclick = () => { syncDraft(); draft.variants.push({ weight: "", price: "", image: "" }); rerenderForm(); };
  document.querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => { syncDraft(); if (draft.variants.length === 1) return toast("يجب أن يحتوي المنتج على حجم واحد على الأقل", false); draft.variants.splice(+b.dataset.rm, 1); rerenderForm(); }));
  document.querySelectorAll("[data-img]").forEach((box) => {
    box.querySelector("input[type=file]").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      const err = box.querySelector(".err"); err.textContent = "";
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return (err.textContent = "الصيغ المسموحة: JPG أو PNG أو WEBP.");
      if (file.size > 5 * 1024 * 1024) return (err.textContent = "الحد الأقصى لحجم الصورة 5 ميجابايت.");
      err.textContent = "جارٍ الرفع...";
      const path = `${crypto.randomUUID()}.${file.type.split("/")[1]}`;
      const { error } = await db.storage.from(BUCKET).upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (error) return (err.textContent = "فشل الرفع: " + error.message);
      const url = db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
      const key = box.dataset.img; key === "main" ? (draft.image = url) : (draft.variants[+key.slice(1)].image = url);
      err.textContent = ""; const im = box.querySelector("img"); im.src = url; im.classList.remove("hidden");
    };
  });
  $("#pform").onsubmit = save;
}
function rerenderForm() { $("#view").innerHTML = form(); bindForm(); }

async function save(e) {
  e.preventDefault(); syncDraft();
  document.querySelectorAll(".err").forEach((x) => { if (x.textContent !== "جارٍ الرفع...") x.textContent = ""; });
  let ok = true; const setErr = (el, m) => { el.textContent = m; ok = false; };
  if (!draft.name.trim()) setErr($('[data-e="name"]'), "اسم المنتج مطلوب.");
  if (!draft.image) setErr($('[data-e="image"]'), "الصورة الرئيسية مطلوبة.");
  document.querySelectorAll("[data-variant]").forEach((el, i) => {
    const v = draft.variants[i], errs = el.querySelectorAll(".err");
    if (!v.weight.trim()) setErr(errs[0], "الحجم مطلوب.");
    const n = Number(String(v.price).replace(",", "."));
    if (String(v.price).trim() === "" || !isFinite(n) || n <= 0) setErr(errs[1], "أدخل سعراً صحيحاً أكبر من صفر.");
  });
  if (!ok) return toast("راجع الحقول المطلوبة", false);
  const variants = draft.variants.map((v) => ({ weight: v.weight.trim(), price: Number(String(v.price).replace(",", ".")), image: v.image || draft.image }));
  const isNew = !draft.id;
  const p = { ...draft, name: draft.name.trim(), variants, id: draft.id || "p" + Date.now().toString(36), categoryLabel: CATEGORIES[draft.category], badge: CATEGORIES[draft.category], sortOrder: draft.sortOrder ?? products.length };
  $("#save").disabled = true;
  const { error } = await db.from("products").upsert(toRow(p));
  if (error) { $("#save").disabled = false; return toast("تعذر الحفظ: " + error.message, false); }
  await loadProducts(); toast(isNew ? "تمت إضافة المنتج بنجاح" : "تم حفظ التعديلات بنجاح"); go("products");
}

function confirmDelete(p) {
  $("#modal-name").textContent = p.name; $("#modal").classList.remove("hidden");
  const close = () => $("#modal").classList.add("hidden");
  $("#m-cancel").onclick = close;
  $("#m-ok").onclick = async () => {
    const { error } = await db.from("products").delete().eq("id", p.id); close();
    if (error) return toast("تعذر الحذف: " + error.message, false);
    await loadProducts(); toast("تم حذف المنتج"); go("products");
  };
}
if (configured) db.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT" && !$("#app").classList.contains("hidden")) show("#login"); });
boot();
