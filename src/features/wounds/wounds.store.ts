import { create } from "zustand";

import { woundRepository } from "@/src/features/wounds/wounds.repository";
import { WoundObservation, WoundRecord } from "@/src/features/wounds/wounds.types";

type WoundsStore = {
  wounds: WoundRecord[];
  isHydrating: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  createWound: (wound: WoundRecord) => Promise<void>;
  addObservation: (woundId: string, observation: WoundObservation) => Promise<void>;
  updateObservationNotes: (woundId: string, observationId: string, notes: string) => Promise<void>;
  clearAll: () => Promise<void>;
};

function sortByUpdated(wounds: WoundRecord[]): WoundRecord[] {
  return [...wounds].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export const useWoundsStore = create<WoundsStore>((set, get) => ({
  wounds: [],
  isHydrating: true,
  error: null,
  hydrate: async () => {
    try {
      const wounds = await woundRepository.list();
      set({ wounds: sortByUpdated(wounds), isHydrating: false, error: null });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Failed to load wounds.";
      set({ error: message, isHydrating: false });
    }
  },
  createWound: async (wound) => {
    const wounds = sortByUpdated([wound, ...get().wounds]);
    await woundRepository.saveAll(wounds);
    set({ wounds, error: null });
  },
  addObservation: async (woundId, observation) => {
    const wounds = get().wounds.map((wound) => {
      if (wound.id !== woundId) {
        return wound;
      }

      return {
        ...wound,
        updatedAt: observation.capturedAt,
        coverImageUri: observation.originalImageUri,
        observations: [...wound.observations, observation],
      };
    });

    const sorted = sortByUpdated(wounds);
    await woundRepository.saveAll(sorted);
    set({ wounds: sorted, error: null });
  },
  updateObservationNotes: async (woundId, observationId, notes) => {
    const nowIso = new Date().toISOString();
    const wounds = get().wounds.map((wound) => {
      if (wound.id !== woundId) {
        return wound;
      }

      return {
        ...wound,
        updatedAt: nowIso,
        observations: wound.observations.map((observation) =>
          observation.id === observationId ? { ...observation, notes } : observation,
        ),
      };
    });

    const sorted = sortByUpdated(wounds);
    await woundRepository.saveAll(sorted);
    set({ wounds: sorted, error: null });
  },
  clearAll: async () => {
    await woundRepository.clear();
    set({ wounds: [] });
  },
}));
