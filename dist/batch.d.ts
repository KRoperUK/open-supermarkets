/**
 * Batch primitives, for agents.
 *
 * A week of meals is roughly thirty ingredients. One at a time that is thirty
 * searches plus thirty adds — sixty process starts at ~0.85s each, sixty MCP
 * round trips, and sixty tool results sitting in the model's context. The agent
 * spends most of its budget on plumbing rather than on deciding what to cook,
 * and every one of those calls is a place a run can half-fail and leave a basket
 * in an unknown state.
 *
 * These run the same work in one invocation, one auth, one report.
 *
 * Deliberately NOT included: any attempt to resolve ambiguity. Picking between a
 * 650g pack and a 200g recipe requirement is a judgement about someone's money
 * and their fridge, and the model has context the CLI never will — the rest of
 * the meal plan, the budget, whether leftovers are fine. So batch search returns
 * CANDIDATES and the model chooses. The CLI does not get an opinion.
 */
import type { GroceryProvider, Product, SearchOptions } from './providers/types';
/** A query, or a query with per-item overrides. */
export type BatchQuery = string | {
    query: string;
    limit?: number;
};
export interface BatchSearchResult {
    query: string;
    products: LeanProduct[];
    error?: string;
}
/**
 * The fields a model needs to choose between two milks, and nothing else.
 *
 * Thirty queries × five candidates × a full Product is a serious slice of a
 * context window, and images, descriptions and ratings are noise to something
 * deciding on price, size and availability.
 */
export interface LeanProduct {
    id: string;
    name: string;
    price: number;
    currency: string;
    size?: string;
    unit?: string;
    inStock: boolean;
}
export declare function lean(p: Product): LeanProduct;
/**
 * Run many searches against one provider.
 *
 * Bounded concurrency because these are reverse-engineered endpoints that
 * rate-limit — firing thirty parallel requests at Albert Heijn is how you get a
 * 403 and conclude the integration is broken. A failed query yields an `error`
 * on that entry rather than sinking the batch, since one bad ingredient should
 * not cost you the other twenty-nine.
 */
export declare function batchSearch(provider: GroceryProvider, queries: BatchQuery[], options?: SearchOptions & {
    concurrency?: number;
}): Promise<BatchSearchResult[]>;
export interface BatchAddItem {
    id: string;
    qty?: number;
}
export interface BatchAddResult {
    id: string;
    qty: number;
    ok: boolean;
    error?: string;
}
/**
 * Add many products to a basket.
 *
 * Sequential, unlike search. Baskets are mutable server-side state and several
 * providers resolve item ids against the live basket on every write, so
 * concurrent adds race each other. Slower and correct beats faster and wrong
 * when the artefact is someone's shopping.
 */
export declare function batchAdd(provider: GroceryProvider, items: BatchAddItem[]): Promise<BatchAddResult[]>;
/**
 * Parse a batch file or stdin payload.
 *
 * Accepts what an agent is likely to emit without being told a schema: a bare
 * array of strings, an array of objects, or either wrapped in `{queries}` /
 * `{items}`. Newline-delimited plain text works too, because that is what falls
 * out of a shell pipeline.
 */
export declare function parseBatchInput(raw: string): BatchQuery[];
export declare function parseAddInput(raw: string): BatchAddItem[];
//# sourceMappingURL=batch.d.ts.map