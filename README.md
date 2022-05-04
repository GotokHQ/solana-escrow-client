# Escrow Payment Client

Helper JavaScript client library for interacting with solana escrow program

```

## Usage

```js

import { PublicKey, 
  Connection,
  Keypair } from "@solana/web3.js";
import { Request, Response } from "express";
import {
  EscrowClient
} from "solana_escrow_client";

const toArrayBuffer = (buf: Buffer): Uint8Array => {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
  }
  return view;
}

const walletServiceClient = new EscrowClient(
  Keypair.fromSecretKey(toArrayBuffer(Buffer.from(process.env.FEE_PAYER!, 'base64'))),
  Keypair.fromSecretKey(toArrayBuffer(Buffer.from(process.env.AUTHORITY!, 'base64'))),
  new PublicKey(process.env.FEE_TAKER!),
  new Connection(process.env.RPC_URL!),
  new PublicKey(process.env.ESCROW_PROGRAM_ID!),
);

```