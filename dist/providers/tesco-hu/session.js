"use strict";
/**
 * Tesco Hungary — cookie session store.
 *
 * bevasarlas.tesco.hu sits behind Akamai and its login lives on www.tesco.hu, so
 * there is no scripted login here. The user signs in with a normal browser and
 * imports the resulting cookies — either a raw `Cookie:` request header copied
 * from DevTools → Network (the one route that always works and includes HttpOnly
 * cookies), or a cookie JSON export from Chrome DevTools / Cookie-Editor /
 * Playwright.
 *
 * Stored at ~/.tesco-hu/session.json. Deliberately a different file from the UK
 * provider's ~/.tesco/session.json so the two never overwrite each other.
 *
 * This module has no network code and imports nothing from ../tesco/ (that module
 * loads Playwright at import time).
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
exports.importSession = exports.importSessionFromHeader = exports.getCookieString = exports.clearSession = exports.getSessionInfo = exports.loadSession = exports.saveSession = exports.normaliseCookieExport = exports.parseCookieHeader = exports.inferSessionExpiry = exports.SESSION_FILE = exports.CONFIG_DIR = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
exports.CONFIG_DIR = path.join(os.homedir(), '.tesco-hu');
exports.SESSION_FILE = path.join(exports.CONFIG_DIR, 'session.json');
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const COOKIE_DOMAIN = '.tesco.hu';
const AUTH_COOKIE_RE = /(auth|oauth|token|session|sid|sso|identity|access|refresh|jwt|tesco)/i;
function cookieExpiryMs(cookie) {
    const raw = cookie?.expires ?? cookie?.expirationDate;
    if (raw === undefined || raw === null || raw === -1 || raw === 0)
        return null;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0)
        return null;
    // Playwright and Chrome exports use seconds; tolerate millisecond exports too.
    return numeric > 10000000000 ? numeric : numeric * 1000;
}
/**
 * Earliest expiry among auth-looking cookies that is at least a minute away;
 * otherwise a 12 hour fallback. `now` is injectable for tests.
 */
function inferSessionExpiry(cookies, now = Date.now(), fallbackMs = DEFAULT_SESSION_TTL_MS) {
    const authExpiries = cookies
        .filter(c => AUTH_COOKIE_RE.test(String(c?.name || '')))
        .map(cookieExpiryMs)
        .filter((e) => !!e && e > now + 60000)
        .sort((a, b) => a - b);
    if (authExpiries.length > 0)
        return new Date(authExpiries[0]).toISOString();
    return new Date(now + fallbackMs).toISOString();
}
exports.inferSessionExpiry = inferSessionExpiry;
/** Parse a raw `Cookie:` request header. Values legitimately contain '='. */
function parseCookieHeader(header) {
    const cleaned = String(header ?? '')
        .trim()
        .replace(/^Cookie:\s*/i, '')
        .replace(/^["']|["']$/g, '');
    const cookies = cleaned
        .split(';')
        .map(pair => pair.trim())
        .filter(Boolean)
        .map((pair) => {
        const eq = pair.indexOf('=');
        if (eq === -1)
            return null;
        const name = pair.slice(0, eq).trim();
        const value = pair.slice(eq + 1).trim();
        if (!name || !value)
            return null;
        return { name, value, domain: COOKIE_DOMAIN, path: '/', expires: -1, httpOnly: false, secure: true, sameSite: 'Lax' };
    })
        .filter((c) => c !== null);
    if (cookies.length === 0) {
        throw new Error('No cookies parsed from that header.\n' +
            'Expected something like: name=value; name2=value2; ...\n' +
            'In DevTools → Network, pick a bevasarlas.tesco.hu request, then Request Headers → Cookie.');
    }
    return cookies;
}
exports.parseCookieHeader = parseCookieHeader;
/**
 * Normalise a cookie JSON export. Chrome DevTools exports an array; Cookie-Editor
 * exports an array with Capitalised keys or `{ [domain]: cookie[] }`; Playwright
 * storage_state wraps everything in `{ cookies: [...] }`.
 */
function normaliseCookieExport(raw) {
    let list;
    if (Array.isArray(raw))
        list = raw;
    else if (raw && typeof raw === 'object' && Array.isArray(raw.cookies))
        list = raw.cookies;
    else if (raw && typeof raw === 'object')
        list = Object.values(raw).flat();
    else
        list = [];
    const cookies = list
        .map((c) => ({
        name: c?.name ?? c?.Name,
        value: c?.value ?? c?.Value,
        domain: c?.domain ?? c?.Domain ?? COOKIE_DOMAIN,
        path: c?.path ?? c?.Path ?? '/',
        expires: Number(c?.expirationDate ?? c?.expires ?? -1),
        httpOnly: Boolean(c?.httpOnly ?? c?.HttpOnly ?? false),
        secure: Boolean(c?.secure ?? c?.Secure ?? false),
        sameSite: String(c?.sameSite ?? c?.SameSite ?? 'Lax'),
    }))
        .filter(c => c.name && c.value);
    if (cookies.length === 0) {
        throw new Error('No usable cookies found in the file. Check the export includes name/value fields.');
    }
    return cookies;
}
exports.normaliseCookieExport = normaliseCookieExport;
function saveSession(session, file = exports.SESSION_FILE) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(session, null, 2), { mode: 0o600 });
}
exports.saveSession = saveSession;
/** Null when there is no session or it has expired. Callers decide what to say. */
function loadSession(file = exports.SESSION_FILE) {
    if (!fs.existsSync(file))
        return null;
    const session = JSON.parse(fs.readFileSync(file, 'utf-8'));
    if (new Date(session.expiresAt) < new Date())
        return null;
    return session;
}
exports.loadSession = loadSession;
function getSessionInfo(file = exports.SESSION_FILE) {
    if (!fs.existsSync(file))
        return { exists: false, path: file, expired: true };
    const session = JSON.parse(fs.readFileSync(file, 'utf-8'));
    return {
        exists: true,
        path: file,
        expired: new Date(session.expiresAt) < new Date(),
        expiresAt: session.expiresAt,
        lastLogin: session.lastLogin,
        cookieCount: session.cookies?.length ?? 0,
    };
}
exports.getSessionInfo = getSessionInfo;
function clearSession(file = exports.SESSION_FILE) {
    if (fs.existsSync(file))
        fs.unlinkSync(file);
}
exports.clearSession = clearSession;
function getCookieString(session) {
    return session.cookies.map(c => `${c.name}=${c.value}`).join('; ');
}
exports.getCookieString = getCookieString;
function sessionFrom(cookies) {
    return { cookies, expiresAt: inferSessionExpiry(cookies), lastLogin: new Date().toISOString() };
}
function importSessionFromHeader(header, file = exports.SESSION_FILE) {
    const session = sessionFrom(parseCookieHeader(header));
    saveSession(session, file);
    return session;
}
exports.importSessionFromHeader = importSessionFromHeader;
function importSession(filePath, file = exports.SESSION_FILE) {
    const resolved = filePath.startsWith('~') ? path.join(os.homedir(), filePath.slice(1)) : path.resolve(filePath);
    if (!fs.existsSync(resolved))
        throw new Error(`Cookie file not found: ${resolved}`);
    const session = sessionFrom(normaliseCookieExport(JSON.parse(fs.readFileSync(resolved, 'utf-8'))));
    saveSession(session, file);
    return session;
}
exports.importSession = importSession;
//# sourceMappingURL=session.js.map