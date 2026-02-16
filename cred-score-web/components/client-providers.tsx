"use client";

import { ChainContextProvider } from "@/context/ChainContextProvider";
import { RpcContextProvider } from "@/context/RpcContextProvider";
import { SelectedWalletAccountContextProvider } from "@solana/react";
import { UiWallet } from "@wallet-standard/react";

const ClientProviders = ({ children }: { children: React.ReactNode }) => {
  const STORAGE_KEY =
    "solana-wallet-standard-example-react:selected-wallet-and-address";

  const stateSync = {
    deleteSelectedWallet: () => {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    },
    getSelectedWallet: () => {
      if (typeof window !== "undefined" && window.localStorage) {
        return localStorage.getItem(STORAGE_KEY);
      }
      return null;
    },
    storeSelectedWallet: (accountKey: string) => {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.setItem(STORAGE_KEY, accountKey);
      }
    },
  };

  return (
    <ChainContextProvider>
      <SelectedWalletAccountContextProvider
        filterWallets={(_: UiWallet) => true}
        stateSync={stateSync}
      >
        <RpcContextProvider>{children}</RpcContextProvider>
      </SelectedWalletAccountContextProvider>
    </ChainContextProvider>
  );
};

export default ClientProviders;
