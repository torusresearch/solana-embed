import type { Transaction, VersionedTransaction } from "@solana/web3.js";
import Web3Auth, { CtorArgs, LoginWithSessionIdParams, SOLANA_METHOD_TYPES, WsEmbedParams } from "@web3auth/ws-embed";

export type TransactionOrVersionedTransaction = Transaction | VersionedTransaction;

export interface RequestArguments<T> {
  method: string;
  params?: T;
}

class Torus extends Web3Auth {
  constructor(params: Omit<CtorArgs, "web3AuthClientId" | "web3AuthNetwork"> = {}) {
    super({
      ...params,
      web3AuthClientId: process.env.WEB3AUTH_CLIENT_ID,
      web3AuthNetwork: "mainnet",
    });
  }

  async init(params: Partial<Omit<WsEmbedParams, "walletUrls" | "confirmationStrategy" | "accountAbstractionConfig" | "enableKeyExport">> = {}) {
    await super.init({
      chainId: "0x65",
      chains: [],
      confirmationStrategy: "popup",
      ...params,
    });
  }

  async loginWithSessionId(_: LoginWithSessionIdParams): Promise<boolean> {
    throw new Error("Not implemented");
  }

  // Solana specific API

  public async requestAccounts(): Promise<string[]> {
    const accounts = await this.provider.request<never, string[]>({
      method: SOLANA_METHOD_TYPES.SOLANA_REQUEST_ACCOUNTS,
    });
    return accounts;
  }

  public async getAccounts(): Promise<string[]> {
    const accounts = await this.provider.request<never, string[]>({
      method: SOLANA_METHOD_TYPES.GET_ACCOUNTS,
    });
    return accounts;
  }

  public async signAndSendTransaction<T extends TransactionOrVersionedTransaction>(transaction: T): Promise<string> {
    const signature = await this.provider.request<{ message: string }, string>({
      method: SOLANA_METHOD_TYPES.SEND_TRANSACTION,
      params: { message: this.serializeTransaction(transaction) },
    });
    return signature;
  }

  /**
   * Signs a transaction and returns the signature
   * @param transaction - The transaction to sign
   * @returns The signature of the transaction encoded in base58
   */
  public async signTransaction<T extends TransactionOrVersionedTransaction>(transaction: T): Promise<string> {
    const signature = await this.provider.request<{ message: string }, string>({
      method: SOLANA_METHOD_TYPES.SIGN_TRANSACTION,
      params: { message: this.serializeTransaction(transaction) },
    });
    return signature;
  }

  /**
   * Signs multiple transactions and returns the serialized transactions
   * @param transactions - The transactions to sign
   * @returns The serialized transactions encoded in base64
   */
  public async signAllTransactions<T extends TransactionOrVersionedTransaction>(transactions: T[]): Promise<string[]> {
    const serializedTransactions = transactions.map((tx) => this.serializeTransaction(tx));
    const signedTransactions = await this.provider.request<{ message: string[] }, string[]>({
      method: SOLANA_METHOD_TYPES.SIGN_ALL_TRANSACTIONS,
      params: { message: serializedTransactions },
    });
    return signedTransactions;
  }

  /**
   * Signs a message and returns the signature
   * @param message - The message to sign
   * @returns The signature of the message encoded in base58
   */
  public async signMessage(message: string, pubKey: string): Promise<string> {
    const response = await this.provider.request<{ data: string; from: string }, string>({
      method: SOLANA_METHOD_TYPES.SIGN_MESSAGE,
      params: { data: message, from: pubKey },
    });
    return response;
  }

  public async request<T, U>(args: RequestArguments<T>): Promise<U> {
    const result = await this.provider.request<T, U>(args);
    return result as U;
  }

  private serializeTransaction(transaction: TransactionOrVersionedTransaction): string {
    return Buffer.from(transaction.serialize({ requireAllSignatures: false })).toString("base64");
  }
}

export default Torus;
