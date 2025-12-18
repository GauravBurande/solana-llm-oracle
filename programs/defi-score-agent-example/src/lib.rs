use anchor_lang::prelude::*;

use solana_llm_oracle::cpi::{
    accounts::{CreateChat, CreateLlmInference},
    create_chat, create_llm_inference,
};
use solana_llm_oracle::{state::AccountMeta, ChatContext, Config};

declare_id!("3PXKKoDvK8TUF7mmszeXozkaZS7KGbtUEg3dn3r8PTkL");

#[program]
pub mod defi_score_agent_example {

    use super::*;

    const AGENT_DESC: &str = "You are a DeFi Credit Agent. Analyze a user's Twitter profile and activity to infer their on-chain reputation, trustworthiness, and DeFi literacy. Output a single DeFi Credit Score (0–100) as an integer based on these signals. Only return the number — do not include explanations, text, or any extra information.";
    pub fn initialize(ctx: Context<Initialize>, seed: u8) -> Result<()> {
        ctx.accounts.agent.chat_context = ctx.accounts.chat_context.key();
        ctx.accounts.agent.bump = ctx.bumps.agent;

        // Create the context for the AI agent
        let cpi_program = ctx.accounts.oracle_program.to_account_info();
        let cpi_accounts = CreateChat {
            user: ctx.accounts.signer.to_account_info(),
            chat_context: ctx.accounts.chat_context.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        create_chat(cpi_ctx, AGENT_DESC.to_string(), seed)?;
        Ok(())
    }

    pub fn chat_with_llm(ctx: Context<ChatWithLlm>, text: String) -> Result<()> {
        let cpi_program = ctx.accounts.oracle_program.to_account_info();

        let cpi_accounts = CreateLlmInference {
            user: ctx.accounts.user.to_account_info(),
            inference: ctx.accounts.inference.to_account_info(),
            chat_context: ctx.accounts.chat_context.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

        let disc: [u8; 8] = instruction::CallbackFromLlm::DISCRIMINATOR
            .try_into()
            .expect("Discriminator must be 8 bytes");

        create_llm_inference(
            cpi_ctx,
            text,
            ID,
            disc,
            Some(vec![
                AccountMeta {
                    pubkey: ctx.accounts.user.to_account_info().key(),
                    is_signer: false,
                    is_writable: false,
                },
                AccountMeta {
                    pubkey: ctx.accounts.cred_score.to_account_info().key(),
                    is_signer: false,
                    is_writable: true,
                },
            ]),
        )?;
        Ok(())
    }
    pub fn callback_from_llm(ctx: Context<CallbackFromLlm>, response: String) -> Result<()> {
        // Ensure the identity is a signer
        if !ctx.accounts.config.to_account_info().is_signer {
            return Err(ProgramError::InvalidAccountData.into());
        }

        msg!("AI response received: {}", response);

        // Parse the response as u8
        let parsed_score: u8 = response.trim().parse::<u8>().map_err(|_| {
            msg!("Failed to parse AI response as a number");
            ProgramError::InvalidInstructionData
        })?;

        if parsed_score > 100 {
            msg!("Score exceeds 100, clamping to 100");
        }

        // Update the cred_score account
        let cred_score_account = &mut ctx.accounts.cred_score;
        cred_score_account.score = parsed_score.min(100);

        msg!("Stored score: {}", cred_score_account.score);

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub signer: Signer<'info>,

    #[account(
        init,
        payer = signer,
        space = 8 + 32 + 1,
        seeds = [b"agent"],
        bump
    )]
    pub agent: Account<'info, Agent>,

    /// CHECK: checked in the oracle program
    #[account(mut)]
    pub chat_context: AccountInfo<'info>,

    /// CHECK: the oracle program id
    #[account(address = solana_llm_oracle::ID)]
    pub oracle_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ChatWithLlm<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        init_if_needed,
        payer = user,
        space = 8 + CredScore::INIT_SPACE,
        seeds=[b"cred", user.key().as_ref()],
        bump
    )]
    pub cred_score: Account<'info, CredScore>,

    /// CHECK: Checked in oracle program
    #[account(mut)]
    pub inference: AccountInfo<'info>,

    #[account(seeds = [b"agent"], bump = agent.bump)]
    pub agent: Account<'info, Agent>,

    #[account(address = agent.chat_context)]
    pub chat_context: Account<'info, ChatContext>,

    /// CHECK: the oracle program id
    #[account(address = solana_llm_oracle::ID)]
    pub oracle_program: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CallbackFromLlm<'info> {
    /// CHECK: this is checked by oracle program
    pub config: Account<'info, Config>,
    /// CHECK: the user who's checking their cred score
    pub user: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds=[b"cred", user.key().as_ref()],
        bump
    )]
    pub cred_score: Account<'info, CredScore>,
}

#[account]
#[derive(InitSpace)]
pub struct CredScore {
    pub score: u8,
}

#[account]
pub struct Agent {
    pub chat_context: Pubkey,
    pub bump: u8,
}
