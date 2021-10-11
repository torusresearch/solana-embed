import {
  BaseSignerWalletAdapter,
  //   WalletAccountError,
  //   WalletConnectionError,
  //   WalletDisconnectedError,
  //   WalletDisconnectionError,
  //   WalletError,
  //   WalletNotConnectedError,
  //   WalletPublicKeyError,
  //   WalletSignTransactionError,
  //   WalletWindowClosedError,
} from "@solana/wallet-adapter-base";
import { PublicKey, Transaction } from "@solana/web3.js";
import bs58 from "bs58";

import Torus from "./embed";

type InjectedProvider = { sendAsync: (params: unknown) => Promise<unknown> };

// function isString(a: unknown): a is string {
//   return typeof a === "string";
// }

function isObject(a: unknown): a is Record<string, unknown> {
  return typeof a === "object" && a !== null;
}

function isInjectedProvider(a: unknown): a is InjectedProvider {
  return isObject(a) && "sendAsync" in a && typeof a.sendAsync === "function";
}

export default class Wallet extends BaseSignerWalletAdapter {
  private _providerUrl: URL | undefined;

  private _injectedProvider?: InjectedProvider;

  private _publicKey: PublicKey | null = null;

  private _connecting: boolean;

  private _popup: Window | null = null;

  private _handlerAdded = false;

  private _nextRequestId = 1;

  private _autoApprove = false;

  private _torus: Torus;

  constructor(torus: Torus, private _network: string) {
    super();

    this._connecting = false;
    this._torus = torus;

    if (!this._torus.isInitialized) throw new Error("Call init() first");

    if (isInjectedProvider(torus.provider)) {
      this._injectedProvider = torus.provider;
    } else {
      throw new Error("provider parameter must be an injected provider or a URL string.");
    }
  }

  get publicKey(): PublicKey | null {
    return this._publicKey;
  }

  get ready(): boolean {
    return typeof window !== "undefined";
  }

  get connecting(): boolean {
    return this._connecting;
  }

  get connected(): boolean {
    return !!this._publicKey;
  }

  get autoApprove(): boolean {
    return this._autoApprove;
  }

  handleMessage = (
    e: MessageEvent<{
      id: number;
      method: string;
      params: {
        autoApprove: boolean;
        publicKey: string;
      };
      result?: string;
      error?: string;
    }>
  ): void => {
    if ((this._injectedProvider && e.source === window) || (e.origin === this._providerUrl?.origin && e.source === this._popup)) {
      if (e.data.method === "connected") {
        const newPublicKey = new PublicKey(e.data.params.publicKey);
        if (!this._publicKey || !this._publicKey.equals(newPublicKey)) {
          if (this._publicKey && !this._publicKey.equals(newPublicKey)) {
            this.handleDisconnect();
          }
          this._publicKey = newPublicKey;
          this._autoApprove = !!e.data.params.autoApprove;
          //   TO FIX
          //   this.emit("connect", this._publicKey);
        }
      } else if (e.data.method === "disconnected") {
        this.handleDisconnect();
      } else if (e.data.result || e.data.error) {
        // const promises = this._responsePromises.get(e.data.id);
        // if (promises) {
        //   const [resolve, reject] = promises;
        //   if (e.data.result) {
        //     resolve(e.data.result);
        //   } else {
        //     reject(new Error(e.data.error));
        //   }
        // }
      }
    }
  };

  private handleConnect() {
    if (!this._handlerAdded) {
      this._handlerAdded = true;
      window.addEventListener("message", this.handleMessage);
      window.addEventListener("beforeunload", this._beforeUnload);
    }
    if (this._injectedProvider) {
      // call connect
    } else {
      // torus login pop up
      // openlogin
      // torus return provider
      //   this._torus.login();
    }
  }

  private handleDisconnect() {
    // torus logout ?
    if (this._handlerAdded) {
      this._handlerAdded = false;
      window.removeEventListener("message", this.handleMessage);
      window.removeEventListener("beforeunload", this._beforeUnload);
    }
    if (this._publicKey) {
      this._publicKey = null;
      this.emit("disconnect");
    }
  }

  private async sendRequest(method: string, params: Record<string, unknown>) {
    if (method !== "connect" && !this.connected) {
      throw new Error("Wallet not connected");
    }
    const requestId = this._nextRequestId;
    ++this._nextRequestId;
    // return new Promise((resolve, reject) => {
    //   this._responsePromises.set(requestId, [resolve, reject]);

    if (this._injectedProvider) {
      const result = await this._injectedProvider.sendAsync({
        jsonrpc: "2.0",
        id: requestId,
        method,
        params: {
          ...params,
        },
      });
      return result;
    }
    // throw error ?
    throw new Error("No Provider");

    // });
  }

  async connect(): Promise<void> {
    if (this._popup) {
      this._popup.close();
    }
    await this.handleConnect();
  }

  async disconnect(): Promise<void> {
    if (this._injectedProvider) {
      await this.sendRequest("disconnect", {});
    }
    if (this._popup) {
      this._popup.close();
    }
    this.handleDisconnect();
  }

  private _beforeUnload = (): void => {
    this.disconnect();
  };

  async sign(
    data: Uint8Array,
    display: unknown
  ): Promise<{
    signature: Buffer;
    publicKey: PublicKey;
  }> {
    if (!(data instanceof Uint8Array)) {
      throw new Error("Data must be an instance of Uint8Array");
    }

    const response = (await this.sendRequest("sign", {
      data,
      display,
    })) as { publicKey: string; signature: string };
    const signature = bs58.decode(response.signature);
    const publicKey = new PublicKey(response.publicKey);
    return {
      signature,
      publicKey,
    };
  }

  async signTransaction(transaction: Transaction): Promise<Transaction> {
    const response = (await this.sendRequest("signTransaction", {
      //   message: bs58.encode(transaction.serializeMessage()),
      transaction,
    })) as { publicKey: string; signature: string };
    const signature = bs58.decode(response.signature);
    const publicKey = new PublicKey(response.publicKey);
    transaction.addSignature(publicKey, signature);
    return transaction;
  }

  async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
    const response = (await this.sendRequest("signAllTransactions", {
      //   messages: transactions.map((tx) => bs58.encode(tx.serializeMessage())),
      transactions,
    })) as { publicKey: string; signatures: string[] };
    const signatures = response.signatures.map((s) => bs58.decode(s));
    const publicKey = new PublicKey(response.publicKey);

    return transactions.map((tx, idx) => {
      tx.addSignature(publicKey, signatures[idx]);
      return tx;
    });
  }
}
