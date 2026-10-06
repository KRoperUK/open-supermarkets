/**
 * Tesco Delivery Slot Browser Automation
 *
 * Mirrors src/browser/slots.ts but for Tesco.
 * Uses Playwright to scrape the slot selection page and optionally book a slot.
 */
export interface TescoSlot {
    slot_id: string;
    date: string;
    day: string;
    start_time: string;
    end_time: string;
    price: number;
    available: boolean;
}
export declare function getTescoSlots(headless?: boolean): Promise<TescoSlot[]>;
export declare function bookTescoSlot(slotId: string, headless?: boolean): Promise<void>;
//# sourceMappingURL=tesco-slots.d.ts.map