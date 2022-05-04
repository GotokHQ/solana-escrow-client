import { PublicKey, SYSVAR_RENT_PUBKEY, TransactionInstruction } from '@solana/web3.js';
import * as BufferLayout from 'buffer-layout';
import * as BN from 'bn.js';

export const TOKEN_PROGRAM_ID = new PublicKey(
    'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
);

export const WRAPPED_SOL_MINT = new PublicKey(
    'So11111111111111111111111111111111111111112',
);

export const SOL_MINT = new PublicKey(
    'Ejmc1UB4EsES5oAaRN63SpoxMJidt3ZGBrqrZk49vjTZ',
);

export const DEX_PID = new PublicKey(
    "9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin"
);

export const MEMO_PROGRAM_ID = new PublicKey(
    'Memo1UhkJRfHyvLMcVucJwxXeuD728EqVDDwQDxFMNo',
);

const LAYOUT = BufferLayout.union(BufferLayout.u8('instruction'));
LAYOUT.addVariant(
    0,
    BufferLayout.struct([
        BufferLayout.u8('decimals'),
        BufferLayout.blob(32, 'mintAuthority'),
        BufferLayout.u8('freezeAuthorityOption'),
        BufferLayout.blob(32, 'freezeAuthority'),
    ]),
    'initializeMint',
);
LAYOUT.addVariant(1, BufferLayout.struct([]), 'initializeAccount');
LAYOUT.addVariant(
    3,
    BufferLayout.struct([BufferLayout.nu64('amount')]),
    'transfer',
);
LAYOUT.addVariant(
    7,
    BufferLayout.struct([BufferLayout.nu64('amount')]),
    'mintTo',
);
LAYOUT.addVariant(
    8,
    BufferLayout.struct([BufferLayout.nu64('amount')]),
    'burn',
);
LAYOUT.addVariant(9, BufferLayout.struct([]), 'closeAccount');

const instructionMaxSpan = Math.max(
    ...Object.values(LAYOUT.registry).map((r: any) => r.span),
);

class PublicKeyLayout extends BufferLayout.Blob {
    constructor(property: string) {
        super(32, property);
    }

    decode(b: Buffer, offset?: number) {
        return new PublicKey(super.decode(b, offset) as Buffer);
    }

    encode(src: PublicKey, b: Buffer, offset?: number) {
        return super.encode(src.toBuffer(), b, offset);
    }
}

function publicKeyLayout(property: string) {
    return new PublicKeyLayout(property);
}

export const OWNER_VALIDATION_LAYOUT = BufferLayout.struct([
    publicKeyLayout('account'),
]);

/**
 * Layout for a 64bit unsigned value
 */
const uint64 = (property = "uint64") => {
    return BufferLayout.blob(8, property);
};

export const ACCOUNT_LAYOUT = BufferLayout.struct([
    BufferLayout.blob(32, 'mint'),
    BufferLayout.blob(32, 'owner'),
    BufferLayout.nu64('amount'),
    BufferLayout.blob(93),
]);

export const ESCROW_ACCOUNT_DATA_LAYOUT = BufferLayout.struct([
    BufferLayout.u8("isInitialized"),
    BufferLayout.u8("isSettled"),
    BufferLayout.u8("isCanceled"),
    publicKeyLayout("payerPubkey"),
    publicKeyLayout("payerTokenAccountPubkey"),
    publicKeyLayout("payeeTokenAccountPubkey"),
    publicKeyLayout("payerTempTokenAccountPubkey"),
    publicKeyLayout("authorityPubkey"),
    publicKeyLayout("feeTakerPubkey"),
    uint64('amount'),
    uint64('fee')
]);

export interface EscrowLayout {
    isInitialized: number,
    isSettled: number,
    isCanceled: number,
    payerPubkey: PublicKey,
    payerTokenAccountPubkey: PublicKey,
    payeeTokenAccountPubkey: PublicKey,
    payerTempTokenAccountPubkey: PublicKey,
    authorityPubkey: PublicKey,
    feeTakerPubkey: PublicKey,
    amount: BN,
    fee: BN
}

