/**
 * TescoProvider — implements GroceryProvider interface
 *
 * Composes TescoAPI (REST calls) + auth (session management).
 * Delivery slots and checkout delegate to Playwright browser files.
 */
import { GroceryProvider, Product, Basket, DeliverySlot, Order, SearchOptions } from '../types';
import { TescoAPI } from './api';
export declare class TescoProvider implements GroceryProvider {
    readonly name = "tesco";
    private api;
    constructor();
    private loadSession;
    login(email: string, password: string): Promise<void>;
    logout(): Promise<void>;
    isAuthenticated(): Promise<boolean>;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    getProduct(productId: string): Promise<Product>;
    getCategories(): Promise<any>;
    getBasket(): Promise<Basket>;
    /** Get the basket orderId needed for UpdateBasket mutations */
    private getBasketOrderId;
    /**
     * UpdateBasket takes product_uid (TPNC), but the CLI's `remove`/`update` commands
     * are documented to take the basket item_id (the barcode-style ID shown by `groc
     * basket`) — matching every other provider. Resolve whichever one we were given
     * against the live basket so both forms work.
     */
    private resolveProductUid;
    addToBasket(productId: string, quantity: number): Promise<void>;
    updateBasketItem(itemId: string, quantity: number): Promise<void>;
    removeFromBasket(itemId: string): Promise<void>;
    clearBasket(): Promise<void>;
    getDeliverySlots(): Promise<DeliverySlot[]>;
    bookSlot(slotId: string): Promise<void>;
    checkout(dryRun?: boolean): Promise<Order>;
    getOrders(): Promise<Order[]>;
    /** Expose the underlying API for the staples command */
    getAPI(): TescoAPI;
    private normaliseProduct;
    private normaliseBasketItem;
}
//# sourceMappingURL=index.d.ts.map