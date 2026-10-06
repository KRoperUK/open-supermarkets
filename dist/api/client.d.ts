export declare class SainsburysAPI {
    private client;
    constructor();
    getCategories(): Promise<any>;
    getTaxonomy(): Promise<any>;
    getMeganav(): Promise<any>;
    searchProducts(query: string, page?: number, pageSize?: number): Promise<any>;
    browseCategory(categoryId: string, page?: number, pageSize?: number): Promise<any>;
    getProduct(productId: string): Promise<any>;
    getBasket(pickTime?: string): Promise<any>;
    addToBasket(productId: string, quantity?: number): Promise<any>;
    updateBasketItem(itemId: string, quantity: number): Promise<any>;
    removeFromBasket(itemId: string): Promise<any>;
    clearBasket(): Promise<any>;
    getSlotReservation(): Promise<any>;
    getSlots(startDate?: string, endDate?: string): Promise<any>;
    reserveSlot(slotId: string): Promise<any>;
    checkout(): Promise<any>;
    getOrders(): Promise<any>;
    getOrder(orderId: string): Promise<any>;
    setAuthCookies(cookies: string): void;
}
//# sourceMappingURL=client.d.ts.map