export const TokenAccountLayout = BufferLayout.struct(
    [
        publicKeyLayout('mint'),
        publicKeyLayout('owner'),
        uint64('amount'),
        BufferLayout.u32('delegateOption'),
        publicKeyLayout('delegate'),
        BufferLayout.u8('state'),
        BufferLayout.u32('isNativeOption'),
        BufferLayout.nu64('isNative'),
        BufferLayout.nu64('delegatedAmount'),
        BufferLayout.u32('closeAuthorityOption'),
        publicKeyLayout('closeAuthority'),
    ],
);

export interface Token {
    /**
 * The address of this account
 */
    address: PublicKey,

    /**
     * The mint associated with this account
     */
    mint: PublicKey,

    /**
     * Owner of this account
     */
    owner: PublicKey,

    /**
     * Amount of tokens this account holds
     */
    amount: BN,

    /**
     * The delegate for this account
     */
    delegate: null | PublicKey,

    /**
     * The amount of tokens the delegate authorized to the delegate
     */
    delegatedAmount: BN,

    /**
     * Is this account initialized
     */
    isInitialized: boolean,

    /**
     * Is this account frozen
     */
    isFrozen: boolean,

    /**
     * Is this a native token account
     */
    isNative: boolean,

    /**
     * If this account is a native token, it must be rent-exempt. This
     * value logs the rent-exempt reserve which must remain in the balance
     * until the account is closed.
     */
    rentExemptReserve: null | BN,

    /**
     * Optional authority to close the account
     */
    closeAuthority: null | PublicKey,
}


const encodeTokenInstructionData = (instruction: any) => {
    const b = Buffer.alloc(instructionMaxSpan);
    const span = LAYOUT.encode(instruction, b);
    return b.slice(0, span);
}

export const createAssociatedTokenAccountIx = (
    fundingAddress: PublicKey,
    walletAddress: PublicKey,
    splTokenMintAddress: PublicKey,
    associatedTokenAddress: PublicKey,
): TransactionInstruction => {
    const systemProgramId = new PublicKey('11111111111111111111111111111111');
    const keys = [
        {
            pubkey: fundingAddress,
            isSigner: true,
            isWritable: true,
        },
        {
            pubkey: associatedTokenAddress,
            isSigner: false,
            isWritable: true,
        },
        {
            pubkey: walletAddress,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: splTokenMintAddress,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: systemProgramId,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: TOKEN_PROGRAM_ID,
            isSigner: false,
            isWritable: false,
        },
        {
            pubkey: SYSVAR_RENT_PUBKEY,
            isSigner: false,
            isWritable: false,
        },
    ];
    const ix = new TransactionInstruction({
        keys,
        programId: ASSOCIATED_TOKEN_PROGRAM_ID,
        data: Buffer.from([]),
    });
    return ix;
}

export function initializeAccount(account: PublicKey, mint: PublicKey, owner: PublicKey) {
    const keys = [
        { pubkey: account, isSigner: false, isWritable: true },
        { pubkey: mint, isSigner: false, isWritable: false },
        { pubkey: owner, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        data: encodeTokenInstructionData({
            initializeAccount: {},
        }),
        programId: TOKEN_PROGRAM_ID,
    });
}

export const transfer = (source: PublicKey, destination: PublicKey, amount: BN, owner: PublicKey) => {
    const keys = [
        { pubkey: source, isSigner: false, isWritable: true },
        { pubkey: destination, isSigner: false, isWritable: true },
        { pubkey: owner, isSigner: true, isWritable: false },
    ];
    return new TransactionInstruction({
        keys,
        data: encodeTokenInstructionData({
            transfer: { amount },
        }),
        programId: TOKEN_PROGRAM_ID,
    });
}

export const OWNER_VALIDATION_PROGRAM_ID = new PublicKey(
    '4MNPdKu9wFMvEeZBMt3Eipfs5ovVWTJb31pEXDJAAxX5',
);

export function encodeOwnerValidationInstruction(instruction: any) {
    const b = Buffer.alloc(OWNER_VALIDATION_LAYOUT.span);
    const span = OWNER_VALIDATION_LAYOUT.encode(instruction, b);
    return b.slice(0, span);
}

export function assertOwner(account: PublicKey, owner: PublicKey) {
    const keys = [{ pubkey: account, isSigner: false, isWritable: false }];
    return new TransactionInstruction({
        keys,
        data: encodeOwnerValidationInstruction({ account: owner }),
        programId: OWNER_VALIDATION_PROGRAM_ID,
    });
}

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
