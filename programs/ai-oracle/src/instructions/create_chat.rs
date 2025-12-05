use anchor_lang::prelude::*;

use crate::ChatContext;

#[derive(Accounts)]
#[instruction(text: String, seed: u8)]
pub struct CreateChat<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init,
        payer = user,
        space = 8 + 4 + text.as_bytes().len() + 1 + 1,
        seeds = [b"chat_context", user.key().as_ref(), seed.to_le_bytes().as_ref()],
        bump
    )]
    pub chat_context: Account<'info, ChatContext>,
    pub system_program: Program<'info, System>,
}

impl CreateChat<'_> {
    pub fn create_new_chat(
        &mut self,
        text: String,
        seed: u8,
        bumps: &CreateChatBumps,
    ) -> Result<()> {
        self.chat_context.set_inner(ChatContext {
            text,
            seed,
            bump: bumps.chat_context,
        });
        Ok(())
    }
}
