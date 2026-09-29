// Shared by the public site and the admin dashboard: one data source.
(function () {
  const cfg = window.SUPABASE_CONFIG || {};
  const configured = !!(cfg.url && cfg.anonKey && window.supabase);
  // Keep only the origin so a pasted "/rest/v1/" or trailing slash can't break requests
let baseUrl = cfg.url;
try { baseUrl = new URL(String(cfg.url).trim()).origin; } catch (e) {}
const client = configured ? window.supabase.createClient(baseUrl, String(cfg.anonKey).trim()) : null;

  // DB row -> object shape used by the existing storefront code
  const fromRow = (r) => ({
    id: r.id, name: r.name, description: r.description || "",
    category: r.category, categoryLabel: r.category_label, badge: r.badge || r.category_label,
    price: Number(r.price), weight: r.weight, image: r.image,
    rating: Number(r.rating || 0), reviewsCount: r.reviews_count || 0,
    spicyLevel: r.spicy_level ?? 3, ingredients: r.ingredients || [],
    variants: (r.variants || []).map((v) => ({ ...v, price: Number(v.price) })),
    available: r.available !== false, sortOrder: r.sort_order || 0,
  });
  // object -> DB row (price/weight mirror the first variant so legacy code keeps working)
  const toRow = (p) => {
    const first = p.variants[0];
    return {
      id: p.id, name: p.name, description: p.description,
      category: p.category, category_label: p.categoryLabel, badge: p.badge || p.categoryLabel,
      price: first.price, weight: first.weight, image: p.image || first.image,
      rating: p.rating || 0, reviews_count: p.reviewsCount || 0, spicy_level: p.spicyLevel ?? 3,
      ingredients: p.ingredients || [], variants: p.variants,
      available: p.available !== false, sort_order: p.sortOrder || 0,
    };
  };

  async function fetchProducts() {
    if (!client) { // Supabase not configured yet: keep the site working from the bundled seed
      const res = await fetch("products-seed.json");
      return (await res.json()).map((p, i) => ({ available: true, sortOrder: i, ...p }));
    }
    const { data, error } = await client.from("products").select("*").order("sort_order").order("created_at");
    if (error) throw error;
    return data.map(fromRow);
  }

  window.ProductsAPI = { client, configured, fromRow, toRow, fetchProducts };
})();
