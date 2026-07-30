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
    catalog: Catalog,
}


#[wasm_bindgen]
impl Game {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Game {
        Game {
            inventory: HashMap::new(),
            buildings: HashMap::new(),
            catalog: Catalog {
                resources: Vec::new(),
                processes: Vec::new(),
                buildings: Vec::new(),
            },
        }
    }

    #[wasm_bindgen]
    pub fn load_catalog(&mut self, catalog: JsValue) -> Result<(), JsValue> {
        let parsed_catalog: Catalog = serde_wasm_bindgen::from_value(catalog)
            .map_err(|err| JsValue::from_str(&format!("Invalid catalog JSON shape: {err}")))?;

        validate_catalog(&parsed_catalog)
            .map_err(|err| JsValue::from_str(&format!("Catalog validation failed: {err}")))?;

        self.catalog = parsed_catalog;

        Ok(())
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
        let entry = self
            .buildings
            .entry((building_name.to_string(), process_name.to_string()))
            .or_insert(0);
        *entry += count;

        Ok(())
    }

    #[wasm_bindgen]
    pub fn get_catalog(&self) -> Result<JsValue, JsValue> {
        serde_wasm_bindgen::to_value(&self.catalog)
            .map_err(|err| JsValue::from_str(&format!("Failed to serialize catalog: {err}")))
    }
}
