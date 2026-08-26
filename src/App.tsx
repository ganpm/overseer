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
  const { game, snapshot, throughputChartData, powerChartData } = useGame();

  return (
    <div className="flex flex-col h-screen w-full bg-foreground overflow-y-auto scrollbar-hidden">
      <Tabs defaultValue="production" className="flex-1 mx-auto w-full md:w-md bg-background">
        <TabsContent value="production">
          <ProductionOverview game={game} snapshot={snapshot} />
        </TabsContent>
        <TabsContent value="analytics">
          <AnalyticsOverview throughputChartData={throughputChartData} powerChartData={powerChartData} />
        </TabsContent>
        <TabsList className="fixed bottom-0 z-50 md:w-md w-full justify-center" variant="line">
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};