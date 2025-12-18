# Solana LLM Oracle

**On-chain LLM inference for Solana programs via CPI callbacks**

This repository provides a **Solana-native AI oracle** that allows smart contracts to **request LLM inference**, receive results **asynchronously**, and **process responses on-chain** via verified callbacks.

It is designed for:

- AI agents on Solana
- Autonomous on-chain decision systems
- Programmatic text → JSON → instruction workflows

The core crate is **`solana-llm-oracle`**, which exposes a CPI interface that Anchor programs can safely integrate.

---

## How It Works (High Level)

1. **Your program creates an LLM context (chat / agent)**
2. **Your program sends a prompt via CPI**
3. An **off-chain oracle** performs LLM inference
4. The oracle **calls back into your program**
5. Your program **verifies the oracle identity** and **processes the response**

This pattern ensures:

- Deterministic on-chain logic
- Asynchronous AI execution
- Secure, program-owned callbacks

---

## Installation

Add the oracle crate to your Anchor program **with CPI enabled**:

```sh
cargo add solana-llm-oracle --features cpi
```

---

## Creating an AI Agent (Chat Context)

Define your agent prompt and create a **chat context** via CPI.

```rust
use anchor_lang::prelude::*;
use solana_llm_oracle::cpi::{
    accounts::CreateChat,
    create_chat,
};

const AGENT_DESC: &str = "You are a helpful assistant.";

pub fn initialize(ctx: Context<Initialize>, seed: u8) -> Result<()> {
    // Store the chat context on your agent account
    ctx.accounts.agent.chat_context = ctx.accounts.chat_context.key();
    ctx.accounts.agent.bump = ctx.bumps.agent;

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
```

This creates a **persistent AI agent context** on-chain that can be reused for multiple interactions.

---

## Sending a Prompt (LLM Inference)

To request inference, call `create_llm_inference` via CPI.

```rust
use solana_llm_oracle::cpi::{
    accounts::CreateLlmInference,
    create_llm_inference,
};
use solana_llm_oracle::state::AccountMeta;

pub fn chat_with_llm(ctx: Context<ChatWithLlm>, text: String) -> Result<()> {
    let cpi_program = ctx.accounts.oracle_program.to_account_info();
    let cpi_accounts = CreateLlmInference {
        user: ctx.accounts.user.to_account_info(),
        inference: ctx.accounts.inference.to_account_info(),
        chat_context: ctx.accounts.chat_context.to_account_info(),
        system_program: ctx.accounts.system_program.to_account_info(),
    };

    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    // Callback discriminator (must be exactly 8 bytes)
    let callback_discriminator: [u8; 8] =
        instruction::CallbackFromLlm::DISCRIMINATOR
            .try_into()
            .expect("Invalid discriminator");

    create_llm_inference(
        cpi_ctx,
        text,
        crate::ID,                        // callback program id
        callback_discriminator,           // callback instruction
        Some(vec![
            AccountMeta {
                pubkey: ctx.accounts.user.key(),
                is_signer: false,
                is_writable: false,
            },
            AccountMeta {
                pubkey: ctx.accounts.cred_score.key(),
                is_signer: false,
                is_writable: true,
            },
        ]),
    )?;

    Ok(())
}
```

### Notes

- The **last argument** is `Option<Vec<AccountMeta>>`

  - `Some(...)` → pass extra accounts to the callback
  - `None` → callback only receives required accounts

- This allows **dynamic account routing** to your callback

---

## Handling the Callback (Critical Section)

The oracle will invoke your callback instruction with the LLM response.

### ⚠️ Account Order Matters

**The `Config` account MUST be the first account** in the callback context.

```rust
pub fn callback_from_llm(
    ctx: Context<CallbackFromLlm>,
    response: String,
) -> Result<()> {
    // Verify oracle identity
    if !ctx.accounts.config.to_account_info().is_signer {
        return Err(ProgramError::InvalidAccountData.into());
    }

    msg!("AI response received: {}", response);

    // Example: parse numeric output
    let parsed_score: u8 = response.trim().parse::<u8>().map_err(|_| {
        msg!("Failed to parse AI response");
        ProgramError::InvalidInstructionData
    })?;

    let cred_score = &mut ctx.accounts.cred_score;
    cred_score.score = parsed_score.min(100);

    Ok(())
}
```

### Why Config Must Be First

- The oracle enforces identity verification
- Anchor account ordering must match CPI expectations
- Incorrect ordering will cause runtime failures

---

## Example: DeFi Credit Score Agent

This repository includes a **complete working example**:

### 🔗 `defi-score-agent-example`

A Solana program that:

- Analyzes a user's Twitter activity
- Uses an LLM to infer DeFi literacy & trustworthiness
- Returns a **single integer score (0–100)**
- Stores the score on-chain

**Agent Prompt**

```text
You are a DeFi Credit Agent. Analyze a user's Twitter profile
and activity to infer their on-chain reputation, trustworthiness,
and DeFi literacy. Output a single DeFi Credit Score (0–100)
as an integer. Only return the number.
```

This example demonstrates:

- Agent initialization
- Inference requests
- Callback verification
- Parsing structured LLM output
- Safe state updates

➡️ **See:** `programs/defi-score-agent-example`

---

## What Can Agents Return?

Agents can be designed to return:

- Plain text
- Structured JSON
- Encoded instructions
- Deterministic numeric outputs
- Actionable signals (approve / reject / execute)

For advanced use cases, see **instruction-emitting agents** (e.g. token minters, governors, routers).

---

## Building

```sh
anchor build
```

---

## Testing

```sh
anchor test
```

---

## High-level architecture of oracle

Think of this program as a long-running oracle daemon:

```
┌─────────────┐
│ Solana Prog │
│ (on-chain)  │
│ Inference   │◄──── user tx
│ Context PDA │
└──────┬──────┘
       │
       │ program_subscribe (WebSocket)
       ▼
┌───────────────────────────┐
│ Oracle Process (this code)│
│                           │
│ 1. Detect new Inference   │
│ 2. Deserialize            │
│ 3. Call LLM, get response │
│ 4. Build callback ix      │
│ 5. Send tx back to Solana │
└──────────┬────────────────┘
           │
           ▼
┌─────────────────┐
│ Callback IX     │
│ marks processed │
│ writes response │
└─────────────────┘
```

This is NOT a request/response server.
It is a state-watcher + executor.
