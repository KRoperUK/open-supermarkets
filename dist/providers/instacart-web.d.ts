/**
 * Instacart (US / Canada) — unofficial web GraphQL API.
 *
 * Use this when you do not have an official Developer Platform key. It talks to
 * the same GraphQL endpoint instacart.com's own web app uses, which means it can
 * actually search real products with real prices for a real address — something
 * the official API deliberately does not expose.
 *
 * The trade-offs are real and you should know them before depending on it:
 *
 *   • Login is bot-protected and cannot be scripted. You supply a session cookie
 *     captured from a browser you logged into yourself.
 *   • It sends Apollo *persisted queries*: an operation name plus a SHA-256 hash
 *     the server already knows. Those hashes are tied to an Instacart frontend
 *     build and rotate when they deploy. When that happens every call fails at
 *     once and the hashes below must be recaptured.
 *   • Automated access may be against Instacart's Terms of Service. This is here
 *     for personal automation. Decide for yourself.
 *
 * Protocol credit: github.com/kleinjm/instacart_api (Ruby, MIT). Endpoints,
 * headers, operation names and the persisted-query mechanism were read from that
 * project and reimplemented; no code was copied.
 *
 * PARTIALLY VERIFIED LIVE (2026-08-03), which is better than it sounds:
 *
 *   ✓ The endpoint is not bot-walled — plain nginx, HTTP 200, no Cloudflare
 *     challenge (unlike DoorDash).
 *   ✓ The persisted-query hashes below are CURRENT. The server resolved them and
 *     validated variables, which it would not do for a stale hash.
 *   ✓ SearchCrossRetailerGroupResults runs ANONYMOUSLY and returns real itemIds.
 *   ✗ Items returns "Not Authenticated" without a cookie, so hydrating names and
 *     prices still needs a session. Untested with a real one.
 */
import type { Basket, Product, SearchOptions } from './types';
export declare class StalePersistedQueryError extends Error {
    constructor(operation: string);
}
export declare class InstacartWebProvider {
    readonly name = "instacart-web";
    private http;
    private zoneId?;
    private postalCode?;
    private shopId?;
    constructor(sessionCookie?: string | undefined, opts?: {
        zoneId?: string;
        postalCode?: string;
        shopId?: string;
    });
    private extensions;
    private unwrap;
    /** Persisted queries go over GET with the payload in the query string. */
    private query;
    /** Mutations go over POST with a JSON body. */
    private mutate;
    private requireLocation;
    /**
     * Search is TWO calls, and the first one needs no authentication.
     *
     * Verified against the live endpoint 2026-08-03:
     *
     *   SearchCrossRetailerGroupResults  → anonymous, returns `results[].itemIds`
     *   Items                            → "Not Authenticated" without a cookie
     *
     * So the search half works for anyone; only hydrating names and prices needs
     * the session. That is why a failure here reads very differently depending on
     * which leg broke, and why the two are reported separately.
     *
     * The required variables were discovered by letting the server name each
     * missing one in turn. `shopId` (singular) is required *in addition to*
     * `shopIds`, and `searchSource` is mandatory — omitting any of them fails
     * validation before the query runs.
     */
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    getBasket(): Promise<Basket>;
    addToBasket(productId: string, quantity?: number): Promise<void>;
    removeFromBasket(itemId: string): Promise<void>;
}
//# sourceMappingURL=instacart-web.d.ts.map