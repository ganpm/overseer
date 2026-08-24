use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque, hash_map::Entry};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

/// Represents a resource in the game.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct Resource {
    name: String,
}

/// Represents a specific amount of a resource.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ResourceAmount {
    amount: f64,
    resource: String,
}

/// Represents a process that can be run in a building.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct Process {
    name: String,
    duration: f64,
    power_consumption: f64,
    power_generation: f64,
    inputs: Vec<ResourceAmount>,
    outputs: Vec<ResourceAmount>,
}

/// Represents a building in the game.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct Building {
    name: String,
    process_options: Vec<String>,
    cost: Vec<ResourceAmount>,
}

/// Represents an instance of a process running in a building.
/// This is used to track the state of a process, including its progress and efficiency.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ProcessInstance {
    name: String,
    power_consumption: f64,
    power_generation: f64,
    inputs: Vec<ResourceAmount>,
    outputs: Vec<ResourceAmount>,
    duration: f64,
    elapsed: f64,
    efficiency: f64,
}

/// Represents a group of buildings running the same process.
/// This struct is used to track the state of a building group, including the number of active and pending buildings, as well as the total count of buildings in the group.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct BuildingGroupInstance {
    name: String,
    process: ProcessInstance,
    total_count: u32,
    /// The number of buildings running the process.
    /// Some buildings will not be active if there are not enough resources to run the process.
    active_count: u32,
    idle_count: u32,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Default)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ThroughputValue {
    produced: f64,
    consumed: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Default)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct RateHistory {
    produced: VecDeque<f64>,
    consumed: VecDeque<f64>,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(from_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct JSONGameData {
    resources: Vec<Resource>,
    processes: Vec<Process>,
    buildings: Vec<Building>,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct GameData {
    resources: HashMap<String, Resource>,
    processes: HashMap<String, Process>,
    buildings: HashMap<String, Building>,
}


#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ThroughputPoint {
    timestamp: f64,
    produced: f64,
    consumed: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ProductionChartData {
    resource_name: String,
    current_amount: f64,
    average_production: f64,
    average_consumption: f64,
    average_rate: f64,
    points: Vec<ThroughputPoint>,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct InventoryEntry {
    resource: String,
    amount: f64,
}

/// Represents the state of the game, including the player's inventory, constructed buildings, and available processes.
#[wasm_bindgen]
pub struct Game {
    /// The current inventory.
    /// Uses the resource name to keep track of the quantity of that resource in the inventory.
    /// Represented as a HashMap for efficient lookups and updates of item quantities.
    inventory: HashMap<String, f64>,

    /// The currently constructed buildings and the processes they are currently running.
    buildings: HashMap<(String, String), BuildingGroupInstance>,

    sample_length: usize,

    /// Accumulator for tracking the flow of resources produced and consumed during a single tick of the game.
    throughput_values: HashMap<String, ThroughputValue>,

    /// Tracker for the flow of resources over time, allowing for historical analysis of resource production and consumption.
    throughput_tracker: HashMap<String, VecDeque<ThroughputPoint>>,

    /// Lookup table for all the data loaded into the game.
    data: GameData,
}

impl Game {
    fn max_affordable(
        inventory: &HashMap<String, f64>,
        cost: &[ResourceAmount],
        requested: u32,
    ) -> u32 {
        if requested == 0 || cost.is_empty() {
            return requested;
        }

        cost.iter().fold(requested, |max_count, item| {
            if item.amount <= 0.0 {
                return max_count;
            }
            let available = inventory.get(&item.resource).copied().unwrap_or(0.0);
            let affordable = (available / item.amount).floor().max(0.0) as u32;
            max_count.min(affordable)
        })
    }
}


#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new(data: JSONGameData, sample_length: usize) -> Result<Game, JsValue> {
        let resources = data
            .resources
            .into_iter()
            .map(|r| (r.name.clone(), r))
            .collect::<HashMap<_, _>>();
        let processes = data
            .processes
            .into_iter()
            .map(|p| (p.name.clone(), p))
            .collect::<HashMap<_, _>>();
        let buildings = data
            .buildings
            .into_iter()
            .map(|b| (b.name.clone(), b))
            .collect::<HashMap<_, _>>();

        Ok(Game {
            inventory: HashMap::new(),
            buildings: HashMap::new(),
            sample_length,
            throughput_values: HashMap::new(),
            throughput_tracker: HashMap::new(),
            data: GameData {
                resources,
                processes,
                buildings,
            },
        })
    }

    #[wasm_bindgen(getter)]
    pub fn inventory(&self) -> Vec<InventoryEntry> {
        self.inventory
            .iter()
            .map(|(k, v)| InventoryEntry {
                resource: k.clone(),
                amount: *v,
            })
            .collect()
    }

    #[wasm_bindgen(getter)]
    pub fn buildings(&self) -> Vec<BuildingGroupInstance> {
        self.buildings.values().cloned().collect()
    }

    #[wasm_bindgen(getter)]
    pub fn data(&self) -> GameData {
        self.data.clone()
    }

    #[wasm_bindgen(js_name = "addBuilding")]
    pub fn add_building(
        &mut self,
        building_name: &str,
        process_name: &str,
        count: i32,
    ) -> Result<(), JsValue> {
        if count == 0 {
            return Ok(());
        }

        let Some(building) = self.data.buildings.get(building_name) else {
            return Err(JsValue::from_str(&format!(
                "Building '{}' does not exist",
                building_name
            )));
        };

        if !building.process_options.iter().any(|p| p == process_name)
        {
            return Err(JsValue::from_str(&format!(
                "Process '{}' is not available for building '{}'",
                process_name, building_name
            )));
        }

        let key = (building_name.to_string(), process_name.to_string());

        if count > 0 {
            let requested = count as u32;

            let buildable = requested;
            // let buildable = Self::max_affordable(&self.inventory, &building.cost, requested);
            // if buildable == 0 {
            //     // TODO: Consider returning an error or warning if the player cannot afford any buildings.
            //     return Ok(()); 
            // }

            match self.buildings.entry(key) {
                Entry::Occupied(mut entry) => {
                    // Group already exists, pay for new buildings,
                    // and add them in as idle, leaving the running cycle unaffected.
                    // for cost in &building.cost {
                    //     *self.inventory.entry(cost.resource.clone()).or_insert(0.0) -=
                    //         cost.amount * buildable as f64;
                    // }

                    let group = entry.get_mut();
                    group.total_count = group.total_count.saturating_add(buildable);
                    group.idle_count = group.idle_count.saturating_add(buildable);
                },
                Entry::Vacant(entry) => {
                    let Some(process) = self.data.processes.get(process_name) else {
                        return Err(JsValue::from_str(&format!(
                            "Process '{}' does not exist",
                            process_name
                        )));
                    };

                    //for cost in &building.cost {
                    //    *self.inventory.entry(cost.resource.clone()).or_insert(0.0) -=
                    //        cost.amount * buildable as f64;
                    //}

                    entry.insert(BuildingGroupInstance {
                        name: building_name.to_string(),
                        process: ProcessInstance {
                            name: process_name.to_string(),
                            power_consumption: process.power_consumption,
                            power_generation: process.power_generation,
                            inputs: process.inputs.clone(),
                            outputs: process.outputs.clone(),
                            duration: process.duration,
                            elapsed: 0.0,
                            efficiency: 0.0,
                        },
                        total_count: buildable,
                        active_count: 0,
                        idle_count: buildable,
                    });
                }
            }
        } else {
            let to_remove = (-count) as u32;

            if let Entry::Occupied(mut entry) = self.buildings.entry(key) {
                let group = entry.get_mut();
                let removed = to_remove.min(group.total_count);

                let from_idle = removed.min(group.idle_count);
                group.idle_count = group.idle_count.saturating_sub(from_idle);

                let from_active = removed.saturating_sub(from_idle);
                group.active_count = group.active_count.saturating_sub(from_active);
                group.total_count = group.total_count.saturating_sub(removed);

                if group.total_count == 0 {
                    entry.remove();
                }
            }
        }

        Ok(())
    }

    #[wasm_bindgen(js_name = "tick")]
    pub fn tick(&mut self, delta_ms: f64) -> Result<bool, JsValue> {
        if !delta_ms.is_finite() {
            return Err(JsValue::from_str("Delta seconds must be finite"));
        }

        if delta_ms <= 0.0 {
            return Ok(false);
        }

        let mut total_power_consumption = 0.0_f64;
        let mut total_power_generation = 0.0_f64;

        self.buildings.values().for_each(|group| {
            total_power_consumption += group.process.power_consumption * group.active_count as f64;
            total_power_generation += group.process.power_generation * group.active_count as f64;
        });

        let has_power = total_power_generation > 0.0;

        let consumer_power_scale = if total_power_consumption > 0.0 {
            (total_power_generation / total_power_consumption).clamp(0.0, 1.0)
        } else {
            1.0
        };

        let Game { inventory, buildings, ..} = self;

        let mut changed = false;

        // Note: |= on purpose, not || because || short-circuits and we want to tick all groups even if one returns true.
        for group in buildings.values_mut() {
            changed |= Self::tick_group(
                group,
                inventory,
                &mut self.throughput_values,
                delta_ms,
                has_power,
                consumer_power_scale
            );
        }

        Ok(changed)
    }

    #[wasm_bindgen(js_name = "getProductionChartData")]
    pub fn get_production_chart_data(&self) -> Vec<ProductionChartData> {
        let mut series = Vec::<ProductionChartData>::new();

        for resource_name in self.data.resources.keys() {
            let points = self
                .throughput_tracker
                .get(resource_name)
                .cloned()
                .unwrap_or_else(|| vec![ThroughputPoint {
                    timestamp: 0.0,
                    produced: 0.0,
                    consumed: 0.0,
                }; self.sample_length].into());

            let current_amount = *self.inventory.get(resource_name).unwrap_or(&0.0);
            let average_production = points.iter().map(|p| p.produced).sum::<f64>() / self.sample_length as f64;
            let average_consumption = points.iter().map(|p| p.consumed).sum::<f64>() / self.sample_length as f64;
            let average_rate = average_production + average_consumption;

            series.push(ProductionChartData {
                resource_name: resource_name.clone(),
                current_amount: current_amount,
                average_production,
                average_consumption,
                average_rate,
                points: points.into(),
            });
        }

        series
    }

    #[wasm_bindgen(js_name = "sampleThroughput")]
    pub fn sample_throughput(&mut self, timestamp: f64) {
        let throughput_values = std::mem::take(&mut self.throughput_values);

        for resource_name in self.data.resources.keys() {
            let sampled = throughput_values.get(resource_name).cloned().unwrap_or_default();
            let tracker = self
                .throughput_tracker
                .entry(resource_name.clone())
                .or_insert_with(|| vec![ThroughputPoint {
                    timestamp,
                    produced: 0.0,
                    consumed: 0.0,
                }; self.sample_length].into()); // Initialize with default points if not present
            tracker.push_back(ThroughputPoint {
                timestamp,
                produced: sampled.produced,
                consumed: sampled.consumed,
            });
            while tracker.len() > self.sample_length {
                tracker.pop_front();
            }
            self.throughput_values.insert(resource_name.clone(), ThroughputValue::default()); // Reset flow for the next tick
        }
    }
}


impl Game {
    fn consume_inputs(
        inventory: &mut HashMap<String, f64>,
        throughput_values: &mut HashMap<String, ThroughputValue>,
        inputs: &[ResourceAmount],
        count: u32,
    ) {
        for input in inputs {
            let consumed_amount = input.amount * count as f64;
            if consumed_amount <= 0.0 {
                continue;
            }
            *inventory.entry(input.resource.clone()).or_insert(0.0) -= consumed_amount;
            throughput_values
                .entry(input.resource.clone())
                .or_insert_with(ThroughputValue::default)
                .consumed -= consumed_amount;
        }
    }

    fn produce_outputs(
        inventory: &mut HashMap<String, f64>,
        throughtput_values: &mut HashMap<String, ThroughputValue>,
        outputs: &[ResourceAmount],
        count: u32,
    ) {
        for output in outputs {
            let produced_amount = output.amount * count as f64;
            *inventory.entry(output.resource.clone()).or_insert(0.0) += produced_amount;
            throughtput_values
                .entry(output.resource.clone())
                .or_insert_with(ThroughputValue::default)
                .produced += produced_amount;
        }
    }

    fn tick_group(
        group: &mut BuildingGroupInstance,
        inventory: &mut HashMap<String, f64>,
        throughput_values: &mut HashMap<String, ThroughputValue>,
        delta_ms: f64,
        has_power: bool,
        consumer_power_scale: f64,
    ) -> bool {
        let needs_power = group.process.power_consumption > 0.0;
        let is_powered = !needs_power || has_power;

        // Anything mid-cycle stops and loses progress, dropping back to idle.
        // Buildings that need power cannot do anything else this tick.
        if needs_power && !is_powered {
            if group.active_count > 0 {
                group.idle_count = group.idle_count.saturating_add(group.active_count);
                group.active_count = 0;
                group.process.elapsed = 0.0;
                return true;
            }
            return false;
        }

        // Brownouts (has power but scarce) slows consumers down instead of stopping them
        // Non-consumers are unaffected
        let efficiency = if needs_power && is_powered {
            consumer_power_scale
        } else {
            1.0
        };

        group.process.efficiency = efficiency;

        if group.active_count > 0 {
            let time_advanced = delta_ms * efficiency;
            let next_elapsed = group.process.elapsed + time_advanced;

            // Cycle not complete: just increment elapsed cycle time and return.
            if next_elapsed < group.process.duration * 1000.0 {
                group.process.elapsed = next_elapsed;
                return true;
            }

            // Cycle complete: produce outputs for buildings that were
            // actively working this cycle.
            Self::produce_outputs(inventory, throughput_values, &group.process.outputs, group.active_count);

            // Buiildings that just finished and and those in idle count (new arrivals or previously resource-starved)
            // now compete together for the next cycle.
            let candidates = group.active_count + group.idle_count;
            let starting = if is_powered {
                Self::max_affordable(inventory, &group.process.inputs, candidates)
            } else {
                0
            };

            if starting > 0 {
                // Consume inputs for the buildings that will start the next cycle.
                Self::consume_inputs(inventory, throughput_values, &group.process.inputs, starting);
            }
            group.active_count = starting;
            group.idle_count = candidates.saturating_sub(starting);
            group.process.elapsed = 0.0;
            return true;
        } else if group.idle_count > 0 && is_powered {
            // Nothing running - idle buildings try to start a new cycle as soon as resources and power allow
            let starting = Self::max_affordable(inventory, &group.process.inputs, group.idle_count);
            if starting > 0 {
                // Consume inputs for the buildings that will start the next cycle.
                Self::consume_inputs(inventory, throughput_values, &group.process.inputs, starting);

                group.active_count = starting;
                group.idle_count = group.idle_count.saturating_sub(starting);
                group.process.elapsed = 0.0;
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}
