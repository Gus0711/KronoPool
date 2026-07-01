/**
 * Génération CSV (export récap). Séparateur `;` (compatible Excel FR) + BOM UTF-8.
 */
function escape(value: string): string {
	if (/[";\n\r]/.test(value)) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export function toCSV(rows: (string | number)[][]): string {
	const body = rows.map((r) => r.map((c) => escape(String(c))).join(';')).join('\r\n');
	return '﻿' + body; // BOM pour Excel
}

/** En-têtes HTTP pour un téléchargement CSV nommé. */
export function csvHeaders(filename: string): Record<string, string> {
	return {
		'Content-Type': 'text/csv; charset=utf-8',
		'Content-Disposition': `attachment; filename="${filename}"`
	};
}
