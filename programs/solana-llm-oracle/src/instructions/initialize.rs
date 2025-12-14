use anchor_lang::prelude::*;

use crate::Config;

#[derive(Accounts)]
pub struct Initialize<'info> {
    // or use the ORACLE_IDENTITY constant for address validation
    #[account(mut, address = pubkey!("grvFMybwWoinrAp39feYxkq3JJQ7NY5oC3X9rNH26x7"))]
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
        self.config.set_inner(Config { bump: bumps.config });
        Ok(())
    }
}
