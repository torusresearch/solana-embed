import { Transaction } from "@solana/web3.js";
import TorusCommunicationProvider from "./communicationProvider";
import TorusInPageProvider from "./inPageProvider";
import { LOGIN_PROVIDER_TYPE, NetworkInterface, PAYMENT_PROVIDER_TYPE, PaymentParams, TorusCtorArgs, TorusParams, UserInfo, WALLET_PATH } from "./interfaces";
declare class Torus {
    private torusUrl;
    private torusIframe;
    private styleLink;
    isInitialized: boolean;
    torusAlert: HTMLDivElement;
    modalZIndex: number;
    alertZIndex: number;
    private torusAlertContainer;
    requestedLoginProvider?: LOGIN_PROVIDER_TYPE;
    currentLoginProvider?: LOGIN_PROVIDER_TYPE;
    provider: TorusInPageProvider;
    communicationProvider: TorusCommunicationProvider;
    dappStorageKey: string;
    constructor({ modalZIndex }?: TorusCtorArgs);
    init({ buildEnv, enableLogging, network, showTorusButton, useLocalStorage, buttonPosition, apiKey, }?: TorusParams): Promise<void>;
    private handleDappStorageKey;
    login(params?: {
        loginProvider?: LOGIN_PROVIDER_TYPE;
    }): Promise<string[]>;
    logout(): Promise<void>;
    cleanUp(): Promise<void>;
    clearInit(): void;
    hideTorusButton(): void;
    showTorusButton(): void;
    sendTransaction(transaction: Transaction): Promise<Transaction>;
    signTransaction(transaction: Transaction): Promise<Transaction>;
    signAllTransaction(transaction: Transaction): Promise<Transaction>;
    connect(transaction: Transaction): Promise<Transaction>;
    /** @ignore */
    /** @ignore */
    private _setupWeb3;
    setProvider(params: NetworkInterface): Promise<void>;
    showWallet(path: WALLET_PATH, params?: Record<string, string>): Promise<void>;
    getUserInfo(): Promise<UserInfo>;
    initiateTopup(provider: PAYMENT_PROVIDER_TYPE, params: PaymentParams): Promise<boolean>;
}
export default Torus;
