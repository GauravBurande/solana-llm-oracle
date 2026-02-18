import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { DefiScoreAgentExample } from "../target/types/defi_score_agent_example";
import { PublicKey } from "@solana/web3.js";

describe("defi-score-agent-example", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const provider = anchor.getProvider();
  const payer = provider.wallet.payer;
  const llmProgramAddress = new PublicKey(
    "LLM4VF4uxgbcrUdwF9rBh7MUEypURp8FurEdZLhZqed"
  );

  // const idlAccount = "5TKsqg7Y3LtknVUHVskLzTUKrM7hWopYF61zgE6BgT17"; // idl json stored on chain in a pda

  const program = anchor.workspace
    .DefiScoreAgentExample as Program<DefiScoreAgentExample>;

  let seed = 0;
  const [chatContext] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("chat_context"),
      payer.publicKey.toBuffer(),
      Buffer.from([seed]),
    ],
    llmProgramAddress
  );

  console.log(
    "cred account",
    PublicKey.findProgramAddressSync(
      [Buffer.from("cred"), payer.publicKey.toBuffer()],
      program.programId
    )[0]
  );

  const [inference] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("inference"),
      payer.publicKey.toBuffer(),
      chatContext.toBuffer(),
    ],
    llmProgramAddress
  );

  xit("Is initialized!", async () => {
    const tx = await program.methods
      .initialize(seed)
      .accounts({
        chatContext,
        signer: provider.wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("get ur DeFi cred score", async () => {
    // it's more like ur web3 aura score
    const twitter_context = `Gourav is a Solana enthusiast and Solana Turbine graduate, actively building at SLO HQ while sharing practical learnings on blockchain development, onchain gaming, and content creation strategies. He balances tech pursuits with a love for sports and highlights the supportive Solana community for newcomers from diverse backgrounds. Lesser-known detail: he experiments with mobile-optimized games, predicting a shift from consoles to phones via advancements like Solana Mobile partnerships`;
    const tx = await program.methods
      .chatWithLlm(twitter_context)
      .accounts({
        inference,
        chatContext,
        user: provider.wallet.publicKey,
      })
      .rpc();
    console.log("Your transaction signature ", tx);
  });
});
