import { create } from "zustand";

import { woundRepository } from "@/src/features/wounds/wounds.repository";
import { fileSystemMediaService } from "@/src/services/media/fileSystemMedia.service";
import { WoundObservation, WoundRecord } from "@/src/features/wounds/wounds.types";

type WoundsStore = {
  wounds: WoundRecord[];
  isHydrating: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  createWound: (wound: WoundRecord) => Promise<void>;
  addObservation: (woundId: string, observation: WoundObservation) => Promise<void>;
  updateObservationNotes: (woundId: string, observationId: string, notes: string) => Promise<void>;
  /** Delete a single observation (and its media files) from a wound. */
  deleteObservation: (woundId: string, observationId: string) => Promise<void>;
  /** Delete an entire wound record and all its media files. */
  deleteWound: (woundId: string) => Promise<void>;
  /** Save AI analysis result to a wound-level field. */
  saveWoundAiAnalysis: (woundId: string, analysis: NonNullable<WoundRecord["aiAnalysis"]>) => Promise<void>;
  /** Save AI analysis result to a specific observation. */
  saveObservationAiAnalysis: (woundId: string, observationId: string, analysis: NonNullable<WoundObservation["aiAnalysis"]>) => Promise<void>;
  /** Manually override the wound type classification. */
  updateWoundType: (woundId: string, topClassKey: string) => Promise<void>;
  /** Update wound label and/or body location. */
  updateWoundDetails: (woundId: string, label: string, bodyLocation?: string) => Promise<void>;
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
  deleteObservation: async (woundId, observationId) => {
    const wound = get().wounds.find((w) => w.id === woundId);
    if (!wound) return;

    // Delete media files first (fire-and-forget errors)
    try {
      await fileSystemMediaService.deleteObservationMedia(woundId, observationId);
    } catch { /* ignore */ }

    const updatedObservations = wound.observations.filter((o) => o.id !== observationId);

    // If last observation deleted, remove the whole wound
    if (updatedObservations.length === 0) {
      const wounds = get().wounds.filter((w) => w.id !== woundId);
      await woundRepository.saveAll(wounds);
      set({ wounds });
      return;
    }

    // Otherwise update coverImage to latest remaining observation
    const latest = [...updatedObservations].sort(
      (a, b) => new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime()
    )[0];

    const wounds = sortByUpdated(
      get().wounds.map((w) =>
        w.id !== woundId
          ? w
          : { ...w, observations: updatedObservations, coverImageUri: latest.originalImageUri, updatedAt: latest.capturedAt }
      )
    );
    await woundRepository.saveAll(wounds);
    set({ wounds, error: null });
  },

  deleteWound: async (woundId) => {
    const wound = get().wounds.find((w) => w.id === woundId);
    if (!wound) return;

    // Delete all media files for the wound
    try {
      await fileSystemMediaService.deleteWoundMedia(woundId, wound.observations.map((o) => o.id));
    } catch { /* ignore */ }

    const wounds = get().wounds.filter((w) => w.id !== woundId);
    await woundRepository.saveAll(wounds);
    set({ wounds, error: null });
  },

  saveWoundAiAnalysis: async (woundId, analysis) => {
    const now = new Date().toISOString();
    const wounds = get().wounds.map((w) =>
      w.id !== woundId ? w : { ...w, updatedAt: now, aiAnalysis: analysis }
    );
    await woundRepository.saveAll(wounds);
    set({ wounds, error: null });
  },

  saveObservationAiAnalysis: async (woundId, observationId, analysis) => {
    const wounds = get().wounds.map((w) =>
      w.id !== woundId
        ? w
        : {
            ...w,
            observations: w.observations.map((o) =>
              o.id !== observationId ? o : { ...o, aiAnalysis: analysis }
            ),
          }
    );
    await woundRepository.saveAll(wounds);
    set({ wounds, error: null });
  },

  updateWoundType: async (woundId, topClassKey) => {
    const now = new Date().toISOString();
    const wounds = sortByUpdated(
      get().wounds.map((w) =>
        w.id !== woundId
          ? w
          : {
              ...w,
              updatedAt: now,
              woundType: {
                ...w.woundType,
                topClassKey,
                source: "classification_space" as const,
                // Mark as manually overridden via confidence=1 and single probability
                confidence: 1.0,
                probabilities: { [topClassKey]: 1.0 },
              },
            }
      )
    );
    await woundRepository.saveAll(wounds);
    set({ wounds, error: null });
  },

  updateWoundDetails: async (woundId, label, bodyLocation) => {
    const now = new Date().toISOString();
    const wounds = sortByUpdated(
      get().wounds.map((w) =>
        w.id !== woundId
          ? w
          : { ...w, updatedAt: now, label: label.trim() || w.label, bodyLocation: bodyLocation?.trim() || undefined }
      )
    );
    await woundRepository.saveAll(wounds);
    set({ wounds, error: null });
  },

  clearAll: async () => {
    await woundRepository.clear();
    set({ wounds: [] });
  },
}));
