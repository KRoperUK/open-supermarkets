"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SainsburysProvider = void 0;
const axios_1 = __importDefault(require("axios"));
const login_1 = require("../auth/login");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const API_BASE = 'https://www.sainsburys.co.uk/groceries-api/gol-services';
const SESSION_FILE = path.join(os.homedir(), '.sainsburys', 'session.json');
class SainsburysProvider {
    constructor() {
        this.name = 'sainsburys';
        /** Single-flight guard so concurrent 401s trigger one Playwright login, not N. */
        this.reauthInFlight = null;
        // Store number can be configured via environment variable
        // Default to '0560' if not set
        this.storeNumber = process.env.SAINSBURYS_STORE_NUMBER || '0560';
        this.client = axios_1.default.create({
            baseURL: API_BASE,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                'Accept': 'application/json',
            }
        });
        // Load session if exists
        this.loadSession();
        // Auto re-auth (issue #11): Sainsbury's sessions expire after ~20 min.
        // Opt in by setting SAINSBURYS_EMAIL + SAINSBURYS_PASSWORD — on a
        // 401/403 we re-login headlessly once and replay the failed request.
        this.client.interceptors.response.use(undefined, async (error) => {
            const status = error?.response?.status;
            const config = error?.config;
            const email = process.env.SAINSBURYS_EMAIL;
            const password = process.env.SAINSBURYS_PASSWORD;
            if ((status === 401 || status === 403) && config && !config._authRetry && email && password) {
                config._authRetry = true;
                if (!this.reauthInFlight) {
                    console.error(`⚠️  Sainsbury's session rejected (HTTP ${status}) — re-authenticating…`);
                    this.reauthInFlight = this.headlessRelogin(email, password)
                        .finally(() => { this.reauthInFlight = null; });
                }
                await this.reauthInFlight;
                config.headers = {
                    ...config.headers,
                    Cookie: this.client.defaults.headers.common['Cookie'],
                    wcauthtoken: this.client.defaults.headers.common['wcauthtoken'],
                };
                return this.client.request(config);
            }
            throw error;
        });
    }
    async headlessRelogin(email, password) {
        const sessionData = await (0, login_1.login)(email, password, { headless: true });
        this.applySession(sessionData.cookies);
    }
    applySession(cookies) {
        this.client.defaults.headers.common['Cookie'] =
            cookies.map((c) => `${c.name}=${c.value}`).join('; ');
        const authCookie = cookies.find((c) => c.name.startsWith('WC_AUTHENTICATION_'));
        if (authCookie) {
            this.client.defaults.headers.common['wcauthtoken'] = authCookie.value;
        }
        else {
            delete this.client.defaults.headers.common['wcauthtoken'];
        }
    }
    loadSession() {
        try {
            if (fs.existsSync(SESSION_FILE)) {
                const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
                if (session.cookies) {
                    // Handle both formats: array (from login.ts) or string (legacy)
                    if (Array.isArray(session.cookies)) {
                        this.applySession(session.cookies);
                    }
                    else {
                        // Legacy format: cookies already a header string
                        this.client.defaults.headers.common['Cookie'] = session.cookies;
                    }
                }
            }
        }
        catch (error) {
            // Ignore session load errors
        }
    }
    async login(email, password) {
        // login() saves the session file itself; we just adopt the cookies.
        const sessionData = await (0, login_1.login)(email, password);
        this.applySession(sessionData.cookies);
    }
    async logout() {
        if (fs.existsSync(SESSION_FILE)) {
            fs.unlinkSync(SESSION_FILE);
        }
        delete this.client.defaults.headers.common['Cookie'];
    }
    async isAuthenticated() {
        try {
            await this.getBasket();
            return true;
        }
        catch {
            return false;
        }
    }
    mapProduct(p) {
        return {
            product_uid: p.product_uid,
            name: p.name,
            description: p.description || p.short_description,
            retail_price: p.retail_price,
            unit_price: p.unit_price,
            in_stock: p.in_stock !== false && p.is_available !== false,
            image_url: p.image || p.assets?.plp_image,
            provider: this.name
        };
    }
    async search(query, options) {
        const params = {
            'filter[keyword]': query,
            page_number: options?.offset ? Math.floor(options.offset / (options.limit || 24)) + 1 : 1,
            page_size: options?.limit || 24,
            sort_order: 'FAVOURITES_FIRST'
        };
        const response = await this.client.get('/product/v1/product', { params });
        return response.data.products.map((p) => this.mapProduct(p));
    }
    async getFavourites(options) {
        const offset = options?.offset || 0;
        const limit = options?.limit;
        const needed = typeof limit === 'number' ? offset + limit : Infinity;
        const pageSize = 24;
        const products = [];
        for (let page = 1; products.length < needed && page <= 100; page++) {
            const response = await this.client.get('/product/v1/favourites', {
                params: {
                    'include[ASSOCIATIONS]': 'true',
                    'include[REPLACEMENT_PRODUCTS]': 'true',
                    minimised: 'true',
                    store_identifier: this.storeNumber,
                    page_number: page,
                    page_size: pageSize
                },
                headers: {
                    Referer: 'https://www.sainsburys.co.uk/gol-ui/favourites-as-list'
                }
            });
            const batch = (response.data.products || []).map((p) => this.mapProduct(p));
            if (batch.length === 0)
                break;
            products.push(...batch);
            if (batch.length < pageSize)
                break;
        }
        return typeof limit === 'number' ? products.slice(offset, offset + limit) : products.slice(offset);
    }
    async searchFavourites(query, options) {
        const products = await this.getFavourites();
        const scored = products
            .map(product => ({ product, score: this.favouriteSearchScore(product, query) }))
            .filter(result => result.score > 0)
            .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
            .map(result => result.product);
        const offset = options?.offset || 0;
        const limit = options?.limit || 24;
        return scored.slice(offset, offset + limit);
    }
    favouriteSearchScore(product, query) {
        const haystack = `${product.name} ${product.description || ''}`.toLowerCase();
        const needle = query.trim().toLowerCase();
        if (!needle)
            return 0;
        if (haystack === needle)
            return 1000;
        if (haystack.includes(needle))
            return 500 + needle.length;
        const terms = needle.split(/\s+/).filter(Boolean);
        return terms.reduce((score, term) => {
            if (haystack.includes(term))
                return score + 100 + term.length;
            return score;
        }, 0);
    }
    async getProduct(productId) {
        const response = await this.client.get(`/product/v1/product/${productId}`);
        return this.mapProduct(response.data);
    }
    async getCategories() {
        const response = await this.client.get('/product/categories/tree');
        return response.data;
    }
    async getBasket() {
        const pickTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        const response = await this.client.get('/basket/v2/basket', {
            params: {
                pick_time: pickTime,
                store_number: this.storeNumber,
                slot_booked: 'false'
            }
        });
        const data = response.data;
        return {
            items: data.items?.map((item) => ({
                item_id: item.item_uid,
                product_uid: item.product?.sku,
                name: item.product?.name,
                quantity: item.quantity,
                unit_price: parseFloat(item.subtotal_price) / item.quantity,
                total_price: parseFloat(item.subtotal_price || 0)
            })) || [],
            total_quantity: data.item_count || 0,
            total_cost: parseFloat(data.total_price || 0),
            provider: this.name
        };
    }
    async addToBasket(productId, quantity) {
        // Generate pick_time (tomorrow at current time)
        const pickTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        await this.client.post('/basket/v2/basket/item', {
            product_uid: productId,
            quantity,
            uom: 'ea', // unit of measure: 'ea' for each
            selected_catchweight: ''
        }, {
            params: {
                pick_time: pickTime,
                store_number: this.storeNumber,
                slot_booked: 'false'
            }
        });
    }
    async updateBasketItem(itemId, quantity) {
        const pickTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
        // Get current basket to find the item
        const basket = await this.getBasket();
        // The basket view prints a product_uid as "ID", and callers pass that back
        // here (and to removeFromBasket), but a basket line is identified by its
        // item_uid. Match either, so the id a user actually sees is usable.
        const item = basket.items.find(i => i.item_id === itemId) ||
            basket.items.find(i => i.product_uid === itemId);
        if (!item) {
            throw new Error(`Item ${itemId} not found in basket`);
        }
        // Update using PUT with items array
        await this.client.put('/basket/v2/basket', {
            items: [{
                    product_uid: item.product_uid,
                    quantity,
                    uom: 'ea',
                    selected_catchweight: '',
                    item_uid: itemId,
                    decreasing_quantity: quantity < item.quantity
                }]
        }, {
            params: {
                pick_time: pickTime,
                store_number: this.storeNumber,
                slot_booked: 'false'
            }
        });
    }
    async removeFromBasket(itemId) {
        // Remove by updating to quantity 0
        await this.updateBasketItem(itemId, 0);
    }
    async clearBasket() {
        const basket = await this.getBasket();
        for (const item of basket.items) {
            await this.removeFromBasket(item.item_id);
        }
    }
    async getDeliverySlots() {
        // Use browser automation (headless) to get slots
        const { getSlots } = await Promise.resolve().then(() => __importStar(require('../browser/slots')));
        const slots = await getSlots(true); // headless mode
        return slots.map(s => ({
            slot_id: s.slot_id,
            start_time: s.start_time,
            end_time: s.end_time,
            date: s.date,
            price: s.price,
            available: s.available
        }));
    }
    async bookSlot(slotId) {
        const { bookSlot } = await Promise.resolve().then(() => __importStar(require('../browser/slots')));
        await bookSlot(slotId, false); // Show browser for booking
    }
    async checkout(dryRun = false) {
        const { checkout } = await Promise.resolve().then(() => __importStar(require('../browser/checkout')));
        const result = await checkout(dryRun);
        return {
            order_id: result.order_id,
            status: result.status,
            total: result.total,
            items: []
        };
    }
    async getOrders() {
        // Fetch the order list
        const listResponse = await this.client.get('/order/v1/order', {
            params: { page_size: 10, page_number: 1 }
        });
        const rawOrders = listResponse.data.orders || [];
        // Fetch full detail for each order (needed to get order_items)
        const orders = await Promise.all(rawOrders.map(async (o) => {
            let items = [];
            try {
                const detail = await this.client.get(`/order/v1/order/${o.order_uid}`);
                items = (detail.data.order_items || []).map((item) => ({
                    item_id: item.product.product_uid,
                    product_uid: item.product.product_uid,
                    name: item.product.name,
                    quantity: item.quantity,
                    unit_price: parseFloat((item.sub_total / item.quantity).toFixed(2)),
                    total_price: parseFloat(item.sub_total)
                }));
            }
            catch {
                // detail fetch failed — order still usable without items
            }
            return {
                order_id: o.order_uid,
                status: o.status,
                total: parseFloat(o.total || 0),
                delivery_slot: o.slot_start_time ? {
                    slot_id: '',
                    start_time: o.slot_start_time,
                    end_time: o.slot_end_time || '',
                    date: o.slot_start_time.split('T')[0],
                    price: parseFloat(o.slot_price || 0),
                    available: true
                } : undefined,
                items
            };
        }));
        return orders;
    }
}
exports.SainsburysProvider = SainsburysProvider;
//# sourceMappingURL=sainsburys.js.map