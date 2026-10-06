#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const format_1 = require("./format");
const client_1 = require("./api/client");
const login_1 = require("./auth/login");
const basket_1 = require("./commands/basket");
const program = new commander_1.Command();
const api = new client_1.SainsburysAPI();
// Load saved session if available
const session = (0, login_1.loadSession)();
if (session) {
    const cookieString = (0, login_1.getCookieString)(session);
    api.setAuthCookies(cookieString);
}
program
    .name('sainsburys')
    .description('Sainsbury\'s Groceries CLI - Complete meal planning & ordering')
    .version('1.0.0');
// Login
program
    .command('login')
    .description('Login to Sainsbury\'s account')
    .option('-e, --email <email>', 'Email address')
    .option('-p, --password <password>', 'Password')
    .action(async (options) => {
    try {
        const email = options.email || process.env.SAINSBURYS_EMAIL;
        const password = options.password || process.env.SAINSBURYS_PASSWORD;
        if (!email || !password) {
            console.error('❌ Email and password required');
            console.error('Use: sb login --email EMAIL --password PASSWORD');
            process.exit(1);
        }
        const sessionData = await (0, login_1.login)(email, password);
        const cookieString = (0, login_1.getCookieString)(sessionData);
        api.setAuthCookies(cookieString);
        console.log('✅ Login successful!');
    }
    catch (error) {
        console.error('❌ Login failed:', error.message);
        process.exit(1);
    }
});
// Logout
program
    .command('logout')
    .description('Clear saved session')
    .action(() => {
    (0, login_1.clearSession)();
    console.log('👋 Logged out');
});
// Search
program
    .command('search <query>')
    .description('Search for products')
    .option('--json', 'Output as JSON')
    .option('--limit <n>', 'Results per page', '24')
    .action(async (query, options) => {
    try {
        const data = await api.searchProducts(query, 1, parseInt(options.limit));
        if (options.json) {
            console.log(JSON.stringify(data, null, 2));
        }
        else {
            if (data.products && data.products.length > 0) {
                data.products.forEach((product, idx) => {
                    console.log(`${idx + 1}. ${product.name}`);
                    if (product.retail_price?.price) {
                        console.log(`   ${(0, format_1.money)(product.retail_price.price, product.currency)} | ID: ${product.product_uid}`);
                    }
                });
            }
            else {
                console.log('No results found');
            }
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
});
// Product
program
    .command('product <id>')
    .description('Get product details')
    .option('--json', 'Output as JSON')
    .action(async (id, options) => {
    try {
        const data = await api.getProduct(id);
        if (options.json) {
            console.log(JSON.stringify(data, null, 2));
        }
        else {
            console.log(`\n${data.name || 'Product'}`);
            if (data.retail_price?.price) {
                console.log(`Price: ${(0, format_1.money)(data.retail_price.price, data.currency)}`);
            }
            console.log(`ID: ${id}`);
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
});
// Add to basket
program
    .command('add <product-id>')
    .description('Add product to basket')
    .option('-q, --qty <n>', 'Quantity', '1')
    .action(async (productId, options) => {
    try {
        const quantity = parseInt(options.qty);
        await (0, basket_1.addCommand)(api, productId, quantity);
    }
    catch (error) {
        console.error('Add command failed');
        process.exit(1);
    }
});
// Remove from basket
program
    .command('remove <item-id>')
    .description('Remove item from basket')
    .action(async (itemId) => {
    try {
        await (0, basket_1.removeCommand)(api, itemId);
    }
    catch (error) {
        process.exit(1);
    }
});
// Update quantity
program
    .command('update <item-id> <quantity>')
    .description('Update item quantity')
    .action(async (itemId, quantity) => {
    try {
        await (0, basket_1.updateCommand)(api, itemId, parseInt(quantity));
    }
    catch (error) {
        process.exit(1);
    }
});
// Clear basket
program
    .command('clear')
    .description('Clear entire basket')
    .option('--force', 'Skip confirmation')
    .action(async (options) => {
    try {
        if (!options.force) {
            console.log('⚠️  This will clear your entire basket!');
            console.log('Use --force to confirm');
            process.exit(0);
        }
        await (0, basket_1.clearCommand)(api);
    }
    catch (error) {
        process.exit(1);
    }
});
// Basket
program
    .command('basket')
    .description('View basket')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
    try {
        const data = await api.getBasket();
        if (options.json) {
            console.log(JSON.stringify(data, null, 2));
        }
        else {
            if (data.trolley?.trolley_details) {
                const trolley = data.trolley.trolley_details;
                console.log(`\n🛒 Your Basket\n`);
                console.log(`Items: ${trolley.total_quantity || 0}`);
                console.log(`Subtotal: ${(0, format_1.money)(trolley.total_cost || 0)}\n`);
                if (trolley.products && trolley.products.length > 0) {
                    trolley.products.forEach((item) => {
                        console.log(`• ${item.quantity}x ${item.name}`);
                        console.log(`  ${(0, format_1.money)(item.unit_price)} each | Item ID: ${item.item_id || item.id}`);
                    });
                }
            }
            else {
                console.log('Basket is empty');
            }
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response?.status === 401) {
            console.error('💡 You need to login: sb login');
        }
        process.exit(1);
    }
});
// Slots
program
    .command('slots')
    .description('View delivery slots')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
    try {
        const data = await api.getSlotReservation();
        if (options.json) {
            console.log(JSON.stringify(data, null, 2));
        }
        else {
            console.log('📅 Delivery Slots:');
            console.log(JSON.stringify(data, null, 2));
        }
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
});
// Book slot
program
    .command('book <slot-id>')
    .description('Reserve delivery slot')
    .action(async (slotId) => {
    try {
        console.error(`📅 Reserving slot ${slotId}...`);
        const result = await api.reserveSlot(slotId);
        console.log('✅ Slot reserved!');
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error) {
        console.error('❌ Failed to reserve slot:', error.message);
        process.exit(1);
    }
});
// Checkout
program
    .command('checkout')
    .description('Complete order and checkout')
    .option('--dry-run', 'Preview without placing order')
    .action(async (options) => {
    try {
        if (options.dryRun) {
            console.log('🔍 Dry run mode - previewing order...');
            const basket = await api.getBasket();
            console.log(JSON.stringify(basket, null, 2));
            console.log('\n💡 Use without --dry-run to place order');
            return;
        }
        console.error('🛒 Placing order...');
        const result = await api.checkout();
        console.log('✅ Order placed!');
        console.log(JSON.stringify(result, null, 2));
    }
    catch (error) {
        console.error('❌ Checkout failed:', error.message);
        process.exit(1);
    }
});
// Orders
program
    .command('orders')
    .description('View order history')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
    try {
        const data = await api.getOrders();
        console.log(JSON.stringify(data, null, 2));
    }
    catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
});
program.parse();
//# sourceMappingURL=cli-complete.js.map