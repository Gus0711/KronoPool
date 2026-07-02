/**
 * Génération CSV (export récap). Séparateur `;` (compatible Excel FR) + BOM UTF-8.
 */
function escape(value: string): string {
	// Neutralise l'injection de formule (Excel/LibreOffice) : une cellule commençant
	// par = + - @ (ou TAB/CR) serait sinon interprétée comme une formule. On préfixe
	// d'une apostrophe avant le quoting habituel du séparateur/guillemets.
	let v = value;
	if (/^[=+\-@\t\r]/.test(v)) v = `'${v}`;
	if (/[";\n\r]/.test(v)) {
		return `"${v.replace(/"/g, '""')}"`;
	}
	return v;
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
