"use client";

import { useContext, useState } from "react";
import { Loader2 } from "lucide-react";
import { CredScore, fetchCredScore } from "@/program-client";
import {
  type Account,
  address,
  type Address,
  getBase58Decoder,
  signAndSendTransactionMessageWithSigners,
} from "@solana/kit";
import { getCredPda, getCredScoreTransaction } from "@/lib/helpers";
import Link from "next/link";
import { ChainContext } from "@/context/ChainContext";
import { RpcContext } from "@/context/RpcContext";
import {
  useSelectedWalletAccount,
  useWalletAccountTransactionSendingSigner,
} from "@solana/react";

const Hero = () => {
  const [selectedWalletAccount] = useSelectedWalletAccount();

  if (!selectedWalletAccount) {
    return <DisconnectedHero />;
  }

  return <ConnectedHero selectedWalletAccount={selectedWalletAccount} />;
};

const DisconnectedHero = () => {
  return (
    <div className="min-h-screen bg-yellow-300 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-32 h-32 bg-pink-400 rounded-full opacity-50"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-400 rounded-full opacity-50"></div>
      <div className="absolute top-1/2 right-10 w-24 h-24 bg-purple-400 opacity-50 rotate-45"></div>
      <div className="absolute bottom-10 left-20 w-28 h-28 bg-cyan-400 opacity-50 rotate-12"></div>

      <div className="max-w-2xl w-full bg-pink-500 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black p-8 relative z-10">
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-black text-yellow-300 mb-2 uppercase tracking-wider transform -rotate-1"
            style={{ textShadow: "4px 4px 0px rgba(0,0,0,1)" }}
          >
            Cred Score
          </h1>
          <h2
            className="text-3xl font-black text-blue-400 uppercase tracking-wide transform rotate-1"
            style={{ textShadow: "3px 3px 0px rgba(0,0,0,1)" }}
          >
            Calculator
          </h2>

          <p className="text-white font-bold mt-4 text-lg">
            ✨ Something like{" "}
            <Link
              target="_blank"
              href="https://fair.club/investor/invite/MJW8CR69"
              className="text-blue-400"
            >
              fair.club
            </Link>
            , where ur wallet will have an credibility score stored onchain,
            your twitter activity will be used to calculate the score via an
            onchain ai agent built using{" "}
            <Link
              target="_blank"
              href="https://slo.gauravvan.com"
              className="text-blue-400"
            >
              Solana LLM Oracle
            </Link>{" "}
            ! ✨
          </p>
        </div>

        <div className="bg-yellow-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
          <p className="text-lg font-black text-black">
            ⚠️ Please connect your wallet to continue
          </p>
        </div>
      </div>
    </div>
  );
};

