import {
  getInitializeInstructionAsync,
  getChatWithLlmInstructionAsync,
  ChatWithLlmInstruction,
} from "@/program-client";
import {
  address,
  appendTransactionMessageInstructions,
  BaseTransactionMessage,
  createTransactionMessage,
  getAddressEncoder,
  getProgramDerivedAddress,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  TransactionMessageWithFeePayer,
  TransactionMessageWithSigners,
  type TransactionSigner,
} from "@solana/kit";
import { SolanaRpc } from "./types";

export const getCredScoreTransaction = async (
  rpc: SolanaRpc,
  twitter_context: string,
  signer: TransactionSigner,
  seed: number = 0
): Promise<
  BaseTransactionMessage &
    TransactionMessageWithFeePayer &
    TransactionMessageWithSigners
> => {
  const addressEncoder = getAddressEncoder();
  const llmProgramAddress = address(
    "LLM4VF4uxgbcrUdwF9rBh7MUEypURp8FurEdZLhZqed"
  );
  const userAddress = signer.address;
  const addressBytes = addressEncoder.encode(userAddress);
  const [chatContext] = await getProgramDerivedAddress({
    seeds: [Buffer.from("chat_context"), addressBytes, Buffer.from([seed])],
    programAddress: llmProgramAddress,
  });
  const [inference] = await getProgramDerivedAddress({
    seeds: [
      Buffer.from("inference"),
      addressBytes,
      addressEncoder.encode(chatContext),
    ],
    programAddress: llmProgramAddress,
  });

  const chatWithLLmIxn = await getChatWithLlmInstructionAsync({
    user: signer,
    text: twitter_context,
    chatContext,
    inference,
  });
  const ixns = [chatWithLLmIxn];
  const chatContextAccount = await rpc.getAccountInfo(chatContext).send();

  if (!chatContextAccount) {
    console.log("Initializing chat context");
    const initIxn = await getInitializeInstructionAsync({
      chatContext,
      seed,
      signer,
    });
    ixns.unshift(initIxn as unknown as ChatWithLlmInstruction);
  }

  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
    (tx) => appendTransactionMessageInstructions(ixns, tx)
  );
  return transactionMessage;
};
