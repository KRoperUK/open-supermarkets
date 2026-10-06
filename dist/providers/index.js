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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareProduct = exports.ProviderFactory = void 0;
const registry_1 = require("./registry");
__exportStar(require("./types"), exports);
__exportStar(require("./registry"), exports);
/**
 * Legacy synchronous factory, kept so existing callers and the MCP server keep
 * working. It eagerly requires the UK providers.
 *
 * Prefer `createProvider()` from the registry: it loads one provider on demand
 * instead of all of them, which is the whole point of the manifest.
 *
 * @deprecated use `createProvider()`
 */
class ProviderFactory {
    static create(name) {
        (0, registry_1.getManifest)(name); // throws with a helpful message for unknown ids
        switch (name) {
            case 'sainsburys':
                return new (require('./sainsburys').SainsburysProvider)();
            case 'ocado':
                return new (require('./ocado').OcadoProvider)();
            case 'tesco':
                return new (require('./tesco/index').TescoProvider)();
            case 'ah':
                return new (require('./ah').AlbertHeijnProvider)();
            case 'ah-be':
                return new (require('./ah').AlbertHeijnBEProvider)();
            case 'mercadona':
                return new (require('./mercadona').MercadonaProvider)();
            case 'ahorramas':
                return new (require('./ahorramas').AhorramasProvider)();
            case 'tesco-hu':
                return new (require('./tesco-hu/index').TescoHuProvider)();
            case 'kroger':
                return new (require('./kroger').KrogerProvider)();
            case 'instacart':
                return new (require('./instacart').InstacartProvider)();
            case 'instacart-web':
                return new (require('./instacart-web').InstacartWebProvider)();
            default:
                // Reachable only if a manifest entry has no case here — which the
                // registry-parity test catches before it ships.
                throw new Error(`"${name}" has a manifest entry but no synchronous constructor. ` +
                    `Add a case to ProviderFactory.create, or use \`await createProvider('${name}')\`.`);
        }
    }
    static getAvailableProviders() {
        return registry_1.PROVIDERS.map((p) => p.id);
    }
    static createAll() {
        return (0, registry_1.list)({ country: 'GB' }).map((p) => this.create(p.id));
    }
}
exports.ProviderFactory = ProviderFactory;
// NOTE: deliberately no `export { SainsburysProvider } from './sainsburys'` etc.
// A static re-export here would make this barrel eagerly load every provider —
// including Tesco, which pulls in Playwright — the moment anything imports
// `./providers` for a type or a registry helper. That would defeat the manifest's
// lazy `load()` thunks entirely.
//
// Need a concrete class? Import its module directly, or use `createProvider(id)`.
// There is a test in `test/lazy-loading.test.ts` that fails if this regresses.
/**
 * Search the same query across several providers at once.
 * Defaults to every search-capable provider in the given country.
 */
async function compareProduct(query, providers, limit = 5, country = 'GB') {
    const ids = providers ?? (0, registry_1.list)({ country, capability: 'search' }).map((p) => p.id);
    return Promise.all(ids.map(async (id) => {
        try {
            const provider = await (0, registry_1.createProvider)(id);
            const products = await provider.search(query, { limit });
            return { provider: id, products, error: null };
        }
        catch (error) {
            return { provider: id, products: [], error: error.message };
        }
    }));
}
exports.compareProduct = compareProduct;
//# sourceMappingURL=index.js.map