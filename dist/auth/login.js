"use strict";
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
exports.clearSession = exports.getCookieString = exports.loadSession = exports.saveSession = exports.login = void 0;
const playwright_extra_1 = require("playwright-extra");
const puppeteer_extra_plugin_stealth_1 = __importDefault(require("puppeteer-extra-plugin-stealth"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const readline = __importStar(require("readline"));
// Sainsbury's sits behind Akamai. A vanilla Playwright browser is served an
// "Access Denied" page instead of the login form, so headless re-auth can never
// succeed — the login loop just retries on every 401. Tesco's auth already
// loads these evasions; Sainsbury's did not. With them the login page renders.
playwright_extra_1.chromium.use((0, puppeteer_extra_plugin_stealth_1.default)());
const CONFIG_DIR = path.join(os.homedir(), '.sainsburys');
const SESSION_FILE = path.join(CONFIG_DIR, 'session.json');
/**
 * Prefer a real, installed Chrome over the bundled Chromium: it is a closer
 * match for what Akamai expects, and it avoids a ~150 MB browser download on
 * first run. Falls back to the bundled browser if the channel is unavailable,
 * mirroring the Tesco auth path.
 */
async function launchBrowser(headless) {
    const launchOptions = {
        headless,
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
    catch {
        console.log(`⚠️  Could not launch ${preferredChannel}; falling back to bundled Chromium.`);
        return playwright_extra_1.chromium.launch(launchOptions);
    }
}
/**
 * Akamai serves a short "Access Denied" page (with a Reference #) rather than
 * the login form. Detecting it explicitly turns a 30-second selector timeout
 * into an actionable error.
 */
async function isEdgeBlock(page) {
    const body = await page
        .locator('body')
        .innerText({ timeout: 3000 })
        .catch(() => '');
    return /access denied|don't have permission to access/i.test(body);
}
async function login(email, password, options = {}) {
    const headless = options.headless ?? false;
    const log = headless ? console.error : console.log;
    log('🔐 Logging in to Sainsbury\'s...');
    const browser = await launchBrowser(headless);
    const context = await browser.newContext({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
        viewport: { width: 1440, height: 900 },
        locale: 'en-GB',
        timezoneId: 'Europe/London',
    });
    await context.addInitScript("Object.defineProperty(navigator, 'webdriver', { get: () => undefined });");
    const page = await context.newPage();
    try {
        // Go to login page (OAuth endpoint). This redirects to
        // account.sainsburys.co.uk/login-ui/gol/login?login_challenge=...
        log('📍 Navigating to login page...');
        await page.goto('https://www.sainsburys.co.uk/gol-ui/oauth/login', {
            waitUntil: 'domcontentloaded',
            timeout: 45000,
        });
        await page.waitForTimeout(3000);
        if (await isEdgeBlock(page)) {
            throw new Error('Sainsbury\'s edge returned an Access Denied page to the automated browser, ' +
                'so the login form never rendered. Either the stealth evasions have stopped ' +
                'working or this network is blocked — import a session from an interactive ' +
                'login instead.');
        }
        // Handle cookie consent if present
        try {
            log('🍪 Checking for cookie consent...');
            const acceptButton = page.locator('#onetrust-accept-btn-handler');
            if (await acceptButton.isVisible({ timeout: 3000 })) {
                log('🍪 Accepting cookies...');
                await acceptButton.click();
                log('🍪 Waiting for banner to dismiss...');
                await page.waitForTimeout(3000);
                // Wait for overlay to disappear
                await page.waitForSelector('#onetrust-consent-sdk.ot-hide, .onetrust-pc-dark-filter.ot-hide', { timeout: 5000 }).catch(() => { });
            }
        }
        catch (e) {
            log('🍪 No cookie consent found or already accepted');
        }
        // Wait for login form to appear
        log('⏳ Waiting for login form...');
        await page.waitForSelector('input[type="email"], input[name="email"], #username', { timeout: 30000 });
        // Fill in email
        log('📧 Entering email...');
        await page.fill('input[type="email"], input[name="email"], #username', email);
        await page.waitForTimeout(500);
        // Fill in password
        log('🔑 Entering password...');
        await page.fill('input[type="password"], input[name="password"], #password', password);
        await page.waitForTimeout(500);
        // Force remove any cookie overlays blocking interactions
        log('🧹 Removing cookie overlays...');
        // @ts-ignore - runs in browser context
        await page.evaluate(() => {
            // @ts-ignore
            const overlay = document.querySelector('.onetrust-pc-dark-filter');
            // @ts-ignore
            const banner = document.querySelector('#onetrust-consent-sdk');
            if (overlay)
                overlay.remove();
            if (banner)
                banner.remove();
        });
        await page.waitForTimeout(1000);
        // Click login button
        log('👆 Clicking login...');
        await page.click('button[type="submit"], button[data-testid="log-in"]');
        // Wait for navigation
        log('⏳ Waiting for login...');
        await page.waitForTimeout(5000);
        // Check if logged in
        const currentUrl = page.url();
        log(`Current URL: ${currentUrl}`);
        // Handle MFA if required
        if (currentUrl.includes('/mfa')) {
            if (headless) {
                throw new Error('Sainsbury\'s asked for MFA — run `groc login` interactively to complete it.');
            }
            log('🔐 MFA required - SMS code sent');
            log('📱 Check your phone for the 6-digit code');
            // Prompt for MFA code
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            const mfaCode = await new Promise((resolve) => {
                rl.question('Enter 6-digit MFA code: ', (answer) => {
                    rl.close();
                    resolve(answer.trim());
                });
            });
            if (!mfaCode || mfaCode.length !== 6) {
                throw new Error('Invalid MFA code - must be 6 digits');
            }
            log('🔑 Submitting MFA code...');
            await page.fill('#code, input[name="code"]', mfaCode);
            await page.waitForTimeout(500);
            // Remove cookie overlays again (they may reappear on MFA page)
            // @ts-ignore - runs in browser context
            await page.evaluate(() => {
                // @ts-ignore
                const overlay = document.querySelector('.onetrust-pc-dark-filter');
                // @ts-ignore
                const banner = document.querySelector('#onetrust-consent-sdk');
                if (overlay)
                    overlay.remove();
                if (banner)
                    banner.remove();
            });
            await page.waitForTimeout(500);
            await page.click('button[data-testid="submit-code"], button[type="submit"]:has-text("Continue")');
            log('⏳ Waiting for redirect...');
            await page.waitForTimeout(5000);
            const finalUrl = page.url();
            log(`Final URL after MFA: ${finalUrl}`);
            if (finalUrl.includes('login') || finalUrl.includes('mfa')) {
                throw new Error('MFA verification failed - check code and try again');
            }
        }
        else if (currentUrl.includes('login')) {
            throw new Error('Login failed - still on login page');
        }
        log('✅ Login successful!');
        // Get cookies
        const cookies = await context.cookies();
        const sessionData = {
            cookies: cookies,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
            lastLogin: new Date().toISOString()
        };
        // Save session
        saveSession(sessionData);
        await browser.close();
        return sessionData;
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
    console.error(`💾 Session saved to ${SESSION_FILE}`);
}
exports.saveSession = saveSession;
function loadSession() {
    if (!fs.existsSync(SESSION_FILE)) {
        return null;
    }
    try {
        const data = fs.readFileSync(SESSION_FILE, 'utf8');
        const session = JSON.parse(data);
        // Check if expired
        if (new Date(session.expiresAt) < new Date()) {
            console.error('⚠️  Session expired');
            return null;
        }
        return session;
    }
    catch (error) {
        console.error('⚠️  Corrupt session file, removing');
        fs.unlinkSync(SESSION_FILE);
        return null;
    }
}
exports.loadSession = loadSession;
function getCookieString(session) {
    return session.cookies.map(c => `${c.name}=${c.value}`).join('; ');
}
exports.getCookieString = getCookieString;
function clearSession() {
    if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
        console.error('🗑️  Session cleared');
    }
}
exports.clearSession = clearSession;
//# sourceMappingURL=login.js.map