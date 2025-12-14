use anchor_lang::prelude::*;

#[account]
#[derive(Default, Debug)]
pub struct Inference {
    pub chat_context: Pubkey,
    pub user: Pubkey,
    pub text: String,
    pub callback_program_id: Pubkey,
    pub callback_discriminator: [u8; 8],
    pub callback_account_metas: Vec<AccountMeta>,
    pub is_processed: bool,
}

impl Inference {
    pub fn seed() -> &'static [u8] {
        b"inference"
    }

    // 121 = 8 + 32 + 32 + 32 + 8 + 1 + 4 + 4
    pub fn space(text: &String, account_metas_len: usize) -> usize {
        121 + text.as_bytes().len() + account_metas_len * AccountMeta::size()
    }
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct AccountMeta {
    pub pubkey: Pubkey,
    pub is_signer: bool,
    pub is_writable: bool,
}

impl AccountMeta {
    pub fn size() -> usize {
        8 + AccountMeta::INIT_SPACE
    }
}
