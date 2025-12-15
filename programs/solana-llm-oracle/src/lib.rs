pub mod constants;
pub mod error;
pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::anchor::ephemeral;

use crate::state::AccountMeta;
pub use constants::*;
pub use instructions::*;
pub use state::*;

declare_id!("DVc1wcKi3tnj8oHG5nHZ1xYC3JmtBmrZ3WmBm3K3qrLm");

#[ephemeral]
#[program]
pub mod solana_llm_oracle {

    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        ctx.accounts.initialize(&ctx.bumps)
    }

    pub fn create_chat(ctx: Context<CreateChat>, text: String, seed: u8) -> Result<()> {
        ctx.accounts.create_new_chat(text, seed, &ctx.bumps)
    }

    pub fn create_llm_inference(
        ctx: Context<CreateLlmInference>,
        text: String,
        callback_program_id: Pubkey,
        callback_discriminator: [u8; 8],
        account_metas: Option<Vec<AccountMeta>>,
    ) -> Result<()> {
        ctx.accounts.create_llm_inference(
            text,
            callback_program_id,
            callback_discriminator,
            account_metas,
            &ctx.bumps,
        )
    }

    pub fn delegate(ctx: Context<Delegate>) -> Result<()> {
        ctx.accounts.delegate()
    }

    pub fn callback_from_llm<'info>(
        ctx: Context<'_, '_, '_, 'info, CallbackFromLlm<'info>>,
        response: String,
    ) -> Result<()> {
        // Check if payer is not in remaining accounts, oracle also sends callback_account_metas from client which are remaining accounts
        if ctx
            .remaining_accounts
            .iter()
            .any(|acc| acc.key().eq(&ctx.accounts.config.key()))
        {
            return Err(ProgramError::InvalidAccountData.into());
        }
        ctx.accounts
            .callback_from_llm(response, ctx.remaining_accounts.to_vec())
    }

    pub fn callback_test(ctx: Context<CallbackTest>, response: String) -> Result<()> {
        ctx.accounts.callback_test(response)
    }
}
