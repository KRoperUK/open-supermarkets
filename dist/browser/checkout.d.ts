export interface CheckoutResult {
    order_id: string;
    total: number;
    delivery_slot?: string;
    delivery_cost: number;
    items_count: number;
    status: 'preview' | 'payment_required' | 'completed';
    payment_url?: string;
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
export declare function checkout(dryRun?: boolean): Promise<CheckoutResult>;
//# sourceMappingURL=checkout.d.ts.map