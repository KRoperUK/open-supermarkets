/**
 * TescoHuProvider — Tesco Magyarország (bevasarlas.tesco.hu).
 *
 * Composes TescoHuAPI (GraphQL over xapi.tesco.com, region HU) with the cookie
 * session store. Catalogue search needs no account. Basket operations need an
 * imported browser session — see session.ts.
 *
 * Shares no code with ../tesco (UK): that provider is core, CI-tested and its
 * auth module imports Playwright at load time, which would make every Hungarian
 * search pay for a browser it never uses.
 */
import type { Basket, GroceryProvider, Product, SearchOptions } from '../types';
import { TescoHuAPI } from './api';
export interface FlatCategory {
    id: string;
    name: string;
    label: string;
    depth: number;
    path: string;
}
/** superDepartment → department → aisle, flattened with a breadcrumb path. */
export declare function flattenTaxonomy(nodes: any[], depth?: number, parentPath?: string): FlatCategory[];
export declare function normaliseProduct(p: any, provider?: string): Product;
/** GetBasket → Basket. splitView is an array in the mfe-trolley shape; tolerate an object. */
export declare function normaliseBasket(data: any, provider?: string): Basket;
export declare class TescoHuProvider implements GroceryProvider {
    readonly name: string;
    private api;
    constructor();
    /** Exposed for tests and provider-specific commands. */
    getAPI(): TescoHuAPI;
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    getProduct(productId: string): Promise<Product>;
    getCategories(): Promise<FlatCategory[]>;
    logout(): Promise<void>;
    isAuthenticated(): Promise<boolean>;
    /** Raise the actionable session error before any network call. */
    protected requireSession(): void;
    getBasket(): Promise<Basket>;
    /** The basket's own id doubles as the orderId that UpdateBasket needs. */
    private getBasketOrderId;
    /**
     * UpdateBasket takes the product id, but `remove`/`update` are documented to
     * take the basket line id like every other provider. Resolve either against
     * the live basket; an unknown id is passed through as a product id.
     */
    private resolveProductUid;
    addToBasket(productId: string, quantity: number): Promise<void>;
    updateBasketItem(itemId: string, quantity: number): Promise<void>;
    removeFromBasket(itemId: string): Promise<void>;
    clearBasket(): Promise<void>;
}
//# sourceMappingURL=index.d.ts.map