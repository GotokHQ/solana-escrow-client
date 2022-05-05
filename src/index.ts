import {
  PublicKey,
  Transaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
  SystemProgram,
  Connection,
  Keypair,
} from '@solana/web3.js';
import * as spl from '@solana/spl-token';
import BN from 'bn.js';
import {
  InitializePaymentInput,
  SettlePaymentInput,
  InitializePaymentOutput,
  SettlePaymentOutput,
  ClosePaymentInput,
  CancelPaymentInput,
  CancelPaymentOutput,
  SettleAndTransferInput,
} from './types';
import {
  memoInstruction,
  WRAPPED_SOL_MINT,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  ESCROW_SPAN,
} from './instructions';
import { EscrowProgram } from './EscrowProgram';
import { Escrow } from './accounts/escrow';

export const FAILED_TO_FIND_ACCOUNT = 'Failed to find account';
export const INVALID_ACCOUNT_OWNER = 'Invalid account owner';
export const INVALID_AUTHORITY = 'Invalid authority';
export const INVALID_PAYER_ADDRESS = 'Invalid payer address';
export const ACCOUNT_ALREADY_CANCELED = 'Account already canceled';
export const ACCOUNT_ALREADY_SETTLED = 'Account already settled';
export const INVALID_SIGNATURE = 'Invalid signature';
export const AMOUNT_MISMATCH = 'Amount mismatch';
export const FEE_MISMATCH = 'Fee mismatch';
export const TRANSACTION_SEND_ERROR = 'Transaction send error';

export * from './EscrowProgram';
export * from './accounts';

export interface EscrowAccount {
  isInitialized: boolean;
  isSettled: boolean;
  payerPubkey: PublicKey;
  payeePubkey: PublicKey;
  payerTempTokenAccountPubkey: PublicKey;
  authorityPubkey: PublicKey;
  feeTakerPubkey: PublicKey;
  amount: BN;
  fee: BN;
}

export class EscrowClient {
  private feePayer: Keypair;
  private authority: Keypair;
  private wallet: Keypair;
  private feeTaker: PublicKey;
  private escrowProgram: PublicKey;
  private connection: Connection;

  constructor(
    feePayer: Keypair,
    authority: Keypair,
    feeTaker: PublicKey,
    connection: Connection,
    escrowProgram: PublicKey,
    wallet: Keypair,
  ) {
    this.feePayer = feePayer;
    this.authority = authority;
    this.feeTaker = feeTaker;
    this.connection = connection;
    this.escrowProgram = escrowProgram;
    this.wallet = wallet;
  }

