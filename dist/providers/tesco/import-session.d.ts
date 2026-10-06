/**
 * Tesco Session Import
 *
 * Fallback for when Playwright login is blocked by Akamai.
 * User exports cookies from Chrome DevTools (Application > Cookies > Export)
 * and passes the JSON file here — we write it to ~/.tesco/session.json.
 *
 * Usage:
 *   npm run groc -- --provider tesco import-session --file ~/Downloads/tesco-cookies.json
 *
 * How to export cookies from Chrome:
 *   1. Log in to tesco.com manually in Chrome
 *   2. Open DevTools (F12)
 *   3. Application tab > Storage > Cookies > https://www.tesco.com
 *   4. Right-click > Export (or use "Cookie Editor" extension)
 *   5. Save as JSON file and pass to --file flag
 */
export declare function importSession(filePath: string): void;
/**
 * Import from a raw `Cookie:` request header.
 *
 * Added because exporting cookies via a browser extension turned out to be the
 * single worst step in onboarding — extension UIs differ, some have no export at
 * all, and the one thing everyone can reliably do is copy a request header out
 * of DevTools.
 *
 * It is also strictly more complete than `document.cookie`, which omits HttpOnly
 * cookies — and Tesco's session cookies are HttpOnly, so the console trick that
 * looks like it should work silently produces a useless session.
 *
 *   DevTools → Network → any tesco.com request → Headers → Request Headers
 *   → right-click the `Cookie` value → Copy value
 */
export declare function importSessionFromHeader(header: string): void;
//# sourceMappingURL=import-session.d.ts.map