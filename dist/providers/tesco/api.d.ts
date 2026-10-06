/**
 * Tesco API Client — GraphQL via xapi.tesco.com
 *
 * All data operations go to https://xapi.tesco.com/ as batched GraphQL POSTs.
 * Endpoints and schema discovered via src/providers/tesco/discover.ts on 2026-03-08.
 *
 * Required headers on every request:
 *   x-apikey  — static API key (public, baked into the mfe bundles)
 *   language  — en-GB
 *   region    — UK
 *
 * Auth is carried via session cookies injected by setAuthCookies().
 *
 * Request format:  POST /  with body = JSON array of operation objects
 * Response format: JSON array of { data: { ... } } matching the batch order
 */
export declare class TescoAPI {
    private client;
    constructor();
    /** Inject session cookies from ~/.tesco/session.json */
    setAuthCookies(cookieString: string): void;
    /**
     * Send a single GraphQL operation.
     * Tesco batches operations as an array; we wrap/unwrap automatically.
     */
    private gql;
    getCategories(): Promise<any>;
    /**
     * Search for products.
     *
     * Step 1: search.api.tesco.com returns a list of TPNBs (no Akamai block).
     * Step 2: xapi GraphQL batch-fetches full product details for each TPNB.
     *
     * The www.tesco.com/search page is SSR (blocked by Akamai for non-browser
     * requests), and the xapi GetRecommendations approach only returns exclusion
     * context (no results). This two-step approach avoids both problems.
     */
    searchProducts(query: string, count?: number, page?: number): Promise<any[]>;
    getProduct(tpnc: string): Promise<any>;
    getBasket(): Promise<any>;
    /**
     * Add or update a basket item.
     * Tesco uses a single UpdateBasket mutation for both add and remove.
     * Requires the basket orderId from getBasket().basket.id
     *
     * @param tpnc     Tesco Product Number (numeric string)
     * @param quantity  New quantity — 0 removes the item
     * @param orderId  basket.id from getBasket() (the trn:tesco:order:... string)
     */
    updateBasket(tpnc: string, quantity: number, orderId: string): Promise<any>;
    getSlots(start: string, end: string): Promise<any>;
    bookSlot(slotId: string): Promise<any>;
    getOrders(page?: number, pageSize?: number): Promise<any>;
    getOrder(orderId: string): Promise<any>;
}
//# sourceMappingURL=api.d.ts.map