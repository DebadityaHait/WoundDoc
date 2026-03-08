import { WoundRecord } from "@/src/features/wounds/wounds.types";
import { getJsonItem, removeItem, setJsonItem } from "@/src/services/storage/asyncStorage";

const WOUNDS_KEY = "wounddoc:wounds:v1";

export interface WoundRepository {
  list(): Promise<WoundRecord[]>;
  saveAll(wounds: WoundRecord[]): Promise<void>;
  clear(): Promise<void>;
}

export class LocalWoundRepository implements WoundRepository {
  async list(): Promise<WoundRecord[]> {
    const data = await getJsonItem<WoundRecord[]>(WOUNDS_KEY);
    return data ?? [];
  }

  async saveAll(wounds: WoundRecord[]): Promise<void> {
    await setJsonItem(WOUNDS_KEY, wounds);
  }

  async clear(): Promise<void> {
    await removeItem(WOUNDS_KEY);
  }
}

// TODO: Replace with SupabaseWoundRepository when cloud persistence is enabled.
export const woundRepository: WoundRepository = new LocalWoundRepository();
