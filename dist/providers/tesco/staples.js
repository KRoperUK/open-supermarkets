"use strict";
/**
 * Tesco Staples Detection
 *
 * Analyses previous Tesco order history to identify products you buy
 * regularly ("staples"), so they can be auto-suggested or auto-added
 * to the basket at the start of each weekly shop.
 *
 * Staple = bought in >50% of your last N orders (default: last 10).
 *
 * Saved to: ~/.tesco/staples.json
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
exports.addStaplesToBasket = exports.printStaples = exports.updateStaples = exports.loadStaples = exports.saveStaples = exports.fetchOrderHistory = exports.analyseOrders = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
const CONFIG_DIR = path.join(os.homedir(), '.tesco');
const STAPLES_FILE = path.join(CONFIG_DIR, 'staples.json');
// ─────────────────────────────────────────────────────────
// Core analysis
// ─────────────────────────────────────────────────────────
function analyseOrders(orders, threshold = 0.5) {
    if (orders.length === 0)
        return [];
    const counts = {};
    for (const order of orders) {
        const items = order.items || order.orderLines || order.products || [];
        // Use a Set per order to avoid double-counting a product appearing twice in one order
        const seenInThisOrder = new Set();
        for (const item of items) {
            const id = String(item.id || item.tpnb || item.productId || '').trim();
            if (!id)
                continue;
            const name = (item.name || item.title || 'Unknown product').trim();
            const qty = Number(item.quantity || item.qty || 1);
            if (!counts[id]) {
                counts[id] = { name, totalQty: 0, orderCount: 0 };
            }
            counts[id].totalQty += qty;
            if (!seenInThisOrder.has(id)) {
                counts[id].orderCount += 1;
                seenInThisOrder.add(id);
            }
        }
    }
    const staples = [];
    for (const [productId, data] of Object.entries(counts)) {
        const frequency = data.orderCount / orders.length;
        if (frequency >= threshold) {
            staples.push({
                productId,
                name: data.name,
                avgQty: Math.round(data.totalQty / data.orderCount),
                frequency: Math.round(frequency * 100) / 100,
            });
        }
    }
    // Sort by frequency descending, then name
    return staples.sort((a, b) => b.frequency - a.frequency || a.name.localeCompare(b.name));
}
exports.analyseOrders = analyseOrders;
// ─────────────────────────────────────────────────────────
// Fetch + persist
// ─────────────────────────────────────────────────────────
async function fetchOrderHistory(api, n = 10) {
    const data = await api.getOrders(1, n);
    if (!data)
        return [];
    if (Array.isArray(data))
        return data;
    return data.orders || data.orderHistory || [];
}
exports.fetchOrderHistory = fetchOrderHistory;
function saveStaples(staples) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(STAPLES_FILE, JSON.stringify(staples, null, 2));
    console.log(`💾 Staples saved to ${STAPLES_FILE}`);
}
exports.saveStaples = saveStaples;
function loadStaples() {
    if (!fs.existsSync(STAPLES_FILE))
        return [];
    return JSON.parse(fs.readFileSync(STAPLES_FILE, 'utf-8'));
}
exports.loadStaples = loadStaples;
// ─────────────────────────────────────────────────────────
// CLI helpers (called from src/cli.ts staples command)
// ─────────────────────────────────────────────────────────
async function updateStaples(api) {
    console.log('📦 Fetching Tesco order history...');
    const orders = await fetchOrderHistory(api);
    if (orders.length === 0) {
        console.log('⚠️  No order history found. Cannot build staples list.');
        console.log('   Make sure you are logged in and have completed past deliveries.');
        return [];
    }
    console.log(`📊 Analysing ${orders.length} orders...`);
    const staples = analyseOrders(orders);
    saveStaples(staples);
    return staples;
}
exports.updateStaples = updateStaples;
function printStaples(staples, json = false) {
    if (json) {
        console.log(JSON.stringify(staples, null, 2));
        return;
    }
    if (staples.length === 0) {
        console.log('\n📋 No staples found yet. Run with --update to build from order history.\n');
        return;
    }
    console.log('\n🛒 Your Tesco Staples\n');
    staples.forEach((s, i) => {
        const pct = Math.round(s.frequency * 100);
        console.log(`${i + 1}. ${s.name}`);
        console.log(`   ID: ${s.productId}  |  Avg qty: ${s.avgQty}  |  Bought: ${pct}% of orders\n`);
    });
}
exports.printStaples = printStaples;
async function addStaplesToBasket(provider, staples, skipIds = new Set()) {
    const toAdd = staples.filter(s => !skipIds.has(s.productId));
    if (toAdd.length === 0) {
        console.log('✅ All staples already in basket');
        return;
    }
    console.log(`\n🛒 Adding ${toAdd.length} staples to basket...\n`);
    for (const s of toAdd) {
        try {
            await provider.addToBasket(s.productId, s.avgQty);
            console.log(`   ✅ ${s.name} x${s.avgQty}`);
        }
        catch (err) {
            console.log(`   ❌ ${s.name}: ${err.message}`);
        }
    }
}
exports.addStaplesToBasket = addStaplesToBasket;
//# sourceMappingURL=staples.js.map