/**
 * Albert Heijn (Netherlands) — catalogue search.
 *
 * AH issues an *anonymous* bearer token to anyone who asks, which is why this
 * provider needs no account, no address and no browser. That makes it the
 * reference implementation for a search-only provider: if you want to add your
 * country's supermarket, copy this file.
 *
 * Protocol credit: github.com/gwillem/appie-go (Go, MIT). No code was copied —
 * the endpoints, the `x-application` header and the anonymous token flow were
 * read from that project and reimplemented here.
 *
 * Verified live: 2026-08-03.
 */
import type { Product, SearchOptions } from './types';
/**
 * Without this header the API returns HTTP 500
 * "Can not find application: 'null'". It is not optional.
 *
 * It also selects the storefront. AHBEWEBSHOP serves Albert Heijn Belgium from
 * the same host, with its own rate-limit bucket — observed returning HTTP 200
 * while the NL context was throttled.
 */
export declare const AH_APPLICATIONS: {
    readonly NL: "AHWEBSHOP";
    readonly BE: "AHBEWEBSHOP";
};
export declare class AlbertHeijnProvider {
    readonly name: string;
    private http;
    private token?;
    private tokenExpiry;
    constructor(application?: string);
    /**
     * Anonymous token. Cached until 60s before expiry so a multi-command session
     * does not re-authenticate on every call.
     */
    private ensureToken;
    private toProduct;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    getProduct(productId: string): Promise<Product>;
}
/**
 * Albert Heijn Belgium — same API, different storefront.
 *
 * Verified: HTTP 200, 324 results for "brood", and served successfully while the
 * NL context was rate-limited, which is what shows it is a distinct application
 * rather than the same catalogue reordered.
 *
 * NOT verified: that the assortment and pricing match ah.be exactly. If you shop
 * there and something looks wrong, please open an issue — that is the check we
 * could not run from here.
 */
export declare class AlbertHeijnBEProvider extends AlbertHeijnProvider {
    readonly name: string;
    constructor();
}
//# sourceMappingURL=ah.d.ts.map