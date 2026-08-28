import { useState } from "react";
import { useGame } from "@/game/game-context.tsx";
import { MenuBar } from "@/components/menu-bar";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ProductionOverview } from "@/features/production/production.tsx";
import { AnalyticsOverview } from "@/features/analytics/analytics.tsx";


export const App = () => {
  const { game, snapshot, throughputChartData, powerChartData } = useGame();
  const [title, setTitle] = useState<"Production" | "Analytics">("Production");

  return (
    <div className="flex flex-col h-screen items-center w-full bg-foreground overflow-hidden">
      <Tabs defaultValue="production" className="flex-1 flex flex-col gap-2 min-h-0 w-full md:w-md bg-background">
        <MenuBar title={title} className="mx-4 mt-4" />
        <Separator />
        <TabsContent value="production" className="min-h-0 mx-4 overflow-auto scrollbar-hidden">
          <ProductionOverview game={game} snapshot={snapshot} />
        </TabsContent>
        <TabsContent value="analytics" className="min-h-0 mx-4 overflow-auto scrollbar-hidden">
          <AnalyticsOverview throughputChartData={throughputChartData} powerChartData={powerChartData} />
        </TabsContent>
        <TabsList className="w-full justify-center" variant="line">
          <TabsTrigger value="production" onClick={() => setTitle("Production")}>Production</TabsTrigger>
          <TabsTrigger value="analytics" onClick={() => setTitle("Analytics")}>Analytics</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};