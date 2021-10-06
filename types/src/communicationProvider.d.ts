import type { Duplex } from "readable-stream";
import BaseProvider from "./baseProvider";
import { CommunicationProviderState, EMBED_TRANSLATION_ITEM, ProviderOptions, UnValidatedJsonRpcRequest } from "./interfaces";
import PopupHandler from "./PopupHandler";
/**
 * @param {Object} connectionStream - A Node.js duplex stream
 * @param {Object} opts - An options bag
 * @param {number} opts.maxEventListeners - The maximum number of event listeners
 * @param {boolean} opts.shouldSendMetadata - Whether the provider should send page metadata
 */
declare class TorusCommunicationProvider extends BaseProvider<CommunicationProviderState> {
    protected _state: CommunicationProviderState;
    shouldSendMetadata: boolean;
    embedTranslations: EMBED_TRANSLATION_ITEM;
    torusUrl: string;
    dappStorageKey: string;
    windowRefs: Record<string, PopupHandler>;
    private torusAlertContainer;
    private torusIframe;
    protected static _defaultState: CommunicationProviderState;
    tryWindowHandle: (payload: UnValidatedJsonRpcRequest | UnValidatedJsonRpcRequest[], cb: (...args: any[]) => void) => void;
    constructor(connectionStream: Duplex, { maxEventListeners, jsonRpcStreamName, shouldSendMetadata }: ProviderOptions);
    /**
     * Returns whether the inPage provider is connected to Torus.
     */
    isConnected(): boolean;
    get isLoggedIn(): boolean;
    get isIframeFullScreen(): boolean;
    _initializeState(params: Record<string, unknown>): Promise<void>;
    /**
     * Internal RPC method. Forwards requests to background via the RPC engine.
     * Also remap ids inbound and outbound
     */
    protected _rpcRequest(payload: UnValidatedJsonRpcRequest | UnValidatedJsonRpcRequest[], callback: (...args: any[]) => void): void;
    /**
     * When the provider becomes connected, updates internal state and emits
     * required events. Idempotent.
     *
     * @param chainId - The ID of the newly connected chain.
     * @emits TorusInpageProvider#connect
     */
    protected _handleConnect(chainId: string): void;
    /**
     * When the provider becomes disconnected, updates internal state and emits
     * required events. Idempotent with respect to the isRecoverable parameter.
     *
     * Error codes per the CloseEvent status codes as required by EIP-1193:
     * https://developer.mozilla.org/en-US/docs/Web/API/CloseEvent#Status_codes
     *
     * @param isRecoverable - Whether the disconnection is recoverable.
     * @param errorMessage - A custom error message.
     * @emits TorusInpageProvider#disconnect
     */
    protected _handleDisconnect(isRecoverable: boolean, errorMessage?: string): void;
    _handleWindow(windowId: string, { url, target, features }?: {
        url?: string;
        target?: string;
        features?: string;
    }): void;
    private _handleCloseWindow;
    private _createPopupBlockAlert;
    private getLogoUrl;
    _displayIframe(isFull?: boolean): void;
    hideTorusButton(): void;
    showTorusButton(): void;
    private _sendWidgetVisibilityStatus;
}
export default TorusCommunicationProvider;
