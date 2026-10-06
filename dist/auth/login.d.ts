export interface SessionData {
    cookies: any[];
    expiresAt: string;
    lastLogin: string;
}
export interface LoginOptions {
    /**
     * Run the browser headless (for automatic re-auth). Progress logs go to
     * stderr so JSON on stdout stays clean, and an MFA challenge fails fast
     * instead of prompting — MFA needs an interactive `groc login`.
     */
    headless?: boolean;
}
export declare function login(email: string, password: string, options?: LoginOptions): Promise<SessionData>;
export declare function saveSession(session: SessionData): void;
export declare function loadSession(): SessionData | null;
export declare function getCookieString(session: SessionData): string;
export declare function clearSession(): void;
//# sourceMappingURL=login.d.ts.map