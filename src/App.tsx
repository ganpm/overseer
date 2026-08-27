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
    <div className="flex flex-col h-screen w-full bg-foreground overflow-hidden">
      <Tabs defaultValue="production" className="mx-auto flex-1 min-h-0 w-full md:w-md bg-background">
        <TabsContent value="production" className="min-h-0 overflow-auto scrollbar-hidden">
          <ProductionOverview game={game} snapshot={snapshot} />
        </TabsContent>
        <TabsContent value="analytics" className="min-h-0 overflow-auto scrollbar-hidden">
          <AnalyticsOverview throughputChartData={throughputChartData} powerChartData={powerChartData} />
        </TabsContent>
        <TabsList className="md:w-md w-full justify-center" variant="line">
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};