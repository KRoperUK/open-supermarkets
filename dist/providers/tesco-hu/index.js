"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TescoHuProvider = exports.normaliseBasket = exports.normaliseProduct = exports.flattenTaxonomy = void 0;
const api_1 = require("./api");
const session_1 = require("./session");
/** superDepartment → department → aisle, flattened with a breadcrumb path. */
function flattenTaxonomy(nodes, depth = 0, parentPath = '') {
    const out = [];
    for (const node of nodes ?? []) {
        const name = String(node?.name ?? '');
        const path = parentPath ? `${parentPath} > ${name}` : name;
        out.push({ id: String(node?.id ?? ''), name, label: String(node?.label ?? ''), depth, path });
        if (Array.isArray(node?.children))
            out.push(...flattenTaxonomy(node.children, depth + 1, path));
    }
    return out;
}
exports.flattenTaxonomy = flattenTaxonomy;
function normaliseProduct(p, provider = api_1.TESCO_HU.id) {
    const price = p?.price ?? {};
    const unitPrice = price.unitPrice !== undefined && price.unitPrice !== null && price.unitOfMeasure
        ? { price: Number(price.unitPrice), measure: String(price.unitOfMeasure) }
        : undefined;
    // `status` is authoritative when present. Without it fall back to isForSale.
    // The Product interface has no "unknown", so an absent field reads as not in
    // stock rather than as available — never claim stock we did not see.
    const inStock = typeof p?.status === 'string' ? p.status === 'AvailableForSale' : p?.isForSale === true;
    const stats = p?.reviews?.stats;
    const crumbs = [p?.departmentName, p?.aisleName].filter(Boolean);
    return {
        product_uid: String(p?.id ?? p?.tpnc ?? ''),
        name: String(p?.title ?? 'Unknown product'),
        description: crumbs.length ? crumbs.join(' / ') : undefined,
        retail_price: { price: Number(price.actual ?? 0) },
        unit_price: unitPrice,
        in_stock: inStock,
        image_url: p?.defaultImageUrl || undefined,
        provider,
        currency: api_1.TESCO_HU.currency,
        rating: typeof stats?.overallRating === 'number' ? stats.overallRating : undefined,
        review_count: typeof stats?.noOfReviews === 'number' ? stats.noOfReviews : undefined,
    };
}
exports.normaliseProduct = normaliseProduct;
function normaliseBasketItem(item) {
    const product = item?.product ?? {};
    const quantity = Number(item?.quantity ?? 1);
    const unitPrice = Number(product?.price?.actual ?? 0);
    const cost = item?.cost;
    return {
        item_id: String(item?.id ?? ''),
        product_uid: String(product?.id ?? product?.tpnb ?? ''),
        name: String(product?.title ?? 'Unknown item'),
        quantity,
        unit_price: unitPrice,
        total_price: cost !== undefined && cost !== null ? Number(cost) : unitPrice * quantity,
    };
}
/** GetBasket → Basket. splitView is an array in the mfe-trolley shape; tolerate an object. */
function normaliseBasket(data, provider = api_1.TESCO_HU.id) {
    const basket = data?.basket ?? data ?? {};
    const view = Array.isArray(basket?.splitView) ? basket.splitView[0] : basket?.splitView;
    const items = view?.items ?? [];
    const normalised = items.map(normaliseBasketItem);
    const totalItems = view?.totalItems !== undefined && view?.totalItems !== null
        ? Number(view.totalItems)
        : normalised.reduce((s, i) => s + i.quantity, 0);
    return {
        items: normalised,
        total_quantity: totalItems,
        total_cost: Number(view?.totalPrice ?? 0),
        provider,
        currency: api_1.TESCO_HU.currency,
    };
}
exports.normaliseBasket = normaliseBasket;
class TescoHuProvider {
    constructor() {
        this.name = api_1.TESCO_HU.id;
        this.api = new api_1.TescoHuAPI(api_1.TESCO_HU);
        try {
            const session = (0, session_1.loadSession)();
            if (session?.cookies?.length)
                this.api.setAuthCookies((0, session_1.getCookieString)(session));
        }
        catch {
            // A corrupt session file must not break anonymous search. Basket calls
            // will raise the session error with instructions.
        }
    }
    /** Exposed for tests and provider-specific commands. */
    getAPI() {
        return this.api;
    }
    // ── catalogue ────────────────────────────────────────────────────────
    async search(query, options) {
        const count = options?.limit || 24;
        const page = options?.offset ? Math.floor(options.offset / count) + 1 : 1;
        const { products } = await this.api.search(query, page, count);
        return products.map(p => normaliseProduct(p, this.name));
    }
    async getProduct(productId) {
        const p = await this.api.getProduct(productId);
        if (!p)
            throw new Error(`${this.name}: product ${productId} not found`);
        return normaliseProduct(p, this.name);
    }
    async getCategories() {
        return flattenTaxonomy(await this.api.getCategories());
    }
    // ── auth ─────────────────────────────────────────────────────────────
    async logout() {
        (0, session_1.clearSession)();
    }
    async isAuthenticated() {
        if (!this.api.hasAuthCookies())
            return false;
        try {
            await this.api.getBasket();
            return true;
        }
        catch (err) {
            if (err instanceof api_1.TescoHuSessionError)
                return false;
            throw err;
        }
    }
    /** Raise the actionable session error before any network call. */
    requireSession() {
        if (!this.api.hasAuthCookies())
            throw new api_1.TescoHuSessionError((0, api_1.sessionHelp)(this.name));
    }
    // ── basket ───────────────────────────────────────────────────────────
    //
    // Wired, but NOT declared in the manifest until a live round-trip with an
    // imported session has been verified (see the spec's capability promotion rule).
    async getBasket() {
        this.requireSession();
        return normaliseBasket(await this.api.getBasket(), this.name);
    }
    /** The basket's own id doubles as the orderId that UpdateBasket needs. */
    async getBasketOrderId() {
        const data = await this.api.getBasket();
        const orderId = data?.basket?.id ?? data?.id;
        if (!orderId)
            throw new Error(`${this.name}: could not read the basket id — is the session valid?`);
        return String(orderId);
    }
    /**
     * UpdateBasket takes the product id, but `remove`/`update` are documented to
     * take the basket line id like every other provider. Resolve either against
     * the live basket; an unknown id is passed through as a product id.
     */
    async resolveProductUid(itemOrProductId) {
        const basket = normaliseBasket(await this.api.getBasket(), this.name);
        const match = basket.items.find(i => i.item_id === itemOrProductId || i.product_uid === itemOrProductId);
        return match?.product_uid ?? itemOrProductId;
    }
    async addToBasket(productId, quantity) {
        this.requireSession();
        const orderId = await this.getBasketOrderId();
        await this.api.updateBasket(productId, quantity, orderId);
    }
    async updateBasketItem(itemId, quantity) {
        this.requireSession();
        const productUid = await this.resolveProductUid(itemId);
        const orderId = await this.getBasketOrderId();
        await this.api.updateBasket(productUid, quantity, orderId);
    }
    async removeFromBasket(itemId) {
        await this.updateBasketItem(itemId, 0);
    }
    async clearBasket() {
        this.requireSession();
        const basket = normaliseBasket(await this.api.getBasket(), this.name);
        const orderId = await this.getBasketOrderId();
        for (const item of basket.items) {
            await this.api.updateBasket(item.product_uid, 0, orderId);
        }
    }
}
exports.TescoHuProvider = TescoHuProvider;
//# sourceMappingURL=index.js.map