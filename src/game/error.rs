use thiserror::Error;

#[derive(Error, Debug)]
pub enum GameError {
    #[error("Building '{building_name}' not found.")]
    BuildingNotFound {
        building_name: String,
    },
    #[error("Process '{process_name}' is not compatible with building '{building_name}'.")]
    IncompatibleProcess {
        process_name: String,
        building_name: String,
    },
    #[error("Process '{process_name}' not found.")]
    ProcessNotFound {
        process_name: String,
    },
}