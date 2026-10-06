"use strict";
/**
 * Tesco Hungary — GraphQL client for https://xapi.tesco.com/
 *
 * bevasarlas.tesco.hu is the same Tesco micro-frontend platform as www.tesco.com
 * and talks to the same GraphQL backend ("mango") with the same public API key.
 * The `region` and `language` headers select the Hungarian catalogue: the same
 * product id returns "Banán lédig" with region HU and product-not-found with UK.
 *
 * Unlike the storefront, xapi answers plain HTTP clients — no Akamai challenge —
 * so search needs no browser and no account. Verified live 2026-09-17.
 *
 * Schema notes (introspection is disabled; learned from the site's SSR cache):
 *   - Product fields: id tpnb tpnc gtin title status isForSale defaultImageUrl
 *     price { actual unitPrice unitOfMeasure } reviews { stats { ... } } ...
 *   - The UK fields isAvailable / displayPrice / unitPrice do NOT exist here.
 *   - search(query, page, count, sortBy) and category(facet, page, sortBy, count)
 *     both return { info { total page count pageSize offset } results { node } }.
 *
 * Request format: POST / with a JSON array of operations; the response is an
 * array in the same order, each element { data, errors?, status }.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TescoHuAPI = exports.sessionHelp = exports.TescoHuSessionError = exports.TESCO_HU = exports.TESCO_API_KEY = exports.XAPI_URL = void 0;
const axios_1 = __importDefault(require("axios"));
exports.XAPI_URL = 'https://xapi.tesco.com/';
/** Public key baked into the site's page config (`mangoApiKey`). Same as the UK. */
exports.TESCO_API_KEY = 'TvOSZJHlEk0pjniDGQFAc9Q59WGAR4dA';
exports.TESCO_HU = {
    id: 'tesco-hu',
    region: 'HU',
    language: 'hu-HU',
    currency: 'HUF',
    origin: 'https://bevasarlas.tesco.hu',
    shopPath: '/shop/hu-HU/',
};
class TescoHuSessionError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'TescoHuSessionError';
        this.status = status;
    }
}
exports.TescoHuSessionError = TescoHuSessionError;
function sessionHelp(providerId, status) {
    return [
        `${providerId} session missing or rejected${status ? ` (${status})` : ''}.`,
        `Sign in at https://www.tesco.hu/account/login/hu-HU in your browser, copy the Cookie request header`,
        `from DevTools → Network on any bevasarlas.tesco.hu request, then run`,
        `\`supermarket --provider ${providerId} import-session --stdin\` and paste it.`,
        `Check with \`supermarket status --provider ${providerId}\`.`,
    ].join(' ');
}
exports.sessionHelp = sessionHelp;
const PRODUCT_FIELDS = `
  id
  tpnb
  tpnc
  gtin
  title
  status
  isForSale
  defaultImageUrl
  bulkBuyLimit
  averageWeight
  productType
  superDepartmentName
  departmentName
  aisleName
  shelfName
  price { actual unitPrice unitOfMeasure }
  promotions { id description }
  reviews { stats { noOfReviews overallRating } }
`;
function httpStatusOf(err) {
    return err?.response?.status ?? err?.extensions?.http?.status;
}
class TescoHuAPI {
    constructor(config = exports.TESCO_HU) {
        this.config = config;
        this.client = axios_1.default.create({
            headers: {
                'x-apikey': exports.TESCO_API_KEY,
                region: config.region,
                language: config.language,
                'accept-language': config.language,
                'content-type': 'application/json',
                accept: 'application/json',
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
                Origin: config.origin,
                Referer: `${config.origin}${config.shopPath}`,
            },
        });
    }
    /** Inject cookies from an imported session (see session.ts). */
    setAuthCookies(cookieString) {
        this.client.defaults.headers.common['Cookie'] = cookieString;
    }
    hasAuthCookies() {
        return Boolean(this.client.defaults.headers.common['Cookie']);
    }
    /**
     * Send one operation as a one-element batch and unwrap the first result.
     * GraphQL errors are thrown; an Unauthorized error or a 401/403 becomes a
     * TescoHuSessionError so the CLI/MCP boundary can tell the user what to do.
     */
    async gql(operationName, query, variables = {}) {
        let response;
        try {
            response = await this.client.post(exports.XAPI_URL, [{ operationName, variables, query }]);
        }
        catch (err) {
            const status = httpStatusOf(err);
            if (status === 401 || status === 403)
                throw new TescoHuSessionError(sessionHelp(this.config.id, status), status);
            throw err;
        }
        const result = Array.isArray(response.data) ? response.data[0] : response.data;
        const errors = result?.errors ?? [];
        if (errors.length) {
            const auth = errors.find(e => /unauthori[sz]ed/i.test(String(e?.message)) || [401, 403].includes(httpStatusOf(e)));
            if (auth) {
                const status = httpStatusOf(auth) ?? 401;
                throw new TescoHuSessionError(sessionHelp(this.config.id, status), status);
            }
            const msg = errors.map(e => e?.message).filter(Boolean).join(', ');
            throw new Error(`GraphQL error (${operationName}): ${msg}`);
        }
        return result?.data;
    }
    // ── catalogue (anonymous) ────────────────────────────────────────────
    async search(query, page, count) {
        const data = await this.gql('Search', `query Search($query: String!, $page: Int, $count: Int, $sortBy: String) {
        search(query: $query, page: $page, count: $count, sortBy: $sortBy) {
          info { total page count pageSize offset }
          results { node { ... on ProductType { ${PRODUCT_FIELDS} } } }
        }
      }`, { query, page, count, sortBy: 'relevance' });
        const results = data?.search?.results ?? [];
        return {
            total: Number(data?.search?.info?.total ?? 0),
            products: results.map(r => r?.node).filter(Boolean),
        };
    }
    async getProduct(tpnc) {
        const data = await this.gql('GetProduct', `query GetProduct($tpnc: String) { product(tpnc: $tpnc) { ${PRODUCT_FIELDS} } }`, { tpnc });
        return data?.product;
    }
    /** Superdepartment → department → aisle tree. */
    async getCategories() {
        const data = await this.gql('Taxonomy', `query Taxonomy($includeChildren: Boolean = true) {
        taxonomy(includeInspirationEvents: false) {
          name
          label
          children @include(if: $includeChildren) {
            id
            name
            label
            children { id name label }
          }
        }
      }`, { includeChildren: true });
        return data?.taxonomy ?? [];
    }
    // ── basket (needs an imported session) ──────────────────────────────
    async getBasket() {
        return this.gql('GetBasket', `query GetBasket {
        basket {
          id
          splitView {
            id
            totalPrice
            guidePrice
            totalItems
            items {
              id
              quantity
              cost
              unit
              product { id tpnb gtin title defaultImageUrl price { actual unitPrice unitOfMeasure } }
            }
          }
        }
      }`);
    }
    /**
     * Add, change or remove a line. quantity 0 removes. orderId is basket.id from
     * getBasket(). Same mutation the Hungarian mfe-basket-manager bundle uses.
     */
    async updateBasket(tpnc, quantity, orderId) {
        return this.gql('UpdateBasket', `mutation UpdateBasket($items: [BasketLineItemInputType], $orderId: ID) {
        basket(items: $items, orderId: $orderId) {
          id
          splitView {
            id
            totalPrice
            totalItems
            items { id quantity cost product { id title } }
          }
        }
      }`, { orderId, items: [{ adjustment: false, id: tpnc, newValue: quantity, newUnitChoice: 'pcs' }] });
    }
}
exports.TescoHuAPI = TescoHuAPI;
//# sourceMappingURL=api.js.map