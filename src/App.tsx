import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import { OperationsView } from "@/features/operations-view";
import { ProductionView } from "@/features/production-view";
import { PowerGridView } from "@/features/power-grid-view";

export const App = () => {
  return (
    <div className="md:max-w-lg w-full h-screen mx-auto">
      <Tabs defaultValue="operations">
        <TabsContent value="operations">
          <OperationsView />
        </TabsContent>

        <TabsContent value="production">
          <ProductionView />
        </TabsContent>

        <TabsContent value="power-grid">
          <PowerGridView />
        </TabsContent>

        <TabsList className="fixed bottom-0 z-50 md:max-w-lg w-full justify-center" variant="line">
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="production">Production</TabsTrigger>
          <TabsTrigger value="power-grid">Power Grid</TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
};