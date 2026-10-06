/**
 * Tesco API Discovery Tool
 *
 * Launches a non-headless Playwright session that intercepts all network
 * requests to *.tesco.com so we can learn the real endpoint paths,
 * required headers, and cookie names before writing the API client.
 *
 * Usage:
 *   npm run groc -- --provider tesco discover
 */
export declare function discover(): Promise<void>;
//# sourceMappingURL=discover.d.ts.map