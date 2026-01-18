import {
  getInitializeInstructionAsync,
  getChatWithLlmInstructionAsync,
} from "@/program-client";
import {
  address,
  Address,
  appendTransactionMessageInstructions,
  createNoopSigner,
  createSolanaRpc,
  createTransactionMessage,
  getAddressEncoder,
  getProgramDerivedAddress,
  pipe,
  setTransactionMessageFeePayerSigner,
  setTransactionMessageLifetimeUsingBlockhash,
  TransactionMessage,
} from "@solana/kit";
export const getCredScoreTransaction = async (
  twitter_context: string,
  user: Address,
  seed: number = 0
): Promise<TransactionMessage> => {
  const rpc = createSolanaRpc("https://api.devnet.solana.com");
  const addressEncoder = getAddressEncoder();
  const llmProgramAddress = address(
    "LLM4VF4uxgbcrUdwF9rBh7MUEypURp8FurEdZLhZqed"
  );
  const addressBytes = addressEncoder.encode(user);
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
  const signer = createNoopSigner(user);
  const initIxn = await getInitializeInstructionAsync({
    chatContext,
    seed,
    signer,
  });
  const chatWithLLmIxn = await getChatWithLlmInstructionAsync({
    user: signer,
    text: twitter_context,
    chatContext,
    inference,
  });
  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
    (tx) => appendTransactionMessageInstructions([initIxn, chatWithLLmIxn], tx)
  );
  return transactionMessage;
};
