use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use wasm_bindgen::prelude::*;

#[derive(Serialize, Deserialize, Clone)]
struct Resource {
    name: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct ResourceAmount {
    amount: f64,
    resource: String,
}

#[derive(Serialize, Deserialize, Clone)]
struct Process {
    name: String,
    duration: f64,
    power_consumption: f64,
    power_generation: f64,
    inputs: Vec<ResourceAmount>,
    outputs: Vec<ResourceAmount>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Building {
    name: String,
    available_processes: Vec<String>,
    cost: Vec<ResourceAmount>,
}

#[derive(Serialize, Deserialize, Clone)]
struct Catalog {
    resources: Vec<Resource>,
    processes: Vec<Process>,
    buildings: Vec<Building>,
}

#[derive(Clone)]
struct InFlightBatch {
    remaining_seconds: f64,
    count: u32,
}

#[derive(Serialize, Clone)]
struct ProcessProgress {
    active_count: u32,
    total_count: u32,
    pending_count: u32,
    duration_seconds: f64,
    remaining_seconds: f64,
    progress_percent: f64,
    efficiency_percent: f64,
}

#[derive(Serialize, Deserialize, Clone, Default)]
struct ResourceFlow {
    produced: f64,
    consumed: f64,
}

fn validate_catalog(catalog: &Catalog) -> Result<(), String> {
    let resource_names: HashSet<&str> = catalog.resources.iter().map(|resource| resource.name.as_str()).collect();
    let process_names: HashSet<&str> = catalog.processes.iter().map(|process| process.name.as_str()).collect();
    let building_names: HashSet<&str> = catalog.buildings.iter().map(|building| building.name.as_str()).collect();

    if resource_names.len() != catalog.resources.len() {
        return Err("Duplicate resource names found in catalog".to_string());
    }
    if process_names.len() != catalog.processes.len() {
        return Err("Duplicate process names found in catalog".to_string());
    }
    if building_names.len() != catalog.buildings.len() {
        return Err("Duplicate building names found in catalog".to_string());
    }

    for resource in &catalog.resources {
        if resource.name.trim().is_empty() {
            return Err("Resource name cannot be empty".to_string());
        }
    }

    for process in &catalog.processes {
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

    for building in &catalog.buildings {
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

#[wasm_bindgen]
pub struct Game {
    inventory: HashMap<String, f64>,
    buildings: HashMap<(String, String), u32>,
    processes: HashMap<String, Process>,
    pending_buildings: HashMap<(String, String), u32>,
    in_flight: HashMap<(String, String), InFlightBatch>,
    catalog: Catalog,
    resource_flow: HashMap<String, ResourceFlow>,
}

impl Game {
    fn find_process(&self, process_name: &str) -> Option<Process> {
        self.processes.get(process_name).cloned()
    }

    fn find_building(&self, building_name: &str) -> Option<&Building> {
        self.catalog
            .buildings
            .iter()
            .find(|building| building.name == building_name)
    }

    fn in_flight_count(&self, key: &(String, String)) -> u32 {
        self.in_flight
            .get(key)
            .map(|batch| batch.count)
            .unwrap_or(0)
    }

    fn max_startable_jobs(&self, process: &Process, capacity: u32) -> u32 {
        let mut startable = capacity;

        for input in &process.inputs {
            let available = *self.inventory.get(&input.resource).unwrap_or(&0.0);
            let max_by_resource = (available / input.amount).floor();
            if max_by_resource <= 0.0 {
                return 0;
            }

            let max_by_resource_u32 = if max_by_resource > u32::MAX as f64 {
                u32::MAX
            } else {
                max_by_resource as u32
            };

            startable = startable.min(max_by_resource_u32);
            if startable == 0 {
                return 0;
            }
        }

        startable
    }

    fn consume_inputs(&mut self, process: &Process, jobs: u32) {
        for input in &process.inputs {
            let consumed = input.amount * jobs as f64;
            let entry = self.inventory.entry(input.resource.clone()).or_insert(0.0);
            *entry -= consumed;
            self.resource_flow
                .entry(input.resource.clone())
                .or_default()
                .consumed -= consumed;

            // If the resource amount is very close to zero, set it to exactly zero to avoid floating-point precision issues.
            if *entry < 1e-9 {
                *entry = 0.0;
            }
        }
    }

    fn produce_outputs(&mut self, process: &Process, jobs: u32) {
        for output in &process.outputs {
            let produced = output.amount * jobs as f64;
            let entry = self.inventory.entry(output.resource.clone()).or_insert(0.0);
            *entry += produced;
            self.resource_flow
                .entry(output.resource.clone())
                .or_default()
                .produced += produced;
        }
    }

    fn apply_building_delta(&mut self, building_name: &str, process_name: &str, delta: i32) -> Result<(), JsValue> {
        if delta == 0 {
            return Err(JsValue::from_str("Building delta must be non-zero"));
        }

        // TODO: Can be optimized by using a HashSet for available_buildings
        let building = self
            .find_building(building_name)
            .ok_or_else(|| JsValue::from_str(&format!("Unknown building '{building_name}'")))?;

        // TODO: Can be optimized by using a HashSet for available_processes
        if !building
            .available_processes
            .iter()
            .any(|available| available == process_name)
        {
            return Err(JsValue::from_str(&format!(
                "Building '{building_name}' does not support process '{process_name}'"
            )));
        }

        // TODO: Can be optimized by using a HashSet for available_processes
        if self.find_process(process_name).is_none() {
            return Err(JsValue::from_str(&format!("Unknown process '{process_name}'")));
        }

        let key = (building_name.to_string(), process_name.to_string());
        let current_count = *self.buildings.get(&key).unwrap_or(&0);

        let next_count = if delta > 0 {
            let amount = delta as u32;
            current_count
                .checked_add(amount)
                .ok_or_else(|| JsValue::from_str("Building count overflow"))?
        } else {
            let amount = delta.unsigned_abs();
            current_count.saturating_sub(amount)
        };

        if next_count == 0 {
            self.buildings.remove(&key);
        } else {
            self.buildings.insert(key.clone(), next_count);
        }

        let had_running_cycle = self.in_flight_count(&key) > 0;

        if had_running_cycle {
            if delta > 0 {
                let pending_entry = self.pending_buildings.entry(key.clone()).or_insert(0);
                *pending_entry = pending_entry.saturating_add(delta as u32);
            } else {
                let mut remaining_to_remove = delta.unsigned_abs();

                if let Some(pending_entry) = self.pending_buildings.get_mut(&key) {
                    let removed_from_pending = (*pending_entry).min(remaining_to_remove);
                    *pending_entry -= removed_from_pending;
                    remaining_to_remove -= removed_from_pending;
                }

                if self.pending_buildings.get(&key).copied().unwrap_or(0) == 0 {
                    self.pending_buildings.remove(&key);
                }

                if remaining_to_remove > 0 {
                    if let Some(batch) = self.in_flight.get_mut(&key) {
                        if batch.count <= remaining_to_remove {
                            self.in_flight.remove(&key);
                        } else {
                            batch.count -= remaining_to_remove;
                        }
                    }
                }
            }
        }

        Ok(())
    }
}


#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Game {
        Game {
            inventory: HashMap::new(),
            buildings: HashMap::new(),
            processes: HashMap::new(),
            pending_buildings: HashMap::new(),
            in_flight: HashMap::new(),
            catalog: Catalog {
                resources: Vec::new(),
                processes: Vec::new(),
                buildings: Vec::new(),
            },
            resource_flow: HashMap::new(),
        }
    }

    #[wasm_bindgen]
    pub fn load_catalog(&mut self, catalog: JsValue) -> Result<(), JsValue> {
        let parsed_catalog: Catalog = serde_wasm_bindgen::from_value(catalog)
            .map_err(|err| JsValue::from_str(&format!("Invalid catalog JSON shape: {err}")))?;

        validate_catalog(&parsed_catalog)
            .map_err(|err| JsValue::from_str(&format!("Catalog validation failed: {err}")))?;

        self.catalog = parsed_catalog;
        self.pending_buildings.clear();
        self.in_flight.clear();
        self.resource_flow.clear();

        self.processes = self
            .catalog
            .processes
            .iter()
            .map(|process| (process.name.clone(), process.clone()))
            .collect();

        Ok(())
    }

    #[wasm_bindgen]
    pub fn get_process(&self, process_name: &str) -> Result<JsValue, JsValue> {
        let process = self.find_process(process_name)
            .ok_or_else(|| JsValue::from_str(&format!("Unknown process '{process_name}'")))?;

        serde_wasm_bindgen::to_value(&process)
            .map_err(|err| JsValue::from_str(&format!("Failed to serialize process: {err}")))
    }

    #[wasm_bindgen]
    pub fn get_process_progress(&self, building_name: &str, process_name: &str) -> Result<JsValue, JsValue> {
        let process = self
            .find_process(process_name)
            .ok_or_else(|| JsValue::from_str(&format!("Unknown process '{process_name}'")))?;

        let mut total_power_generation = 0.0;
        let mut total_power_consumption = 0.0;
        for ((_, in_flight_process_name), batch) in &self.in_flight {
            let in_flight_process = self
                .find_process(in_flight_process_name)
                .ok_or_else(|| JsValue::from_str(&format!("Unknown process '{in_flight_process_name}'")))?;

            total_power_generation += in_flight_process.power_generation * batch.count as f64;
            total_power_consumption += in_flight_process.power_consumption * batch.count as f64;
        }

        let consumer_power_scale = if total_power_consumption <= 0.0 {
            1.0
        } else {
            (total_power_generation / total_power_consumption).clamp(0.0, 1.0)
        };

        let key = (building_name.to_string(), process_name.to_string());
        let total_count = *self.buildings.get(&key).unwrap_or(&0);
        let pending_count = *self.pending_buildings.get(&key).unwrap_or(&0);

        let (active_count, remaining_seconds, progress_percent) =
            if let Some(batch) = self.in_flight.get(&key) {
                let clamped_remaining = batch.remaining_seconds.clamp(0.0, process.duration);
                let progressed = (process.duration - clamped_remaining).clamp(0.0, process.duration);
                let progress_percent = if process.duration <= 0.0 {
                    0.0
                } else {
                    (progressed / process.duration * 100.0).clamp(0.0, 100.0)
                };

                (batch.count, clamped_remaining, progress_percent)
            } else {
                (0, 0.0, 0.0)
            };

        serde_wasm_bindgen::to_value(&ProcessProgress {
            active_count,
            total_count,
            pending_count,
            duration_seconds: process.duration,
            remaining_seconds,
            progress_percent,
            efficiency_percent: if process.power_consumption > 0.0 {
                consumer_power_scale * 100.0
            } else {
                100.0
            },
        })
        .map_err(|err| JsValue::from_str(&format!("Failed to serialize process progress: {err}")))
    }

    #[wasm_bindgen]
    pub fn add_resource(&mut self, resource_name: &str, amount: f64) -> Result<(), JsValue> {
        let entry = self.inventory.entry(resource_name.to_string()).or_insert(0.0);
        *entry += amount;
        Ok(())
    }

    #[wasm_bindgen]
    pub fn get_resource_amount(&self, resource_name: &str) -> Result<f64, JsValue> {
        Ok(*self.inventory.get(resource_name).unwrap_or(&0.0))
    }

    #[wasm_bindgen]
    pub fn add_building(&mut self, building_name: &str, process_name: &str, count: u32) -> Result<(), JsValue> {
        if count == 0 {
            return Err(JsValue::from_str("Building count must be greater than zero"));
        }

        let delta = i32::try_from(count)
            .map_err(|_| JsValue::from_str("Building count is too large"))?;

        self.apply_building_delta(building_name, process_name, delta)
    }

    #[wasm_bindgen]
    pub fn remove_building(&mut self, building_name: &str, process_name: &str, count: u32) -> Result<(), JsValue> {
        if count == 0 {
            return Err(JsValue::from_str("Building count must be greater than zero"));
        }

        let delta = i32::try_from(count)
            .map_err(|_| JsValue::from_str("Building count is too large"))?;

        self.apply_building_delta(building_name, process_name, -delta)
    }

    #[wasm_bindgen]
    pub fn get_catalog(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.catalog)
            .map_err(|err| JsValue::from_str(&format!("Failed to serialize catalog: {err}")))
    }

    #[wasm_bindgen]
    pub fn get_buildings(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.buildings)
            .map_err(|err| JsValue::from_str(&format!("Failed to serialize buildings: {err}")))
    }

