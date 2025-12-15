use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::system_instruction::create_account;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_lang::{prelude::*, system_program};

use crate::state::AccountMeta;
use crate::{ChatContext, Inference};

// how about inference on ER, maybe delegate later

#[derive(Accounts)]
#[instruction(text: String, callback_program_id: Pubkey, callback_discriminator: [u8; 8], account_metas: Option<Vec<AccountMeta>>)]
pub struct CreateLlmInference<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        seeds = [b"chat_context", user.key().as_ref(), chat_context.seed.to_le_bytes().as_ref()],
        bump = chat_context.bump
    )]
    pub chat_context: Account<'info, ChatContext>,
    /// CHECK: the correct inference pda inside the ixn logic
    #[account(
        mut,
        seeds=[Inference::seed(), user.key().as_ref(), chat_context.key().as_ref()],
        bump
    )]
    pub inference: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

impl CreateLlmInference<'_> {
    pub fn create_llm_inference(
        &mut self,
        text: String,
        callback_program_id: Pubkey,
        callback_discriminator: [u8; 8],
        account_metas: Option<Vec<AccountMeta>>,
        bumps: &CreateLlmInferenceBumps,
    ) -> Result<()> {
        let rent = Rent::get()?;
        let space = Inference::space(&text, account_metas.as_ref().map_or(0, |m| m.len()));
        let inference_info = self.inference.to_account_info();
        let current_len = inference_info.data_len();

        let mut additional_rent = rent.minimum_balance(space);

        let user_info = self.user.to_account_info();
        let system_program_info = self.system_program.to_account_info();

        if inference_info.owner.eq(&system_program::ID) {
            let create_instruction = create_account(
                &self.user.key(),
                &self.inference.key(),
                additional_rent,
                space as u64,
                &crate::ID,
            );

            let account_infos = [user_info, inference_info, system_program_info];

            let user = self.user.key();
            let chat_context = self.chat_context.key();
            let signers_seeds: &[&[&[u8]]] = &[&[
                Inference::seed(),
                user.as_ref(),
                chat_context.as_ref(),
                &[bumps.inference],
            ]];
            invoke_signed(&create_instruction, &account_infos, signers_seeds)?;
        } else {
            additional_rent = additional_rent.saturating_sub(rent.minimum_balance(current_len));
            inference_info.resize(space)?;

            if additional_rent > 0 {
                let cpi_context = CpiContext::new(
                    system_program_info,
                    Transfer {
                        from: user_info,
                        to: inference_info,
                    },
                );

                transfer(cpi_context, additional_rent)?;
            }
        }

        let inference = &mut self.inference;
        let mut inference_data = inference.try_borrow_mut_data()?;
        let mut inference =
            Inference::try_deserialize_unchecked(&mut inference_data.as_ref()).unwrap_or_default();

        inference.chat_context = self.chat_context.key();
        inference.user = self.user.key();
        inference.text = text;
        inference.callback_program_id = callback_program_id;
        inference.callback_discriminator = callback_discriminator;
        inference.callback_account_metas = account_metas.unwrap_or_default();
        inference.is_processed = false;

        inference.try_serialize(&mut inference_data.as_mut())?;
        Ok(())
    }
}
