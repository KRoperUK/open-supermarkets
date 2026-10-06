import { GroceryProvider, Product, Basket, DeliverySlot, Order, SearchOptions } from './types';
export declare class SainsburysProvider implements GroceryProvider {
    readonly name = "sainsburys";
    private client;
    private storeNumber;
    /** Single-flight guard so concurrent 401s trigger one Playwright login, not N. */
    private reauthInFlight;
    constructor();
    private headlessRelogin;
    private applySession;
    private loadSession;
    login(email: string, password: string): Promise<void>;
    logout(): Promise<void>;
    isAuthenticated(): Promise<boolean>;
    private mapProduct;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    getFavourites(options?: SearchOptions): Promise<Product[]>;
    searchFavourites(query: string, options?: SearchOptions): Promise<Product[]>;
    private favouriteSearchScore;
    getProduct(productId: string): Promise<Product>;
    getCategories(): Promise<any>;
    getBasket(): Promise<Basket>;
    addToBasket(productId: string, quantity: number): Promise<void>;
    updateBasketItem(itemId: string, quantity: number): Promise<void>;
    removeFromBasket(itemId: string): Promise<void>;
    clearBasket(): Promise<void>;
    getDeliverySlots(): Promise<DeliverySlot[]>;
    bookSlot(slotId: string): Promise<void>;
    checkout(dryRun?: boolean): Promise<Order>;
    getOrders(): Promise<Order[]>;
}
//# sourceMappingURL=sainsburys.d.ts.map