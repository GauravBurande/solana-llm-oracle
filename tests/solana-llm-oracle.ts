import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaLlmOracle } from "../target/types/solana_llm_oracle";
import { PublicKey } from "@solana/web3.js";
import { xit } from "mocha";

describe("solana-llm-oracle", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaLlmOracle as Program<SolanaLlmOracle>;
  const provider = anchor.getProvider();
  const payer = provider.wallet.payer;
  const programId = program.programId;
  const systemProgram = anchor.web3.SystemProgram.programId;

  const [config] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId
  );

  const getChatContext = async (seed: number) => {
    const [chatContext] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("chat_context"),
        payer.publicKey.toBuffer(),
        Buffer.from([seed]),
      ],
      programId
    );

    return chatContext;
  };

  const getInferencePda = async (chatContext: PublicKey) => {
    const [inference] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("inference"),
        payer.publicKey.toBuffer(),
        chatContext.toBuffer(),
      ],
      programId
    );

    return inference;
  };

  it("Is initialized!", async () => {
    const tx = await program.methods
      .initialize()
      .accountsPartial({
        admin: payer.publicKey,
        config,
        systemProgram,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });

  it("Starts new chat with context/Title", async () => {
    const seed = 0;
    const chatContext = await getChatContext(seed);
    const tx = await program.methods
      .createChat("You're a nice assistant", seed)
      .accountsPartial({
        user: payer.publicKey,
        chatContext,
        systemProgram,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  it("LLm inference - chat with ai", async () => {
    const callbackDiscriminator = [196, 61, 185, 224, 30, 229, 25, 52]; // for callbackTest ixn
    const seed = 0;
    const chatContext = await getChatContext(seed);
    const inference = await getInferencePda(chatContext);
    const tx = await program.methods
      .createLlmInference(
        "gm how are u?",
        programId,
        callbackDiscriminator,
        null
      )
      .accountsPartial({
        chatContext,
        user: payer.publicKey,
        inference,
        systemProgram,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  xit("Oracle sent a callback to proxy program!", async () => {
    const seed = 0;
    const chatContext = await getChatContext(seed);
    const inference = await getInferencePda(chatContext);
    const tx = await program.methods
      .callbackFromLlm("I'm good ser, gm!")
      .accountsPartial({
        config,
        inference,
        payer: payer.publicKey,
        program: programId,
      })
      .rpc();
    console.log("Your transaction signature", tx);
  });
});
