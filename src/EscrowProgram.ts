import { PublicKey } from '@solana/web3.js';
import { Program } from '@metaplex-foundation/mpl-core';

export class EscrowProgram extends Program {
  static readonly PREFIX = 'escrow';
  static readonly PUBKEY = new PublicKey(
    '5DQUMRfBoEWYs3SWXtBiVt2EA46ahnNswHwncbuEcYjm',
  );

  static async findProgramAuthority(): Promise<[PublicKey, number]> {
    return PublicKey.findProgramAddress(
      [Buffer.from(EscrowProgram.PREFIX, 'utf8')],
      EscrowProgram.PUBKEY,
    );
  }
}
