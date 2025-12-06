use anchor_lang::prelude::*;

use crate::Config;

#[derive(Accounts)]
pub struct CallbackTest<'info> {
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
}

impl CallbackTest<'_> {
    pub fn callback_test(&mut self, response: String) -> Result<()> {
        if !self.config.to_account_info().is_signer {
            return Err(ProgramError::InvalidAccountData.into());
        }
        msg!("Callback response: {:?}", response);
        Ok(())
    }
}
