import { useGame } from "@/game/game-context.tsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { OperationsView } from "@/features/operations-view";
import { ProductionView } from "@/features/production-view";
import { PowerGridView } from "@/features/power-grid-view";


export const App = () => {
  const { game, snapshot, chartData } = useGame();

  return (
    <div className="md:max-w-lg w-full h-screen mx-auto">
      <Tabs defaultValue="operations">
        <div className="relative flex-1 pb-16">
          <TabsContent value="operations">
            <OperationsView game={game} snapshot={snapshot} />
          </TabsContent>

          <TabsContent value="production">
            <ProductionView chartData={chartData} />
          </TabsContent>

          <TabsContent value="power-grid">
            <PowerGridView />
          </TabsContent>
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