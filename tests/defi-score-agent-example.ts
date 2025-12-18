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

  it("Is initialized!", async () => {
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
    const twitter_context = `@gauravvan (gou₹av.sol) is a passionate Solana developer, Turbine graduate, and active Hyderabad DAO member who builds blockchain projects, champions hands-on open-source learning, and enthusiastically engages with the Solana community through tech discussions, tool explorations, and supportive vibes.`;

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
