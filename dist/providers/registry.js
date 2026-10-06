"use strict";
/**
 * The provider registry.
 *
 * Two rules make this scale past one country:
 *
 *   1. Manifests are declarative and import nothing. Listing, filtering and
 *      the capability matrix all work without loading a single provider.
 *   2. Provider code is loaded on demand, by country. Someone shopping in the
 *      UK never loads the German provider, never installs its dependencies'
 *      cost, and never sees its breakage.
 *
 * Adding a provider means adding one manifest entry and one file. Nothing else
 * in the codebase needs to know it exists.
 */
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.providersFor = exports.resolveCountry = exports.createProvider = exports.assertCapability = exports.supports = exports.list = exports.countries = exports.getManifest = exports.MissingCapabilityError = exports.UnknownProviderError = exports.PROVIDERS = void 0;
exports.PROVIDERS = [
    // ── United Kingdom ───────────────────────────────────────────────────
    {
        id: 'sainsburys',
        label: "Sainsbury's",
        country: 'GB',
        capabilities: ['search', 'basket', 'slots', 'checkout', 'orders'],
        auth: 'credentials',
        tier: 'core',
        maintainer: 'abracadabra50',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./sainsburys')))).SainsburysProvider,
    },
    {
        id: 'ocado',
        label: 'Ocado',
        country: 'GB',
        // No 'checkout': slot *booking* and checkout are blocked by AWS WAF bot
        // detection as of 2026-07. Reading slots works; committing to one does not.
        // Declaring a capability we cannot deliver is worse than declaring none.
        capabilities: ['search', 'basket', 'slots', 'orders'],
        auth: 'credentials',
        tier: 'core',
        maintainer: 'abracadabra50',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./ocado')))).OcadoProvider,
    },
    {
        id: 'tesco',
        label: 'Tesco',
        country: 'GB',
        capabilities: ['search', 'basket', 'slots', 'checkout', 'orders'],
        auth: 'session-cookie',
        tier: 'core',
        maintainer: 'abracadabra50',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./tesco/index')))).TescoProvider,
    },
    // ── Netherlands ──────────────────────────────────────────────────────
    {
        id: 'ah',
        label: 'Albert Heijn',
        country: 'NL',
        capabilities: ['search'],
        auth: 'anonymous',
        tier: 'core',
        maintainer: 'abracadabra50',
        credit: 'Protocol documented by github.com/gwillem/appie-go (Go, MIT)',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./ah')))).AlbertHeijnProvider,
    },
    {
        id: 'ah-be',
        label: 'Albert Heijn België',
        country: 'BE',
        capabilities: ['search'],
        auth: 'anonymous',
        tier: 'core',
        maintainer: 'abracadabra50',
        credit: 'Same API as ah; storefront selected by the x-application header',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./ah')))).AlbertHeijnBEProvider,
    },
    // ── Spain ────────────────────────────────────────────────────────────
    {
        id: 'mercadona',
        label: 'Mercadona',
        country: 'ES',
        capabilities: ['search'],
        auth: 'none',
        tier: 'core',
        maintainer: 'abracadabra50',
        credit: 'Open REST catalogue + the storefront\'s public Algolia search key',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./mercadona')))).MercadonaProvider,
    },
    {
        id: 'ahorramas',
        label: 'AhorraMás',
        country: 'ES',
        capabilities: ['search'],
        auth: 'none',
        tier: 'community',
        maintainer: 'vgvr0',
        credit: 'Salesforce Commerce Cloud storefront using anonymous server-rendered catalogue pages',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./ahorramas')))).AhorramasProvider,
    },
    // ── Hungary ──────────────────────────────────────────────────────────
    {
        id: 'tesco-hu',
        label: 'Tesco Magyarország',
        country: 'HU',
        // Basket verified live on 2026-09-17 with an imported browser session
        // (add one item, read it back, remove it, totals restored).
        capabilities: ['search', 'basket'],
        auth: 'session-cookie',
        tier: 'community',
        maintainer: 'benedek',
        credit: 'Same xapi.tesco.com GraphQL backend as the UK provider, selected by region/language headers; ' +
            'schema differences learned from the storefront\'s server-rendered Apollo cache',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./tesco-hu/index')))).TescoHuProvider,
    },
    // ── United States ────────────────────────────────────────────────────
    {
        id: 'kroger',
        label: 'Kroger',
        country: 'US',
        capabilities: ['search'],
        auth: 'oauth',
        tier: 'core',
        maintainer: 'abracadabra50',
        credit: 'Official Kroger Public Products API (developer.kroger.com)',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./kroger')))).KrogerProvider,
    },
    {
        id: 'instacart',
        label: 'Instacart (official API)',
        country: 'US',
        countries: ['US', 'CA'],
        capabilities: ['search', 'basket'],
        auth: 'api-key',
        tier: 'core',
        maintainer: 'abracadabra50',
        credit: 'Official Instacart Developer Platform API',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./instacart')))).InstacartProvider,
    },
    {
        id: 'instacart-web',
        label: 'Instacart (unofficial)',
        country: 'US',
        countries: ['US', 'CA'],
        capabilities: ['search', 'basket'],
        auth: 'session-cookie',
        tier: 'core',
        maintainer: 'abracadabra50',
        credit: 'Protocol documented by github.com/kleinjm/instacart_api (Ruby, MIT)',
        load: async () => (await Promise.resolve().then(() => __importStar(require('./instacart-web')))).InstacartWebProvider,
    },
];
const byId = new Map(exports.PROVIDERS.map((p) => [p.id, p]));
class UnknownProviderError extends Error {
    constructor(id, available) {
        super(`Unknown provider: "${id}".\n` +
            `Available: ${available.join(', ')}\n` +
            `Run \`supermarket providers\` to see them with countries and capabilities.`);
        this.name = 'UnknownProviderError';
    }
}
exports.UnknownProviderError = UnknownProviderError;
class MissingCapabilityError extends Error {
    constructor(providerId, capability) {
        super(`${providerId} does not support "${capability}".\n` +
            `Run \`supermarket providers\` to see what it can do.`);
        this.name = 'MissingCapabilityError';
    }
}
exports.MissingCapabilityError = MissingCapabilityError;
function getManifest(id) {
    const m = byId.get(id);
    if (!m)
        throw new UnknownProviderError(id, exports.PROVIDERS.map((p) => p.id));
    return m;
}
exports.getManifest = getManifest;
/** Every country with at least one provider, sorted. */
function countries() {
    const set = new Set();
    for (const p of exports.PROVIDERS) {
        set.add(p.country);
        p.countries?.forEach((c) => set.add(c));
    }
    return [...set].sort();
}
exports.countries = countries;
/** Filter manifests. Loads no provider code. */
function list(opts = {}) {
    return exports.PROVIDERS.filter((p) => {
        if (opts.country) {
            const serves = p.country === opts.country || p.countries?.includes(opts.country);
            if (!serves)
                return false;
        }
        if (opts.capability && !p.capabilities.includes(opts.capability))
            return false;
        if (opts.tier && p.tier !== opts.tier)
            return false;
        return true;
    });
}
exports.list = list;
function supports(id, capability) {
    return getManifest(id).capabilities.includes(capability);
}
exports.supports = supports;
function assertCapability(id, capability) {
    if (!supports(id, capability))
        throw new MissingCapabilityError(id, capability);
}
exports.assertCapability = assertCapability;
/** Instantiate a provider, importing its module only now. */
async function createProvider(id) {
    const Ctor = await getManifest(id).load();
    return new Ctor();
}
exports.createProvider = createProvider;
/**
 * Resolve which country we are shopping in.
 *
 * Explicit flag beats env beats system locale. Falls back to GB, which is
 * where the project started and where the most providers are.
 */
