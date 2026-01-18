"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { CredScore, fetchCredScore } from "@/program-client";
import { type Account, address, Address, createSolanaRpc } from "@solana/kit";
import {
  useCluster,
  useConnector,
  useConnectorClient,
} from "@solana/connector/react";
import { getCredScoreTransaction } from "@/lib/helpers";

const Hero = () => {
  const [twitterContext, setTwitterContext] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [credScore, setCredScore] = useState<Account<CredScore> | null>(null);
  const [error, setError] = useState("");

  const client = useConnectorClient();
  const rpc = createSolanaRpc("https://api.devnet.solana.com");

  const { isConnected, account } = useConnector();
  const { cluster } = useCluster();

  const getExplorerUrl = useCallback(
    (sig: string) => {
      const clusterSlug = cluster?.id?.replace("solana:", "");
      if (
        !clusterSlug ||
        clusterSlug === "mainnet" ||
        clusterSlug === "mainnet-beta"
      ) {
        return "https://explorer.solana.com/tx/" + sig;
      }
      return (
        "https://explorer.solana.com/tx/" + sig + "?cluster=" + clusterSlug
      );
    },
    [cluster?.id]
  );

  const startPolling = async (accountAddress: Address) => {
    let attempts = 0;
    const maxAttempts = 30; // Poll for ~30 seconds

    const poll = setInterval(async () => {
      attempts++;

      try {
        // Replace with actual RPC and config
        const account = await fetchCredScore(rpc, accountAddress);

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

    if (!account) {
      setError("Please connect the wallet first!");
      return;
    }

    setIsLoading(true);
    setError("");
    setCredScore(null);

    try {
      // Call the helper function to get transaction
      // Replace with actual implementation
      const transaction = await getCredScoreTransaction(
        twitterContext,
        address(account)
      );

      await startPolling(address(account));
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "Failed to process transaction"
      );
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Cred Score Calculator
          </h1>
          <p className="text-gray-600">
            Enter your Twitter context to calculate your credibility score
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">
              Twitter Context
            </label>
            <Input
              type="text"
              placeholder="go to ur X handle, click the grok icon and paste ur X handle info here!"
              value={twitterContext}
              onChange={(e) => setTwitterContext(e.target.value)}
              disabled={!isConnected || isLoading}
              className="w-full"
            />
          </div>

          {!isConnected && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-800">
                ⚠️ Please connect your wallet to continue
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <Button
            onClick={handleSubmit}
            disabled={!isConnected || isLoading || !twitterContext.trim()}
            className="w-full h-12 text-lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              "Calculate Cred Score"
            )}
          </Button>

          {credScore && (
            <div className="mt-6 bg-linear-to-r from-purple-100 to-blue-100 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Your Cred Score
              </h3>
              <span className="text-gray-600">Score:</span>
              <span className="text-3xl font-bold text-purple-600">
                {credScore.data.score}
              </span>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Your credibility score is calculated based on Twitter engagement and
            account metrics
          </p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
