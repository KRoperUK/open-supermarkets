import { SainsburysAPI } from '../api/client';
export declare function addCommand(api: SainsburysAPI, productId: string, quantity: number): Promise<any>;
export declare function removeCommand(api: SainsburysAPI, itemId: string): Promise<void>;
export declare function updateCommand(api: SainsburysAPI, itemId: string, quantity: number): Promise<void>;
export declare function clearCommand(api: SainsburysAPI): Promise<void>;
//# sourceMappingURL=basket.d.ts.map