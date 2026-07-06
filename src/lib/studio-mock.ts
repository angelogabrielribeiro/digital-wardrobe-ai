export type StudioCategory = "superior" | "inferior" | "peca-unica" | "calcados" | "acessorios";

export type StudioProduct = {
  id: string;
  name: string;
  category: StudioCategory;
  price: number;
  sku?: string;
  image: string;
  buyUrl?: string;
  status: "pronto" | "revisar" | "sem-imagem";
  stats: { views: number; tryons: number; saves: number; buyClicks: number };
};

export const CATEGORY_LABEL: Record<StudioCategory, string> = {
  superior: "Superior",
  inferior: "Inferior",
  "peca-unica": "Peça única",
  calcados: "Calçados",
  acessorios: "Acessórios",
};

export const PRO_CATEGORIES: StudioCategory[] = ["calcados", "acessorios"];

export const KPIS = {
  views: 2384,
  looks: 917,
  triedProducts: 431,
  buyClicks: 128,
  estimatedSalesBRL: 12480,
  intentRatePct: 18,
};

export const CATEGORY_INTEREST: Array<{ label: string; pct: number }> = [
  { label: "Jaquetas", pct: 42 },
  { label: "Vestidos", pct: 31 },
  { label: "Calças", pct: 18 },
  { label: "Tênis", pct: 9 },
];

export const FORGOTTEN: Array<{ name: string; tests: number }> = [
  { name: "Camisa Xadrez", tests: 0 },
  { name: "Bermuda Cargo", tests: 2 },
  { name: "Moletom Cinza", tests: 3 },
];

export const WEEK_INSIGHTS = {
  topProduct: { name: "Jaqueta Jeans", growthPct: 84 },
  hotCategory: { name: "Jaquetas", sharePct: 42 },
  forgotten: { name: "Camisa Xadrez", tests: 0 },
  recommendation:
    "Destaque a Jaqueta Jeans na vitrine ou no WhatsApp. Ela está gerando mais interesse que a média.",
};

const img = (seed: string) =>
  `https://images.unsplash.com/photo-${seed}?auto=format&fit=crop&w=600&q=70`;

export const MOCK_PRODUCTS: StudioProduct[] = [
  {
    id: "p1",
    name: "Jaqueta Jeans",
    category: "superior",
    price: 289.9,
    sku: "JQ-001",
    image: img("1601333144130-8cbb312386b6"),
    buyUrl: "https://loja.exemplo/jaqueta-jeans",
    status: "pronto",
    stats: { views: 417, tryons: 132, saves: 48, buyClicks: 19 },
  },
  {
    id: "p2",
    name: "Camisa Branca",
    category: "superior",
    price: 149.0,
    sku: "CB-014",
    image: img("1602810318383-e386cc2a3ccf"),
    status: "pronto",
    stats: { views: 300, tryons: 93, saves: 27, buyClicks: 11 },
  },
  {
    id: "p3",
    name: "Calça Cargo",
    category: "inferior",
    price: 219.5,
    sku: "CC-022",
    image: img("1594633312681-425c7b97ccd1"),
    status: "pronto",
    stats: { views: 250, tryons: 81, saves: 22, buyClicks: 8 },
  },
  {
    id: "p4",
    name: "Vestido Midi",
    category: "peca-unica",
    price: 349.0,
    sku: "VM-007",
    image: img("1520367445093-50dc08a59d9d"),
    status: "revisar",
    stats: { views: 180, tryons: 55, saves: 14, buyClicks: 4 },
  },
  {
    id: "p5",
    name: "Camisa Xadrez",
    category: "superior",
    price: 179.0,
    sku: "CX-003",
    image: img("1618354691373-d851c5c3a990"),
    status: "sem-imagem",
    stats: { views: 22, tryons: 0, saves: 0, buyClicks: 0 },
  },
];

export type CatalogRow = {
  id: string;
  name: string;
  category: StudioCategory;
  price: number;
  sku?: string;
  image?: string;
  buyUrl?: string;
  status: "pronto" | "revisar" | "sem-imagem";
};

export const MOCK_IMPORT_ROWS: CatalogRow[] = [
  { id: "r1", name: "Jaqueta Corduroy", category: "superior", price: 329, sku: "JC-101", image: img("1591047139829-d91aecb6caea"), buyUrl: "https://loja.exemplo/jc-101", status: "pronto" },
  { id: "r2", name: "Camiseta Oversized", category: "superior", price: 89, sku: "CO-210", image: img("1521572163474-6864f9cf17ab"), status: "pronto" },
  { id: "r3", name: "Calça Wide Leg", category: "inferior", price: 259, sku: "CW-330", image: img("1591195853828-11db59a44f6b"), status: "revisar" },
  { id: "r4", name: "Vestido Slip", category: "peca-unica", price: 399, sku: "VS-441", image: img("1503342217505-b0a15ec3261c"), status: "pronto" },
  { id: "r5", name: "Blazer Alfaiataria", category: "superior", price: 549, sku: "BA-552", status: "sem-imagem" },
];
