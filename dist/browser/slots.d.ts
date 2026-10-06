export interface Slot {
    slot_id: string;
    date: string;
    day: string;
    start_time: string;
    end_time: string;
    price: number;
    available: boolean;
}
export declare function getSlots(headless?: boolean): Promise<Slot[]>;
export declare function bookSlot(slotId: string, headless?: boolean): Promise<void>;
//# sourceMappingURL=slots.d.ts.map