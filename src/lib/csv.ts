import type { StudioCategory } from "./db";

/**
 * Flexible catalog importer. Understands:
 *  - Shopify/Matrixify exports (Handle + Title + Option{1,2,3} Name/Value + Variant Image + Image Src).
 *  - Generic spreadsheets with aliased headers (nome/produto/title, preco/price, imagem/image src, etc.).
 *
 * Produces one ParsedProduct per real product, with visual variants grouped and
 * sizes consolidated. Never emits one product per size.
 */

export type VariantKind = "color" | "pattern" | "style" | "visual" | "other";
export type OptionRole = "size" | "visual" | "ignore";

/** Override map keyed by NORMALIZED option name (lowercased, no accents). */
export type OptionRoleOverrides = Record<string, { role: OptionRole; kind?: VariantKind }>;

export type OptionQuestion = {
  /** Original display name of the option. */
  name: string;
  normalizedName: string;
  values: Array<{ value: string; image?: string }>;
  suggestedRole: OptionRole;
  suggestedKind: VariantKind;
  imagesVary: boolean;
};

export type ParsedVariant = {
  source_option_name?: string;
  source_option_value?: string;
  display_name: string;
  option_kind: VariantKind;
  image?: string;
  price?: number;
  sku?: string;
  buyUrl?: string;
  sizes: string[];
};

export type ParsedProduct = {
  name: string;
  category: StudioCategory;
  price: number;
  description?: string;
  image?: string;
  sku?: string;
  buyUrl?: string;
  sizes: string[];
  variants: ParsedVariant[];
};

/* ─────────────────────────── CSV lex ─────────────────────────── */

export function parseCsv(text: string, overrides?: OptionRoleOverrides): ParsedProduct[] {
  const records = parseCsvToRecords(text);
  return productsFromRecords(records, overrides);
}

/** Public: convert raw CSV text to normalized records (header-keyed). */
export function parseCsvToRecords(text: string): CsvRecord[] {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  const delim = detectDelimiter(cleaned);
  const rows = splitRows(cleaned, delim);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  return rows.slice(1).map((r) => rowToRecord(headers, r));
}

function detectDelimiter(text: string): string {
  const first = text.split("\n", 1)[0];
  const comma = (first.match(/,/g) ?? []).length;
  const semi = (first.match(/;/g) ?? []).length;
  const tab = (first.match(/\t/g) ?? []).length;
  if (tab > comma && tab > semi) return "\t";
  return semi > comma ? ";" : ",";
}

function splitRows(text: string, delim: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = "";
  let inQuote = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuote) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuote = false; }
      } else field += c;
    } else {
      if (c === '"') inQuote = true;
      else if (c === delim) { cur.push(field); field = ""; }
      else if (c === "\n") { cur.push(field); rows.push(cur); cur = []; field = ""; }
      else field += c;
    }
  }
  cur.push(field);
  rows.push(cur);
  return rows.filter((r) => r.some((v) => v.trim().length > 0));
}

