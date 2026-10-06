/**
 * Kroger (United States) — official Public Products API.
 *
 * The best-behaved provider in this repo. Everything else here is reverse
 * engineered against a site that would rather we didn't; Kroger publishes a
 * documented API, hands out credentials through self-serve registration, and
 * states its rate limit up front (10,000 calls/day).
 *
 * It is also the widest single US integration available. Kroger operates Ralphs,
 * Fred Meyer, King Soopers, Harris Teeter, Smith's, QFC, Food4Less and others —
 * one set of credentials covers all of them.
 *
 *   Register:  https://developer.kroger.com   → Client ID + Client Secret
 *   Docs:      https://developer.kroger.com/reference/
 *
 * Auth is OAuth2 *client_credentials* with scope `product.compact` — an
 * application token, not a user login. Nobody signs in, no cookie expires, no
 * bot challenge. That makes it the only US provider here usable unattended.
 *
 * ⚠️  NOT VERIFIED LIVE — credentials require registering an application, which
 *     needs the repo owner's details. Written against the published API
 *     reference and the endpoint shapes used by the Python client
 *     (github.com/CupOfOwls/kroger-api, MIT). Everything is documented rather
 *     than guessed, but the response mapping is unconfirmed until someone runs
 *     it with a key.
 */
import type { Product, SearchOptions } from './types';
export declare class KrogerProvider {
    readonly name = "kroger";
    private http;
    private clientId;
    private clientSecret;
    private locationId?;
    private token?;
    private tokenExpiry;
    constructor(clientId?: string | undefined, clientSecret?: string | undefined, locationId?: string | undefined);
    /**
     * Application token via client_credentials. Cached until shortly before
     * expiry — Kroger's daily call limit counts token requests too, so
     * re-authenticating per search would waste a meaningful slice of 10,000.
     */
    private ensureToken;
    /**
     * Kroger's `upc` is NOT a scannable barcode — it is the 11-digit product code
     * zero-padded to 13, with the UPC-A check digit dropped.
     *
     * That one missing digit is why Open Food Facts returns nothing for a Kroger
     * product straight out of the API. Reconstructing it turns enrichment from a
     * fuzzy name guess into an exact lookup:
     *
     *   0000980089500 → 009800895007 → Nutella, Nutri-Score E, allergens
     *                                  milk / nuts / soybeans
     *
     * Verified against Nutella, Coca-Cola and Oreo. Own-brand Kroger lines mostly
     * are not in Open Food Facts at all, which is a coverage gap rather than a
     * normalisation one.
     */
    private static toBarcode;
    private static label;
    private toProduct;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    getProduct(productId: string): Promise<Product>;
    /**
     * Find store ids near a postcode. Prices are per-store, so this is how you get
     * a usable KROGER_LOCATION_ID — surfaced because the alternative is telling
     * people to go and read the API reference.
     */
    findStores(zipCode: string, limit?: number): Promise<Array<{
        locationId: string;
        name: string;
        chain: string;
        address: string;
    }>>;
}
//# sourceMappingURL=kroger.d.ts.map