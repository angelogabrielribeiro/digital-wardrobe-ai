import * as XLSX from "xlsx";
import {
  parseCsv,
  parseCsvToRecords,
  productsFromRecords,
  detectOptionQuestions,
  scoreHeaders,
  type CsvRecord,
  type OptionQuestion,
  type OptionRoleOverrides,
  type ParsedProduct,
} from "./csv";

const MAX_FILE_BYTES = 12 * 1024 * 1024;
const MAX_DATA_ROWS = 5000;

// Sheet name (normalized) → skip when looking for "Products".
const SKIP_SHEET_NAMES = new Set<string>([
  "export summary", "summary", "resumo", "instructions", "instrucoes",
  "cover", "capa", "readme", "notes", "log", "changelog",
]);

function normalizeSheetName(v: string): string {
  return v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export type SpreadsheetRead = {
  records: CsvRecord[];
  sheetName: string;
  questions: OptionQuestion[];
};

export class SpreadsheetError extends Error {
  code:
    | "too_large"
    | "too_many_rows"
    | "empty"
    | "no_products_sheet"
    | "no_name_column"
    | "read_failed";
  extra?: Record<string, unknown>;
  constructor(code: SpreadsheetError["code"], message: string, extra?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.extra = extra;
  }
}

export function isSupportedSpreadsheet(file: File): boolean {
  if (file.size > MAX_FILE_BYTES) return false;
  const n = file.name.toLowerCase();
  return n.endsWith(".csv") || n.endsWith(".xlsx") || n.endsWith(".xls") || n.endsWith(".xlsm");
}

/**
 * Reads an Excel or CSV file, picks the correct sheet, converts to normalized
 * records, and precomputes ambiguous option questions. Never publishes on its
 * own — callers should confirm questions then call `buildProducts`.
 */
export async function readSpreadsheet(file: File): Promise<SpreadsheetRead> {
  if (file.size > MAX_FILE_BYTES) {
    throw new SpreadsheetError(
      "too_large",
      "Este arquivo passa de 12 MB. Reduza a planilha ou divida em dois arquivos.",
    );
  }

  const name = file.name.toLowerCase();
  const isExcel =
    name.endsWith(".xlsx") || name.endsWith(".xls") || name.endsWith(".xlsm") ||
    file.type.includes("spreadsheet") || file.type.includes("excel");

  let records: CsvRecord[] = [];
  let sheetName = "";

  if (isExcel) {
    let wb: XLSX.WorkBook;
    try {
      const buf = await file.arrayBuffer();
      wb = XLSX.read(buf, { type: "array" });
    } catch {
      throw new SpreadsheetError("read_failed", "Não conseguimos abrir esta planilha.");
    }
    const chosen = pickProductsSheet(wb);
    if (!chosen) {
      throw new SpreadsheetError(
        "no_products_sheet",
        "Não encontramos uma aba com produtos.",
        { sheets: wb.SheetNames },
      );
    }
    sheetName = chosen.name;
    const csv = XLSX.utils.sheet_to_csv(chosen.sheet, { FS: ",", blankrows: false });
    records = parseCsvToRecords(csv);
  } else {
    const text = await file.text();
    records = parseCsvToRecords(text);
    sheetName = file.name;
  }

  // Drop fully empty rows.
  records = records.filter((r) => Object.values(r).some((v) => v && String(v).trim().length > 0));

  if (records.length === 0) {
    throw new SpreadsheetError("empty", "A planilha parece estar vazia.");
  }
  if (records.length > MAX_DATA_ROWS) {
    throw new SpreadsheetError(
      "too_many_rows",
      "Essa planilha possui mais de 5.000 linhas. Para manter a importação rápida, divida o catálogo em dois arquivos.",
    );
  }

  // Ensure we can find at least one product row (has a recognizable name).
  const firstProducts = productsFromRecords(records);
  if (firstProducts.length === 0) {
    throw new SpreadsheetError(
      "no_name_column",
      "Não encontramos uma coluna de nome do produto. Verifique se sua planilha tem uma coluna como Nome, Título ou Title.",
    );
  }

  const questions = detectOptionQuestions(records);
  return { records, sheetName, questions };
}

/** Applies user's confirmations (or none) and returns final ParsedProducts. */
export function buildProducts(
  records: CsvRecord[],
  overrides?: OptionRoleOverrides,
): ParsedProduct[] {
  return productsFromRecords(records, overrides);
}

/** Back-compat wrapper (no sheet-detection UX; throws technical Errors). */
export async function parseSpreadsheetFile(file: File): Promise<ParsedProduct[]> {
  const read = await readSpreadsheet(file);
  return buildProducts(read.records);
}

// keep parseCsv exported for anyone who still needs it
export { parseCsv };

/* ─────────────────────────── Sheet auto-detect ─────────────────────────── */

function pickProductsSheet(wb: XLSX.WorkBook): { name: string; sheet: XLSX.WorkSheet } | null {
  const names = wb.SheetNames.filter((n) => n && wb.Sheets[n]);
  if (names.length === 0) return null;

  // 1) exact "Products" wins.
  const exact = names.find((n) => normalizeSheetName(n) === "products");
  if (exact) return { name: exact, sheet: wb.Sheets[exact] };

  // 2) score each non-skip sheet by header recognition.
  type Cand = { name: string; sheet: XLSX.WorkSheet; score: number };
  const candidates: Cand[] = [];
  for (const name of names) {
    if (SKIP_SHEET_NAMES.has(normalizeSheetName(name))) continue;
    const sheet = wb.Sheets[name];
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ",", blankrows: false });
    const firstLine = csv.split(/\r?\n/, 1)[0] ?? "";
    const headers = firstLine.split(",").map((s) => s.trim());
    const score = scoreHeaders(headers);
    candidates.push({ name, sheet, score });
  }
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  if (best && best.score >= 2) return { name: best.name, sheet: best.sheet };

  // 3) fallback: first sheet if nothing scored.
  const first = names[0];
  return { name: first, sheet: wb.Sheets[first] };
}
