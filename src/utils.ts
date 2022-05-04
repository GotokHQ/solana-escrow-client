import { ConfirmedTransaction, Connection } from "@solana/web3.js";

export async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  
export const waitForSignatureConfirmation = async (
    signature: string,
    connection: Connection
  ): Promise<ConfirmedTransaction | null> => {
    try {
      let retries = 10;
      let confirmedTransaction = await connection.getConfirmedTransaction(
        signature
      );
      if (confirmedTransaction) return confirmedTransaction;
      for (;;) {
        await sleep(5000);
        confirmedTransaction = await connection.getConfirmedTransaction(
          signature
        );
        if (confirmedTransaction) return confirmedTransaction;
        if (--retries <= 0) {
          break;
        }
        console.log("confirmation retry " + retries);
      }
      return confirmedTransaction;
    } catch (error) {
      console.log(`error: ${error}`);
      return null;
    }
  };
  