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
import type { Capability, GroceryProvider, ProviderManifest } from './types';
export declare const PROVIDERS: ProviderManifest[];
export declare class UnknownProviderError extends Error {
    constructor(id: string, available: string[]);
}
export declare class MissingCapabilityError extends Error {
    constructor(providerId: string, capability: Capability);
}
export declare function getManifest(id: string): ProviderManifest;
/** Every country with at least one provider, sorted. */
export declare function countries(): string[];
export interface ListOptions {
    country?: string;
    capability?: Capability;
    tier?: ProviderManifest['tier'];
}
/** Filter manifests. Loads no provider code. */
export declare function list(opts?: ListOptions): ProviderManifest[];
export declare function supports(id: string, capability: Capability): boolean;
export declare function assertCapability(id: string, capability: Capability): void;
/** Instantiate a provider, importing its module only now. */
export declare function createProvider(id: string): Promise<GroceryProvider>;
/**
 * Resolve which country we are shopping in.
 *
 * Explicit flag beats env beats system locale. Falls back to GB, which is
 * where the project started and where the most providers are.
 */
export declare function resolveCountry(explicit?: string): string;
/**
 * Providers usable in a country for a given capability.
 * Throws with something actionable rather than returning an empty array,
 * because "no results" is almost always a country mismatch.
 */
export declare function providersFor(country: string, capability?: Capability): ProviderManifest[];
//# sourceMappingURL=registry.d.ts.map