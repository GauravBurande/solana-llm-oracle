"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BalanceElement,
  ClusterElement,
  TokenListElement,
  TransactionHistoryElement,
  DisconnectElement,
} from "@solana/connector/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Wallet,
  Copy,
  Globe,
  Check,
  RefreshCw,
  Coins,
  History,
  ExternalLink,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const clusterColors: Record<string, string> = {
  "solana:mainnet": "bg-green-500",
  "solana:devnet": "bg-blue-500",
  "solana:testnet": "bg-yellow-500",
  "solana:localnet": "bg-red-500",
};

export function WalletDropdownContent({
  selectedAccount,
  walletIcon,
  walletName,
}) {
  const [copied, setCopied] = useState(false);
  const shortAddress = `${selectedAccount.slice(
    0,
    4
  )}...${selectedAccount.slice(-4)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(selectedAccount);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-[360px] p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={walletIcon} />
            <AvatarFallback>
              <Wallet />
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{shortAddress}</div>
            <div className="text-xs text-muted-foreground">{walletName}</div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={handleCopy}>
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </Button>

          {/* <ClusterElement
            render={({ cluster, clusters, setCluster }) => (
              <Select value={cluster?.id} onValueChange={setCluster}>
                <SelectTrigger>
                  <SelectValue>
                    <Button variant="outline" size="icon">
                      <Globe />
                    </Button>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {clusters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      <div className="flex items-center gap-2">
                        <span
                          className={`h-2 w-2 rounded-full ${
                            clusterColors[c.id]
                          }`}
                        />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          /> */}
        </div>
      </div>

      {/* Balance */}
      <BalanceElement
        render={({ solBalance, isLoading, refetch }) => (
          <div className="rounded-[12px] border p-4">
            <div className="flex justify-between">
              <span>Balance</span>
              <button onClick={() => refetch()}>
                <RefreshCw className={isLoading ? "animate-spin" : ""} />
              </button>
            </div>
            <div className="text-2xl font-bold">
              {solBalance?.toFixed(4)} SOL
            </div>
          </div>
        )}
      />

      {/* Tokens & Transactions */}
      <Accordion type="multiple">
        <AccordionItem value="tokens">
          <AccordionTrigger>
            <Coins /> Tokens
          </AccordionTrigger>
          <AccordionContent>
            <TokenListElement
              limit={5}
              render={({ tokens }) =>
                tokens.map((t) => (
                  <div key={t.mint}>
                    {t.symbol}: {t.formatted}
                  </div>
                ))
              }
            />
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value="transactions">
          <AccordionTrigger>
            <History /> Activity
          </AccordionTrigger>
          <AccordionContent>
            <TransactionHistoryElement
              limit={5}
              render={({ transactions }) =>
                transactions.map((tx) => (
                  <a key={tx.signature} href={tx.explorerUrl}>
                    {tx.type}
                  </a>
                ))
              }
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Disconnect */}
      <DisconnectElement
        render={({ disconnect, disconnecting }) => (
          <Button
            variant="destructive"
            className="w-full"
            onClick={disconnect}
            disabled={disconnecting}
          >
            <LogOut /> {disconnecting ? "Disconnecting..." : "Disconnect"}
          </Button>
        )}
      />
    </div>
  );
}
