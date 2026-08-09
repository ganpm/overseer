use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet, VecDeque, hash_map::Entry};
use tsify::Tsify;
use wasm_bindgen::prelude::*;

const FLOW_HISTORY_LENGTH: usize = 60;

/// Represents a resource in the game.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
pub struct Resource {
    name: String,
}

/// Represents a specific amount of a resource.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
pub struct ResourceAmount {
    amount: f64,
    resource: String,
}

/// Represents a process that can be run in a building.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
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
pub struct Building {
    name: String,
    available_processes: Vec<String>,
    cost: Vec<ResourceAmount>,
}

/// Represents an instance of a process running in a building.
/// This struct is used to track the state of a process, including its progress and efficiency.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
pub struct ProcessInstance {
    process_name: String,
    power_consumption: f64,
    power_generation: f64,
    inputs: Vec<ResourceAmount>,
    outputs: Vec<ResourceAmount>,
    duration: f64,
    remaining_seconds: f64,
    progress_percent: f64,
    efficiency_percent: f64,
}

/// Represents a group of buildings running the same process.
/// This struct is used to track the state of a building group, including the number of active and pending buildings, as well as the total count of buildings in the group.
#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
pub struct BuildingGroupInstance {
    building_name: String,
    process: ProcessInstance,
    total_count: u32,
    /// The number of buildings running the process.
    /// Some buildings will not be active if there are not enough resources to run the process.
    active_count: u32,
    idle_count: u32,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Default)]
#[tsify(into_wasm_abi)]
pub struct Rate {
    produced: f64,
    consumed: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone, Default)]
#[tsify(into_wasm_abi)]
pub struct RateHistory {
    produced: VecDeque<f64>,
    consumed: VecDeque<f64>,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(from_wasm_abi)]
pub struct JSONGameData {
    resources: Vec<Resource>,
    processes: Vec<Process>,
    buildings: Vec<Building>,
}

