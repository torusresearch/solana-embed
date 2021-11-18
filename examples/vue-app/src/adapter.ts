import {
    BaseMessageSignerWalletAdapter,
    EventEmitter,
    pollUntilReady,
    WalletAccountError,
    WalletConnectionError,
    WalletDisconnectedError,
    WalletDisconnectionError,
    WalletError,
    WalletNotConnectedError,
    WalletNotFoundError,
    WalletNotInstalledError,
    WalletPublicKeyError,
    WalletSignTransactionError,
    WalletWindowClosedError,
} from '@solana/wallet-adapter-base';
import { PublicKey, Transaction, Message, Cluster } from '@solana/web3.js';
import Torus, { TorusParams } from '@toruslabs/solana-embed';

export type { TorusParams } from '@toruslabs/solana-embed';

interface TorusWindow extends Window {
    torus: Torus;
}

declare const window: TorusWindow;

export class TorusWalletAdapter extends BaseMessageSignerWalletAdapter {
    private _connecting: boolean;
    private _torus: Torus | null;
    private _publicKey: PublicKey | null;
    private _config: TorusParams;

    constructor(config: TorusParams) {
        super();
        this._connecting = false;
        this._torus = null;
        this._publicKey = null;
        this._config = config;
        // if (!this.ready) pollUntilReady(this, config.pollInterval || 1000, config.pollCount || 3);
    }

    get publicKey(): PublicKey | null {
        return this._publicKey;
    }

    get ready(): boolean {
        return typeof window !== 'undefined' && !!window.torus;
    }

    get connecting(): boolean {
        return this._connecting;
    }

    get connected(): boolean {
        return !!this._torus?.isLoggedIn;
    }

    async connect(): Promise<void> {
        try {
            if (this.connected || this.connecting) return;
            this._connecting = true;
            let torus = typeof window !== 'undefined' && window.torus;

            // check if torus is init, torus.init({config})
            if (!torus) torus = new Torus();
            this._torus = torus;
            if (!this._torus.isInitialized) await this._torus.init(this._config);

            let login_result;
            if (!torus.isLoggedIn) {
                try {
                    login_result = await torus?.login();
                } catch (error: any) {
                    if (error instanceof WalletError) throw error;
                    throw new WalletConnectionError(error?.message, error);
                }
            }
            if (!login_result) throw new WalletConnectionError();

            let publicKey: PublicKey;
            try {
                publicKey = new PublicKey(login_result[0]);
            } catch (error: any) {
                throw new WalletPublicKeyError(error?.message, error);
            }
            // torus.on('disconnect', this._disconnected);
            // this._torus = torus;
            this._publicKey = publicKey;

            this.emit('connect');
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        } finally {
            this._connecting = false;
        }
    }

    async disconnect(): Promise<void> {
        // torus.logout
        const wallet = this._torus;
        if (wallet) {
            this._torus = null;
            this._publicKey = null;
            try {
                if (wallet.isLoggedIn) await wallet.cleanUp();
            } catch (error: any) {
                this.emit('error', new WalletDisconnectionError(error?.message, error));
            }
        }
        this.emit('disconnect');
    }

    async signTransaction(transaction: Transaction): Promise<Transaction> {
        try {
            const wallet = this._torus;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                return (await wallet.signTransaction(transaction)) || transaction;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signAllTransactions(transactions: Transaction[]): Promise<Transaction[]> {
        try {
            const wallet = this._torus;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                return (await wallet.signAllTransactions(transactions)) || transactions;
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    async signMessage(message: Uint8Array): Promise<Uint8Array> {
        try {
            const wallet = this._torus;
            if (!wallet) throw new WalletNotConnectedError();

            try {
                const signature = await wallet.signMessage(message);
                return Uint8Array.from(signature);
            } catch (error: any) {
                throw new WalletSignTransactionError(error?.message, error);
            }
        } catch (error: any) {
            this.emit('error', error);
            throw error;
        }
    }

    private _disconnected = () => {
        this.disconnect();
    };
}
