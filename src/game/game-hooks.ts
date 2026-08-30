import { useSyncExternalStore } from "react";
import { useGameStore } from "@/game/game-context";
import type { GameSnapshot } from "@/game/game-context";
import type { ThroughputChartData, PowerChartData, Catalog } from "pkg/overseer";

// Selector hooks

export const useGameSnapshot = (): GameSnapshot => {
  const store = useGameStore();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}

// Prevents charts from re-rendering every tick interval instead of every sample interval

export const useThroughputChartData = (): ThroughputChartData[] => {
  const store = useGameStore();
  return useSyncExternalStore(store.subscribe, store.getThroughputChartData);
}

export const usePowerChartData = (): PowerChartData => {
  const store = useGameStore();
  return useSyncExternalStore(store.subscribe, store.getPowerChartData);
}

export const useCatalog = (): Catalog => {
  const store = useGameStore();
  return useSyncExternalStore(store.subscribe, store.getCatalog);
}