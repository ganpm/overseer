use serde::{Deserialize, Serialize};
use std::collections::{HashMap, VecDeque, hash_map::Entry};
use tsify::Tsify;
use wasm_bindgen::prelude::*;
use crate::game::error::GameError;

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
    amount: i32,
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
    /// If the process consumes power, this represents the amount of power currently allocated to it.
    /// If the process produces power, this represents the amount of power currently being generated.
    power_allocated: f64,
    inputs: Vec<ResourceAmount>,
    outputs: Vec<ResourceAmount>,
    duration: f64,
    elapsed: f64,
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
    cycle_speed_mult: f64,
    enabled: bool,
    /// Locally buffered input resources, topped up via fair allocation; capped at amount * total_count per resource.
    input_buffer: HashMap<String, i32>,
}


impl BuildingGroupInstance {

    /// Count how many buildings in the group can start with the available resources in the input buffer.
    pub fn count_startable(&self) -> u32 {
        if !self.enabled {
            return 0;
        }

        let requested = self.total_count;
        let cost = &self.process.inputs;
        let inventory = &self.input_buffer;

        if requested == 0 || cost.is_empty() {
            return requested;
        }

        cost.iter().fold(requested, |max_count, item| {
            if item.amount <= 0 {
                return max_count;
            }
            let available = inventory.get(&item.resource).copied().unwrap_or(0);
            let affordable = (available / item.amount).max(0) as u32;
            max_count.min(affordable)
        })
    }

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
    building_entries: Vec<(String, String)>,
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
    produced: i32,
    consumed: i32,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ThroughputDataPoint {
    timestamp: f64,
    produced: i32,
    consumed: i32,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct ThroughputChartData {
    resource_name: String,
    current_amount: i32,
    average_production: i32,
    average_consumption: i32,
    average_rate: i32,
    points: Vec<ThroughputDataPoint>,
}

#[derive(Tsify, Serialize, Deserialize, Clone)]
#[tsify(into_wasm_abi)]
#[serde(rename_all = "camelCase")]
pub struct InventoryEntry {
    resource: String,
    amount: i32,
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
    inventory: HashMap<String, i32>,

    /// The currently constructed buildings and the processes they are currently running.
    buildings: HashMap<(String, String), BuildingGroupInstance>,

    /// The length of the sample window for tracking throughput and power data.
    sample_length: usize,

    /// The interval at which samples are taken for tracking throughput and power data.
    sample_interval: f64,

    /// Accumulator for tracking the flow of resources produced and consumed during a single tick of the game.
    throughput_data: HashMap<String, ThroughputData>,

    /// Tracker for the flow of resources over time, allowing for historical analysis of resource production and consumption.
    throughput_tracker: HashMap<String, VecDeque<ThroughputDataPoint>>,

    /// Internal variable for tracking power information
    power_data: PowerData,

    /// Internal variable for tracking power history over time
    power_tracker: VecDeque<PowerDataPoint>,

    /// Lookup table for all the data loaded into the game.
    data: GameData,

    /// Internal database for game data
    catalog: Catalog,
}


#[wasm_bindgen]
impl Game {

    #[wasm_bindgen(constructor)]
    pub fn new(
        #[wasm_bindgen(js_name = "jsonData")]
        json_data: JSONGameData,
        #[wasm_bindgen(js_name = "sampleLength")]
        sample_length: usize,
        #[wasm_bindgen(js_name = "sampleInterval")]
        sample_interval: f64
    ) -> Game {
        let data = Self::create_data_from(&json_data);
        let catalog = Self::create_catalog_from(&json_data, &data);
        let power_tracker = Self::create_power_tracker_from(sample_length, sample_interval as u32);
        Game {
            inventory: HashMap::new(),
            buildings: HashMap::new(),
            sample_length,
            sample_interval,
            throughput_data: HashMap::new(),
            throughput_tracker: HashMap::new(),
            power_data: PowerData::default(),
            power_tracker,
            data,
            catalog,
        }
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
        #[wasm_bindgen(js_name = "buildingName")]
        building_name: &str,
        #[wasm_bindgen(js_name = "processName")]
        process_name: &str,
        #[wasm_bindgen(js_name = "count")]
        count: i32,
    ) -> Result<(), JsError> {
        if count == 0 {
            return Ok(());
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

            // Match entry here instead of chaining since chaining does not allow for early returns with errors.
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
                },
                Entry::Vacant(entry) => {
                    // Retrieve the building from the game data, returning an error if it doesn't exist.
                    let building = self.data.buildings.get(building_name)
                        .ok_or_else(|| GameError::BuildingNotFound {
                            building_name: building_name.to_string(),
                        })?;

                    // Retrieve the process from the game data, returning an error if it doesn't exist.
                    let process = self.data.processes.get(process_name)
                        .ok_or_else(|| GameError::ProcessNotFound {
                            process_name: process_name.to_string(),
                        })?;

                    // Check if the process is compatible with the building.
                    building.process_options
                        .iter()
                        .any(|p| p == process_name)
                        .then_some(())
                        .ok_or_else(|| GameError::IncompatibleProcess {
                            building_name: building_name.to_string(),
                            process_name: process_name.to_string(),
                        })?;

                    // Pay the cost
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
                            power_allocated: 0.0,
                            inputs: process.inputs.clone(),
                            outputs: process.outputs.clone(),
                            duration: process.duration,
                            elapsed: 0.0,
                        },
                        total_count: buildable,
                        active_count: 0,
                        cycle_speed_mult: 1.0,
                        enabled: true,
                        input_buffer: HashMap::new(),
                    });
                }
            }
        } else {
            if let Entry::Occupied(mut entry) = self.buildings.entry(key) {
                let group = entry.get_mut();
                let count_to_remove = count.unsigned_abs();
                let from_active = count_to_remove.min(group.active_count);
                let from_total = count_to_remove.min(group.total_count);

                group.active_count = group.active_count.saturating_sub(from_active);
                group.total_count = group.total_count.saturating_sub(from_total);

                // Buffer capacity shrinks with total_count; drop any amount that no longer fits.
                let total_count = group.total_count as i32;
                for input in &group.process.inputs {
                    let max_amount = input.amount.saturating_mul(total_count);
                    if let Some(buffered) = group.input_buffer.get_mut(&input.resource) {
                        if *buffered > max_amount {
                            *buffered = max_amount;
                        }
                    }
                }

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
        #[wasm_bindgen(js_name = "buildingName")]
        building_name: &str,
        #[wasm_bindgen(js_name = "processName")]
        process_name: &str,
        #[wasm_bindgen(js_name = "cycleSpeedMult")]
        cycle_speed_mult: f64
    ) {

        self.buildings
            .entry((building_name.to_string(), process_name.to_string()))
            .and_modify(|bgi| bgi.cycle_speed_mult = cycle_speed_mult);


    }

    #[wasm_bindgen(js_name = "setBuildingEnabled")]
    pub fn set_building_enabled(
        &mut self,
        #[wasm_bindgen(js_name = "buildingName")]
        building_name: &str,
        #[wasm_bindgen(js_name = "processName")]
        process_name: &str,
        #[wasm_bindgen(js_name = "enabled")]
        enabled: bool
    ) {

        self.buildings
            .entry((building_name.to_string(), process_name.to_string()))
            .and_modify(|bgi| bgi.enabled = enabled);

    }

    #[wasm_bindgen(js_name = "tick")]
    pub fn tick(
        &mut self,
        #[wasm_bindgen(js_name = "deltaMs")]
        delta_ms: f64
    ) -> bool {

        if delta_ms <= 0.0 || !delta_ms.is_finite() {
            return false;
        }

        // Distribute contested input resources into each group's buffer before groups try to start.
        self.tick_resource_allocation();

        // Distribute power for the current game tick
        self.tick_power_allocation();

        // Tick resource production for all building groups and determine if any state has changed.
        let changed = self.tick_resource_production(delta_ms);

        changed
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
                    produced: 0,
                    consumed: 0,
                }; self.sample_length].into());

            let current_amount = *self.inventory.get(resource_name).unwrap_or(&0);
            let average_production = points.iter().map(|p| p.produced).sum::<i32>() / self.sample_length as i32;
            let average_consumption = points.iter().map(|p| p.consumed).sum::<i32>() / self.sample_length as i32;
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
                            produced: 0,
                            consumed: 0,
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
        let points = self.power_tracker.iter().cloned().collect::<Vec<_>>();
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
            points,
        }
    }

    #[wasm_bindgen(js_name = "samplePowerData")]
    pub fn sample_power_data(
        &mut self,
        #[wasm_bindgen(js_name = "timestamp")]
        timestamp: f64
    ) {
        self.power_tracker.push_back(PowerDataPoint {
            timestamp,
            maximum_consumption: self.power_data.maximum_consumption,
            maximum_generation: self.power_data.maximum_generation,
            net_maximum_power: self.power_data.maximum_generation + self.power_data.maximum_consumption,
            current_consumption: self.power_data.current_consumption,
            current_generation: self.power_data.current_generation,
            net_current_power: self.power_data.current_generation + self.power_data.current_consumption,
        });
        self.power_tracker.pop_front();
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

        let building_entries = json_data.buildings.iter()
            .flat_map(|b| b.process_options.iter().map(move |p| (b.name.clone(), p.clone())))
            .collect::<Vec<_>>();

        Catalog {
            production_buildings,
            generation_buildings,
            building_entries,
        }
    }

    fn create_power_tracker_from(
        sample_length: usize,
        sample_interval: u32
    ) -> VecDeque<PowerDataPoint> {
        (0..sample_length)
            .map(|i| PowerDataPoint {
                timestamp: 0.0 - (((sample_length - 1 - i) as f64) * sample_interval as f64),
                maximum_consumption: 0.0,
                maximum_generation: 0.0,
                net_maximum_power: 0.0,
                current_consumption: 0.0,
                current_generation: 0.0,
                net_current_power: 0.0,
            })
            .collect()
    }

    fn consume_inputs(
        inventory: &mut HashMap<String, i32>,
        throughput_data: &mut HashMap<String, ThroughputData>,
        inputs: &[ResourceAmount],
        count: u32,
    ) {
        if count == 0 {
            return;
        }

        for input in inputs {
            let consumed_amount = input.amount * count as i32;
            if consumed_amount <= 0 {
                continue;
            }
            *inventory
                .entry(input.resource.clone())
                .or_insert(0) -= consumed_amount;
            throughput_data
                .entry(input.resource.clone())
                .or_insert_with(ThroughputData::default)
                .consumed -= consumed_amount;
        }
    }

    fn produce_outputs(
        inventory: &mut HashMap<String, i32>,
        throughput_data: &mut HashMap<String, ThroughputData>,
        outputs: &[ResourceAmount],
        count: u32,
    ) {
        for output in outputs {
            let produced_amount = output.amount * count as i32;
            *inventory
                .entry(output.resource.clone())
                .or_insert(0) += produced_amount;
            throughput_data
                .entry(output.resource.clone())
                .or_insert_with(ThroughputData::default)
                .produced += produced_amount;
        }
    }

    /// Loads inputs from the shared inventory into each enabled group's input buffer.
    /// The input priority is determined by the order of declaration in the catalog.
    /// By convention, groups declared earlier in the catalog are in the beginning of the production chain,
    /// and are therefore given higher priority when taking resources from the shared inventory.
    fn tick_resource_allocation(&mut self) {
        for (building_name, process_name) in self.catalog.building_entries.iter() {
            let Some(group) = self.buildings.get_mut(&(building_name.clone(), process_name.clone())) else {
                continue;
            };
            if !group.enabled {
                continue;
            }

            for input in &group.process.inputs {
                let max_buffered = input.amount * group.total_count as i32;
                let buffered = group.input_buffer.get(&input.resource).copied().unwrap_or(0);
                if buffered >= max_buffered {
                    continue; // Buffer already full, skip it.
                }
                let available = self.inventory.get(&input.resource).copied().unwrap_or(0);
                let to_load = (max_buffered - buffered).min(available);
                if to_load > 0 {
                    *group.input_buffer.entry(input.resource.clone()).or_insert(0) += to_load;
                    *self.inventory.entry(input.resource.clone()).or_insert(0) -= to_load;
                }
            }
        }
    }

    /// Allocates power to each building group based on their active count and power requirements.
    /// If a building group is not currently active, its potential power consumption is calculated based on the number of buildings that can start.
    /// Allocated power does not mean that the power actually being consumed; 
    /// If the building has enough input resource to start, power is allocated to it so it is included in the power calculation, and can now start.
    fn tick_power_allocation(&mut self) {
        let mut maximum_power_consumption = 0.0;
        let mut maximum_power_generation = 0.0;
        let mut current_power_consumption = 0.0;
        let mut current_power_generation = 0.0;

        self.buildings
            .values()
            .filter(|group| group.enabled)
            .for_each(|group| {
                let power_consumption = group.process.power_consumption;
                let power_generation = group.process.power_generation;
                let total_count = group.total_count as f64;

                maximum_power_consumption += power_consumption * total_count;
                maximum_power_generation += power_generation * total_count;

                // If the group is currently working, use that
                // Otherwise, use the number of buildings that can start based on available inputs.
                let count = if group.active_count > 0 {
                    group.active_count as f64
                } else {
                    group.count_startable() as f64
                };
                current_power_consumption += power_consumption * count;
                current_power_generation += power_generation * count;
            });

        self.power_data = PowerData {
            maximum_consumption: -maximum_power_consumption,
            maximum_generation: maximum_power_generation,
            current_consumption: -current_power_consumption,
            current_generation: current_power_generation,
        };

        // Power distribution policy: Proportionate distribution
        // Use active count when distributing power to ensure that only currently working buildings receive power.
        // The active count also includes buildings that can start based on available inputs to prevent deadlocks.
        let consumer_power_ratio = if current_power_consumption > 0.0 {
            // If there is power being consumed, calculate the proportion of available power to allocate.
            (current_power_generation / current_power_consumption).clamp(0.0, 1.0)
        } else if current_power_generation > 0.0 {
            // If there is power being generated but no consumption, allocate all available power.
            1.0
        } else {
            // No power is being generated and no power is being consumed, so allocate nothing.
            0.0
        };

        self.buildings
            .values_mut()
            .for_each(|group| {
                // Disabled groups are excluded from the ratio calculation above, so their allocation must be
                // explicitly zeroed here; otherwise they'd keep whatever value they had before being disabled.
                group.process.power_allocated = if group.process.power_consumption > 0.0 {
                    if group.enabled {
                        group.process.power_consumption * consumer_power_ratio
                    } else {
                        0.0
                    }
                } else {
                    if group.enabled {
                        group.process.power_generation
                    } else {
                        0.0
                    }
                };
            });
    }

    /// Tick resource production for all building groups and return whether any state has changed.
    fn tick_resource_production(&mut self, delta_ms: f64) -> bool {
        let mut changed = false;

        self.buildings
            .values_mut()
            .for_each(|group| {
                // Note: |= on purpose, not || because || short-circuits and we want to tick all groups even if one returns true.
                changed |= Self::tick_group(group, &mut self.inventory, &mut self.throughput_data, delta_ms);
            });

        changed
    }

    /// Tick a single building group and return whether its state has changed.
    fn tick_group(
        group: &mut BuildingGroupInstance,
        inventory: &mut HashMap<String, i32>,
        throughput_data: &mut HashMap<String, ThroughputData>,
        delta_ms: f64,
    ) -> bool {
        let consumes_power = group.process.power_consumption > 0.0;
        let is_powered = group.process.power_allocated > 0.0;
        let mut changed = false;

        // If the building group is disabled, or requires power but is not powered, set all buildings to idle
        // and return. Reset the progress of the process.
        if !group.enabled || (consumes_power && !is_powered) {
            if group.active_count > 0 {
                group.active_count = 0;
                group.process.elapsed = 0.0;
                changed = true;
            }
            return changed;
        }

        if group.active_count > 0 {
            let efficiency = if consumes_power {
                group.process.power_allocated / group.process.power_consumption
            } else {
                1.0
            };
            // Increment first before checking to prevent off-by-one errors in cycle completion.
            group.process.elapsed += delta_ms * efficiency * group.cycle_speed_mult;
            if group.process.elapsed < group.process.duration * 1000.0 {
                return true;
            }
            Self::produce_outputs(inventory, throughput_data, &group.process.outputs, group.active_count);
            changed = true; // Outputs have been produced (normally a diff check but we trust that it did change)
            group.active_count = 0; // Reset active count after producing outputs, also allows next block to run
            group.process.elapsed = 0.0; // Reset elapsed time for the next cycle (in case the next block failed to start any new cycles)
        }

        if group.active_count == 0 {
            // Nothing running - idle buildings try to start a new cycle using their buffered inputs
            let starting = group.count_startable();
            if starting > 0 {
                // Consume buffered inputs for the buildings that will start the next cycle.
                Self::consume_inputs(&mut group.input_buffer, throughput_data, &group.process.inputs, starting);
                group.active_count = starting;
                group.process.elapsed = 0.0;
                changed = true;
            }
            // Preserve changed here
            // - if produced outputs in the previous cycle, doesnt matter if new cycles were started (changed = true from production)
            // - if did not produce outputs but tried to start a new cycle and failed due to insufficient resources (changed = false from initialization)
        }

        changed
    }
}
