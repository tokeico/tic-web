import type { CSSProperties } from "react";

const cache = new Map<string, CSSProperties>();

/**
 * Inline CSS string → React style object. The design is built from inline
 * styles ("display:flex;gap:8px"); this keeps them verbatim, so what's here
 * is exactly what the designer specified. Parsed once per string.
 */
export function st(css: string): CSSProperties {
	const hit = cache.get(css);
	if (hit) return hit;
	const out: Record<string, string> = {};
	for (const decl of css.split(";")) {
		const i = decl.indexOf(":");
		if (i < 0) continue;
		const prop = decl.slice(0, i).trim();
		const value = decl.slice(i + 1).trim();
		if (!prop) continue;
		out[
			prop.startsWith("--")
				? prop
				: prop.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
		] = value;
	}
	cache.set(css, out as CSSProperties);
	return out as CSSProperties;
}
