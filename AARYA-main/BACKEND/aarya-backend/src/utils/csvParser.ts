import XLSX from 'xlsx';

// ============================================================
// CSV / Excel Parser Utility
// ============================================================
// Uses SheetJS (xlsx v0.18.5, last Apache-2.0 release) to parse
// both CSV and Excel files from an in-memory Buffer.
// Always reads the first sheet.
// ============================================================

export interface ParsedFile {
  /** All header column names as they appear in the file. */
  headers: string[];
  /** All data rows as string maps (header → cell value as string). */
  rows: Record<string, string>[];
}

/**
 * Parse a CSV or Excel file Buffer into headers + rows.
 *
 * @param buffer   The file content from multer memoryStorage.
 * @param mimetype The MIME type (used to hint the parser for edge cases).
 */
export function parseFileBuffer(buffer: Buffer, mimetype: string): ParsedFile {
  // Determine read options based on MIME type
  const isCSV = mimetype.includes('csv') || mimetype === 'text/plain';

  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,              // Parse date cells as JS Date objects
    cellNF: false,                // Don't apply number formats (we keep raw values)
    cellText: false,              // Don't generate text representations
    raw: false,                   // Apply date and number formatting
    ...(isCSV ? { type: 'buffer' } : {}),
  });

  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new Error('The uploaded file contains no sheets.');
  }

  const worksheet = workbook.Sheets[sheetName];

  // sheet_to_json with { header: 1 } gives us raw arrays; with defval: '' we avoid undefined
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    blankrows: false,
    raw: false,     // Return formatted strings (important for date cells)
  });

  if (rawRows.length === 0) {
    throw new Error('The uploaded file is empty or contains no data rows.');
  }

  // Extract headers from the first row's keys
  const headers = Object.keys(rawRows[0]);

  // Normalise every cell to string (some cells may be numbers/dates from SheetJS)
  const rows = rawRows.map((row) => {
    const normalised: Record<string, string> = {};
    for (const header of headers) {
      const cell = row[header];
      if (cell instanceof Date) {
        // Format dates as ISO date string (YYYY-MM-DD)
        normalised[header] = cell.toISOString().split('T')[0];
      } else {
        normalised[header] = String(cell ?? '').trim();
      }
    }
    return normalised;
  });

  return { headers, rows };
}

/**
 * Returns only the first N rows (for sampling in auto-detection).
 */
export function sampleRows(rows: Record<string, string>[], n: number): Record<string, string>[] {
  return rows.slice(0, n);
}
