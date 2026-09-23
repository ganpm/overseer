import { useState } from "react";
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
  const [title, setTitle] = useState<"Production" | "Analytics">("Production");

  return (
    <div className="flex flex-col h-screen items-center w-full bg-[oklch(0.269_0_0)] overflow-hidden">
      <Tabs defaultValue="production" className="flex-1 flex flex-col gap-2 min-h-0 w-full md:w-md bg-background">
        <MenuBar title={title} className="mx-4 mt-2" />
        <Separator />
        <TabsContent value="production" className="min-h-0 mx-1 px-3 overflow-auto scrollbar-hidden">
          <ProductionOverview />
        </TabsContent>
        <TabsContent value="analytics" className="min-h-0 mx-1 px-3 overflow-auto scrollbar-hidden">
          <AnalyticsOverview />
        </TabsContent>
        <TabsList className="w-full justify-center" variant="line">
          <TabsTrigger value="production" onClick={() => setTitle("Production")}>Production</TabsTrigger>
          <TabsTrigger value="analytics" onClick={() => setTitle("Analytics")}>Analytics</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};