"use strict";
/**
 * Tesco Authentication
 *
 * Interactive browser-based login via Playwright.
 * Tesco uses email OTP (not SMS) for MFA, and Akamai bot-detection,
 * so we launch a real non-headless browser with stealth patches.
 *
 * Session stored at ~/.tesco/session.json (same shape as Sainsbury's).
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearSession = exports.getCookieString = exports.loadSession = exports.getSessionInfo = exports.saveSession = exports.login = exports.inferSessionExpiry = void 0;
const playwright_extra_1 = require("playwright-extra");
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const readline = __importStar(require("readline"));
playwright_extra_1.chromium.use((0, puppeteer_extra_plugin_stealth_1.default)());
const CONFIG_DIR = path.join(os.homedir(), '.tesco');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');
const DEFAULT_SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const AUTH_COOKIE_RE = /(auth|oauth|token|session|sid|sso|identity|access|refresh|jwt|tesco)/i;
function ask(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim());
        });
    });
}
function askHidden(question) {
    return new Promise(resolve => {
        process.stdout.write(question);
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: false });
        process.stdin.setRawMode(true);
        let input = '';
        process.stdin.on('data', function onData(char) {
            const c = char.toString();
            if (c === '\r' || c === '\n') {
                process.stdin.setRawMode(false);
                process.stdin.removeListener('data', onData);
                process.stdout.write('\n');
                rl.close();
                resolve(input);
            }
            else if (c === '\x7f') {
                input = input.slice(0, -1);
            }
            else {
                input += c;
            }
        });
    });
}
function cookieExpiryMs(cookie) {
    const raw = cookie?.expires ?? cookie?.expirationDate ?? cookie?.ExpirationDate;
    if (raw === undefined || raw === null || raw === -1 || raw === 0)
        return null;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0)
        return null;
    // Playwright and Chrome exports use seconds; tolerate millisecond exports too.
    return numeric > 10000000000 ? numeric : numeric * 1000;
}
function inferSessionExpiry(cookies, fallbackMs = DEFAULT_SESSION_TTL_MS) {
    const now = Date.now();
    const authCookieExpiries = cookies
        .filter(cookie => AUTH_COOKIE_RE.test(String(cookie?.name || '')))
        .map(cookieExpiryMs)
        .filter((expiry) => !!expiry && expiry > now + 60000)
        .sort((a, b) => a - b);
    if (authCookieExpiries.length > 0) {
        return new Date(authCookieExpiries[0]).toISOString();
    }
    return new Date(now + fallbackMs).toISOString();
}
exports.inferSessionExpiry = inferSessionExpiry;
async function launchTescoBrowser() {
    const launchOptions = {
        headless: false,
        args: [
            '--disable-blink-features=AutomationControlled',
            '--disable-features=IsolateOrigins,site-per-process',
            '--no-default-browser-check',
            '--disable-dev-shm-usage',
        ],
    };
    const preferredChannel = process.env.GROC_BROWSER_CHANNEL || process.env.PLAYWRIGHT_CHROMIUM_CHANNEL || 'chrome';
    try {
        return await playwright_extra_1.chromium.launch({ ...launchOptions, channel: preferredChannel });
    }
    catch (error) {
        if (preferredChannel) {
            console.log(`⚠️  Could not launch ${preferredChannel}; falling back to bundled Chromium.`);
        }
        return playwright_extra_1.chromium.launch(launchOptions);
    }
}
async function isTescoSecurityBlock(page) {
    const body = await page.locator('body').innerText({ timeout: 3000 }).catch(() => '');
    return /failed some security checks|something is not right|access denied|unusual traffic/i.test(body);
}
function blockedLoginMessage() {
    return [
        'Tesco blocked the automated browser with its security checks.',
        'Reliable fallback:',
        '1. Log in to https://www.tesco.com/groceries/en-GB/ in your normal browser',
        '2. Export Tesco cookies with Cookie-Editor or DevTools',
        '3. Run: groc --provider tesco import-session --file ~/Downloads/tesco-cookies.json',
    ].join('\n');
}
async function login(email, password) {
    const pwd = password || process.env.TESCO_PASSWORD || await askHidden('Password: ');
    console.log('🔐 Logging in to Tesco...');
    const browser = await launchTescoBrowser();
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 },
        locale: 'en-GB',
        timezoneId: 'Europe/London',
    });
    await context.addInitScript("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });");
    const page = await context.newPage();
    try {
        console.log('📍 Navigating to Tesco sign-in...');
        await page.goto('https://www.tesco.com/account/auth/en-GB/login?from=https%3A%2F%2Fwww.tesco.com%2Fgroceries%2Fen-GB%2F', { waitUntil: 'domcontentloaded', timeout: 30000 });
        if (await isTescoSecurityBlock(page)) {
            throw new Error(blockedLoginMessage());
        }
        // Accept cookies
        try {
            const acceptBtn = page.locator('#onetrust-accept-btn-handler');
            if (await acceptBtn.isVisible({ timeout: 4000 })) {
                await acceptBtn.click();
                await page.waitForTimeout(1500);
            }
        }
        catch {
            // No cookie banner
        }
        // Email field
        console.log('📧 Entering email...');
        await page.waitForSelector('input[type="email"], input[name="username"], #username, input[name="email"]', { timeout: 15000 });
        await page.fill('input[type="email"], input[name="username"], #username, input[name="email"]', email);
        await page.waitForTimeout(400);
        // Continue / Next button (some flows split email + password)
        const continueBtn = page.locator('button:has-text("Continue"), button:has-text("Next"), button[type="submit"]').first();
        if (await continueBtn.isVisible({ timeout: 2000 })) {
            await continueBtn.click();
            await page.waitForTimeout(1500);
        }
        if (await isTescoSecurityBlock(page)) {
            throw new Error(blockedLoginMessage());
        }
        // Password field — long timeout so user can solve Akamai/CAPTCHA challenges manually
        console.log('🔑 Waiting for password field... (solve any challenges in the browser window)');
        try {
            await page.waitForSelector('input[type="password"], input[name="password"], #password', { timeout: 60000 });
            await page.fill('input[type="password"], input[name="password"], #password', pwd);
            await page.waitForTimeout(400);
            // Submit
            console.log('👆 Submitting login...');
            await page.click('button[type="submit"]');
            await page.waitForTimeout(5000);
        }
        catch {
            // Password field never appeared — Akamai bot detection likely triggered
            console.log('\n⚠️  Automated form fill timed out.');
            console.log('   Please complete the login in the browser window, then press Enter here.');
            await ask('Press Enter once logged in: ');
        }
        if (await isTescoSecurityBlock(page)) {
            throw new Error(blockedLoginMessage());
        }
        const currentUrl = page.url();
        console.log(`📍 Post-login URL: ${currentUrl}`);
        // Handle MFA / email verification
        if (currentUrl.includes('challenge') ||
            currentUrl.includes('otp') ||
            currentUrl.includes('verify') ||
            currentUrl.includes('security')) {
            // Check if there's a numeric code input (OTP) or just a "click the link" flow
            const hasCodeInput = await page.$('input[name="otp"], input[name="code"], input[type="number"], #otp, #code')
                .then(el => !!el).catch(() => false);
            if (hasCodeInput) {
                console.log('\n🔐 MFA required — check your email for a one-time code.');
                const otp = await ask('Enter the OTP code from your email: ');
                if (!otp || otp.length < 4)
                    throw new Error('Invalid OTP code');
                await page.fill('input[name="otp"], input[name="code"], input[type="number"], #otp, #code', otp);
                await page.waitForTimeout(400);
                await page.click('button[type="submit"]');
            }
            else {
                // "Is this you?" notification — session cookies are already set, just navigate away
                console.log('\n📧 Tesco sent a "is this you?" notification — session may already be established.');
                console.log('   Navigating to groceries...\n');
                await page.goto('https://www.tesco.com/groceries/en-GB/', {
                    waitUntil: 'domcontentloaded',
                    timeout: 30000,
                });
                await page.waitForTimeout(2000);
            }
        }
        else if (currentUrl.includes('/login') || currentUrl.includes('sign-in')) {
            throw new Error('Login failed — still on login page. Check email/password.');
        }
        console.log('✅ Login successful!');
        const cookies = await context.cookies();
        const session = {
            cookies,
            expiresAt: inferSessionExpiry(cookies),
            lastLogin: new Date().toISOString(),
        };
        saveSession(session);
        await browser.close();
        return session;
    }
    catch (error) {
        await browser.close();
        throw error;
    }
}
exports.login = login;
function saveSession(session) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(SESSION_FILE, JSON.stringify(session, null, 2), { mode: 0o600 });
    console.log(`💾 Tesco session saved to ${SESSION_FILE}`);
}
exports.saveSession = saveSession;
function getSessionInfo() {
    if (!fs.existsSync(SESSION_FILE)) {
        return { exists: false, path: SESSION_FILE, expired: true };
    }
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    const expired = new Date(session.expiresAt) < new Date();
    return {
        exists: true,
        path: SESSION_FILE,
        expired,
        expiresAt: session.expiresAt,
        lastLogin: session.lastLogin,
        cookieCount: session.cookies?.length || 0,
    };
}
exports.getSessionInfo = getSessionInfo;
function loadSession() {
    if (!fs.existsSync(SESSION_FILE))
        return null;
    const session = JSON.parse(fs.readFileSync(SESSION_FILE, 'utf-8'));
    if (new Date(session.expiresAt) < new Date()) {
        console.log('⚠️  Tesco session expired — please login again or import a fresh browser session');
        return null;
    }
    return session;
}
exports.loadSession = loadSession;
function getCookieString(session) {
    return session.cookies.map(c => `${c.name}=${c.value}`).join('; ');
}
exports.getCookieString = getCookieString;
function clearSession() {
    if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
        console.log('🗑️  Tesco session cleared');
    }
}
exports.clearSession = clearSession;
//# sourceMappingURL=auth.js.map