function normalizeHeader(v: string): string {
  return v
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

export type CsvRecord = { [key: string]: string };

function rowToRecord(headers: string[], row: string[]): CsvRecord {
  const r: CsvRecord = {};
  for (let i = 0; i < headers.length; i++) {
    r[headers[i]] = (row[i] ?? "").trim();
  }
  return r;
}

/* ─────────────────────────── Header aliases ─────────────────────────── */

const H = {
  handle: ["handle", "product_handle", "id", "product_id"],
  name: ["nome", "produto", "name", "title", "product_title", "product_name"],
  price: ["preco", "preço", "price", "variant_price", "valor"],
  image: ["imagem", "image", "image_src", "image_url", "foto", "picture", "photo"],
  variantImage: ["variant_image", "variant_image_url", "imagem_variante"],
  link: ["url", "link", "buy_url", "product_url", "link_de_compra", "product_link"],
  sku: ["sku", "variant_sku", "codigo", "código", "code"],
  category: ["categoria", "category", "type", "product_type", "tipo"],
  description: ["descricao", "descrição", "description", "body_(html)", "body_html"],
  imagePosition: ["image_position"],
  size: ["tamanho", "size", "asian_size", "eu_size", "us_size"],
  color: ["cor", "color", "colour", "photo_color"],
  pattern: ["estampa", "pattern", "print"],
  style: ["modelo", "style", "design"],
};

/** Known product-related headers for sheet-scoring. */
export const RECOGNIZED_HEADERS = new Set<string>([
  ...H.handle, ...H.name, ...H.price, ...H.image, ...H.variantImage,
  ...H.link, ...H.sku, ...H.category, ...H.description,
  ...H.size, ...H.color, ...H.pattern, ...H.style,
  "option1_name", "option1_value", "option2_name", "option2_value", "option3_name", "option3_value",
]);

/** Score a header row by how many recognized product-headers it contains. */
export function scoreHeaders(headers: string[]): number {
  let s = 0;
  for (const h of headers) if (RECOGNIZED_HEADERS.has(normalizeHeader(h))) s++;
  return s;
}

function pick(rec: CsvRecord, keys: string[]): string {
  for (const k of keys) if (rec[k] !== undefined && rec[k] !== "") return rec[k];
  return "";
}

/* ─────────────────────────── Records → products ─────────────────────────── */

export function productsFromRecords(
  records: CsvRecord[],
  overrides?: OptionRoleOverrides,
): ParsedProduct[] {
  if (records.length === 0) return [];
  const first = records[0];
  const hasHandle = H.handle.some((k) => k in first);
  const hasOption = ["option1_name", "option2_name", "option3_name"].some((k) => k in first);

  if (hasHandle && hasOption) return parseShopify(records, overrides ?? {});
  return parseGeneric(records);
}

/**
 * Detect Option{N} columns whose role is unclear (name doesn't obviously mean
 * "size" or "color/pattern/style/photo"). One question per option NAME (not per
 * option index) so we don't ask twice for the same column across products.
 */
export function detectOptionQuestions(records: CsvRecord[]): OptionQuestion[] {
  if (records.length === 0) return [];
  const first = records[0];
  const hasOption = ["option1_name", "option2_name", "option3_name"].some((k) => k in first);
  if (!hasOption) return [];

  // group rows by handle so we can decide "images vary" per product
  const groupsByName = new Map<string, {
    original: string;
    values: Map<string, string | undefined>; // value → image (last seen)
    imagesVary: boolean;
    _imgs: Set<string>;
  }>();

  for (const rec of records) {
    for (const i of [1, 2, 3]) {
      const rawName = (rec[`option${i}_name`] ?? "").trim();
      const value = (rec[`option${i}_value`] ?? "").trim();
      if (!rawName || !value) continue;
      const n = normalizeText(rawName);
      // Skip clearly-named options.
      if (isSizeName(n) || isVisualName(n)) continue;
      const img = pick(rec, H.variantImage) || undefined;
      let g = groupsByName.get(n);
      if (!g) {
        g = { original: rawName, values: new Map(), imagesVary: false, _imgs: new Set() };
        groupsByName.set(n, g);
      }
      if (!g.values.has(value)) g.values.set(value, img);
      if (img) g._imgs.add(img);
    }
  }

  const out: OptionQuestion[] = [];
  for (const [n, g] of groupsByName) {
    // If overrides already set for this name we don't ask.
    const values = Array.from(g.values.entries()).map(([value, image]) => ({ value, image }));
    const imagesVary = g._imgs.size > 1;
    // Suggest: images vary → likely a visual (color); otherwise size only when values look size-y.
    const allSizeLike = values.length > 0 && values.every((v) => looksLikeSize(v.value));
    const suggestedRole: OptionRole = imagesVary ? "visual" : (allSizeLike ? "size" : "visual");
    const suggestedKind: VariantKind = imagesVary ? "color" : "visual";
    out.push({
      name: g.original,
      normalizedName: n,
      values,
      suggestedRole,
      suggestedKind,
      imagesVary,
    });
  }
  return out;
}

/* ─────────────────────────── Shopify / Matrixify ─────────────────────────── */

function parseShopify(records: CsvRecord[], overrides: OptionRoleOverrides): ParsedProduct[] {
  const groups = new Map<string, CsvRecord[]>();
  let currentHandle = "";
  for (const rec of records) {
    const h = pick(rec, H.handle) || currentHandle;
    if (!h) continue;
    currentHandle = h;
    const list = groups.get(h) ?? [];
    list.push(rec);
    groups.set(h, list);
  }

  const products: ParsedProduct[] = [];
  for (const [handle, group] of groups) {
    const seed = group.find((r) => pick(r, H.name).trim()) ?? group[0];
    const name = pick(seed, H.name) || handle;
    if (!name) continue;

    const mainImage = pickMainImage(group);
    const category = normalizeCategory(pick(seed, H.category));
    const description = pick(seed, H.description) || undefined;
    const buyUrl = pick(seed, H.link) || undefined;

    // Decide role of each Option{N} column for this handle (applies overrides).
    const optionRoles = classifyShopifyOptions(group, overrides);

    type Bucket = ParsedVariant & { _key: string };
    const buckets = new Map<string, Bucket>();
    const productSizes = new Set<string>();
    let seedPrice = 0;
    let seedSku: string | undefined;

    for (const rec of group) {
      const opts = readShopifyOptions(rec);
      const variantImage = pick(rec, H.variantImage) || undefined;
      const rowPrice = parsePrice(pick(rec, H.price));
      const rowSku = pick(rec, H.sku) || undefined;

      // Sizes for this row.
      const sizeVals: string[] = [];
      for (let i = 0; i < opts.length; i++) {
        if (optionRoles[i]?.role === "size" && opts[i].value) sizeVals.push(opts[i].value);
      }
      const explicitSize = pick(rec, H.size);
      if (explicitSize) sizeVals.push(explicitSize);

      // Visual key.
      const visualParts: Array<{ name: string; value: string; kind: VariantKind }> = [];
      for (let i = 0; i < opts.length; i++) {
        if (optionRoles[i]?.role === "visual" && opts[i].value) {
          visualParts.push({
            name: opts[i].name,
            value: opts[i].value,
            kind: optionRoles[i]?.kind ?? guessKindFromName(opts[i].name),
          });
        }
      }

      if (visualParts.length === 0) {
        for (const s of sizeVals) productSizes.add(s);
        if (!seedPrice && rowPrice > 0) seedPrice = rowPrice;
        if (!seedSku && rowSku) seedSku = rowSku;
        continue;
      }

      const key = visualParts.map((v) => v.value.toLowerCase()).join("|") + "|" + (variantImage ?? "");
      const existing = buckets.get(key);
      const displayName = visualParts.map((v) => v.value).join(" / ");
      const primary = visualParts[0];

      if (!existing) {
        buckets.set(key, {
          _key: key,
          source_option_name: primary.name,
          source_option_value: primary.value,
          display_name: displayName,
          option_kind: primary.kind,
          image: variantImage || mainImage,
          price: rowPrice > 0 ? rowPrice : undefined,
          sku: rowSku,
          buyUrl,
          sizes: [],
        });
      }
      const b = buckets.get(key)!;
      for (const s of sizeVals) if (!b.sizes.includes(s)) b.sizes.push(s);
      if (!seedPrice && rowPrice > 0) seedPrice = rowPrice;
    }

    const variants = Array.from(buckets.values()).map(({ _key, ...v }) => v);

    products.push({
      name,
      category,
      price: seedPrice || parsePrice(pick(seed, H.price)),
      description,
      image: mainImage,
      sku: seedSku,
      buyUrl,
      sizes: Array.from(productSizes),
      variants,
    });
  }

  return products;
}

function pickMainImage(group: CsvRecord[]): string | undefined {
  const withPos = group
    .map((r) => ({ img: pick(r, H.image), pos: parseInt(pick(r, H.imagePosition), 10) }))
    .filter((x) => x.img);
  const pos1 = withPos.find((x) => x.pos === 1);
  if (pos1) return pos1.img;
  return withPos[0]?.img || undefined;
}

type ShopifyOption = { name: string; value: string };

function readShopifyOptions(rec: CsvRecord): ShopifyOption[] {
  const out: ShopifyOption[] = [];
  for (const i of [1, 2, 3]) {
    const name = rec[`option${i}_name`] ?? "";
    const value = rec[`option${i}_value`] ?? "";
    if (name || value) out.push({ name: name.trim(), value: value.trim() });
  }
  return out;
}

type Role = { role: OptionRole; kind?: VariantKind };

/**
 * Priority:
 *  1) User override by option name → wins.
 *  2) Option name matches a known size keyword → size.
 *  3) Option name matches a known visual keyword → visual (kind inferred).
 *  4) Values look like sizes AND no image varies with the option → size.
 *  5) Default → visual.
 */
function classifyShopifyOptions(group: CsvRecord[], overrides: OptionRoleOverrides): Array<Role> {
  const roles: Array<Role> = [{ role: "visual" }, { role: "visual" }, { role: "visual" }];
  for (const i of [0, 1, 2]) {
    const nameSample =
      group.find((r) => (r[`option${i + 1}_name`] ?? "").trim())?.[`option${i + 1}_name`] ?? "";
    const n = normalizeText(nameSample);
    if (!n) { roles[i] = { role: "visual" }; continue; }

    const override = overrides[n];
    if (override) { roles[i] = { role: override.role, kind: override.kind }; continue; }

    if (isSizeName(n)) { roles[i] = { role: "size" }; continue; }
    if (isVisualName(n)) { roles[i] = { role: "visual", kind: guessKindFromName(n) }; continue; }

    const values = group.map((r) => (r[`option${i + 1}_value`] ?? "").trim()).filter(Boolean);
    const uniq = Array.from(new Set(values));
    const allSize = uniq.length > 0 && uniq.every((v) => looksLikeSize(v));
    const imagesVary = new Set(group.map((r) => pick(r, H.variantImage))).size > 1;
    roles[i] = { role: allSize && !imagesVary ? "size" : "visual" };
  }
  return roles;
}

/* ─────────────────────────── Generic (non-Shopify) ─────────────────────────── */

function parseGeneric(records: CsvRecord[]): ParsedProduct[] {
  const out: ParsedProduct[] = [];
  for (const rec of records) {
    const name = pick(rec, H.name).trim();
    if (!name) continue;
    const price = parsePrice(pick(rec, H.price));
    const image = pick(rec, H.image) || undefined;
    const sku = pick(rec, H.sku) || undefined;
    const buyUrl = pick(rec, H.link) || undefined;

    const colorVal = pick(rec, H.color);
    const patternVal = pick(rec, H.pattern);
    const styleVal = pick(rec, H.style);
    const sizeVal = pick(rec, H.size);
    const variants: ParsedVariant[] = [];
    if (colorVal) variants.push(makeVariant("Cor", colorVal, "color", image));
    else if (patternVal) variants.push(makeVariant("Estampa", patternVal, "pattern", image));
    else if (styleVal) variants.push(makeVariant("Modelo", styleVal, "style", image));

    out.push({
      name,
      category: normalizeCategory(pick(rec, H.category)),
      price,
      description: pick(rec, H.description) || undefined,
      image,
      sku,
      buyUrl,
      sizes: sizeVal ? [sizeVal] : [],
      variants,
    });
  }
  const merged = new Map<string, ParsedProduct>();
  for (const p of out) {
    const key = `${p.name}::${p.category}`;
    const cur = merged.get(key);
    if (!cur) { merged.set(key, p); continue; }
    for (const s of p.sizes) if (!cur.sizes.includes(s)) cur.sizes.push(s);
    for (const v of p.variants) {
      const dupe = cur.variants.find((x) => x.display_name.toLowerCase() === v.display_name.toLowerCase());
      if (!dupe) cur.variants.push(v);
    }
    if (!cur.image && p.image) cur.image = p.image;
    if (!cur.price && p.price) cur.price = p.price;
  }
  return Array.from(merged.values());
}

function makeVariant(name: string, value: string, kind: VariantKind, image?: string): ParsedVariant {
  return {
    source_option_name: name,
    source_option_value: value,
    display_name: value,
    option_kind: kind,
    image,
    sizes: [],
  };
}

/* ─────────────────────────── Helpers ─────────────────────────── */

function normalizeText(v: string): string {
  return v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function guessKindFromName(name: string): VariantKind {
  const n = normalizeText(name);
  if (/(cor|color|colour)/.test(n)) return "color";
  if (/(estampa|pattern|print)/.test(n)) return "pattern";
  if (/(modelo|style|design)/.test(n)) return "style";
  return "visual";
}

function isSizeName(n: string): boolean {
  return /(tamanho|size|talla|talle)/.test(n);
}
function isVisualName(n: string): boolean {
  return /(cor|color|colour|estampa|pattern|print|modelo|style|design|photo)/.test(n);
}

const SIZE_TOKENS = new Set([
  "pp", "p", "m", "g", "gg", "ggg",
  "xs", "s", "l", "xl", "xxl", "3xl", "4xl", "5xl",
  "unico", "único", "one size", "onesize", "u",
]);

function looksLikeSize(v: string): boolean {
  const n = normalizeText(v);
  if (SIZE_TOKENS.has(n)) return true;
  if (/^\d{2}$/.test(n)) {
    const num = parseInt(n, 10);
    if (num >= 28 && num <= 60) return true;
  }
  if (/^(eu|us|br)\s?\d+$/.test(n)) return true;
  if (/^asian\s?size/.test(n)) return true;
  return false;
}

function parsePrice(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeCategory(v: string): StudioCategory {
  const n = normalizeText(v);
  if (["inferior", "calca", "bermuda", "saia", "short", "pants", "shorts", "skirt"].some((k) => n.includes(k))) return "inferior";
  if (["vestido", "macacao", "peca-unica", "peca_unica", "dress", "jumpsuit"].some((k) => n.includes(k))) return "peca-unica";
  if (["tenis", "sapato", "calcado", "shoes", "sneaker"].some((k) => n.includes(k))) return "calcados";
  if (["bolsa", "acessor", "bag", "accessor"].some((k) => n.includes(k))) return "acessorios";
  return "superior";
}
