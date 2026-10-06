/**
 * Tesco Authentication
 *
 * Interactive browser-based login via Playwright.
 * Tesco uses email OTP (not SMS) for MFA, and Akamai bot-detection,
 * so we launch a real non-headless browser with stealth patches.
 *
 * Session stored at ~/.tesco/session.json (same shape as Sainsbury's).
 */
export interface TescoSession {
    cookies: any[];
    expiresAt: string;
    lastLogin: string;
}
export interface TescoSessionInfo {
    exists: boolean;
    path: string;
    expired: boolean;
    expiresAt?: string;
    lastLogin?: string;
    cookieCount?: number;
}
export declare function inferSessionExpiry(cookies: any[], fallbackMs?: number): string;
export declare function login(email: string, password?: string): Promise<TescoSession>;
export declare function saveSession(session: TescoSession): void;
export declare function getSessionInfo(): TescoSessionInfo;
export declare function loadSession(): TescoSession | null;
export declare function getCookieString(session: TescoSession): string;
export declare function clearSession(): void;
//# sourceMappingURL=auth.d.ts.map