fn validate_data(data: &JSONGameData) -> Result<(), String> {
    let resource_names: HashSet<&str> = data
        .resources
        .iter()
        .map(|resource| resource.name.as_str())
        .collect();
    let process_names: HashSet<&str> = data
        .processes
        .iter()
        .map(|process| process.name.as_str())
        .collect();
    let building_names: HashSet<&str> = data
        .buildings
        .iter()
        .map(|building| building.name.as_str())
        .collect();

    if resource_names.len() != data.resources.len() {
        return Err("Duplicate resource names found in catalog".to_string());
    }
    if process_names.len() != data.processes.len() {
        return Err("Duplicate process names found in catalog".to_string());
    }
    if building_names.len() != data.buildings.len() {
        return Err("Duplicate building names found in catalog".to_string());
    }

    for resource in &data.resources {
        if resource.name.trim().is_empty() {
            return Err("Resource name cannot be empty".to_string());
        }
    }

    for process in &data.processes {
        if process.name.trim().is_empty() {
            return Err("Process name cannot be empty".to_string());
        }
        if process.duration <= 0.0 {
            return Err(format!(
                "Process '{}' must have a positive duration",
                process.name
            ));
        }
        if !process.power_consumption.is_finite() || process.power_consumption < 0.0 {
            return Err(format!(
                "Process '{}' must have a finite, non-negative power_consumption",
                process.name
            ));
        }
        if !process.power_generation.is_finite() || process.power_generation < 0.0 {
            return Err(format!(
                "Process '{}' must have a finite, non-negative power_generation",
                process.name
            ));
        }

        for input in &process.inputs {
            if input.amount <= 0.0 {
                return Err(format!(
                    "Process '{}' has a non-positive input amount for resource '{}'",
                    process.name, input.resource
                ));
            }
            if !resource_names.contains(input.resource.as_str()) {
                return Err(format!(
                    "Process '{}' references unknown input resource '{}'",
                    process.name, input.resource
                ));
            }
        }

        for output in &process.outputs {
            if output.amount <= 0.0 {
                return Err(format!(
                    "Process '{}' has a non-positive output amount for resource '{}'",
                    process.name, output.resource
                ));
            }
            if !resource_names.contains(output.resource.as_str()) {
                return Err(format!(
                    "Process '{}' references unknown output resource '{}'",
                    process.name, output.resource
                ));
            }
        }
    }

    for building in &data.buildings {
        if building.name.trim().is_empty() {
            return Err("Building name cannot be empty".to_string());
        }

        for process_name in &building.available_processes {
            if !process_names.contains(process_name.as_str()) {
                return Err(format!(
                    "Building '{}' references unknown process '{}'",
                    building.name, process_name
                ));
            }
        }

        for cost in &building.cost {
            if cost.amount <= 0.0 {
                return Err(format!(
                    "Building '{}' has a non-positive cost amount for resource '{}'",
                    building.name, cost.resource
                ));
            }
            if !resource_names.contains(cost.resource.as_str()) {
                return Err(format!(
                    "Building '{}' references unknown cost resource '{}'",
                    building.name, cost.resource
                ));
            }
        }
    }

    Ok(())
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
pub struct GameData {
    resources: HashMap<String, Resource>,
    processes: HashMap<String, Process>,
    buildings: HashMap<String, Building>,
}


#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
pub struct ProductionChartPoint {
    label: String,
    produced: f64,
    consumed: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
pub struct ProductionChartSeries {
    resource_name: String,
    current_amount: f64,
    average_production: f64,
    average_consumption: f64,
    average_rate: f64,
    points: Vec<ProductionChartPoint>,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
pub struct InventoryEntry {
    resource: String,
    amount: f64,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
pub struct RateHistoryEntry {
    resource: String,
    rate: RateHistory,
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

    /// Accumulator for tracking the flow of resources produced and consumed during a single tick of the game.
    flow: HashMap<String, Rate>,

    /// Tracker for the flow of resources over time, allowing for historical analysis of resource production and consumption.
    tracker: HashMap<String, RateHistory>,

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
    pub fn new(data: JSONGameData) -> Result<Game, JsValue> {
        validate_data(&data)
            .map_err(|err| JsValue::from_str(&format!("Game data validation failed: {err}")))?;

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
            flow: HashMap::new(),
            tracker: HashMap::new(),
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
        self.buildings
            .iter()
            .map(|((bn, _), bgi)| BuildingGroupInstance {
                building_name: bn.clone(),
                process: bgi.process.clone(),
                active_count: bgi.active_count,
                idle_count: bgi.idle_count,
                total_count: bgi.total_count,
            })
            .collect()
    }

    #[wasm_bindgen(getter)]
    pub fn tracker(&self) -> Vec<RateHistoryEntry> {
        self.tracker
            .iter()
            .map(|(k, v)| RateHistoryEntry {
                resource: k.clone(),
                rate: v.clone(),
            })
            .collect()
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

        if !building.available_processes.iter().any(|p| p == process_name)
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
                        building_name: building_name.to_string(),
                        process: ProcessInstance {
                            process_name: process_name.to_string(),
                            power_consumption: process.power_consumption,
                            power_generation: process.power_generation,
                            inputs: process.inputs.clone(),
                            outputs: process.outputs.clone(),
                            duration: process.duration,
                            remaining_seconds: process.duration,
                            progress_percent: 0.0,
                            efficiency_percent: 100.0,
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
    pub fn tick(&mut self, delta_seconds: f64) -> Result<bool, JsValue> {
        if !delta_seconds.is_finite() {
            return Err(JsValue::from_str("Delta seconds must be finite"));
        }

        if delta_seconds <= 0.0 {
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
                &mut self.flow,
                delta_seconds,
                has_power,
                consumer_power_scale
            );
        }

        Ok(changed)
    }

    #[wasm_bindgen(js_name = "getProductionChartSeries")]
    pub fn get_production_chart_series(&self) -> Vec<ProductionChartSeries> {
        let mut series = Vec::<ProductionChartSeries>::new();

        for resource_name in self.data.resources.keys() {
            let history = self
                .tracker
                .get(resource_name)
                .cloned()
                .unwrap_or_else(|| RateHistory {
                    produced: vec![0.0; FLOW_HISTORY_LENGTH].into(),
                    consumed: vec![0.0; FLOW_HISTORY_LENGTH].into(),
                });

            let points = history
                .produced
                .iter()
                .zip(history.consumed.iter())
                .enumerate()
                .map(|(index, (produced, consumed))| ProductionChartPoint {
                    label: format!("-{}s", FLOW_HISTORY_LENGTH - 1 - index),
                    produced: *produced,
                    consumed: *consumed,
                })
                .collect::<Vec<_>>();

            let current_amount = *self.inventory.get(resource_name).unwrap_or(&0.0);
            let average_production = history.produced.iter().sum::<f64>() / FLOW_HISTORY_LENGTH as f64;
            let average_consumption = history.consumed.iter().sum::<f64>() / FLOW_HISTORY_LENGTH as f64;
            let average_rate = average_production + average_consumption;

            series.push(ProductionChartSeries {
                resource_name: resource_name.clone(),
                current_amount: current_amount,
                average_production,
                average_consumption,
                average_rate,
                points,
            });
        }

        series
    }

    #[wasm_bindgen(js_name = "sampleResourceFlowHistory")]
    pub fn sample_resource_flow_history(&mut self) {
        let sample_flow = std::mem::take(&mut self.flow);

        for resource_name in self.data.resources.keys() {
            let sampled = sample_flow.get(resource_name).cloned().unwrap_or_default();
            let history = self
                .tracker
                .entry(resource_name.clone())
                .or_insert_with(|| RateHistory {
                    produced: vec![0.0; FLOW_HISTORY_LENGTH].into(),
                    consumed: vec![0.0; FLOW_HISTORY_LENGTH].into(),
                });
            history.produced.pop_front();
            history.produced.push_back(sampled.produced);
            history.consumed.pop_front();
            history.consumed.push_back(sampled.consumed);
            self.flow.insert(resource_name.clone(), Rate::default()); // Reset flow for the next tick
        }
    }
}


impl Game {
    fn tick_group(
        group: &mut BuildingGroupInstance,
        inventory: &mut HashMap<String, f64>,
        flow: &mut HashMap<String, Rate>,
        delta_seconds: f64,
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
                group.process.remaining_seconds = group.process.duration;
                group.process.progress_percent = 0.0;
                return true;
            }
            return false;
        }

        // Brownouts (has power but scarce) slows consumers down instead of stopping them
        // Non-consumers are unaffected
        let speed_scale = if needs_power && is_powered {
            consumer_power_scale
        } else {
            1.0
        };

        if group.active_count > 0 {
            let time_left = delta_seconds * speed_scale;

            if group.process.remaining_seconds > time_left {
                group.process.remaining_seconds -= time_left;
                group.process.progress_percent =
                    100.0 * (group.process.duration - group.process.remaining_seconds) / group.process.duration;
                return true;
            }

            // Cycle complete: produce outputs for building was
            // actively working this cycle.
            for output in &group.process.outputs {
                *inventory.entry(output.resource.clone()).or_insert(0.0) +=
                    output.amount * group.active_count as f64;
                flow
                    .entry(output.resource.clone())
                    .or_insert_with(Rate::default)
                    .produced += output.amount * group.active_count as f64;
            }

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
                for input in &group.process.inputs {
                    *inventory.entry(input.resource.clone()).or_insert(0.0) -=
                        input.amount * starting as f64;
                    flow
                        .entry(input.resource.clone())
                        .or_insert_with(Rate::default)
                        .consumed -= input.amount * starting as f64;
                }
            }
            group.active_count = starting;
            group.idle_count = candidates.saturating_sub(starting);
            group.process.remaining_seconds = group.process.duration;
            group.process.progress_percent = 0.0;
            return true;
        } else if group.idle_count > 0 && is_powered {
            // Nothing running - idle buildings try to start a new cycle as soon as resources and power allow
            let starting = Self::max_affordable(inventory, &group.process.inputs, group.idle_count);
            if starting > 0 {
                // Consume inputs for the buildings that will start the next cycle.
                for input in &group.process.inputs {
                    *inventory.entry(input.resource.clone()).or_insert(0.0) -=
                        input.amount * starting as f64;
                    flow
                        .entry(input.resource.clone())
                        .or_insert_with(Rate::default)
                        .consumed -= input.amount * starting as f64;
                }

                group.active_count = starting;
                group.idle_count = group.idle_count.saturating_sub(starting);
                group.process.remaining_seconds = group.process.duration;
                group.process.progress_percent = 0.0;
                return true;
            } else {
                return false;
            }
        } else {
            return false;
        }
    }
}
