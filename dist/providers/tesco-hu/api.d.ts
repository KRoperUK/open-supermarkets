/**
 * Tesco Hungary — GraphQL client for https://xapi.tesco.com/
 *
 * bevasarlas.tesco.hu is the same Tesco micro-frontend platform as www.tesco.com
 * and talks to the same GraphQL backend ("mango") with the same public API key.
 * The `region` and `language` headers select the Hungarian catalogue: the same
 * product id returns "Banán lédig" with region HU and product-not-found with UK.
 *
 * Unlike the storefront, xapi answers plain HTTP clients — no Akamai challenge —
 * so search needs no browser and no account. Verified live 2026-09-17.
 *
 * Schema notes (introspection is disabled; learned from the site's SSR cache):
 *   - Product fields: id tpnb tpnc gtin title status isForSale defaultImageUrl
 *     price { actual unitPrice unitOfMeasure } reviews { stats { ... } } ...
 *   - The UK fields isAvailable / displayPrice / unitPrice do NOT exist here.
 *   - search(query, page, count, sortBy) and category(facet, page, sortBy, count)
 *     both return { info { total page count pageSize offset } results { node } }.
 *
 * Request format: POST / with a JSON array of operations; the response is an
 * array in the same order, each element { data, errors?, status }.
 */
export declare const XAPI_URL = "https://xapi.tesco.com/";
/** Public key baked into the site's page config (`mangoApiKey`). Same as the UK. */
export declare const TESCO_API_KEY = "TvOSZJHlEk0pjniDGQFAc9Q59WGAR4dA";
export interface TescoRegionConfig {
    /** Provider id used in error messages, e.g. "tesco-hu". */
    id: string;
    /** `region` header, upper-case, e.g. "HU". */
    region: string;
    /** `language` and `accept-language` headers, e.g. "hu-HU". */
    language: string;
    /** ISO 4217. */
    currency: string;
    /** Storefront origin, used for Origin/Referer headers. */
    origin: string;
    /** Shop path prefix on the storefront, e.g. "/shop/hu-HU/". */
    shopPath: string;
}
export declare const TESCO_HU: TescoRegionConfig;
export declare class TescoHuSessionError extends Error {
    status?: number;
    constructor(message: string, status?: number);
}
export declare function sessionHelp(providerId: string, status?: number): string;
export declare class TescoHuAPI {
    readonly config: TescoRegionConfig;
    private client;
    constructor(config?: TescoRegionConfig);
    /** Inject cookies from an imported session (see session.ts). */
    setAuthCookies(cookieString: string): void;
    hasAuthCookies(): boolean;
    /**
     * Send one operation as a one-element batch and unwrap the first result.
     * GraphQL errors are thrown; an Unauthorized error or a 401/403 becomes a
     * TescoHuSessionError so the CLI/MCP boundary can tell the user what to do.
     */
    private gql;
    search(query: string, page: number, count: number): Promise<{
        total: number;
        products: any[];
    }>;
    getProduct(tpnc: string): Promise<any>;
    /** Superdepartment → department → aisle tree. */
    getCategories(): Promise<any[]>;
    getBasket(): Promise<any>;
    /**
     * Add, change or remove a line. quantity 0 removes. orderId is basket.id from
     * getBasket(). Same mutation the Hungarian mfe-basket-manager bundle uses.
     */
    updateBasket(tpnc: string, quantity: number, orderId: string): Promise<any>;
}
//# sourceMappingURL=api.d.ts.map