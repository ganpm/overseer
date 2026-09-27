import { useEffect, useRef, useState } from "react";
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
import { useGameStore } from "@/context/game";
import { useCatalog } from "@/hooks/game";

type TabValue = "production" | "analytics";

export const App = () => {
  const [tab, setTab] = useState<TabValue>("production");
  const [hasProductionNotification, setHasProductionNotification] = useState(false);
  const store = useGameStore();
  const catalog = useCatalog();
  const hasRunDemo = useRef(false);

  // Demo mode: build one of every available building and jump to Analytics to showcase the results
  useEffect(() => {
    if (hasRunDemo.current) return;
    hasRunDemo.current = true;

    store.mutate((game) => {
      for (const building of [...catalog.generationBuildings, ...catalog.productionBuildings]) {
        for (const processName of building.processOptions) {
          game.addBuilding(building.name, processName, 1);
        }
      }
    });

    setTab("analytics");
    setHasProductionNotification(true);
  }, [store, catalog]);

  const title = tab === "production" ? "Production" : "Analytics";

  return (
    <div className="flex flex-col h-screen items-center w-full bg-[oklch(0.269_0_0)] overflow-hidden">
      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = value as TabValue;
          setTab(next);
          if (next === "production") setHasProductionNotification(false);
        }}
        className="flex-1 flex flex-col gap-2 min-h-0 w-full md:w-md bg-background"
      >
        <MenuBar title={title} className="mx-4 mt-2" />
        <Separator />
        <TabsContent value="production" className="min-h-0 mx-1 px-3 overflow-auto scrollbar-hidden">
          <ProductionOverview />
        </TabsContent>
        <TabsContent value="analytics" className="min-h-0 mx-1 px-3 overflow-auto scrollbar-hidden">
          <AnalyticsOverview />
        </TabsContent>
        <TabsList className="w-full justify-center" variant="line">
          <TabsTrigger value="production" className="relative">
            Production
            {hasProductionNotification && (
              <span className="absolute top-0.5 right-1/4 size-2 rounded-full bg-destructive" aria-label="New activity" />
            )}
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};