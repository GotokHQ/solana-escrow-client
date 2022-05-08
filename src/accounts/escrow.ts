import {
  Borsh,
  StringPublicKey,
  AnyPublicKey,
  ERROR_INVALID_OWNER,
  Account,
} from '@metaplex-foundation/mpl-core';
import BN from 'bn.js';
import { AccountInfo, } from '@solana/web3.js';
import { EscrowProgram } from '../EscrowProgram';

export type EscrowDataArgs = {
  amount: BN;
};

export class EscrowData extends Borsh.Data<EscrowDataArgs> {
  static readonly SCHEMA = EscrowData.struct([
    ['isInitialized', 'u8'],
    ['isSettled', 'u8'],
    ['isCanceled', 'u8'],
    ['payer', 'pubkeyAsString'],
    ['payerToken', 'pubkeyAsString'],
    ['payeeToken', 'pubkeyAsString'],
    ['vaultToken', 'pubkeyAsString'],
    ['authority', 'pubkeyAsString'],
    ['feeToken', 'pubkeyAsString'],
    ['amount', 'u64'],
    ['fee', 'u64'],
  ]);
  isInitialized: boolean;
  isSettled: boolean;
  isCanceled: boolean;
  payer: StringPublicKey;
  payerToken: StringPublicKey;
  payeeToken: StringPublicKey;
  vaultToken: StringPublicKey;
  authority: StringPublicKey;
  feeToken: StringPublicKey;
  amount: BN;
  fee: BN;

  constructor(args: EscrowDataArgs) {
    super(args);
  }
}

export class Escrow extends Account<EscrowData> {
  constructor(pubkey: AnyPublicKey, info: AccountInfo<Buffer>) {
    super(pubkey, info);
    this.data = EscrowData.deserialize(this.info.data);
    if (!this.assertOwner(EscrowProgram.PUBKEY)) {
      throw ERROR_INVALID_OWNER();
    }
  }
}
