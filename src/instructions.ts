import { PublicKey, TransactionInstruction } from '@solana/web3.js';

export const TOKEN_PROGRAM_ID = new PublicKey(
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export const WRAPPED_SOL_MINT = new PublicKey(
    'So11111111111111111111111111111111111111112',
);

export const MEMO_PROGRAM_ID = new PublicKey(
    'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
);

export const ESCROW_SPAN = 211;

export function memoInstruction(memo: string, signer?: PublicKey) {
    const keys: { pubkey: PublicKey, isSigner: boolean, isWritable: boolean }[] = [];
    if (signer) {
        keys.push({ pubkey: signer, isSigner: true, isWritable: false })
    }
    return new TransactionInstruction({
        keys: keys,
        data: Buffer.from(memo, 'utf-8'),
        programId: MEMO_PROGRAM_ID,
    });
}

export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
    'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
);
