import { useGame } from "@/game/game-context.tsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useState } from "react";

import { OperationsView } from "@/features/operations-view";
import { ProductionView } from "@/features/production-view";
import { PowerGridView } from "@/features/power-grid-view";

type TabValue = "operations" | "production" | "power-grid";

const getPanelClassName = (isActive: boolean) =>
  isActive
    ? "visible relative"
    : "invisible absolute inset-0 pointer-events-none";

export const App = () => {
  const { game, snapshot, chartData } = useGame();
  const [activeTab, setActiveTab] = useState<TabValue>("operations");

  return (
    <div className="md:max-w-lg w-full h-screen mx-auto">
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TabValue)}>
        <div className="relative flex-1 pb-16">
          <div className={getPanelClassName(activeTab === "operations")}>
            <OperationsView game={game} snapshot={snapshot} />
          </div>

          {activeTab === "production" && (
            <div className={getPanelClassName(true)}>
              <ProductionView chartData={chartData} />
            </div>
          )}

          <div className={getPanelClassName(activeTab === "power-grid")}>
            <PowerGridView />
          </div>
        </div>

        <TabsList className="fixed bottom-0 z-50 md:max-w-lg w-full justify-center" variant="line">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="power-grid">Power Grid</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};