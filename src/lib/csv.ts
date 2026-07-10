import type { ProductInput, StudioCategory } from "./db";

/**
 * Minimal CSV parser (handles quoted fields with "" escapes and commas or semicolons).
 * Expected headers (case-insensitive, accents ignored):
 *   nome, categoria, preco, descricao, imagem, sku, buy_url
 */
export function parseCsv(text: string): ProductInput[] {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").trim();
  if (!cleaned) return [];
  const delim = detectDelimiter(cleaned);
  const rows = splitRows(cleaned, delim);
  if (rows.length < 2) return [];
  const headers = rows[0].map(normalizeHeader);
  const idx = (name: string) => headers.indexOf(name);
  const iName = idx("nome");
  const iCat = idx("categoria");
  const iPrice = idx("preco");
  const iDesc = idx("descricao");
  const iImg = idx("imagem");
  const iSku = idx("sku");
  const iBuy = idx("buy_url");

  const out: ProductInput[] = [];
  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    const name = (iName >= 0 ? row[iName] : row[0] ?? "").trim();
    if (!name) continue;
    const price = parsePrice(iPrice >= 0 ? row[iPrice] : "0");
    out.push({
      name,
      category: normalizeCategory(iCat >= 0 ? row[iCat] : ""),
      price,
      description: iDesc >= 0 ? row[iDesc]?.trim() || undefined : undefined,
      image: iImg >= 0 ? row[iImg]?.trim() || undefined : undefined,
      sku: iSku >= 0 ? row[iSku]?.trim() || undefined : undefined,
      buyUrl: iBuy >= 0 ? row[iBuy]?.trim() || undefined : undefined,
    });
  }
  return out;
}

function detectDelimiter(text: string): string {
  const first = text.split("\n", 1)[0];
  const comma = (first.match(/,/g) ?? []).length;
  const semi = (first.match(/;/g) ?? []).length;
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

function parsePrice(v: string | undefined): number {
  if (!v) return 0;
  const cleaned = v.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeCategory(v: string): StudioCategory {
  const n = v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (["inferior", "calca", "bermuda", "saia", "short"].some((k) => n.includes(k))) return "inferior";
  if (["vestido", "macacao", "peca-unica", "peca_unica", "peca"].some((k) => n.includes(k))) return "peca-unica";
  if (["tenis", "sapato", "calcado"].some((k) => n.includes(k))) return "calcados";
  if (["bolsa", "acessor"].some((k) => n.includes(k))) return "acessorios";
  return "superior";
}
