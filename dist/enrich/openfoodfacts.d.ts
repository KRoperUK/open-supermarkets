/**
 * Open Food Facts enrichment.
 *
 * Every provider gives you a name and a price. None of them reliably give you
 * allergens, additives, Nutri-Score or ingredients — and the ones that do use
 * their own vocabulary, so you cannot compare across retailers or countries.
 *
 * Open Food Facts is an open database covering products worldwide under a free
 * licence (ODbL for the data). One integration enriches every provider in every
 * country, needs no key, and cannot be WAF-blocked. It is the cheapest global
 * capability in this project.
 *
 * Docs: https://openfoodfacts.github.io/openfoodfacts-server/api/
 * Verified live: 2026-08-03.
 */
import type { Product } from '../providers/types';
export interface Nutrition {
    barcode?: string;
    /** Nutri-Score a–e. */
    nutriscore?: string;
    /** NOVA processing group 1–4; 4 is ultra-processed. */
    nova?: number;
    /** Green-Score / Eco-Score a–e, where present. */
    ecoscore?: string;
    /** Normalised, prefix stripped: ["milk", "nuts"] rather than ["en:milk"]. */
    allergens: string[];
    ingredients?: string;
    labels: string[];
    brand?: string;
    /**
     * How the product was matched. `barcode` is exact; `name` is a best guess
     * from a text search and should be shown as such.
     */
    match: 'barcode' | 'name';
    source: 'openfoodfacts';
}
/** Exact lookup by barcode. Cheap and accurate — prefer this when you have one. */
export declare function byBarcode(barcode: string): Promise<Nutrition | null>;
/**
 * Fuzzy lookup by product name, for the common case where a provider exposes no
 * barcode. Best-effort and guarded: a hit whose name does not substantially
 * overlap the query is discarded rather than returned as a guess.
 *
 * Never rely on a `match: 'name'` result for allergen decisions.
 */
export declare function byName(name: string): Promise<Nutrition | null>;
export interface EnrichedProduct extends Product {
    nutrition?: Nutrition;
}
/**
 * Enrich a batch of products, bounded in concurrency so we stay a polite client
 * of a donation-funded nonprofit. Never throws: a product that cannot be matched
 * comes back unchanged.
 */
export declare function enrich(products: Product[], opts?: {
    concurrency?: number;
}): Promise<EnrichedProduct[]>;
//# sourceMappingURL=openfoodfacts.d.ts.map