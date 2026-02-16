"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useSelectedWalletAccount } from "@solana/react";
import { StandardConnect, StandardDisconnect } from "@wallet-standard/core";
import type { UiWallet, UiWalletAccount } from "@wallet-standard/react";
import {
  uiWalletAccountBelongsToUiWallet,
  uiWalletAccountsAreSame,
  useConnect,
  useDisconnect,
} from "@wallet-standard/react";
import { Wallet, ChevronDown } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function WalletMenuItem({
  wallet,
  selectedWalletAccount,
  onAccountSelect,
  onDisconnect,
  onError,
}: {
  wallet: UiWallet;
  selectedWalletAccount: UiWalletAccount | undefined;
  onAccountSelect(account: UiWalletAccount | undefined): void;
  onDisconnect(wallet: UiWallet): void;
  onError(err: unknown): void;
}) {
  const [isConnecting, connect] = useConnect(wallet);
  const [isDisconnecting, disconnect] = useDisconnect(wallet);
  const isPending = isConnecting || isDisconnecting;
  const isConnected = wallet.accounts.length > 0;
  const supportsStandardConnect =
    wallet.features.includes(StandardConnect) &&
    wallet.features.includes(StandardDisconnect);

  const handleConnectClick = useCallback(async () => {
    try {
      const existingAccounts = [...wallet.accounts];
      const nextAccounts = await connect();

      for (const nextAccount of nextAccounts) {
        if (
          !existingAccounts.some((existingAccount) =>
            uiWalletAccountsAreSame(nextAccount, existingAccount)
          )
        ) {
          onAccountSelect(nextAccount);
          return;
        }
      }

      if (nextAccounts[0]) {
        onAccountSelect(nextAccounts[0]);
      }
    } catch (e) {
      onError(e);
    }
  }, [connect, onAccountSelect, onError, wallet.accounts]);

  if (!supportsStandardConnect) {
    return (
      <DropdownMenuItem disabled>
        <span className="flex items-center gap-2">
          {wallet.icon ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={wallet.icon} alt={wallet.name} />
              <AvatarFallback>
                <Wallet className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          ) : null}
          {wallet.name}
        </span>
      </DropdownMenuItem>
    );
  }

  if (!isConnected) {
    return (
      <DropdownMenuItem
        disabled={isPending}
        onSelect={async (event) => {
          event.preventDefault();
          await handleConnectClick();
        }}
      >
        <span className="flex items-center gap-2">
          {wallet.icon ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={wallet.icon} alt={wallet.name} />
              <AvatarFallback>
                <Wallet className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          ) : null}
          {isConnecting
            ? `Connecting ${wallet.name}...`
            : `Connect ${wallet.name}`}
        </span>
      </DropdownMenuItem>
    );
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger disabled={isPending}>
        <span className="flex items-center gap-2">
          {wallet.icon ? (
            <Avatar className="h-5 w-5">
              <AvatarImage src={wallet.icon} alt={wallet.name} />
              <AvatarFallback>
                <Wallet className="h-3 w-3" />
              </AvatarFallback>
            </Avatar>
          ) : null}
          {wallet.name}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent>
        <DropdownMenuLabel>Accounts</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={selectedWalletAccount?.address}>
          {wallet.accounts.map((account) => (
            <DropdownMenuRadioItem
              key={account.address}
              value={account.address}
              onSelect={() => {
                onAccountSelect(account);
              }}
            >
              {account.address.slice(0, 8)}&hellip;
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={async (event) => {
            event.preventDefault();
            await handleConnectClick();
          }}
        >
          Connect More
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onSelect={async (event) => {
            event.preventDefault();
            try {
              await disconnect();
              onDisconnect(wallet);
            } catch (e) {
              onError(e);
            }
          }}
        >
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}

export function ConnectButton({ className }: { className?: string }) {
  const { current: NO_ERROR } = useRef(Symbol());
  const [error, setError] = useState<symbol | unknown>(NO_ERROR);
  const [selectedWalletAccount, setSelectedWalletAccount, wallets] =
    useSelectedWalletAccount();

  const supportedWallets = useMemo(() => {
    return wallets.filter(
      (wallet) =>
        wallet.features.includes(StandardConnect) &&
        wallet.features.includes(StandardDisconnect)
    );
  }, [wallets]);

  const selectedWallet = useMemo(() => {
    if (!selectedWalletAccount) return undefined;
    return wallets.find((wallet) =>
      uiWalletAccountBelongsToUiWallet(selectedWalletAccount, wallet)
    );
  }, [selectedWalletAccount, wallets]);

  const shortAddress = selectedWalletAccount
    ? `${selectedWalletAccount.address.slice(
        0,
        4
      )}...${selectedWalletAccount.address.slice(-4)}`
    : null;

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            {selectedWalletAccount ? (
              <>
                <Avatar className="h-5 w-5">
                  {selectedWallet?.icon ? (
                    <AvatarImage
                      src={selectedWallet.icon}
                      alt={selectedWallet.name}
                    />
                  ) : null}
                  <AvatarFallback>
                    <Wallet className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs">{shortAddress}</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </>
            ) : (
              "Connect Wallet"
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[220px]">
          {supportedWallets.length === 0 ? (
            <DropdownMenuItem disabled>No wallets installed</DropdownMenuItem>
          ) : (
            supportedWallets
              .filter((account) => account.chains?.includes("solana:devnet"))
              .map((wallet, i) => (
                <WalletMenuItem
                  key={`${wallet.name}-${wallet.icon ?? "noicon"}-${i}`}
                  wallet={wallet}
                  selectedWalletAccount={selectedWalletAccount}
                  onAccountSelect={(account) => {
                    setSelectedWalletAccount(account);
                  }}
                  onDisconnect={(walletToDisconnect) => {
                    if (
                      selectedWalletAccount &&
                      uiWalletAccountBelongsToUiWallet(
                        selectedWalletAccount,
                        walletToDisconnect
                      )
                    ) {
                      setSelectedWalletAccount(undefined);
                    }
                  }}
                  onError={setError}
                />
              ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {error !== NO_ERROR ? (
        <p className="text-xs text-red-600">
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : null}
    </div>
  );
}
