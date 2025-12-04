pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("DVc1wcKi3tnj8oHG5nHZ1xYC3JmtBmrZ3WmBm3K3qrLm");

#[program]
pub mod ai_oracle {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize()
    }
}
