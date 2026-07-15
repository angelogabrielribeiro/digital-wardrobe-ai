import * as XLSX from "xlsx";
import { parseCsv, type ParsedProduct } from "./csv";

/**
 * Lê planilha (Excel .xlsx/.xls/.xlsm ou CSV) e devolve produtos já
 * agrupados com variantes visuais e tamanhos consolidados.
 */
export async function parseSpreadsheetFile(file: File): Promise<ParsedProduct[]> {
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

const MAX_FILE_BYTES = 12 * 1024 * 1024;

export function isSupportedSpreadsheet(file: File): boolean {
  if (file.size > MAX_FILE_BYTES) return false;
  const n = file.name.toLowerCase();
  return (
    n.endsWith(".csv") ||
    n.endsWith(".xlsx") ||
    n.endsWith(".xls") ||
    n.endsWith(".xlsm")
  );
}
