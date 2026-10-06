/**
 * Mercadona (Spain) — open REST catalogue + Algolia search.
 *
 * Spain's largest grocer, and one of the more open APIs in this repo: no token,
 * no cookie, no bot challenge. It is split across two services, which is why the
 * first pass at this provider looked impossible.
 *
 *   REST   tienda.mercadona.es/api/products/{id}/   product detail, INCLUDING the EAN
 *   Algolia 7uzjkl1dj0-dsn.algolia.net              full-text search
 *
 * The Algolia credentials below are the storefront's PUBLIC search key, lifted
 * from their frontend bundle where every visitor's browser already has them.
 * Confirmed search-only: it is rejected with "Method not allowed with this API
 * key" when asked to list indexes, so it cannot read or write anything beyond
 * running queries. If it ever rotates, search breaks with a 403 and these need
 * recapturing from the bundle.
 *
 * Verified live 2026-08-09: 230 hits for "leche"; Leche semidesnatada Hacendado
 * at €5.04; product 4240 resolves to EAN 8402001027475.
 */
import type { Product, SearchOptions } from './types';
export declare class MercadonaProvider {
    readonly name = "mercadona";
    private rest;
    private algolia;
    private index;
    constructor(warehouse?: string);
    /** Prices arrive as strings ("5.04") as often as numbers. */
    private static num;
    private static label;
    private toProduct;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    /** Detail lookup. Unlike search, this carries the EAN. */
    getProduct(productId: string): Promise<Product>;
    getCategories(): Promise<any>;
}
//# sourceMappingURL=mercadona.d.ts.map