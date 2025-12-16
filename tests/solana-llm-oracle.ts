import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaLlmOracle } from "../target/types/solana_llm_oracle";
import { PublicKey } from "@solana/web3.js";

describe("solana-llm-oracle", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SolanaLlmOracle as Program<SolanaLlmOracle>;
  const provider = anchor.getProvider();
  const payer = provider.wallet.payer;
  const programId = program.programId;
  // const programId = "DVc1wcKi3tnj8oHG5nHZ1xYC3JmtBmrZ3WmBm3K3qrLm"; // old one

  const systemProgram = anchor.web3.SystemProgram.programId;

  const ephemeralProvider = new anchor.AnchorProvider(
    new anchor.web3.Connection(
      process.env.EPHEMERAL_RPC_ENDPOINT || "https://devnet.magicblock.app/",
      {
        wsEndpoint:
          process.env.EPHEMERAL_WS_ENDPOINT || "wss://devnet.magicblock.app/",
      }
    ),
    anchor.Wallet.local()
  );

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

  xit("Is initialized!", async () => {
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

  xit("Starts new chat with context/Title", async () => {
    const seed = 1; // even is delegated, odd is on base layer
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
    const seed = 1;
    const chatContext = await getChatContext(seed);
    const inference = await getInferencePda(chatContext);
    const tx = await program.methods
      .createLlmInference(
        "give me an u8 random number, NOTHING ELSE!!",
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
    // 5ans7Vayc4ysaVma6Kqkk2EdXR6BuZDmvojmG4LpSWLA83kfRt46EstrSCQzuWDqLnpdrS8Bfkb51FfrE4wo1zmo
  });

  xit("LLm inference - chat with ai over ephemeral layer", async () => {
    const callbackDiscriminator = [196, 61, 185, 224, 30, 229, 25, 52]; // for callbackTest ixn
    const seed = 0;
    const chatContext = await getChatContext(seed);
    const inference = await getInferencePda(chatContext);
    let tx = await program.methods
      .createLlmInference(
        "ur fav number?",
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
      .transaction();

    tx.recentBlockhash = (
      await ephemeralProvider.connection.getLatestBlockhash()
    ).blockhash;
    tx.feePayer = ephemeralProvider.wallet.publicKey;
    try {
      tx = await ephemeralProvider.wallet.signTransaction(tx);
      const sign = await ephemeralProvider.sendAndConfirm(tx, []);

      console.log("Your transaction signature", sign);
    } catch (e) {}
  });

  xit("Delegate inference to ephemeral rollup", async () => {
    const seed = 6;
    const chatContext = await getChatContext(seed);
    const inference = await getInferencePda(chatContext);
    const tx = await program.methods
      .delegate()
      .accountsPartial({
        chatContext,
        user: payer.publicKey,
        inference,
        systemProgram,
      })
      .rpc();

    console.log("Your transaction signature", tx);
  });

  xit("Oracle sent a callback to proxy program on base layer!", async () => {
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

  xit("Oracle sent a callback to proxy program on ephemeral layer!", async () => {
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
      .transaction();

    tx.feePayer = ephemeralProvider.wallet.publicKey;

    tx.recentBlockhash = (
      await ephemeralProvider.connection.getLatestBlockhash()
    ).blockhash;

    let sign = ephemeralProvider.sendAndConfirm(tx, [
      ephemeralProvider.wallet.payer,
    ]);
    console.log("Your transaction signature", sign);
  });
});

// todo; llm inference and callback is failing when delegated the inference pda due to architectural issue:
// create inference fails to get callback from oracle on er when created the pda for first time and even if it's created and can't create another inference as the pda is owned by delegate program, issue with size and lamports ops

// account owner check for delegated and program id