  cancelEscrowPayment = async (
    input: CancelPaymentInput,
  ): Promise<CancelPaymentOutput> => {
    const escrowAddress = new PublicKey(input.escrowAddress);
    const escrow = await Escrow.load(this.connection, escrowAddress);
    if (!escrow.info) {
      throw new Error(FAILED_TO_FIND_ACCOUNT);
    }
    if (!escrow.info.owner.equals(this.escrowProgram)) {
      throw new Error(INVALID_ACCOUNT_OWNER);
    }

    if (
      !this.authority.publicKey.equals(
        new PublicKey(escrow.data.authorityPubkey),
      )
    ) {
      throw new Error(INVALID_AUTHORITY);
    }
    if (escrow.data?.isCanceled) {
      throw new Error(ACCOUNT_ALREADY_CANCELED);
    }
    if (escrow.data?.isSettled) {
      throw new Error(ACCOUNT_ALREADY_SETTLED);
    }
    const PDA = await EscrowProgram.findProgramAuthority();
    const exchangeInstruction = new TransactionInstruction({
      programId: this.escrowProgram,
      data: Buffer.from(Uint8Array.of(2)),
      keys: [
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: escrowAddress, isSigner: false, isWritable: true },
        {
          pubkey: new PublicKey(escrow.data.payerTokenAccountPubkey),
          isSigner: false,
          isWritable: true,
        },
        { pubkey: this.feePayer.publicKey, isSigner: false, isWritable: true },
        {
          pubkey: new PublicKey(escrow.data.payerTempTokenAccountPubkey),
          isSigner: false,
          isWritable: true,
        },
        { pubkey: spl.NATIVE_MINT, isSigner: false, isWritable: false },
        { pubkey: PDA[0], isSigner: false, isWritable: false },
      ],
    });
    const transaction = new Transaction().add(exchangeInstruction);
    if (input.memo) {
      transaction.add(memoInstruction(input.memo, this.authority.publicKey));
    }
    transaction.recentBlockhash = (
      await this.connection.getRecentBlockhash()
    ).blockhash;
    transaction.feePayer = this.feePayer.publicKey;
    transaction.sign(this.feePayer, this.authority);
    try {
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
      );
      return { signature };
    } catch (error) {
      const newError: any = new Error(TRANSACTION_SEND_ERROR);
      throw newError;
    }
  };

  closeEscrowPayment = async (input: ClosePaymentInput): Promise<string> => {
    const exchangeInstruction = new TransactionInstruction({
      programId: this.escrowProgram,
      data: Buffer.from(Uint8Array.of(3)),
      keys: [
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
        {
          pubkey: new PublicKey(input.escrowAddress),
          isSigner: false,
          isWritable: true,
        },
        { pubkey: this.feePayer.publicKey, isSigner: false, isWritable: true },
      ],
    });
    const transaction = new Transaction().add(exchangeInstruction);
    if (input.memo) {
      transaction.add(memoInstruction(input.memo, this.authority.publicKey));
    }
    transaction.recentBlockhash = (
      await this.connection.getRecentBlockhash()
    ).blockhash;
    transaction.feePayer = this.feePayer.publicKey;
    transaction.sign(this.feePayer, this.authority);
    return await this.connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
    });
  };

  getTokenAccountInfo = async (
    walletAddress: PublicKey,
  ): Promise<spl.AccountInfo> => {
    const info = await this.connection.getAccountInfo(walletAddress);
    if (!info) {
      throw new Error(FAILED_TO_FIND_ACCOUNT);
    }
    if (!info.owner.equals(spl.TOKEN_PROGRAM_ID)) {
      throw new Error(INVALID_ACCOUNT_OWNER);
    }
    if (info.data.length !== spl.AccountLayout.span) {
      throw new Error(`Invalid account size`);
    }

    const data = Buffer.from(info.data);
    const accountInfo = spl.AccountLayout.decode(data) as spl.AccountInfo;
    return accountInfo;
  };

  initializeEscrowPayment = async (
    input: InitializePaymentInput,
  ): Promise<InitializePaymentOutput> => {
    const walletAddress = new PublicKey(input.walletAddress);
    const tokenMintAddress = new PublicKey(input.tokenMintAddress);
    const tokenAccountAddress = new PublicKey(input.tokenAccountAddress);
    const tempTokenAccount = new Keypair();
    let transferXTokensToTempAccIx;
    const createTempTokenAccountIx = SystemProgram.createAccount({
      programId: spl.TOKEN_PROGRAM_ID,
      space: spl.AccountLayout.span,
      lamports: await spl.Token.getMinBalanceRentForExemptAccount(
        this.connection,
      ),
      fromPubkey: this.feePayer.publicKey,
      newAccountPubkey: tempTokenAccount.publicKey,
    });
    const initTempAccountIx = spl.Token.createInitAccountInstruction(
      spl.TOKEN_PROGRAM_ID,
      tokenMintAddress,
      tempTokenAccount.publicKey,
      walletAddress,
    );

    if (tokenMintAddress.equals(WRAPPED_SOL_MINT)) {
      transferXTokensToTempAccIx = SystemProgram.transfer({
        fromPubkey: tokenAccountAddress,
        toPubkey: tempTokenAccount.publicKey,
        lamports: Number(input.amount),
      });
    } else {
      transferXTokensToTempAccIx = spl.Token.createTransferInstruction(
        spl.TOKEN_PROGRAM_ID,
        tokenAccountAddress,
        tempTokenAccount.publicKey,
        walletAddress,
        [],
        new BN(input.amount),
      );
    }
    const escrowAccount = new Keypair();

    const createEscrowAccountIx = SystemProgram.createAccount({
      space: ESCROW_SPAN,
      lamports: await this.connection.getMinimumBalanceForRentExemption(
        ESCROW_SPAN,
        'singleGossip',
      ),
      fromPubkey: this.feePayer.publicKey,
      newAccountPubkey: escrowAccount.publicKey,
      programId: this.escrowProgram,
    });
    const initEscrowIx = new TransactionInstruction({
      programId: this.escrowProgram,
      keys: [
        { pubkey: walletAddress, isSigner: true, isWritable: false },
        {
          pubkey: tempTokenAccount.publicKey,
          isSigner: false,
          isWritable: true,
        },
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: escrowAccount.publicKey, isSigner: false, isWritable: true },
        { pubkey: tokenAccountAddress, isSigner: false, isWritable: false },
        { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
        { pubkey: spl.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      ],
      data: Buffer.from(
        Uint8Array.of(0, ...new BN(input.amount).toArray('le', 8)),
      ),
    });
    const transaction = new Transaction().add(createTempTokenAccountIx);
    if (tokenMintAddress.equals(WRAPPED_SOL_MINT)) {
      transaction.add(
        transferXTokensToTempAccIx,
        initTempAccountIx,
        createEscrowAccountIx,
        initEscrowIx,
      );
    } else {
      transaction.add(
        initTempAccountIx,
        transferXTokensToTempAccIx,
        createEscrowAccountIx,
        initEscrowIx,
      );
    }
    if (input.memo) {
      transaction.add(memoInstruction(input.memo, this.authority.publicKey));
    }
    transaction.recentBlockhash = (
      await this.connection.getRecentBlockhash()
    ).blockhash;
    transaction.feePayer = this.feePayer.publicKey;
    transaction.partialSign(this.feePayer, escrowAccount, tempTokenAccount);
    const signatures = transaction.signatures.map((sig) => ({
      signature: sig.signature && sig.signature.toString('base64'),
      pubKey: sig.publicKey.toBase58(),
    }));
    return {
      message: transaction.serializeMessage().toString('base64'),
      signatures: signatures,
      escrowAddress: escrowAccount.publicKey.toBase58(),
    };
  };

  sendEscrowPayment = async (payload: string): Promise<string> => {
    const buffer = Buffer.from(payload, 'base64');
    const txIx = Transaction.from(buffer);
    if (!txIx.verifySignatures()) {
      throw Error(INVALID_SIGNATURE);
    }
    return this.connection.sendRawTransaction(buffer, {
      skipPreflight: false,
    });
  };

  settleEscrowPayment = async (
    input: SettlePaymentInput,
  ): Promise<SettlePaymentOutput> => {
    const walletAddress = new PublicKey(input.walletAddress);
    const escrowAddress = new PublicKey(input.escrowAddress);
    const info = await this.connection.getAccountInfo(escrowAddress);
    if (!info) {
      throw new Error(FAILED_TO_FIND_ACCOUNT);
    }
    if (!info.owner.equals(this.escrowProgram)) {
      throw new Error(INVALID_ACCOUNT_OWNER);
    }
    const transaction = new Transaction();
    const { transactionInstruction, takerAccount } =
      await this.settlementInstruction(
        walletAddress,
        escrowAddress,
        new BN(input.amount),
        new BN(input.fee || 0),
      );
    transaction.add(transactionInstruction);
    if (input.memo) {
      transaction.add(memoInstruction(input.memo, this.authority.publicKey));
    }
    transaction.recentBlockhash = (
      await this.connection.getRecentBlockhash()
    ).blockhash;
    transaction.feePayer = this.feePayer.publicKey;
    transaction.sign(this.feePayer, this.authority);
    try {
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false },
      );
      return { signature, destinationWalletAddress: takerAccount.toBase58() };
    } catch (error) {
      const newError: any = new Error(TRANSACTION_SEND_ERROR);
      newError.destinationWalletAddress = takerAccount;
      throw newError;
    }
  };

  settleEscrowPaymentAndTransfer = async (
    settlementInput: SettleAndTransferInput,
  ): Promise<SettlePaymentOutput> => {
    const walletAddress = new PublicKey(settlementInput.walletAddress);
    const escrowAddress = new PublicKey(settlementInput.escrowAddress);
    const info = await this.connection.getAccountInfo(escrowAddress);
    if (!info) {
      throw new Error(FAILED_TO_FIND_ACCOUNT);
    }
    if (!info.owner.equals(this.escrowProgram)) {
      throw new Error(INVALID_ACCOUNT_OWNER);
    }
    const transaction = new Transaction();
    const hotWalletAddress = this.wallet.publicKey;
    const { transactionInstruction, takerAccount } =
      await this.settlementInstruction(
        this.wallet.publicKey,
        escrowAddress,
        new BN(settlementInput.amountToSettle),
        new BN(settlementInput.fee || 0),
      );
    transaction.add(transactionInstruction);
    const sourcePublicKey = await _findAssociatedTokenAddress(
      hotWalletAddress,
      new PublicKey(settlementInput.transferTokenMintAddress),
    );
    const destinationPublicKey = await _findAssociatedTokenAddress(
      walletAddress,
      new PublicKey(settlementInput.transferTokenMintAddress),
    );
    const transferBetweenAccountsTxn = spl.Token.createTransferInstruction(
      spl.TOKEN_PROGRAM_ID,
      sourcePublicKey,
      destinationPublicKey,
      hotWalletAddress,
      [],
      new BN(settlementInput.amountToTransfer),
    );
    transaction.add(transferBetweenAccountsTxn);
    if (settlementInput.memo) {
      transaction.add(
        memoInstruction(settlementInput.memo, this.authority.publicKey),
      );
    }
    transaction.recentBlockhash = (
      await this.connection.getRecentBlockhash()
    ).blockhash;
    transaction.feePayer = this.feePayer.publicKey;
    transaction.sign(this.feePayer, this.authority, this.wallet);
    try {
      const signature = await this.connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false },
      );
      return { signature, destinationWalletAddress: takerAccount.toBase58() };
    } catch (error) {
      const newError: any = new Error(TRANSACTION_SEND_ERROR);
      newError.destinationWalletAddress = takerAccount;
      throw newError;
    }
  };

  settlementInstruction = async (
    walletAddress: PublicKey,
    escrowAddress: PublicKey,
    amount: BN,
    settlementFee: BN = new BN(0),
  ): Promise<{
    transactionInstruction: TransactionInstruction;
    takerAccount: PublicKey;
  }> => {
    const escrow = await Escrow.load(this.connection, escrowAddress);
    if (!escrow || !escrow.info) {
      throw new Error(FAILED_TO_FIND_ACCOUNT);
    }
    if (!escrow.info.owner.equals(this.escrowProgram)) {
      throw new Error(INVALID_ACCOUNT_OWNER);
    }

    const expectedAmount = amount;
    const fee = settlementFee || new BN(0);

    if (!expectedAmount.eq(escrow.data.amount)) {
      throw new Error(AMOUNT_MISMATCH);
    }
    const authority = new PublicKey(escrow.data.authorityPubkey);
    if (!this.authority.publicKey.equals(authority)) {
      throw new Error(INVALID_AUTHORITY);
    }
    const payerTempToken = new PublicKey(
      escrow.data.payerTempTokenAccountPubkey,
    );
    const tokenInfo = await this.getTokenAccountInfo(payerTempToken);
    const splToken = new spl.Token(
      this.connection,
      tokenInfo.address,
      spl.TOKEN_PROGRAM_ID,
      this.feePayer,
    );

    let takerAccount = walletAddress;
    let feeTakerAccount = this.feeTaker;

    if (!tokenInfo.isNative) {
      takerAccount = (
        await splToken.getOrCreateAssociatedAccountInfo(walletAddress)
      ).address;
      feeTakerAccount = (
        await splToken.getOrCreateAssociatedAccountInfo(this.feeTaker)
      ).address;
    }
    const PDA = await PublicKey.findProgramAddress(
      [Buffer.from('escrow')],
      this.escrowProgram,
    );
    const exchangeInstruction = new TransactionInstruction({
      programId: this.escrowProgram,
      data: Buffer.from(Uint8Array.of(1, ...fee.toArray('le', 8))),
      keys: [
        { pubkey: this.authority.publicKey, isSigner: true, isWritable: false },
        { pubkey: takerAccount, isSigner: false, isWritable: true },
        { pubkey: feeTakerAccount, isSigner: false, isWritable: true },
        {
          pubkey: payerTempToken,
          isSigner: false,
          isWritable: true,
        },
        { pubkey: escrowAddress, isSigner: false, isWritable: true },
        { pubkey: this.feePayer.publicKey, isSigner: false, isWritable: true },
        { pubkey: spl.TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        { pubkey: PDA[0], isSigner: false, isWritable: false },
      ],
    });
    return { takerAccount, transactionInstruction: exchangeInstruction };
  };

  signTransaction = (transaction: Transaction): Buffer => {
    transaction.feePayer = this.feePayer.publicKey;
    transaction.partialSign(this.feePayer);
    return transaction.serialize();
  };
}

const _findAssociatedTokenAddress = async (
  walletAddress: PublicKey,
  tokenMintAddress: PublicKey,
) => {
  return (
    await PublicKey.findProgramAddress(
      [
        walletAddress.toBuffer(),
        spl.TOKEN_PROGRAM_ID.toBuffer(),
        tokenMintAddress.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )
  )[0];
};
