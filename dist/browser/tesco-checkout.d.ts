/**
 * Tesco Checkout Browser Automation
 *
 * Mirrors src/browser/checkout.ts but for Tesco (trolley → checkout flow).
 *
 * IMPORTANT: This NEVER completes payment automatically.
 * - dryRun=true : Preview trolley only
 * - dryRun=false: Navigates to payment page, then pauses for manual completion
 */
export interface TescoCheckoutResult {
    order_id: string;
    total: number;
    delivery_slot?: string;
    delivery_cost: number;
    items_count: number;
    status: 'preview' | 'payment_required' | 'completed';
    payment_url?: string;
}
/**
 * Navigate Tesco checkout flow and extract order details.
 *
 * IMPORTANT: Payment is NEVER completed automatically.
 */
export declare function tescoCheckout(dryRun?: boolean): Promise<TescoCheckoutResult>;
//# sourceMappingURL=tesco-checkout.d.ts.map