/// <reference types="node" />
import { BaseSignerWalletAdapter } from "@solana/wallet-adapter-base";
import { PublicKey, Transaction } from "@solana/web3.js";
import Torus from "./embed";
export default class Wallet extends BaseSignerWalletAdapter {
    private _network;
    private _providerUrl;
    private _injectedProvider?;
    private _publicKey;
    private _connecting;
    private _popup;
    private _handlerAdded;
    private _nextRequestId;
    private _autoApprove;
    private _torus;
    constructor(torus: Torus, _network: string);
    get publicKey(): PublicKey | null;
    get ready(): boolean;
    get connecting(): boolean;
    get connected(): boolean;
    get autoApprove(): boolean;
    handleMessage: (e: MessageEvent<{
        id: number;
        method: string;
        params: {
            autoApprove: boolean;
            publicKey: string;
        };
        result?: string;
        error?: string;
    }>) => void;
    private handleConnect;
    private handleDisconnect;
    private sendRequest;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    private _beforeUnload;
    sign(data: Uint8Array, display: unknown): Promise<{
        signature: Buffer;
        publicKey: PublicKey;
    }>;
    signTransaction(transaction: Transaction): Promise<Transaction>;
    signAllTransactions(transactions: Transaction[]): Promise<Transaction[]>;
}
