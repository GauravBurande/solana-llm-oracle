"use client";

import { useConnector } from "@solana/connector/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { Wallet, ChevronDown } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { WalletModal } from "./wallet-modal";
import { WalletDropdownContent } from "./wallet-dropdown-content";

export function ConnectButton({ className }: { className?: string }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const {
    isConnected,
    isConnecting,
    account,
    connector,
    walletConnectUri,
    clearWalletConnectUri,
  } = useConnector();

  if (isConnected && account && connector) {
    const shortAddress = `${account.slice(0, 4)}...${account.slice(-4)}`;
    const walletIcon = connector.icon || undefined;

    return (
      <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Avatar className="h-5 w-5">
              {walletIcon && (
                <AvatarImage src={walletIcon} alt={connector.name} />
              )}
              <AvatarFallback>
                <Wallet className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
            <span className="text-xs">{shortAddress}</span>
            <div
              className={`transform transition-transform duration-200 ease-in-out ${
                isDropdownOpen ? "-rotate-180" : "rotate-0"
              }`}
            >
              <ChevronDown className="h-4 w-4 opacity-50" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="p-0 rounded-[20px]">
          <WalletDropdownContent
            selectedAccount={String(account)}
            walletIcon={walletIcon}
            walletName={connector.name}
          />
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return (
    <>
      <Button
        size="sm"
        onClick={() => setIsModalOpen(true)}
        className={className}
      >
        {isConnecting ? (
          <>
            <Spinner className="h-4 w-4" />
            <span className="text-xs">Connecting...</span>
          </>
        ) : (
          "Connect Wallet"
        )}
      </Button>
      <WalletModal
        open={isModalOpen}
        onOpenChange={(open) => {
          setIsModalOpen(open);
          if (!open) clearWalletConnectUri();
        }}
        walletConnectUri={walletConnectUri}
        onClearWalletConnectUri={clearWalletConnectUri}
      />
    </>
  );
}
