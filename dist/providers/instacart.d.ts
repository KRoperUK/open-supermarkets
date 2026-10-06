/**
 * Instacart (US / Canada) — official Developer Platform API.
 *
 * This is the only provider here that is fully sanctioned. Instead of driving a
 * basket, you POST a list of items and get back an Instacart URL where the user
 * picks their store, sees the cart pre-filled, and checks out. For an agent
 * that is arguably the better shape: the agent decides *what*, the human keeps
 * the store, the substitutions and the payment.
 *
 * Docs: https://docs.instacart.com/developer_platform_api
 *
 * ⚠️  NOT VERIFIED LIVE. The API key is issued through an Instacart
 *     representative rather than self-serve signup, so this is written against
 *     the published documentation and has not been exercised against the real
 *     endpoint. Treat the response mapping as unconfirmed until someone with a
 *     key runs it. Everything else in this repo has been run for real.
 */
import type { Basket, Product, SearchOptions } from './types';
export declare class InstacartProvider {
    readonly name = "instacart";
    private http;
    private pending;
    constructor(apiKey?: string | undefined);
    /**
     * Instacart's public API has no product search endpoint — matching happens on
     * their side when the shopping-list page is opened. We surface the queued item
     * so the CLI can show what will be sent, rather than pretending to search.
     */
    search(query: string, options?: SearchOptions): Promise<Product[]>;
    addToBasket(productId: string, quantity?: number): Promise<void>;
    getBasket(): Promise<Basket>;
    clearBasket(): Promise<void>;
    /**
     * Turn the queued items into an Instacart shopping list page.
     * Returns the URL — the human finishes the order there.
     */
    createShoppingList(title?: string): Promise<string>;
}
//# sourceMappingURL=instacart.d.ts.map