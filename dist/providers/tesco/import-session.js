"use strict";
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
exports.importSessionFromHeader = exports.importSession = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const auth_1 = require("./auth");
function importSession(filePath) {
    const resolved = filePath.startsWith('~')
        ? path.join(os.homedir(), filePath.slice(1))
        : path.resolve(filePath);
    if (!fs.existsSync(resolved)) {
        throw new Error(`Cookie file not found: ${resolved}`);
    }
    const raw = JSON.parse(fs.readFileSync(resolved, 'utf-8'));
    // Normalise — Chrome DevTools exports an array; "Cookie Editor" exports
    // { [domain]: cookie[] } or an array with slightly different shape.
    let cookies;
    if (Array.isArray(raw)) {
        cookies = raw;
    }
    else if (raw.cookies && Array.isArray(raw.cookies)) {
        cookies = raw.cookies;
    }
    else {
        // Try to flatten object-of-arrays format
        cookies = Object.values(raw).flat();
    }
    if (cookies.length === 0) {
        throw new Error('No cookies found in the file. Check the export format.');
    }
    // Normalise cookie shape to match Playwright format
    const normalised = cookies.map((c) => ({
        name: c.name || c.Name,
        value: c.value || c.Value,
        domain: c.domain || c.Domain || '.tesco.com',
        path: c.path || c.Path || '/',
        expires: c.expirationDate || c.expires || -1,
        httpOnly: c.httpOnly || c.HttpOnly || false,
        secure: c.secure || c.Secure || false,
        sameSite: c.sameSite || c.SameSite || 'Lax',
    }));
    const validCookies = normalised.filter((c) => c.name && c.value);
    if (validCookies.length === 0) {
        throw new Error('No usable cookies found in the file. Check the export includes name/value fields.');
    }
    const session = {
        cookies: validCookies,
        expiresAt: (0, auth_1.inferSessionExpiry)(validCookies),
        lastLogin: new Date().toISOString(),
    };
    (0, auth_1.saveSession)(session);
    console.log(`✅ Imported ${validCookies.length} cookies — Tesco session ready until ${session.expiresAt}`);
}
exports.importSession = importSession;
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
function importSessionFromHeader(header) {
    const cleaned = header
        .trim()
        .replace(/^Cookie:\s*/i, '') // tolerate the header name being copied too
        .replace(/^["']|["']$/g, ''); // and surrounding quotes
    const cookies = cleaned
        .split(';')
        .map(pair => pair.trim())
        .filter(Boolean)
        .map(pair => {
        const eq = pair.indexOf('=');
        if (eq === -1)
            return null;
        return {
            name: pair.slice(0, eq).trim(),
            // Values legitimately contain '=', so only split on the first one.
            value: pair.slice(eq + 1).trim(),
            domain: '.tesco.com',
            path: '/',
            // A request header carries no expiry, so fall back to the default TTL.
            expires: -1,
            httpOnly: false,
            secure: true,
            sameSite: 'Lax',
        };
    })
        .filter((c) => c !== null && !!c.name && !!c.value);
    if (cookies.length === 0) {
        throw new Error('No cookies parsed from that header.\n' +
            'Expected something like: name=value; name2=value2; ...\n' +
            'In DevTools → Network, pick a tesco.com request, then Request Headers → Cookie.');
    }
    const session = {
        cookies,
        expiresAt: (0, auth_1.inferSessionExpiry)(cookies),
        lastLogin: new Date().toISOString(),
    };
    (0, auth_1.saveSession)(session);
    console.log(`✅ Imported ${cookies.length} cookies from header — Tesco session ready until ${session.expiresAt}`);
}
exports.importSessionFromHeader = importSessionFromHeader;
//# sourceMappingURL=import-session.js.map