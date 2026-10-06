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
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkout = void 0;
const playwright_1 = require("playwright");
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
async function loadSession(page) {
    const sessionFile = `${os.homedir()}/.sainsburys/session.json`;
    if (!fs.existsSync(sessionFile)) {
        throw new Error('No session found. Please login first.');
    }
    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    await page.context().addCookies(session.cookies);
}
/**
 * Navigate checkout flow and extract order details
 *
 * IMPORTANT: This NEVER completes payment automatically
 * - dryRun=true: Preview only, no slot booking
 * - dryRun=false: Books slot, navigates to payment page, then STOPS
 *
 * User must complete payment manually in browser or via separate flow
 */
async function checkout(dryRun = true) {
    const browser = await playwright_1.chromium.launch({
        headless: false, // Always show browser for checkout - transparency
        args: ['--disable-blink-features=AutomationControlled']
    });
    const page = await browser.newPage({
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1920, height: 1080 }
    });
    try {
        await loadSession(page);
        console.log('🛒 Step 1: Loading basket...');
        await page.goto('https://www.sainsburys.co.uk/gol-ui/trolley', {
            waitUntil: 'domcontentloaded',
            timeout: 60000
        });
        // Accept cookies
        try {
            await page.click('#onetrust-accept-btn-handler', { timeout: 3000 });
        }
        catch (e) { }
        await page.waitForTimeout(3000);
        // Extract basket info
        const pageText = await page.textContent('body');
        const totalMatch = pageText?.match(/Total[:\s]*£(\d+\.?\d*)/i);
        const total = totalMatch ? parseFloat(totalMatch[1]) : 0;
        console.log(`💰 Basket total: £${total}`);
        if (total < 25) {
            throw new Error(`Basket total £${total} is below £25 minimum spend`);
        }
        if (dryRun) {
            console.log('\n🔍 DRY RUN MODE');
            console.log('└─ Basket preview only');
            console.log('└─ No slot will be booked');
            console.log('└─ No payment will be requested');
            await page.screenshot({ path: '/tmp/checkout-preview.png', fullPage: true });
            return {
                order_id: 'DRY_RUN',
                total,
                delivery_cost: 0,
                items_count: 0,
                status: 'preview'
            };
        }
        // Real checkout flow starts here
        console.log('\n💳 Step 2: Proceeding to checkout...');
        const checkoutButton = await page.$('button:has-text("Checkout"), a:has-text("Checkout")');
        if (!checkoutButton) {
            throw new Error('Checkout button not found');
        }
        await checkoutButton.click();
        await page.waitForTimeout(5000);
        console.log('📍 Current URL:', page.url());
        // Check if slot selection is needed
        const currentUrl = page.url();
        if (currentUrl.includes('slot')) {
            console.log('\n📅 Step 3: Slot selection required...');
            console.log('⚠️  Browser is open - please select a delivery slot manually');
            console.log('⏳ Waiting for you to select and confirm slot...');
            // Wait for user to select slot (URL will change when they continue)
            let slotConfirmed = false;
            for (let i = 0; i < 60; i++) {
                await page.waitForTimeout(5000);
                const newUrl = page.url();
                if (!newUrl.includes('slot') || newUrl.includes('checkout') || newUrl.includes('payment')) {
                    slotConfirmed = true;
                    break;
                }
            }
            if (!slotConfirmed) {
                throw new Error('Slot selection timeout - no slot was confirmed');
            }
            console.log('✅ Slot confirmed');
        }
        // Now at payment/final checkout page
        console.log('\n💳 Step 4: At payment page...');
        console.log('⏳ Waiting for page to load...');
        await page.waitForTimeout(3000);
        const finalPageText = await page.textContent('body');
        const finalTotalMatch = finalPageText?.match(/Total[:\s]*£(\d+\.?\d*)/i);
        const finalTotal = finalTotalMatch ? parseFloat(finalTotalMatch[1]) : total;
        const deliveryCostMatch = finalPageText?.match(/Delivery[:\s]*£(\d+\.?\d*)/i);
        const deliveryCost = deliveryCostMatch ? parseFloat(deliveryCostMatch[1]) : 0;
        await page.screenshot({ path: '/tmp/checkout-payment-page.png', fullPage: true });
        console.log('\n📊 Order Summary:');
        console.log(`├─ Items total: £${total}`);
        console.log(`├─ Delivery: £${deliveryCost}`);
        console.log(`└─ Total: £${finalTotal}`);
        console.log('\n🛑 PAYMENT REQUIRED');
        console.log('╔═══════════════════════════════════════════╗');
        console.log('║  THIS CLI DOES NOT HANDLE PAYMENT        ║');
        console.log('║  Complete payment manually in browser     ║');
        console.log('║  OR use saved payment method if prompted  ║');
        console.log('╚═══════════════════════════════════════════╝');
        console.log('\n⏳ Keeping browser open for 5 minutes...');
        console.log('   Close this terminal to cancel');
        console.log('   Complete payment in browser to finish order\n');
        // Wait for user to complete payment
        await page.waitForTimeout(300000); // 5 minutes
        // Check if order was completed
        const finalUrl = page.url();
        if (finalUrl.includes('confirmation') || finalUrl.includes('complete')) {
            const orderIdMatch = await page.textContent('body');
            const orderId = orderIdMatch?.match(/Order\s+(?:ID|number)[:\s]*(\w+)/i)?.[1] || 'UNKNOWN';
            return {
                order_id: orderId,
                total: finalTotal,
                delivery_cost: deliveryCost,
                items_count: 0,
                status: 'completed'
            };
        }
        return {
            order_id: 'PENDING',
            total: finalTotal,
            delivery_cost: deliveryCost,
            items_count: 0,
            status: 'payment_required',
            payment_url: page.url()
        };
    }
    finally {
        await browser.close();
    }
}
exports.checkout = checkout;
//# sourceMappingURL=checkout.js.map