"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearCommand = exports.updateCommand = exports.removeCommand = exports.addCommand = void 0;
async function addCommand(api, productId, quantity) {
    console.error(`🛒 Adding product ${productId} (qty: ${quantity})...`);
    try {
        const result = await api.addToBasket(productId, quantity);
        console.log('✅ Added to basket!');
        // Show updated basket
        const basket = await api.getBasket();
        if (basket.trolley?.trolley_details) {
            const trolley = basket.trolley.trolley_details;
            console.log(`\nBasket now has ${trolley.total_quantity || 0} items`);
            console.log(`Total: £${trolley.total_cost || 0}`);
        }
        return result;
    }
    catch (error) {
        console.error('❌ Failed to add to basket');
        console.error(error.message);
        throw error;
    }
}
exports.addCommand = addCommand;
async function removeCommand(api, itemId) {
    console.error(`🗑️  Removing item ${itemId}...`);
    try {
        await api.removeFromBasket(itemId);
        console.log('✅ Removed from basket!');
        // Show updated basket
        const basket = await api.getBasket();
        if (basket.trolley?.trolley_details) {
            const trolley = basket.trolley.trolley_details;
            console.log(`\nBasket now has ${trolley.total_quantity || 0} items`);
            console.log(`Total: £${trolley.total_cost || 0}`);
        }
    }
    catch (error) {
        console.error('❌ Failed to remove from basket');
        console.error(error.message);
        throw error;
    }
}
exports.removeCommand = removeCommand;
async function updateCommand(api, itemId, quantity) {
    console.error(`📝 Updating item ${itemId} to quantity ${quantity}...`);
    try {
        await api.updateBasketItem(itemId, quantity);
        console.log('✅ Updated!');
        // Show updated basket
        const basket = await api.getBasket();
        if (basket.trolley?.trolley_details) {
            const trolley = basket.trolley.trolley_details;
            console.log(`\nBasket now has ${trolley.total_quantity || 0} items`);
            console.log(`Total: £${trolley.total_cost || 0}`);
        }
    }
    catch (error) {
        console.error('❌ Failed to update basket');
        console.error(error.message);
        throw error;
    }
}
exports.updateCommand = updateCommand;
async function clearCommand(api) {
    console.error('🗑️  Clearing basket...');
    try {
        await api.clearBasket();
        console.log('✅ Basket cleared!');
    }
    catch (error) {
        console.error('❌ Failed to clear basket');
        console.error(error.message);
        throw error;
    }
}
exports.clearCommand = clearCommand;
//# sourceMappingURL=basket.js.map