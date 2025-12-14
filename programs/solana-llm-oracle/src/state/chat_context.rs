use anchor_lang::prelude::*;

#[account]
pub struct ChatContext {
    pub text: String,
    pub seed: u8,
    pub bump: u8,
}
