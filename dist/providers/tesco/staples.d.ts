/**
 * Tesco Staples Detection
 *
 * Analyses previous Tesco order history to identify products you buy
 * regularly ("staples"), so they can be auto-suggested or auto-added
 * to the basket at the start of each weekly shop.
 *
 * Staple = bought in >50% of your last N orders (default: last 10).
 *
 * Saved to: ~/.tesco/staples.json
 */
import { TescoAPI } from './api';
interface BasketAdder {
    addToBasket(productId: string, quantity: number): Promise<void>;
}
export interface Staple {
    productId: string;
    name: string;
    avgQty: number;
    frequency: number;
}
interface RawOrderItem {
    id?: string;
    tpnb?: string;
    productId?: string;
    name?: string;
    title?: string;
    quantity?: number;
    qty?: number;
}
interface RawOrder {
    items?: RawOrderItem[];
    orderLines?: RawOrderItem[];
    products?: RawOrderItem[];
}
export declare function analyseOrders(orders: RawOrder[], threshold?: number): Staple[];
export declare function fetchOrderHistory(api: TescoAPI, n?: number): Promise<RawOrder[]>;
export declare function saveStaples(staples: Staple[]): void;
export declare function loadStaples(): Staple[];
export declare function updateStaples(api: TescoAPI): Promise<Staple[]>;
export declare function printStaples(staples: Staple[], json?: boolean): void;
export declare function addStaplesToBasket(provider: BasketAdder, staples: Staple[], skipIds?: Set<string>): Promise<void>;
export {};
//# sourceMappingURL=staples.d.ts.map