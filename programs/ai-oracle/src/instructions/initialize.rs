use anchor_lang::prelude::*;

use crate::{error::OracleError, Config};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 + Config::INIT_SPACE,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

impl Initialize<'_> {
    pub fn initialize(&mut self, bumps: &InitializeBumps) -> Result<()> {
        // the signer should be admin: "grvFMybwWoinrAp39feYxkq3JJQ7NY5oC3X9rNH26x7"
        if self.admin.key().to_string() != "grvFMybwWoinrAp39feYxkq3JJQ7NY5oC3X9rNH26x7" {
            return Err(OracleError::InvalidAdmin.into());
        }

        self.config.set_inner(Config { bump: bumps.config });
        Ok(())
    }
}
