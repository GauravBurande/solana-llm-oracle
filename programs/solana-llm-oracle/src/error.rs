use anchor_lang::prelude::*;

#[error_code]
pub enum OracleError {
    #[msg("You're not an admin ser!")]
    InvalidAdmin,
}