const ConnectedHero = ({
  selectedWalletAccount,
}: {
  selectedWalletAccount: NonNullable<
    ReturnType<typeof useSelectedWalletAccount>[0]
  >;
}) => {
  const [twitterContext, setTwitterContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [credScore, setCredScore] = useState<Account<CredScore> | null>(null);
  const [error, setError] = useState("");

  const { rpc } = useContext(RpcContext);
  const { chain } = useContext(ChainContext);

  // SAFE: only runs when wallet exists
  const transactionSendingSigner = useWalletAccountTransactionSendingSigner(
    selectedWalletAccount,
    chain
  );

  const startPolling = async (accountAddress: Address) => {
    let attempts = 0;
    const maxAttempts = 60;

    const poll = setInterval(async () => {
      attempts++;

      try {
        const credPda = await getCredPda(accountAddress);
        const account = await fetchCredScore(rpc, credPda);
        console.log("cred account; ", account);

        if (account && account.data) {
          setCredScore(account);
          setIsLoading(false);
          clearInterval(poll);
        }
      } catch (err) {
        console.error("Polling error:", err);

        if (attempts >= maxAttempts) {
          setError("Failed to retrieve cred score after multiple attempts");
          setIsLoading(false);
          clearInterval(poll);
        }
      }
    }, 1000);
  };

  const handleSubmit = async () => {
    if (!twitterContext.trim()) {
      setError("Please enter Twitter context");
      return;
    }

    if (!transactionSendingSigner) {
      setError("Wallet signer not available");
      return;
    }

    setIsLoading(true);
    setError("");
    setCredScore(null);

    try {
      const transactionMessage = await getCredScoreTransaction(
        rpc,
        twitterContext,
        transactionSendingSigner
      );

      console.log("transaction message: ", transactionMessage);

      const signature = await signAndSendTransactionMessageWithSigners(
        transactionMessage
      );

      const signatureString = getBase58Decoder().decode(signature);

      alert(`Transaction sent: ${signatureString}`);
      console.log(`Transaction sent: ${signatureString}`);

      await startPolling(address(selectedWalletAccount.address));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : String(err) + " Failed to process transaction"
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-yellow-300 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-32 h-32 bg-pink-400 rounded-full opacity-50"></div>
      <div className="absolute bottom-20 right-20 w-40 h-40 bg-blue-400 rounded-full opacity-50"></div>
      <div className="absolute top-1/2 right-10 w-24 h-24 bg-purple-400 opacity-50 rotate-45"></div>
      <div className="absolute bottom-10 left-20 w-28 h-28 bg-cyan-400 opacity-50 rotate-12"></div>

      <div className="max-w-2xl w-full bg-pink-500 rounded-none shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] border-4 border-black p-8 relative z-10">
        <div className="text-center mb-8">
          <h1
            className="text-5xl font-black text-yellow-300 mb-2 uppercase tracking-wider transform -rotate-1"
            style={{ textShadow: "4px 4px 0px rgba(0,0,0,1)" }}
          >
            Cred Score
          </h1>

          <h2
            className="text-3xl font-black text-blue-400 uppercase tracking-wide transform rotate-1"
            style={{ textShadow: "3px 3px 0px rgba(0,0,0,1)" }}
          >
            Calculator
          </h2>

          <p className="text-white font-bold mt-4 text-lg">
            ✨ Something like{" "}
            <Link
              target="_blank"
              href="https://fair.club/investor/invite/MJW8CR69"
              className="text-blue-400"
            >
              fair.club
            </Link>
            , where ur wallet will have an credibility score stored onchain,
            your twitter activity will be used to calculate the score via an
            onchain ai agent built using{" "}
            <Link
              target="_blank"
              href="https://slo.gauravvan.com"
              className="text-blue-400"
            >
              Solana LLM Oracle
            </Link>{" "}
            ! ✨
          </p>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-xl font-black text-white uppercase tracking-wide">
              Twitter Context
            </label>

            <input
              type="text"
              placeholder="go to ur X handle, click the grok icon and paste ur X handle info here!"
              value={twitterContext}
              onChange={(e) => setTwitterContext(e.target.value)}
              disabled={isLoading}
              className="w-full px-4 py-4 text-lg font-bold bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:outline-none focus:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-400 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-4">
              <p className="text-lg font-black text-white">{error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={isLoading || !twitterContext.trim()}
            className="w-full h-16 text-2xl font-black uppercase bg-blue-400 text-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[-2px] hover:translate-y-[-2px] active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                Processing...
              </span>
            ) : (
              "Calculate!"
            )}
          </button>

          {credScore && (
            <div className="mt-6 bg-linear-to-br from-purple-400 via-pink-400 to-yellow-400 border-4 border-black shadow-[6px_6px__0px_0px_rgba(0,0,0,1)] p-8 transform -rotate-1">
              <h3
                className="text-2xl font-black text-white mb-4 uppercase"
                style={{ textShadow: "2px 2px 0px rgba(0,0,0,1)" }}
              >
                Your Cred Score
              </h3>

              <div className="bg-white border-4 border-black p-6 inline-block transform rotate-2">
                <span className="text-6xl font-black bg-linear-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  {credScore.data.score}
                </span>
              </div>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t-4 border-black border-dashed">
          <p className="text-sm font-bold text-white text-center uppercase tracking-wide">
            🔥 Based on Twitter engagement & metrics 🔥
          </p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
