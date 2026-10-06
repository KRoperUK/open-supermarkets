export interface Product {
    product_uid: string;
    name: string;
    description?: string;
    retail_price: {
        price: number;
    };
    unit_price?: {
        measure: string;
        price: number;
    };
    in_stock: boolean;
    image_url?: string;
    provider: string;
    /**
     * ISO 4217, e.g. "GBP", "EUR", "USD". Optional for backwards compatibility;
     * absent means GBP, which is where this project started. Set it in any
     * non-UK provider — printing a euro price with a pound sign is a bug users
     * notice immediately.
     */
    currency?: string;
    rating?: number;
    review_count?: number;
    size?: string;
}
export interface BasketItem {
    item_id: string;
    product_uid: string;
    name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
}
export interface Basket {
    items: BasketItem[];
    total_quantity: number;
    total_cost: number;
    provider: string;
    /** ISO 4217. Absent means GBP, like Product.currency. Non-UK providers must set it. */
    currency?: string;
}
export interface DeliverySlot {
    slot_id: string;
    start_time: string;
    end_time: string;
    date: string;
    price: number;
    available: boolean;
}
export interface Order {
    order_id: string;
    status: string;
    total: number;
    delivery_slot?: DeliverySlot;
    items: BasketItem[];
}
export interface SearchOptions {
    limit?: number;
    offset?: number;
    category?: string;
}
/**
 * What a provider can actually do.
 *
 * A provider is not all-or-nothing. Catalogue search usually needs no account
 * at all, while checkout needs an account, an address and a card. Splitting
 * these means someone can contribute a search-only provider for their country
 * in an afternoon, instead of being blocked on implementing checkout.
 */
export type Capability = 'search' | 'basket' | 'slots' | 'checkout' | 'orders';
/** How you authenticate. Ordered roughly by how painful it is to automate. */
export type AuthModel = 'none' | 'anonymous' | 'api-key' | 'oauth' | 'credentials' | 'session-cookie';
export type ProviderTier = 'core' | 'community';
export interface ProviderManifest {
    id: string;
    /** Display name, e.g. "Albert Heijn". */
    label: string;
    /** ISO 3166-1 alpha-2, or 'XX' for multi-country aggregators. */
    country: string;
    /** Countries served, when one integration spans several. */
    countries?: string[];
    capabilities: Capability[];
    auth: AuthModel;
    tier: ProviderTier;
    /** GitHub handle of whoever owns breakage. Community providers must have one. */
    maintainer?: string;
    /** Where the protocol knowledge came from, if it was reverse-engineered elsewhere. */
    credit?: string;
    /**
     * Dynamic import. Deliberately a thunk: the registry can list and filter every
     * provider without loading any of their code. A user in the UK never parses
     * the German provider.
     */
    load: () => Promise<ProviderConstructor>;
}
export type ProviderConstructor = new () => GroceryProvider;
/**
 * The provider contract.
 *
 * Only `name` and `search` are required. Everything else is optional and
 * declared through the manifest's `capabilities`. Call `assertCapability()`
 * before reaching for an optional method.
 */
export interface GroceryProvider {
    readonly name: string;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    getProduct?(productId: string): Promise<Product>;
    getCategories?(): Promise<any>;
    login?(email: string, password: string): Promise<void>;
    logout?(): Promise<void>;
    isAuthenticated?(): Promise<boolean>;
    getBasket?(): Promise<Basket>;
    addToBasket?(productId: string, quantity: number): Promise<void>;
    updateBasketItem?(itemId: string, quantity: number): Promise<void>;
    removeFromBasket?(itemId: string): Promise<void>;
    clearBasket?(): Promise<void>;
    getDeliverySlots?(): Promise<DeliverySlot[]>;
    bookSlot?(slotId: string): Promise<void>;
    checkout?(dryRun?: boolean): Promise<Order>;
    getOrders?(): Promise<Order[]>;
}
/**
 * A provider that implements the whole surface — search through checkout.
 *
 * This exists so code that has already established it is holding a full-service
 * provider (the UK three, reached through `ProviderFactory`) does not need a
 * capability guard on every call. New code should prefer `GroceryProvider` plus
 * `assertCapability()`, which is honest about the fact that most providers in
 * the world do not do checkout.
 */
export type FullGroceryProvider = Required<GroceryProvider>;
//# sourceMappingURL=types.d.ts.map