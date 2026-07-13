import * as XLSX from "xlsx";
import { parseCsv } from "./csv";
import type { ProductInput } from "./db";

/**
 * Lê um arquivo enviado pelo lojista (Excel .xlsx/.xls ou CSV) e devolve
 * a lista de produtos normalizada. Excel é convertido para CSV via SheetJS
 * e reutiliza o mesmo parser (mesmos cabeçalhos, mesma normalização).
 */
export async function parseSpreadsheetFile(file: File): Promise<ProductInput[]> {
  const name = file.name.toLowerCase();
  const isExcel =
    name.endsWith(".xlsx") ||
    name.endsWith(".xls") ||
    name.endsWith(".xlsm") ||
    file.type.includes("spreadsheet") ||
    file.type.includes("excel");

  if (isExcel) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheetName = wb.SheetNames[0];
    if (!sheetName) return [];
    const sheet = wb.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ",", blankrows: false });
    return parseCsv(csv);
  }

  const text = await file.text();
  return parseCsv(text);
}

export function isSupportedSpreadsheet(file: File): boolean {
  const n = file.name.toLowerCase();
  return (
    n.endsWith(".csv") ||
    n.endsWith(".xlsx") ||
    n.endsWith(".xls") ||
    n.endsWith(".xlsm")
  );
}
