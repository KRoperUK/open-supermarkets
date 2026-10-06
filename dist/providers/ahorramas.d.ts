/**
 * AhorraMás (Spain) — anonymous server-rendered catalogue search.
 *
 * AhorraMás uses Salesforce Commerce Cloud (Demandware). The public search
 * page and its pagination fragments contain the product data needed by the
 * search-only provider, so no browser, login, cookie jar or postcode is
 * required here. Store selection can affect availability and basket behaviour
 * and is deliberately outside this first implementation.
 */
import type { GroceryProvider, Product, SearchOptions } from './types';
export declare const AHORRAMAS_BASE = "https://www.ahorramas.com";
export declare const AHORRAMAS_PAGE_SIZE = 20;
interface HtmlNode {
    tag: string;
    attrs: Record<string, string>;
    children: HtmlNode[];
    text: string;
}
interface UnitPrice {
    measure: string;
    price: number;
}
interface JsonLdProduct {
    url?: string;
    sku?: string;
    mpn?: string;
    name?: string;
    description?: string;
    image?: string | string[];
    offers?: {
        price?: string | number;
        priceCurrency?: string;
        availability?: string;
    };
}
/** Parse a rendered value such as "0,84€" or "1.234,56 EUR". */
export declare function parsePrice(value: string | number | undefined): number | undefined;
/** Parse the retailer's rendered price-per-unit label into Product.unit_price. */
export declare function parseUnitPrice(value: string | undefined): UnitPrice | undefined;
/** Convert one semantic .product tile into the repository's Product shape. */
export declare function parseProductTile(tile: HtmlNode | string, jsonLdProducts?: JsonLdProduct[]): Product;
/** Parse a full search page or a Search-UpdateGrid HTML fragment. */
export declare function parseSearchPage(html: string): Product[];
export declare class AhorramasProvider implements GroceryProvider {
    readonly name = "ahorramas";
    private readonly http;
    constructor();
    private fetchPage;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
}
export {};
//# sourceMappingURL=ahorramas.d.ts.map