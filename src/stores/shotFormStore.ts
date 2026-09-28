import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { Half } from '@/domain/enums';

/**
 * 記録フォームで「直前の選択」を保持する状態（design.md 2.4）。
 * 入力中のシュートの値そのものは ShotForm の中で持ち、ここには入れない。
 */
type ShotFormState = {
  /** 試合ごとに、直前に選んだ担当GK */
  lastGoalkeeperIdByMatch: Record<string, string>;
  /** 試合ごとに、直前に選んだ前後半 */
  lastHalfByMatch: Record<string, Half>;
  /** 詳細欄（任意項目）を開いているか */
  isDetailOpen: boolean;
  setLastGoalkeeper: (matchId: string, goalkeeperId: string) => void;
  setLastHalf: (matchId: string, half: Half | undefined) => void;
  setDetailOpen: (isOpen: boolean) => void;
};

export const useShotFormStore = create<ShotFormState>()(
  persist(
    (set) => ({
      lastGoalkeeperIdByMatch: {},
      lastHalfByMatch: {},
      isDetailOpen: false,
      setLastGoalkeeper: (matchId, goalkeeperId) =>
        set((state) => ({ lastGoalkeeperIdByMatch: { ...state.lastGoalkeeperIdByMatch, [matchId]: goalkeeperId } })),
      setLastHalf: (matchId, half) =>
        set((state) => {
          const { [matchId]: _, ...rest } = state.lastHalfByMatch;
          return { lastHalfByMatch: half === undefined ? rest : { ...rest, [matchId]: half } };
        }),
      setDetailOpen: (isOpen) => set({ isDetailOpen: isOpen }),
    }),
    {
      name: 'handball_analysis.shotForm',
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
