import { FullGroceryProvider } from './types';
export * from './types';
export * from './registry';
/**
 * Provider ids are strings now, not a closed union — adding a country must not
 * mean editing a type in a different file. `getManifest()` validates at runtime
 * and throws with the available list.
 */
export type ProviderName = string;
/**
 * Legacy synchronous factory, kept so existing callers and the MCP server keep
 * working. It eagerly requires the UK providers.
 *
 * Prefer `createProvider()` from the registry: it loads one provider on demand
 * instead of all of them, which is the whole point of the manifest.
 *
 * @deprecated use `createProvider()`
 */
export declare class ProviderFactory {
    static create(name: ProviderName): FullGroceryProvider;
    static getAvailableProviders(): ProviderName[];
    static createAll(): FullGroceryProvider[];
}
/**
 * Search the same query across several providers at once.
 * Defaults to every search-capable provider in the given country.
 */
export declare function compareProduct(query: string, providers?: ProviderName[], limit?: number, country?: string): Promise<{
    provider: string;
    products: import("./types").Product[];
    error: string | null;
}[]>;
//# sourceMappingURL=index.d.ts.map