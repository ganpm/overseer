import { useGame } from "@/game/game-context.tsx";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";

import { ProductionOverview } from "@/features/production/production.tsx";
import { AnalyticsOverview } from "@/features/analytics/analytics.tsx";


export const App = () => {
  const { game, snapshot, chartData } = useGame();

  return (
    <div className="md:max-w-lg w-full h-screen mx-auto">
      <Tabs defaultValue="operations">
        <div className="relative flex-1 pb-16">
          <TabsContent value="production">
            <ProductionOverview game={game} snapshot={snapshot} />
          </TabsContent>

          <TabsContent value="analytics">
            <AnalyticsOverview chartData={chartData} />
          </TabsContent>

        </div>
        <TabsList className="fixed bottom-0 z-50 md:max-w-lg w-full justify-center" variant="line">
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};