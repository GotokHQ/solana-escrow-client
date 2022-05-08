export interface InitializePaymentOutput {
    message: string;
    signatures: Sig[];
    escrowAddress: string;
}

export interface Sig {
    pubKey: string;
    signature?: string | null;
}

export interface InitializePaymentInput {
    payerWalletAddress: string;
    payeeWalletAddress: string;
    tokenMintAddress: string;
    amount: string;
    fee?: string;
    memo?: string;
}
export interface SettlePaymentInput {
    walletAddress: string;
    amount: string;
    escrowAddress: string
    memo?: string;
}

export interface SettleAndTransferInput {
    walletAddress: string;
    transferTokenMintAddress: string;
    amountToSettle: string;
    amountToTransfer: string;
    escrowAddress: string
    memo?: string;
    fee?: string;
}

export interface CancelPaymentInput {
    escrowAddress: string;
    memo?: string;
}

export interface CancelPaymentOutput {
    signature: string,
}

export interface ClosePaymentInput {
    escrowAddress: string
    memo?: string;
}

export interface SettlePaymentOutput {
    signature: string,
    destinationWalletAddress: string
}