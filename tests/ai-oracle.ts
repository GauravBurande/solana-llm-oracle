import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { AiOracle } from "../target/types/ai_oracle";
import { PublicKey } from "@solana/web3.js";

describe("ai-oracle", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.aiOracle as Program<AiOracle>;
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
    //2X1w7hz1SEa2HfXLeFVYQzhLL6Djyxa2SbsbrWjGkV1oSxEkFkAofapUQRoC53T9JLqRdjiNbeD48GNKud3TH2Lq
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
    // 5SLvJoXBNaBqrxoRo8MQwRrxecbFnpvcaYdCBFtEtEzpvmReEtFg5jVdGskb2uNUZVFe4rA8ruYxt77pWckxDXnf
  });

  it("LLm inference - chat with ai", async () => {
    const callbackDiscriminator = [196, 61, 185, 224, 30, 229, 25, 52];
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
    // uKy7DgCZb7ACa3gxrx24AVViSVKfwT5EyyYBtKMeqzFACapfSzyWTGn2Ub7n3SV9dE68nVwDby3HWwP7jWZhPJu
  });

  it("Oracle sent a callback to proxy program!", async () => {
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
    // 59qK9gMAb4ZAyc9hUxFfUcnNTNGvFx3gsETEqYi9FMEgXxtBPU4abhHKR1kSxtqoekRLtaaP3Q1mtBeEked5BCVR
    // #1 Unknown Program Instruction
    // > Program logged: "Instruction: CallbackFromLlm"
    // > Program invoked: Unknown Program (DVc1wcKi3tnj8oHG5nHZ1xYC3JmtBmrZ3WmBm3K3qrLm)
    // > Program logged: "Instruction: CallbackTest"
    // > Program logged: "Callback response: "I'm good ser, gm!""
    // > Program consumed: 3283 of 193929 compute units
    // > Program returned success
    // > Program consumed: 10125 of 200000 compute units
    // > Program returned success
  });
});
