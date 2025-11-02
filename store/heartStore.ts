// store/heartStore.ts
import { create } from "zustand";

export interface HeartState {
    hearts: { [postId: string]: any[] };
    setHearts: (postId: string, hearts: any[]) => void;
}

export const useHeartStore = create<HeartState>((set) => ({
    hearts: {},
    setHearts: (postId, newHearts) =>
        set((state: HeartState) => ({
            hearts: {
                ...state.hearts,
                [postId]: newHearts || [],
            },
        })),
}));
