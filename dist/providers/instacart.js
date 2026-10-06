"use strict";
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstacartProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const API_BASE = 'https://connect.instacart.com/idp/v1';
class InstacartProvider {
    constructor(apiKey = process.env.INSTACART_API_KEY) {
        this.name = 'instacart';
        this.pending = [];
        if (!apiKey) {
            throw new Error('Instacart needs an API key. Set INSTACART_API_KEY.\n' +
                'Keys are issued by Instacart directly — see https://docs.instacart.com/developer_platform_api');
        }
        this.http = axios_1.default.create({
            baseURL: API_BASE,
            timeout: 15000,
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
        });
    }
    /**
     * Instacart's public API has no product search endpoint — matching happens on
     * their side when the shopping-list page is opened. We surface the queued item
     * so the CLI can show what will be sent, rather than pretending to search.
     */
    async search(query, options = {}) {
        void options;
        return [
            {
                product_uid: `instacart:${query}`,
                name: query,
                retail_price: { price: 0 },
                in_stock: true,
                provider: this.name,
                currency: 'USD',
                description: 'Instacart matches items to products when the shopping list is opened. ' +
                    'Price and availability are resolved at that point, not here.',
            },
        ];
    }
    async addToBasket(productId, quantity = 1) {
        const name = productId.startsWith('instacart:')
            ? productId.slice('instacart:'.length)
            : productId;
        this.pending.push({ name, quantity });
    }
    async getBasket() {
        return {
            items: this.pending.map((item, i) => ({
                item_id: String(i),
                product_uid: `instacart:${item.name}`,
                name: item.name,
                quantity: item.quantity ?? 1,
                unit_price: 0,
                total_price: 0,
            })),
            total_quantity: this.pending.reduce((n, i) => n + (i.quantity ?? 1), 0),
            total_cost: 0,
            provider: this.name,
        };
    }
    async clearBasket() {
        this.pending = [];
    }
    /**
     * Turn the queued items into an Instacart shopping list page.
     * Returns the URL — the human finishes the order there.
     */
    async createShoppingList(title = 'Shopping list') {
        if (this.pending.length === 0) {
            throw new Error('Nothing queued. Add items before creating a shopping list.');
        }
        try {
            const { data } = await this.http.post('/products/products_link', { title, line_items: this.pending });
            const url = data?.products_link_url;
            if (!url) {
                throw new Error('Instacart returned no products_link_url');
            }
            return url;
        }
        catch (err) {
            const status = err?.response?.status;
            throw new Error(`Instacart shopping list failed${status ? ` (HTTP ${status})` : ''}: ${err.message}`);
        }
    }
}
exports.InstacartProvider = InstacartProvider;
//# sourceMappingURL=instacart.js.map