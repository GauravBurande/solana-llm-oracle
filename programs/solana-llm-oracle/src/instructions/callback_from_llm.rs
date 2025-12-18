use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed},
};

use crate::{Config, Inference, ORACLE_IDENTITY};

#[derive(Accounts)]
pub struct CallbackFromLlm<'info> {
    #[account(mut, address = ORACLE_IDENTITY)]
    pub payer: Signer<'info>,
    #[account(
        seeds = [b"config"],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,
    /// CHECK: we accept any inference // can't be the user signing so no seed validations
    #[account(mut)]
    pub inference: Account<'info, Inference>,
    /// CHECK: the callback program; this ixn is just a proxy
    pub program: AccountInfo<'info>,
}

impl<'info> CallbackFromLlm<'info> {
    pub fn callback_from_llm(
        &mut self,
        response: String,
        remaining_accounts: Vec<AccountInfo<'info>>,
    ) -> Result<()> {
        let response_data = [
            self.inference.callback_discriminator.to_vec(),
            response.try_to_vec()?, // to_vec clones the value into a new Vec<>, is there any CU effective alternative?
        ]
        .concat();

        let mut account_metas = vec![AccountMeta {
            pubkey: self.config.key(),
            is_signer: true,
            is_writable: false,
        }];

        account_metas.extend(self.inference.callback_account_metas.iter().map(|meta| {
            AccountMeta {
                pubkey: meta.pubkey,
                is_signer: false, // saves a lot of issues as false always
                is_writable: meta.is_writable,
            }
        }));

        self.inference.is_processed = true;

        let instruction = Instruction {
            program_id: self.program.key(),
            accounts: account_metas,
            data: response_data,
        };

        let mut account_infos = vec![self.config.to_account_info()];
        account_infos = [account_infos, remaining_accounts].concat();

        invoke_signed(
            &instruction,
            &account_infos,
            &[&[b"config", &[self.config.bump]]],
        )?;
        Ok(())
    }
}
