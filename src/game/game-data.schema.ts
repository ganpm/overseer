import { z } from "zod";
import type {
  JSONGameData,
  Resource,
  ResourceAmount,
  Process,
  Building,
} from "pkg/overseer";

const ResourceSchema = z.object({
  name: z.string().trim().min(1),
});

type ResourceSchemaType = z.output<typeof ResourceSchema>;

const ResourceAmountSchema = z.object({
  amount: z.number().positive(),
  resource: z.string().trim().min(1),
});

type ResourceAmountSchemaType = z.output<typeof ResourceAmountSchema>;

const ProcessSchema = z.object({
  name: z.string().trim().min(1), 
  duration: z.number().positive(),
  powerConsumption: z.number().nonnegative(),
  powerGeneration: z.number().nonnegative(),
  inputs: z.array(ResourceAmountSchema),
  outputs: z.array(ResourceAmountSchema),
});

type ProcessSchemaType = z.output<typeof ProcessSchema>;

const BuildingSchema = z.object({
  name: z.string().trim().min(1),
  availableProcesses: z.array(z.string().trim().min(1)),
  cost: z.array(ResourceAmountSchema),
});

type BuildingSchemaType = z.output<typeof BuildingSchema>;

const JSONGameDataSchema = z.object({
  resources: z.array(ResourceSchema),
  processes: z.array(ProcessSchema),
  buildings: z.array(BuildingSchema),
}).superRefine((data, ctx) => {
  const resourceNames = data.resources.map((resource) => resource.name);
  const processNames = data.processes.map((process) => process.name);
  const buildingNames = data.buildings.map((building) => building.name);

  if (new Set(resourceNames).size !== resourceNames.length) {
    ctx.addIssue({
      code: "custom",
      path: ["resources"],
      message: "Duplicate resource names found in game data",
    });
  }

  if (new Set(processNames).size !== processNames.length) {
    ctx.addIssue({
      code: "custom",
      path: ["processes"],
      message: "Duplicate process names found in game data",
    });
  }

  if (new Set(buildingNames).size !== buildingNames.length) {
    ctx.addIssue({
      code: "custom",
      path: ["buildings"],
      message: "Duplicate building names found in game data",
    });
  }
});

type JSONGameDataSchemaType = z.output<typeof JSONGameDataSchema>;

// Validates the provided game data against the expected schema.
// Throws an error if the data is invalid.
export const validateGameData = (data: unknown): JSONGameData =>
  JSONGameDataSchema.parse(data);

// Strict type equality check for TypeScript types
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? (<T>() => T extends B ? 1 : 2) extends
      (<T>() => T extends A ? 1 : 2)
      ? true
      : false
    : false;

type Expect<T extends true> = T;

// Checks for drift between the Game types and the Zod schema types.
// If any of these assertions fail, it indicates that the
// TypeScript types and the Zod schema types are no longer in sync.
// Exported so type assertions do not generate unused variable errors
export type SchemaTypeAssertions = [
  Expect<Equal<Resource, ResourceSchemaType>>,
  Expect<Equal<ResourceAmount, ResourceAmountSchemaType>>,
  Expect<Equal<Process, ProcessSchemaType>>,
  Expect<Equal<Building, BuildingSchemaType>>,
  Expect<Equal<JSONGameData, JSONGameDataSchemaType>>,
];