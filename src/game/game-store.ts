import type {
  Game,
  BuildingGroupInstance,
  InventoryEntry,
  ThroughputChartData,
  PowerChartData,
  Catalog,
} from "pkg/overseer";

export interface GameSnapshot {
  buildings: BuildingGroupInstance[];
  inventory: InventoryEntry[];
}

type Listener = () => void;

export class GameStore {
  private readonly listeners = new Set<Listener>();

  private readonly game: Game;
  private snapshot: GameSnapshot;
  private throughputChartData: ThroughputChartData[];
  private powerChartData: PowerChartData;
  private readonly catalog: Catalog;

  constructor(game: Game) {
    this.game = game;
    this.snapshot = { buildings: game.buildings, inventory: game.inventory };
    this.throughputChartData = game.getThroughputChartData();
    this.powerChartData = game.getPowerChartData();
    this.catalog = game.catalog;
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  getSnapshot = () => this.snapshot;
  getThroughputChartData = () => this.throughputChartData;
  getPowerChartData = () => this.powerChartData;
  getGame = () => this.game;
  getCatalog = () => this.catalog;

  tick(deltaMs: number) {
    this.game.tick(deltaMs);
    this.snapshot = { buildings: this.game.buildings, inventory: this.game.inventory };
    this.notify();
  }

  sample(timestamp: number) {
    this.game.sampleThroughputData(timestamp);
    this.game.samplePowerData(timestamp);
    this.throughputChartData = this.game.getThroughputChartData();
    this.powerChartData = this.game.getPowerChartData();
    this.notify();
  }

  /**
   * Mutates the external store. Syntax is similar to useState's setter function.
   * 
   * Usage:
   * ```ts
   * store.mutate(game => game.setBuildingEnabled(...))
   * ```
   * @param fn 
   * @returns 
   */
  mutate<T>(fn: (game: Game) => T): T {
    const result = fn(this.game);
    this.snapshot = { buildings: this.game.buildings, inventory: this.game.inventory };
    this.notify();
    return result;
  }
}