    #[wasm_bindgen]
    pub fn get_inventory(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.inventory)
            .map_err(|err| JsValue::from_str(&format!("Failed to serialize inventory: {err}")))
    }

    #[wasm_bindgen]
    pub fn get_and_reset_resource_flow(&mut self) -> Result<JsValue, JsValue> {
        let flow = std::mem::take(&mut self.resource_flow);
        for resource in &self.catalog.resources {
            self.resource_flow
                .insert(resource.name.clone(), ResourceFlow::default());
        }

        serde_wasm_bindgen::to_value(&flow)
            .map_err(|err| JsValue::from_str(&format!("Failed to serialize resource flow: {err}")))
    }

    #[wasm_bindgen]
    pub fn tick(&mut self, delta_seconds: f64) -> Result<bool, JsValue> {
        if !delta_seconds.is_finite() {
            return Err(JsValue::from_str("tick delta_seconds must be finite"));
        }

        if delta_seconds <= 0.0 {
            return Ok(false);
        }

        let mut inventory_changed = false;
        let mut simulation_changed = false;
        let building_entries: Vec<((String, String), u32)> = self
            .buildings
            .iter()
            .map(|((building_name, process_name), count)| {
                ((building_name.clone(), process_name.clone()), *count)
            })
            .collect();

        let mut total_power_generation = 0.0;
        let mut total_power_consumption = 0.0;
        for ((_, process_name), batch) in &self.in_flight {
            let process = self
                .find_process(process_name)
                .ok_or_else(|| JsValue::from_str(&format!("Unknown process '{process_name}'")))?;

            total_power_generation += process.power_generation * batch.count as f64;
            total_power_consumption += process.power_consumption * batch.count as f64;
        }

        let consumer_power_scale = if total_power_consumption <= 0.0 {
            1.0
        } else {
            (total_power_generation / total_power_consumption).clamp(0.0, 1.0)
        };

        let mut idle_entries: Vec<((String, String), u32, Process)> = Vec::new();

        for ((building_name, process_name), building_count) in building_entries {
            if building_count == 0 {
                continue;
            }

            let process = self
                .find_process(&process_name)
                .ok_or_else(|| JsValue::from_str(&format!("Unknown process '{process_name}'")))?;

            let key = (building_name.clone(), process_name.clone());

            let mut completed_jobs = 0;
            if let Some(batch) = self.in_flight.get_mut(&key) {
                let process_scale = if process.power_consumption > 0.0 {
                    consumer_power_scale
                } else {
                    1.0
                };

                batch.remaining_seconds -= delta_seconds * process_scale;
                simulation_changed = true;
                if batch.remaining_seconds <= 0.0 {
                    completed_jobs = batch.count;
                }
            }

            if completed_jobs > 0 {
                self.produce_outputs(&process, completed_jobs);
                inventory_changed = true;
                self.in_flight.remove(&key);
                self.pending_buildings.remove(&key);
            }

            if !self.in_flight.contains_key(&key) {
                idle_entries.push((key, building_count, process));
            }
        }

        for (key, building_count, process) in &idle_entries {
            if self.in_flight.contains_key(key) {
                continue;
            }

            let pending = *self.pending_buildings.get(key).unwrap_or(&0);
            let available_capacity = building_count.saturating_sub(pending);
            let startable_jobs = self.max_startable_jobs(process, available_capacity);

            if startable_jobs == 0 {
                continue;
            }

            self.consume_inputs(process, startable_jobs);
            self.in_flight.insert(
                key.clone(),
                InFlightBatch {
                    remaining_seconds: process.duration,
                    count: startable_jobs,
                },
            );

            simulation_changed = true;
            inventory_changed = true;
        }

        Ok(inventory_changed || simulation_changed)
    }

}
