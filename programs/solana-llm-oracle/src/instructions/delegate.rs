use anchor_lang::prelude::*;
use ephemeral_rollups_sdk::{anchor::delegate, cpi::DelegateConfig};

use crate::{ChatContext, Inference};

#[delegate]
#[derive(Accounts)]
pub struct Delegate<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        seeds = [b"chat_context", user.key().as_ref(), chat_context.seed.to_le_bytes().as_ref()],
        bump = chat_context.bump
    )]
    pub chat_context: Account<'info, ChatContext>,
    #[account(
        mut,
        del,
        seeds=[Inference::seed(), user.key().as_ref(), chat_context.key().as_ref()],
        bump
    )]
    pub inference: Account<'info, Inference>,
    pub system_program: Program<'info, System>,
}

impl Delegate<'_> {
    pub fn delegate(&mut self) -> Result<()> {
        let chat_context_pubkey = self.chat_context.key();
        let seeds: &[&[u8]] = &[
            Inference::seed(),
            self.user.key.as_ref(),
            chat_context_pubkey.as_ref(),
        ];

        self.delegate_inference(
            &self.user,
            seeds,
            DelegateConfig {
                ..Default::default()
            },
        )?;
        Ok(())
    }
}
