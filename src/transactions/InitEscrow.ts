import { Borsh } from '@metaplex-foundation/mpl-core';
import BN from 'bn.js';

type Args = {
  amount: BN;
};

export class InitEscrowArgs extends Borsh.Data<Args> {
  static readonly SCHEMA = InitEscrowArgs.struct([
    ['instruction', 'u8'],
    ['amount', 'u64'],
  ]);

  instruction = 0;
  amount: BN;
}
