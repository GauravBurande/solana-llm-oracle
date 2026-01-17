"use client";

import { ConnectorProvider } from "@solana/connector/react";

const ClientProviders = ({ children }: { children: React.ReactNode }) => {
  return <ConnectorProvider>{children}</ConnectorProvider>;
};

export default ClientProviders;
