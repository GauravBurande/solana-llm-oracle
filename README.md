High-level architecture of oracle

Think of this program as a long-running oracle daemon:

```
┌─────────────┐
│ Solana Prog │
│ (on-chain)  │
│ Inference   │◄──── user tx
│ Context PDA │
└──────┬──────┘
       │
       │ program_subscribe (WebSocket)
       ▼
┌───────────────────────────┐
│ Oracle Process (this code)│
│                           │
│ 1. Detect new Inference   │
│ 2. Deserialize            │
│ 3. Call Gemini            │
│ 4. Build callback ix      │
│ 5. Send tx back to Solana │
└──────────┬────────────────┘
           │
           ▼
┌─────────────────┐
│ Callback IX     │
│ marks processed │
│ writes response │
└─────────────────┘
```

This is NOT a request/response server.
It is a state-watcher + executor.
