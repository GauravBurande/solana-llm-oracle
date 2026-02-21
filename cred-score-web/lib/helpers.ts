import {
  getInitializeInstructionAsync,
  getChatWithLlmInstructionAsync,
  ChatWithLlmInstruction,
} from "@/program-client";
import { DEFI_SCORE_AGENT_EXAMPLE_PROGRAM_ADDRESS } from "@/program-client";
import {
  Address,
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
import { getTransferSolInstruction } from "@solana-program/system";

const addressEncoder = getAddressEncoder();
const llmProgramAddress = address(
  "LLM4VF4uxgbcrUdwF9rBh7MUEypURp8FurEdZLhZqed"
);

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
  console.log("chatContextAccount", chatContextAccount);
  if (!chatContextAccount.value) {
    console.log("Initializing chat context");
    const initIxn = await getInitializeInstructionAsync({
      chatContext,
      seed,
      signer,
    });
    ixns.unshift(initIxn as unknown as ChatWithLlmInstruction);
  }

  // const destination = address("5j16iasntXRp6yeXkMhouHgvQ9WyNNG1nh7pyzkuYnXx");

  // const sendIxn = getTransferSolInstruction({
  //   amount: 10000,
  //   source: signer,
  //   destination,
  // });

  const { value: blockhash } = await rpc.getLatestBlockhash().send();
  const transactionMessage = pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(signer, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
    (tx) => appendTransactionMessageInstructions(ixns, tx)
  );
  // const transactionMessage = pipe(
  //   createTransactionMessage({ version: 0 }),
  //   (tx) => setTransactionMessageFeePayerSigner(signer, tx),
  //   (tx) => setTransactionMessageLifetimeUsingBlockhash(blockhash, tx),
  //   (tx) => appendTransactionMessageInstructions(ixns, tx)
  // );
  return transactionMessage;
};

export const getCredPda = async (address: Address) => {
  const addressBytes = addressEncoder.encode(address);
  const [credPda] = await getProgramDerivedAddress({
    programAddress: DEFI_SCORE_AGENT_EXAMPLE_PROGRAM_ADDRESS,
    seeds: [Buffer.from("cred"), addressBytes],
  });

  return credPda;
};
