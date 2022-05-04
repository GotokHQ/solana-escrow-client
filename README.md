# Escrow Payment Client

Helper JavaScript client library for interacting with solana, kurobi escrow payment library 

```

## Usage

```js

import { PublicKey, 
  Connection,
  Keypair } from "@solana/web3.js";
import { Request, Response } from "express";
import {
  WalletServiceClient
} from "solana_service_helper";

const toArrayBuffer = (buf: Buffer): Uint8Array => {
  var ab = new ArrayBuffer(buf.length);
  var view = new Uint8Array(ab);
  for (var i = 0; i < buf.length; ++i) {
      view[i] = buf[i];
  }
  return view;
}

const walletServiceClient = new WalletServiceClient(
  Keypair.fromSecretKey(toArrayBuffer(Buffer.from(process.env.FEE_PAYER!, 'base64'))),
  Keypair.fromSecretKey(toArrayBuffer(Buffer.from(process.env.AUTHORITY!, 'base64'))),
  new PublicKey(process.env.FEE_TAKER!),
  new Connection(process.env.RPC_URL!),
  new PublicKey(process.env.ESCROW_PROGRAM_ID!),
);

export const createAssociatedTokenTx = async (request: Request, response: Response) => {
  try {
    return response.status(200).send(await walletServiceClient.createAssociatedTokenAccount(request.body));
  } catch (error) {
    return response.status(422).send(error.message);
  }
};

export const createAndTransferToAccountTx = async (request: Request, response: Response) => {
  try {
    return response.status(200).send(await walletServiceClient.createAndTransferToAccount(request.body));
  } catch (error) {
    return response.status(422).send(error.message);
  }
};


export const createTransferBetweenSplTokenAccountsTx = async (request: Request, response: Response) => {
  try {
    return response.status(200).send(await walletServiceClient.createTransferBetweenSplTokenAccounts(request.body));
  } catch (error) {
    return response.status(422).send(error.message);
  }
};

export const initializePayment = async (request: Request, response: Response) => {
  try {
    return response.status(200).send(await walletServiceClient.initializeEscrowPayment(request.body));
  } catch (error) {
    return response.status(422).send(error.message);
  }
};

export const sendPayment = async (request: Request, response: Response) => {
  try {
    return response.status(200).send(await walletServiceClient.sendEscrowPayment(request.body));
  } catch (error) {
    return response.status(422).send(error.message);
  }
};

export const settlePayment = async (request: any, response: Response) => {
  try {
    return response.status(200).send(await walletServiceClient.settleEscrowPayment(request.body));
  } catch (error) {
    return response.status(422).send(error.message);
  }
};

export const closePayment = async (request: Request, response: Response) => {
  try {
    return response.status(200).send(await walletServiceClient.closeEscrowPayment(request.body));
  } catch (error) {
    return response.status(422).send(error.message);
  }
};

export const getTransactionSignatureByMemo = async (request: Request, response: Response) => {
  try {
    return response.status(200).send(await walletServiceClient.findTransactionSignatureByMemo(request.query as any));
  } catch (error) {
    return response.status(422).send(error.message);
  }
};

export const nativeTransfer = async (request: Request, response: Response) => {
  try {
    return response.status(200).send(await walletServiceClient.nativeTransferTx(request.body));
  } catch (error) {
    return response.status(422).send(error.message);
  }
};

```