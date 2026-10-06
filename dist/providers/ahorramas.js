"use strict";
/**
 * AhorraMás (Spain) — anonymous server-rendered catalogue search.
 *
 * AhorraMás uses Salesforce Commerce Cloud (Demandware). The public search
 * page and its pagination fragments contain the product data needed by the
 * search-only provider, so no browser, login, cookie jar or postcode is
 * required here. Store selection can affect availability and basket behaviour
 * and is deliberately outside this first implementation.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AhorramasProvider = exports.parseSearchPage = exports.parseProductTile = exports.parseUnitPrice = exports.parsePrice = exports.AHORRAMAS_PAGE_SIZE = exports.AHORRAMAS_BASE = void 0;
const axios_1 = __importDefault(require("axios"));
exports.AHORRAMAS_BASE = 'https://www.ahorramas.com';
const SEARCH_PATH = '/buscador';
const GRID_PATH = '/on/demandware.store/Sites-Ahorramas-Site/es/Search-UpdateGrid';
exports.AHORRAMAS_PAGE_SIZE = 20;
const VOID_TAGS = new Set([
    'area',
    'base',
    'br',
    'col',
    'embed',
    'hr',
    'img',
    'input',
    'link',
    'meta',
    'param',
    'source',
    'track',
    'wbr',
]);
function decodeHtml(value) {
    return value
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
        .replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)));
}
function parseAttributes(source) {
    const attrs = {};
    let index = 0;
    while (index < source.length) {
        while (/\s/.test(source[index] ?? ''))
            index++;
        if (index >= source.length || source[index] === '/' || source[index] === '>')
            break;
        const nameStart = index;
        while (index < source.length && !/[\s=/>]/.test(source[index]))
            index++;
        const name = source.slice(nameStart, index).toLowerCase();
        if (!name) {
            index++;
            continue;
        }
        while (/\s/.test(source[index] ?? ''))
            index++;
        let value = '';
        if (source[index] === '=') {
            index++;
            while (/\s/.test(source[index] ?? ''))
                index++;
            const quote = source[index];
            if (quote === '"' || quote === "'") {
                index++;
                const valueStart = index;
                while (index < source.length && source[index] !== quote)
                    index++;
                value = source.slice(valueStart, index);
                if (source[index] === quote)
                    index++;
            }
            else {
                const valueStart = index;
                while (index < source.length && !/[\s>]/.test(source[index]))
                    index++;
                value = source.slice(valueStart, index);
            }
        }
        attrs[name] = decodeHtml(value);
    }
    return attrs;
}
/** A deliberately small HTML tree builder for the stable semantic markup used by the tiles. */
function parseHtml(html) {
    const root = { tag: '#root', attrs: {}, children: [], text: '' };
    const stack = [root];
    const token = /<!--[\s\S]*?-->|<![^>]*>|<\/?[A-Za-z][^>]*>/g;
    let cursor = 0;
    let match;
    while ((match = token.exec(html))) {
        const directText = decodeHtml(html.slice(cursor, match.index));
        if (directText)
            stack[stack.length - 1].text += directText;
        const raw = match[0];
        if (raw.startsWith('<!--') || raw.startsWith('<!')) {
            cursor = token.lastIndex;
            continue;
        }
        if (raw.startsWith('</')) {
            const closingTag = raw.slice(2, -1).trim().toLowerCase();
            for (let index = stack.length - 1; index > 0; index--) {
                if (stack[index].tag === closingTag) {
                    stack.length = index;
                    break;
                }
            }
            cursor = token.lastIndex;
            continue;
        }
        const body = raw.slice(1, -1);
        const nameMatch = body.match(/^\s*([A-Za-z][\w:-]*)/);
        if (!nameMatch) {
            cursor = token.lastIndex;
            continue;
        }
        const tag = nameMatch[1].toLowerCase();
        const node = {
            tag,
            attrs: parseAttributes(body.slice(nameMatch[0].length)),
            children: [],
            text: '',
        };
        stack[stack.length - 1].children.push(node);
        if (!raw.endsWith('/>') && !VOID_TAGS.has(tag))
            stack.push(node);
        cursor = token.lastIndex;
    }
    const trailingText = decodeHtml(html.slice(cursor));
    if (trailingText)
        stack[stack.length - 1].text += trailingText;
    return root;
}
function classList(node) {
    return (node.attrs.class ?? '').split(/\s+/).filter(Boolean);
}
function hasClass(node, name) {
    return classList(node).includes(name);
}
function findAll(node, predicate) {
    const found = [];
    const visit = (candidate) => {
        if (predicate(candidate))
            found.push(candidate);
        for (const child of candidate.children)
            visit(child);
    };
    visit(node);
    return found;
}
function findFirst(node, predicate) {
    if (predicate(node))
        return node;
    for (const child of node.children) {
        const found = findFirst(child, predicate);
        if (found)
            return found;
    }
    return undefined;
}
function textContent(node) {
    if (!node)
        return '';
    return `${node.text} ${node.children.map(textContent).join(' ')}`
        .replace(/\s+/g, ' ')
        .trim();
}
function numericValue(value) {
    if (typeof value === 'number')
        return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string')
        return undefined;
    const cleaned = value.replace(/\s/g, '').replace(/[^\d,.-]/g, '');
    if (!cleaned)
        return undefined;
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalized = cleaned;
    if (lastComma >= 0 && lastDot >= 0) {
        normalized =
            lastComma > lastDot
                ? cleaned.replace(/\./g, '').replace(',', '.')
                : cleaned.replace(/,/g, '');
    }
    else if (lastComma >= 0) {
        normalized = cleaned.replace(',', '.');
    }
    const result = Number(normalized);
    return Number.isFinite(result) ? result : undefined;
}
/** Parse a rendered value such as "0,84€" or "1.234,56 EUR". */
function parsePrice(value) {
    return numericValue(value);
}
exports.parsePrice = parsePrice;
/** Parse the retailer's rendered price-per-unit label into Product.unit_price. */
function parseUnitPrice(value) {
    if (!value)
        return undefined;
    const match = value.match(/([\d.,]+)\s*(?:€|EUR)?\s*\/\s*(LITRO?|L|KILO?|KG|UNIDAD(?:ES)?|UDS?|U)\b/i);
    if (!match)
        return undefined;
    const price = parsePrice(match[1]);
    if (price === undefined)
        return undefined;
    const rawMeasure = match[2].toUpperCase();
    const measure = rawMeasure.startsWith('L') ? 'LITRO' :
        rawMeasure.startsWith('K') ? 'KILO' : 'UNIDAD';
    return { measure, price };
}
exports.parseUnitPrice = parseUnitPrice;
function parseAvailability(value) {
    if (!value)
        return undefined;
    const normalized = value.toLowerCase();
    if (normalized === 'true' || normalized.includes('instock'))
        return true;
    if (normalized === 'false' || normalized.includes('outofstock'))
        return false;
    return undefined;
}
function parseJsonLd(root) {
    const scripts = findAll(root, (node) => node.tag === 'script' && node.attrs.type === 'application/ld+json');
    const products = [];
    for (const script of scripts) {
        try {
            const value = JSON.parse(script.text.trim());
            const candidates = Array.isArray(value) ? value : [value];
            for (const candidate of candidates) {
                if (candidate?.['@type'] === 'Product')
                    products.push(candidate);
                for (const item of candidate?.itemListElement ?? []) {
                    if (item?.item?.['@type'] === 'Product')
                        products.push(item.item);
                }
            }
        }
        catch {
            // A broken optional JSON-LD block must not hide otherwise parseable tiles.
        }
    }
    return products;
}
function fallbackJsonLd(tile, products) {
    const id = tile.attrs['data-pid'];
    const link = findFirst(tile, (node) => node.tag === 'a' && !!node.attrs.href)?.attrs.href;
    return products.find((product) => String(product.sku ?? product.mpn ?? '') === id ||
        (link && String(product.url ?? '') === link));
}
/** Convert one semantic .product tile into the repository's Product shape. */
function parseProductTile(tile, jsonLdProducts = []) {
    const node = typeof tile === 'string' ? parseHtml(tile) : tile;
    const product = hasClass(node, 'product') ? node :
        findFirst(node, (candidate) => hasClass(candidate, 'product'));
    if (!product)
        throw new Error('AhorraMás product tile is missing .product');
    const structured = fallbackJsonLd(product, jsonLdProducts);
    const productId = product.attrs['data-pid'] ?? structured?.sku ?? structured?.mpn;
    const nameNode = findFirst(product, (candidate) => candidate.tag === 'h2' && hasClass(candidate, 'product-name-gtm'));
    const link = findFirst(product, (candidate) => candidate.tag === 'a' && hasClass(candidate, 'product-pdp-link'));
    const name = textContent(nameNode) || textContent(link) || structured?.name?.trim();
    const priceNode = findFirst(product, (candidate) => candidate.tag === 'span' && hasClass(candidate, 'value') && candidate.attrs.content !== undefined);
    const price = parsePrice(priceNode?.attrs.content ??
        findFirst(product, (candidate) => hasClass(candidate, 'add-to-cart'))?.attrs['data-price'] ??
        structured?.offers?.price);
    const availabilityNode = findFirst(product, (candidate) => hasClass(candidate, 'add-to-cart') && candidate.attrs['data-available'] !== undefined);
    const inStock = parseAvailability(availabilityNode?.attrs['data-available'] ?? structured?.offers?.availability);
    const unitPrice = parseUnitPrice(textContent(findFirst(product, (candidate) => hasClass(candidate, 'unit-price-per-unit'))));
    const image = findFirst(product, (candidate) => candidate.tag === 'img' && (candidate.attrs.itemprop === 'image' || candidate.attrs.src !== undefined));
    if (!productId || !name || price === undefined || inStock === undefined) {
        throw new Error('AhorraMás returned a product tile without a product id, name, price or explicit availability');
    }
    const result = {
        product_uid: String(productId),
        name,
        retail_price: { price },
        in_stock: inStock,
        provider: 'ahorramas',
        currency: structured?.offers?.priceCurrency ?? 'EUR',
    };
    if (unitPrice)
        result.unit_price = unitPrice;
    const description = structured?.description?.trim();
    if (description)
        result.description = description;
    const size = product.attrs['data-size'] ?? product.attrs['data-unitdata'];
    if (size)
        result.size = size;
    const imageUrl = image?.attrs.src ?? image?.attrs['data-src'] ??
        (Array.isArray(structured?.image) ? structured?.image[0] : structured?.image);
    if (imageUrl)
        result.image_url = imageUrl;
    return result;
}
exports.parseProductTile = parseProductTile;
/** Parse a full search page or a Search-UpdateGrid HTML fragment. */
function parseSearchPage(html) {
    if (!html || typeof html !== 'string') {
        throw new Error('AhorraMás returned an empty or non-HTML response');
    }
    const root = parseHtml(html);
    const tiles = findAll(root, (node) => hasClass(node, 'product') && node.attrs['data-pid'] !== undefined);
    if (tiles.length === 0) {
        const pageText = textContent(root).toLowerCase();
        if (pageText.includes('sin resultados') ||
            pageText.includes('no hemos encontrado') ||
            /no\s+(?:se\s+han\s+)?encontrado[\s\S]*resultados/.test(pageText))
            return [];
        throw new Error('AhorraMás returned unexpected search HTML: no product tiles found');
    }
    const jsonLdProducts = parseJsonLd(root);
    return tiles.map((tile) => parseProductTile(tile, jsonLdProducts));
}
exports.parseSearchPage = parseSearchPage;
function errorMessage(error, action) {
    if (axios_1.default.isAxiosError(error)) {
        const status = error.response?.status;
        return new Error(`AhorraMás ${action} failed${status ? ` (HTTP ${status})` : ''}: ${error.message}`);
    }
    return error instanceof Error ? error : new Error(`AhorraMás ${action} failed: ${String(error)}`);
}
class AhorramasProvider {
    constructor() {
        this.name = 'ahorramas';
        this.http = axios_1.default.create({
            baseURL: exports.AHORRAMAS_BASE,
            timeout: 15000,
            headers: { Accept: 'text/html' },
        });
    }
    async fetchPage(query, start) {
        const isInitialPage = start === 0;
        try {
            const response = await this.http.get(isInitialPage ? SEARCH_PATH : GRID_PATH, {
                params: isInitialPage
                    ? { q: query }
                    : { q: query, pmin: 0.01, start, sz: exports.AHORRAMAS_PAGE_SIZE },
                responseType: 'text',
            });
            if (typeof response.data !== 'string') {
                throw new Error('AhorraMás returned a non-HTML response');
            }
            return parseSearchPage(response.data);
        }
        catch (error) {
            throw errorMessage(error, 'search');
        }
    }
    async search(query, options = {}) {
        const normalizedQuery = query.trim();
        if (!normalizedQuery) {
            throw new Error('AhorraMás search query must not be empty');
        }
        if (options.category) {
            throw new Error('AhorraMás category filtering is not implemented yet');
        }
        const limit = options.limit ?? 10;
        const offset = options.offset ?? 0;
        if (!Number.isInteger(limit) || limit < 0) {
            throw new Error('AhorraMás search limit must be a non-negative integer');
        }
        if (!Number.isInteger(offset) || offset < 0) {
            throw new Error('AhorraMás search offset must be a non-negative integer');
        }
        if (limit === 0)
            return [];
        const firstStart = Math.floor(offset / exports.AHORRAMAS_PAGE_SIZE) * exports.AHORRAMAS_PAGE_SIZE;
        const results = [];
        let start = firstStart;
        while (results.length < limit) {
            const page = await this.fetchPage(normalizedQuery, start);
            if (page.length === 0)
                break;
            const pageOffset = Math.max(offset - start, 0);
            results.push(...page.slice(pageOffset, pageOffset + (limit - results.length)));
            if (page.length < exports.AHORRAMAS_PAGE_SIZE)
                break;
            start += exports.AHORRAMAS_PAGE_SIZE;
        }
        return results.slice(0, limit);
    }
}
exports.AhorramasProvider = AhorramasProvider;
//# sourceMappingURL=ahorramas.js.map