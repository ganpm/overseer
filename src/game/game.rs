use wasm_bindgen::prelude::*;
use tsify::Tsify;
use serde::{Deserialize, Serialize};
use std::{collections::{HashMap, HashSet, VecDeque}};

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
    /// The number of buildings that are pending construction.
    /// A building added to a building group is considered pending
    /// until the process in the building group is completed,
    /// at which point the building becomes active and joins the active_count of the building group.
    pending_count: u32,
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


fn validate_data(data: &JSONGameData) -> Result<(), String> {
    let resource_names: HashSet<&str> = data.resources.iter().map(|resource| resource.name.as_str()).collect();
    let process_names: HashSet<&str> = data.processes.iter().map(|process| process.name.as_str()).collect();
    let building_names: HashSet<&str> = data.buildings.iter().map(|building| building.name.as_str()).collect();

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
            return Err(format!("Process '{}' must have a positive duration", process.name));
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

#[wasm_bindgen]
impl Game {

    #[wasm_bindgen(constructor)]
    pub fn new(data: JSONGameData) -> Result<Game, JsValue> {
        validate_data(&data)
            .map_err(|err| JsValue::from_str(&format!("Game data validation failed: {err}")))?;

        let resources = data.resources.into_iter().map(|r| (r.name.clone(), r)).collect::<HashMap<_, _>>();
        let processes = data.processes.into_iter().map(|p| (p.name.clone(), p)).collect::<HashMap<_, _>>();
        let buildings = data.buildings.into_iter().map(|b| (b.name.clone(), b)).collect::<HashMap<_, _>>();
        
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
        self.inventory.iter().map(|(k, v)| InventoryEntry {
            resource: k.clone(),
            amount: *v,
        }).collect()
    }

    #[wasm_bindgen(getter)]
    pub fn buildings(&self) -> Vec<BuildingGroupInstance> {
        self.buildings.iter().map(|((bn, _), bgi)| BuildingGroupInstance {
            building_name: bn.clone(),
            process: bgi.process.clone(),
            active_count: bgi.active_count,
            pending_count: bgi.pending_count,
            total_count: bgi.total_count,
        }).collect()
    }

    #[wasm_bindgen(getter)]
    pub fn tracker(&self) -> Vec<RateHistoryEntry> {
        self.tracker.iter().map(|(k, v)| RateHistoryEntry {
            resource: k.clone(),
            rate: v.clone(),
        }).collect()
    }

    #[wasm_bindgen(getter)]
    pub fn data(&self) -> GameData {
        self.data.clone()
    }

    #[wasm_bindgen(js_name = "addBuilding")]
    pub fn add_building(&mut self, building_name: &str, process_name: &str, count: i32) -> Result<(), JsValue> {
        if !self.data.processes.contains_key(process_name) {
            return Err(JsValue::from_str(&format!("Process '{}' does not exist", process_name)));
        }

        if !self.data.buildings.contains_key(building_name) {
            return Err(JsValue::from_str(&format!("Building '{}' does not exist", building_name)));
        }

        if self.data.buildings.get(building_name).unwrap().available_processes.iter().all(|p| p != process_name) {
            return Err(JsValue::from_str(&format!("Process '{}' is not available for building '{}'", process_name, building_name)));
        }

        if count == 0 {
            return Ok(());
        }

        let key = (building_name.to_string(), process_name.to_string());

        if count > 0 {
            let process = self.data.processes.get(process_name).unwrap().clone();
            let delta = count as u32;

            let building_group = self.buildings.entry(key.clone()).or_insert_with(|| BuildingGroupInstance {
                building_name: building_name.to_string(),
                process: ProcessInstance {
                    process_name: process.name.clone(),
                    power_consumption: process.power_consumption,
                    power_generation: process.power_generation,
                    inputs: process.inputs.clone(),
                    outputs: process.outputs.clone(),
                    duration: process.duration,
                    remaining_seconds: process.duration,
                    progress_percent: 0.0,
                    efficiency_percent: 100.0,
                },
                total_count: 0,
                active_count: 0,
                pending_count: 0,
            });

            building_group.total_count = building_group.total_count.saturating_add(delta);

            if building_group.active_count > 0 {
                // If this group is currently mid-cycle, new buildings join after completion.
                building_group.pending_count = building_group.pending_count.saturating_add(delta);
            } else {
                // If this group is idle, buildings are immediately available to start.
                building_group.active_count = building_group.active_count.saturating_add(delta);
            }
        } else if let Some(building_group) = self.buildings.get_mut(&key) {
            let mut remaining_to_remove = count.unsigned_abs();

            let removed_from_pending = building_group.pending_count.min(remaining_to_remove);
            building_group.pending_count -= removed_from_pending;
            remaining_to_remove -= removed_from_pending;

            let removed_from_active = building_group.active_count.min(remaining_to_remove);
            building_group.active_count -= removed_from_active;
            remaining_to_remove -= removed_from_active;

            let removed_total = removed_from_pending.saturating_add(removed_from_active);
            let additional = remaining_to_remove.min(building_group.total_count.saturating_sub(removed_total));
            building_group.total_count = building_group
                .total_count
                .saturating_sub(removed_total.saturating_add(additional));

            if building_group.total_count == 0 {
                building_group.process.remaining_seconds = building_group.process.duration;
                building_group.process.progress_percent = 0.0;
            }
        }

        if self
            .buildings
            .get(&key)
            .map(|group| group.total_count == 0)
            .unwrap_or(false)
        {
            self.buildings.remove(&key);
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

        let mut inventory_changed = false;
        let mut simulation_changed = false;

        // Compute total power consumption and generation
        let mut total_power_generation = 0.0;
        let mut total_power_consumption = 0.0;

        self.buildings.values().for_each(|building_group| {
            total_power_generation += building_group.process.power_generation * building_group.active_count as f64;
            total_power_consumption += building_group.process.power_consumption * building_group.active_count as f64;
        });

        // Calculate power scale factor
        let consumer_power_scale = if total_power_consumption <= 0.0 {
            1.0
        } else {
            (total_power_generation / total_power_consumption).clamp(0.0, 1.0)
        };

        for building_group in self.buildings.values_mut() {
            let process_scale = if building_group.process.power_consumption > 0.0 {
                consumer_power_scale
            } else {
                1.0
            };

            building_group.process.efficiency_percent = if building_group.process.power_consumption > 0.0 {
                consumer_power_scale * 100.0
            } else {
                100.0
            };

            let mut completed_cycle = false;
            if building_group.active_count > 0 {
                building_group.process.remaining_seconds -= delta_seconds * process_scale;
                simulation_changed = true;

                if building_group.process.remaining_seconds <= 0.0 {
                    completed_cycle = true;
                }
            }

            if completed_cycle {
                // Produce outputs
                for output in &building_group.process.outputs {
                    let produced_amount = output.amount * building_group.active_count as f64;
                    let entry = self.inventory.entry(output.resource.clone()).or_insert(0.0);
                    *entry += produced_amount;
                    self.flow
                        .entry(output.resource.clone())
                        .or_default()
                        .produced += produced_amount;
                }

                inventory_changed = true;

                // If there are pending buildings, they become active after the cycle completes.
                if building_group.pending_count > 0 {
                    building_group.active_count = building_group
                        .active_count
                        .saturating_add(building_group.pending_count);
                    building_group.pending_count = 0;
                }

                // Reset the process for the next cycle
                building_group.process.remaining_seconds = building_group.process.duration;
            }

            if building_group.active_count == 0 || completed_cycle {
                let available_capacity = building_group.total_count.saturating_sub(building_group.pending_count);

                // Compute how many buildings can start based on available resources and capacity
                let startable_processes: u32 = {
                    let mut startable = available_capacity;
                    for input in &building_group.process.inputs {
                        let available_amount = *self.inventory.get(&input.resource).unwrap_or(&0.0);
                        let max_by_resource = (available_amount / input.amount).floor();

                        if max_by_resource <= 0.0 {
                            startable = 0;
                            break;
                        }

                        let max_by_resource_u32 = if max_by_resource > u32::MAX as f64 {
                            u32::MAX
                        } else {
                            max_by_resource as u32
                        };

                        startable = startable.min(max_by_resource_u32);
                        if startable == 0 {
                            break;
                        }
                    }
                    startable
                };

                if startable_processes > 0 {
                    // Consume inputs
                    for input in &building_group.process.inputs {
                        let consumed = input.amount * startable_processes as f64;
                        let entry = self.inventory.entry(input.resource.clone()).or_insert(0.0);
                        *entry -= consumed;
                        self.flow
                            .entry(input.resource.clone())
                            .or_default()
                            .consumed -= consumed;

                        if *entry < 1e-9 {
                            *entry = 0.0;
                        }
                    }

                    building_group.active_count = startable_processes;
                    building_group.process.remaining_seconds = building_group.process.duration;
                    inventory_changed = true;
                    simulation_changed = true;
                } else {
                    building_group.active_count = 0;
                }
            }

            building_group.process.progress_percent = if building_group.active_count == 0 {
                0.0
            } else {
                let clamped_remaining = building_group
                    .process
                    .remaining_seconds
                    .clamp(0.0, building_group.process.duration);
                let progressed = (building_group.process.duration - clamped_remaining)
                    .clamp(0.0, building_group.process.duration);
                if building_group.process.duration <= 0.0 {
                    0.0
                } else {
                    (progressed / building_group.process.duration * 100.0).clamp(0.0, 100.0)
                }
            };
        }

        Ok(inventory_changed || simulation_changed)
    }

    #[wasm_bindgen(js_name = "getProductionChartSeries")]
    pub fn get_production_chart_series(&self) -> Vec<ProductionChartSeries> {
        let mut series = Vec::<ProductionChartSeries>::new();

        for resource_name in  self.data.resources.keys() {
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
            let average_rate = {
                let total_produced: f64 = history.produced.iter().sum();
                let total_consumed: f64 = history.consumed.iter().sum();
                (total_produced - total_consumed) / FLOW_HISTORY_LENGTH as f64
            };

            series.push(ProductionChartSeries {
                resource_name: resource_name.clone(),
                current_amount: current_amount,
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
            let history = self.tracker
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