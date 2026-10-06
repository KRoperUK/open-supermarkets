/**
 * Turn transport errors into something a person can act on.
 *
 * Providers are reverse-engineered integrations against sites that rate-limit,
 * expire sessions and deploy bot protection. The raw failure is almost always
 * "Request failed with status code 401", which tells the user nothing and sends
 * them to the issue tracker for what is usually an expired login.
 *
 * Translating here rather than inside each provider is deliberate: there are six
 * providers and a dozen methods each, most with no try/catch at all. One
 * translation at the boundary fixes every command for every provider, including
 * ones not written yet.
 *
 * Providers that DO have something specific to say (Tesco's session help, Albert
 * Heijn's rate-limit note, Ocado's explanation that checkout was never captured)
 * still win — their messages are preserved untouched.
 */
export interface ExplainOptions {
    /** Provider id, so the suggested fix names the right one. */
    provider?: string;
    /** What was being attempted, e.g. "get slots". Used in the message. */
    action?: string;
}
export declare function explain(err: any, opts?: ExplainOptions): string;
//# sourceMappingURL=errors.d.ts.map