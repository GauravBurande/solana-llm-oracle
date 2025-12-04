use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    count: u32,
    bump: u8,
}
