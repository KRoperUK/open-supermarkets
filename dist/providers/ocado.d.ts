import { GroceryProvider, Product, Basket, DeliverySlot, Order, SearchOptions } from './types';
/**
 * Extract the `productEntities` blob embedded in server-rendered Ocado pages
 * (`"productEntities":{<uuid>:{...}}`) via balanced-brace scanning — the blob
 * is raw JSON inside HTML, so a single regex can't safely bound it.
 */
export declare function extractProductEntities(html: string): Record<string, any>;
export declare class OcadoProvider implements GroceryProvider {
    readonly name = "ocado";
    private client;
    private csrfToken;
    constructor();
    private loadSession;
    static saveSession(cookies: any[]): void;
    login(email: string, password: string): Promise<void>;
    logout(): Promise<void>;
    isAuthenticated(): Promise<boolean>;
    private getCsrfToken;
    private rawCart;
    private productsInfo;
    /**
     * The one and only trolley write. Quantity is a DELTA (+N adds, -N removes,
     * 0 silently no-ops, unavailable products silently no-op).
     */
    private applyQuantity;
    private static cartItems;
    private mapEntity;
    /**
     * Scrape a server-rendered listing page (search results, favourites,
     * regulars, category browse) into ranked Products. All these pages embed
     * the same `productEntities` blob; DOM anchor order = site ranking.
     */
    private scrapeProductsPage;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    getProduct(productId: string): Promise<Product>;
    getCategories(): Promise<any>;
    /**
     * Browse a category listing. Accepts a path from getCategories()
     * (/categories/<slug>/<uuid>[/...]) — the numeric SKU-style UUID in the
     * path is required, a bare slug 404s.
     */
    browseCategory(categoryPath: string, options?: SearchOptions): Promise<Product[]>;
    /** Favourite/frequently-bought products (/favorites page, server-rendered). */
    getFavourites(options?: SearchOptions): Promise<Product[]>;
    /** Ocado has no server-side favourites search — filter favourites by name. */
    searchFavourites(query: string, options?: SearchOptions): Promise<Product[]>;
    getBasket(): Promise<Basket>;
    addToBasket(productId: string, quantity: number): Promise<void>;
    updateBasketItem(itemId: string, quantity: number): Promise<void>;
    removeFromBasket(itemId: string): Promise<void>;
    clearBasket(): Promise<void>;
    /** deliveryDestinationId + regionId, scraped from the /checkout page HTML. */
    private locationIds;
    private getLocationIds;
    getDeliverySlots(): Promise<DeliverySlot[]>;
    getOrders(): Promise<Order[]>;
    /** Recurring-shopping ("Regulars") definitions. Empty array if none set up. */
    getRegulars(): Promise<any[]>;
    bookSlot(_slotId: string): Promise<void>;
    checkout(_dryRun?: boolean): Promise<Order>;
}
/**
 * Import cookies exported from a real browser as the Ocado session — the
 * reliable alternative to Playwright login. Accepts Playwright storage_state
 * ({ cookies: [...] }), a bare cookie array, or Cookie-Editor style exports.
 *
 * Usage: groc --provider ocado import-session --file ~/Downloads/ocado-cookies.json
 */
export declare function importSession(filePath: string): void;
//# sourceMappingURL=ocado.d.ts.map