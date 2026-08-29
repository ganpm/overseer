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
    cycle_speed_mult: f64,
    enabled: bool,
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
pub struct Catalog {
    production_buildings: Vec<Building>,
    generation_buildings: Vec<Building>,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct GameData {
    resources: HashMap<String, Resource>,
    processes: HashMap<String, Process>,
    buildings: HashMap<String, Building>,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Default)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ThroughputData {
    produced: f64,
    consumed: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ThroughputDataPoint {
    timestamp: f64,
    produced: f64,
    consumed: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ThroughputChartData {
    resource_name: String,
    current_amount: f64,
    average_production: f64,
    average_consumption: f64,
    average_rate: f64,
    points: Vec<ThroughputDataPoint>,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct InventoryEntry {
    resource: String,
    amount: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Default)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct PowerData {
    maximum_consumption: f64,
    maximum_generation: f64,
    current_consumption: f64,
    current_generation: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Copy, Default)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct PowerDataPoint {
    timestamp: f64,
    maximum_consumption: f64,
    maximum_generation: f64,
    net_maximum_power: f64,
    current_consumption: f64,
    current_generation: f64,
    net_current_power: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct PowerChartData {
    name: String,
    average_maximum_consumption: f64,
    average_maximum_generation: f64,
    average_net_maximum_power: f64,
    average_current_consumption: f64,
    average_current_generation: f64,
    average_net_current_power: f64,
    points: Vec<PowerDataPoint>,
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
    sample_interval: f64,

    /// Accumulator for tracking the flow of resources produced and consumed during a single tick of the game.
    throughput_data: HashMap<String, ThroughputData>,

    /// Tracker for the flow of resources over time, allowing for historical analysis of resource production and consumption.
    throughput_tracker: HashMap<String, VecDeque<ThroughputDataPoint>>,

    /// Internal variable for tracking power information
    power_data: PowerData,

    /// Internal variable for tracking power history over time
    power_tracker: Option<VecDeque<PowerDataPoint>>,

    /// Lookup table for all the data loaded into the game.
    data: GameData,

    /// Internal database for game data
    catalog: Catalog,
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
    pub fn new(json_data: JSONGameData, sample_length: usize, sample_interval: f64) -> Result<Game, JsValue> {
        let data = Self::create_data_from(&json_data);
        let catalog = Self::create_catalog_from(&json_data, &data);
        Ok(Game {
            inventory: HashMap::new(),
            buildings: HashMap::new(),
            sample_length,
            sample_interval,
            throughput_data: HashMap::new(),
            throughput_tracker: HashMap::new(),
            power_data: PowerData::default(),
            power_tracker: None,
            data,
            catalog,
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

    #[wasm_bindgen(getter)]
    pub fn catalog(&self) -> Catalog {
        self.catalog.clone()
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
                        cycle_speed_mult: 1.0,
                        enabled: true,
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

    #[wasm_bindgen(js_name = "setBuildingCycleSpeed")]
    pub fn set_building_cycle_speed(
        &mut self,
        building_name: &str,
        process_name: &str,
        cycle_speed_mult: f64
    ) -> Result<(), JsValue> {

        self.buildings
            .entry((building_name.to_string(), process_name.to_string()))
            .and_modify(|bgi| bgi.cycle_speed_mult = cycle_speed_mult);

        Ok(())
    }

    #[wasm_bindgen(js_name = "setBuildingEnabled")]
    pub fn set_building_enabled(
        &mut self,
        building_name: &str,
        process_name: &str,
        enabled: bool
    ) -> Result<(), JsValue> {

        self.buildings
            .entry((building_name.to_string(), process_name.to_string()))
            .and_modify(|bgi| bgi.enabled = enabled);

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

        // Update power data for current tick

        let mut maximum_power_consumption = 0.0;
        let mut maximum_power_generation = 0.0;
        let mut current_power_consumption = 0.0;
        let mut current_power_generation = 0.0;

        self.buildings.values().for_each(|group| {
            maximum_power_consumption += group.process.power_consumption * group.total_count as f64;
            maximum_power_generation += group.process.power_generation * group.total_count as f64;
            current_power_consumption += group.process.power_consumption * group.active_count as f64;
            current_power_generation += group.process.power_generation * group.active_count as f64;
        });

        let has_power = current_power_generation > 0.0;

        let consumer_power_scale = if current_power_consumption > 0.0 {
            (current_power_generation / current_power_consumption).clamp(0.0, 1.0)
        } else {
            1.0
        };

        self.power_data = PowerData {
            maximum_consumption: -maximum_power_consumption,
            maximum_generation: maximum_power_generation,
            current_consumption: -current_power_consumption,
            current_generation: current_power_generation,
        };

        let Game { inventory, buildings, ..} = self;

        let mut changed = false;

        // Note: |= on purpose, not || because || short-circuits and we want to tick all groups even if one returns true.
        for group in buildings.values_mut() {
            changed |= Self::tick_group(
                group,
                inventory,
                &mut self.throughput_data,
                delta_ms,
                has_power,
                consumer_power_scale
            );
        }

        Ok(changed)
    }

    #[wasm_bindgen(js_name = "getThroughputChartData")]
    pub fn get_throughput_chart_data(&self) -> Vec<ThroughputChartData> {
        let mut series = Vec::<ThroughputChartData>::new();

        for resource_name in self.data.resources.keys() {
            let points = self
                .throughput_tracker
                .get(resource_name)
                .cloned()
                .unwrap_or_else(|| vec![ThroughputDataPoint {
                    timestamp: 0.0,
                    produced: 0.0,
                    consumed: 0.0,
                }; self.sample_length].into());

            let current_amount = *self.inventory.get(resource_name).unwrap_or(&0.0);
            let average_production = points.iter().map(|p| p.produced).sum::<f64>() / self.sample_length as f64;
            let average_consumption = points.iter().map(|p| p.consumed).sum::<f64>() / self.sample_length as f64;
            let average_rate = average_production + average_consumption;

            series.push(ThroughputChartData {
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

    #[wasm_bindgen(js_name = "sampleThroughputData")]
    pub fn sample_throughput_data(&mut self, timestamp: f64) {
        let throughput_data = std::mem::take(&mut self.throughput_data);

        for resource_name in self.data.resources.keys() {
            let sampled = throughput_data.get(resource_name).cloned().unwrap_or_default();
            let tracker = self
                .throughput_tracker
                .entry(resource_name.clone())
                .or_insert_with(|| {
                    (0..self.sample_length)
                        .map(|i| ThroughputDataPoint {
                            timestamp: timestamp - (((self.sample_length - 1 - i) as f64) * self.sample_interval),
                            produced: 0.0,
                            consumed: 0.0,
                        })
                        .collect()
                }); // Initialize with default points if not present
            tracker.push_back(ThroughputDataPoint {
                timestamp,
                produced: sampled.produced,
                consumed: sampled.consumed,
            });
            while tracker.len() > self.sample_length {
                tracker.pop_front();
            }
            self.throughput_data.insert(resource_name.clone(), ThroughputData::default()); // Reset flow for the next tick
        }
    }

    #[wasm_bindgen(js_name = "getPowerChartData")]
    pub fn get_power_chart_data(&self) -> PowerChartData {
        let points: Vec<PowerDataPoint> = self.power_tracker.clone().unwrap_or_else(|| {
            (0..self.sample_length)
                .map(|_| PowerDataPoint {
                    timestamp: 0.0,
                    maximum_consumption: 0.0,
                    maximum_generation: 0.0,
                    net_maximum_power: 0.0,
                    current_consumption: 0.0,
                    current_generation: 0.0,
                    net_current_power: 0.0,
                })
                .collect()
        }).into();
        let average_maximum_consumption = points.iter().map(|p| p.maximum_consumption).sum::<f64>() / self.sample_length as f64;
        let average_maximum_generation = points.iter().map(|p| p.maximum_generation).sum::<f64>() / self.sample_length as f64;
        let average_net_maximum_power = points.iter().map(|p| p.net_maximum_power).sum::<f64>() / self.sample_length as f64;
        let average_current_consumption = points.iter().map(|p| p.current_consumption).sum::<f64>() / self.sample_length as f64;
        let average_current_generation = points.iter().map(|p| p.current_generation).sum::<f64>() / self.sample_length as f64;
        let average_net_current_power = points.iter().map(|p| p.net_current_power).sum::<f64>() / self.sample_length as f64;

        PowerChartData {
            name: "Power Information".into(),
            average_maximum_consumption,
            average_maximum_generation,
            average_net_maximum_power,
            average_current_consumption,
            average_current_generation,
            average_net_current_power,
            points: points.iter().cloned().collect(),
        }
    }

    #[wasm_bindgen(js_name = "samplePowerData")]
    pub fn sample_power_data(&mut self, timestamp: f64) {
        let mut tracker = self.power_tracker.take().unwrap_or_else(|| {
            (0..self.sample_length)
                .map(|i| PowerDataPoint {
                    timestamp: timestamp - (((self.sample_length - 1 - i) as f64) * self.sample_interval),
                    maximum_consumption: 0.0,
                    maximum_generation: 0.0,
                    net_maximum_power: 0.0,
                    current_consumption: 0.0,
                    current_generation: 0.0,
                    net_current_power: 0.0,
                })
                .collect()
        });
        tracker.push_back(PowerDataPoint {
            timestamp,
            maximum_consumption: self.power_data.maximum_consumption,
            maximum_generation: self.power_data.maximum_generation,
            net_maximum_power: self.power_data.maximum_generation + self.power_data.maximum_consumption,
            current_consumption: self.power_data.current_consumption,
            current_generation: self.power_data.current_generation,
            net_current_power: self.power_data.current_generation + self.power_data.current_consumption,
        });
        while tracker.len() > self.sample_length {
            tracker.pop_front();
        }
        self.power_tracker = Some(tracker);
    }
}


impl Game {
    fn create_data_from(json_data: &JSONGameData) -> GameData {
        let resources = json_data
            .resources
            .iter()
            .map(|r| (r.name.clone(), r.clone()))
            .collect::<HashMap<_, _>>();
        let processes = json_data
            .processes
            .iter()
            .map(|p| (p.name.clone(), p.clone()))
            .collect::<HashMap<_, _>>();
        let buildings = json_data
            .buildings
            .iter()
            .map(|b| (b.name.clone(), b.clone()))
            .collect::<HashMap<_, _>>();
        
        GameData {
            resources,
            processes,
            buildings,
        }
    }

    fn create_catalog_from(json_data: &JSONGameData, data: &GameData) -> Catalog {
        let production_buildings = json_data.buildings.iter()
            .filter(|&b| b.process_options.iter()
                .any(|p| match data.processes.get(p) {
                    Some(proc) => proc.power_consumption > 0.0,
                    None => false
                })
            )
            .map(|b| b.clone())
            .collect();

        let generation_buildings = json_data.buildings.iter()
            .filter(|&b| b.process_options.iter()
                .any(|p| match data.processes.get(p) {
                    Some(proc) => proc.power_generation > 0.0,
                    None => false
                })
            )
            .map(|b| b.clone())
            .collect();

        Catalog {
            production_buildings,
            generation_buildings,
        }
    }

    fn consume_inputs(
        inventory: &mut HashMap<String, f64>,
        throughput_data: &mut HashMap<String, ThroughputData>,
        inputs: &[ResourceAmount],
        count: u32,
    ) {
        for input in inputs {
            let consumed_amount = input.amount * count as f64;
            if consumed_amount <= 0.0 {
                continue;
            }
            *inventory.entry(input.resource.clone()).or_insert(0.0) -= consumed_amount;
            throughput_data
                .entry(input.resource.clone())
                .or_insert_with(ThroughputData::default)
                .consumed -= consumed_amount;
        }
    }

    fn produce_outputs(
        inventory: &mut HashMap<String, f64>,
        throughtput_values: &mut HashMap<String, ThroughputData>,
        outputs: &[ResourceAmount],
        count: u32,
    ) {
        for output in outputs {
            let produced_amount = output.amount * count as f64;
            *inventory.entry(output.resource.clone()).or_insert(0.0) += produced_amount;
            throughtput_values
                .entry(output.resource.clone())
                .or_insert_with(ThroughputData::default)
                .produced += produced_amount;
        }
    }

    fn tick_group(
        group: &mut BuildingGroupInstance,
        inventory: &mut HashMap<String, f64>,
        throughput_data: &mut HashMap<String, ThroughputData>,
        delta_ms: f64,
        has_power: bool,
        consumer_power_scale: f64,
    ) -> bool {
        let needs_power = group.process.power_consumption > 0.0;
        let is_powered = !needs_power || has_power;

        if !group.enabled {
            return false;
        }

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
            let time_advanced = delta_ms * efficiency * group.cycle_speed_mult;
            let next_elapsed = group.process.elapsed + time_advanced;

            // Cycle not complete: just increment elapsed cycle time and return.
            if next_elapsed < group.process.duration * 1000.0 {
                group.process.elapsed = next_elapsed;
                return true;
            }

            // Cycle complete: produce outputs for buildings that were
            // actively working this cycle.
            Self::produce_outputs(inventory, throughput_data, &group.process.outputs, group.active_count);

            // Buildings that just finished and and those in idle count (new arrivals or previously resource-starved)
            // now compete together for the next cycle.
            let candidates = group.active_count + group.idle_count;
            let starting = if is_powered {
                Self::max_affordable(inventory, &group.process.inputs, candidates)
            } else {
                0
            };

            if starting > 0 {
                // Consume inputs for the buildings that will start the next cycle.
                Self::consume_inputs(inventory, throughput_data, &group.process.inputs, starting);
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
                Self::consume_inputs(inventory, throughput_data, &group.process.inputs, starting);

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