function resolveCountry(explicit) {
    if (explicit)
        return explicit.toUpperCase();
    // GROC_* is the pre-3.0 prefix, still honoured so existing setups keep working.
    const fromEnvVar = process.env.SUPERMARKET_COUNTRY ?? process.env.GROC_COUNTRY;
    if (fromEnvVar)
        return fromEnvVar.toUpperCase();
    const locale = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || '';
    const fromEnv = locale.match(/[_-]([A-Z]{2})/);
    if (fromEnv)
        return fromEnv[1];
    try {
        const resolved = Intl.DateTimeFormat().resolvedOptions().locale;
        const m = resolved.match(/[_-]([A-Z]{2})/i);
        if (m)
            return m[1].toUpperCase();
    }
    catch {
        // Intl unavailable; fall through.
    }
    return 'GB';
}
exports.resolveCountry = resolveCountry;
/**
 * Providers usable in a country for a given capability.
 * Throws with something actionable rather than returning an empty array,
 * because "no results" is almost always a country mismatch.
 */
function providersFor(country, capability) {
    const found = list({ country, capability });
    if (found.length === 0) {
        const inCountry = list({ country });
        if (inCountry.length === 0) {
            throw new Error(`No providers for country "${country}". ` +
                `Countries covered: ${countries().join(', ')}.\n` +
                `Set one with --country, or SUPERMARKET_COUNTRY.`);
        }
        throw new Error(`No provider in "${country}" supports "${capability}". ` +
            `Available there: ${inCountry
                .map((p) => `${p.id} (${p.capabilities.join('/')})`)
                .join(', ')}`);
    }
    return found;
}
exports.providersFor = providersFor;
//# sourceMappingURL=registry.js.map