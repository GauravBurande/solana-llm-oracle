use anchor_lang::prelude::*;

use crate::{error::OracleError, Config};

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        payer = admin,
        space = 8 ,
        seeds = [b"config"],
        bump
    )]
    pub config: Account<'info, Config>,
    pub system_program: Program<'info, System>,
}

impl Initialize<'_> {
    pub fn initialize(&mut self) -> Result<()> {
        // the signer should be admin: "grvFMybwWoinrAp39feYxkq3JJQ7NY5oC3X9rNH26x7"
        if self.admin.key().to_string() != "grvFMybwWoinrAp39feYxkq3JJQ7NY5oC3X9rNH26x7" {
            return Err(OracleError::InvalidAdmin.into());
        }
        Ok(())
    }
}
