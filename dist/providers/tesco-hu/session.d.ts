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
export declare const CONFIG_DIR: string;
export declare const SESSION_FILE: string;
export interface SessionCookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    /** Unix seconds, or -1 when unknown. */
    expires: number;
    httpOnly: boolean;
    secure: boolean;
    sameSite: string;
}
export interface TescoHuSession {
    cookies: SessionCookie[];
    expiresAt: string;
    lastLogin: string;
}
export interface TescoHuSessionInfo {
    exists: boolean;
    path: string;
    expired: boolean;
    expiresAt?: string;
    lastLogin?: string;
    cookieCount?: number;
}
/**
 * Earliest expiry among auth-looking cookies that is at least a minute away;
 * otherwise a 12 hour fallback. `now` is injectable for tests.
 */
export declare function inferSessionExpiry(cookies: Array<{
    name?: string;
    expires?: number;
    expirationDate?: number;
}>, now?: number, fallbackMs?: number): string;
/** Parse a raw `Cookie:` request header. Values legitimately contain '='. */
export declare function parseCookieHeader(header: string): SessionCookie[];
/**
 * Normalise a cookie JSON export. Chrome DevTools exports an array; Cookie-Editor
 * exports an array with Capitalised keys or `{ [domain]: cookie[] }`; Playwright
 * storage_state wraps everything in `{ cookies: [...] }`.
 */
export declare function normaliseCookieExport(raw: unknown): SessionCookie[];
export declare function saveSession(session: TescoHuSession, file?: string): void;
/** Null when there is no session or it has expired. Callers decide what to say. */
export declare function loadSession(file?: string): TescoHuSession | null;
export declare function getSessionInfo(file?: string): TescoHuSessionInfo;
export declare function clearSession(file?: string): void;
export declare function getCookieString(session: TescoHuSession): string;
export declare function importSessionFromHeader(header: string, file?: string): TescoHuSession;
export declare function importSession(filePath: string, file?: string): TescoHuSession;
//# sourceMappingURL=session.d.ts.map