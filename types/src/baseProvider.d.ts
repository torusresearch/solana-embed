import { SafeEventEmitterProvider, SendCallBack } from "@toruslabs/base-controllers";
import { JRPCEngine, JRPCRequest, SafeEventEmitter } from "@toruslabs/openlogin-jrpc";
import type { Duplex } from "readable-stream";
import { BaseProviderState, Maybe, ProviderOptions, RequestArguments, UnValidatedJsonRpcRequest } from "./interfaces";
/**
 * @param {Object} connectionStream - A Node.js duplex stream
 * @param {Object} opts - An options bag
 * @param {number} opts.maxEventListeners - The maximum number of event listeners
 */
declare abstract class BaseProvider<U extends BaseProviderState> extends SafeEventEmitter implements SafeEventEmitterProvider {
    protected _state: U;
    _rpcEngine: JRPCEngine;
    jsonRpcConnectionEvents: SafeEventEmitter;
    /**
     * Indicating that this provider is a Torus provider.
     */
    readonly isTorus: true;
    constructor(connectionStream: Duplex, { maxEventListeners, jsonRpcStreamName }: ProviderOptions);
    /**
     * Submits an RPC request for the given method, with the given params.
     * Resolves with the result of the method call, or rejects on error.
     *
     * @param {Object} args - The RPC request arguments.
     * @param {string} args.method - The RPC method name.
     * @param {unknown[] | Object} [args.params] - The parameters for the RPC method.
     * @returns {Promise<unknown>} A Promise that resolves with the result of the RPC method,
     * or rejects if an error is encountered.
     */
    request<T>(args: RequestArguments): Promise<Maybe<T>>;
    send<T, V>(req: JRPCRequest<T>, callback: SendCallBack<V>): void;
    sendAsync<T, V>(req: JRPCRequest<T>): Promise<V>;
    /**
     * Constructor helper.
     * Populates initial state by calling 'wallet_getProviderState' and emits
     * necessary events.
     */
    abstract _initializeState(...args: any[]): Promise<void>;
    /**
     * Internal RPC method. Forwards requests to background via the RPC engine.
     * Also remap ids inbound and outbound
     */
    protected abstract _rpcRequest(payload: UnValidatedJsonRpcRequest | UnValidatedJsonRpcRequest[], callback: (...args: any[]) => void, isInternal?: boolean): void;
    /**
     * When the provider becomes connected, updates internal state and emits
     * required events. Idempotent.
     *
     * @param chainId - The ID of the newly connected chain.
     * @emits TorusInPageProvider#connect
     */
    protected abstract _handleConnect(...args: any[]): void;
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
    protected abstract _handleDisconnect(isRecoverable: boolean, errorMessage?: string): void;
    /**
     * Called when connection is lost to critical streams.
     *
     * @emits TorusInpageProvider#disconnect
     */
    protected _handleStreamDisconnect(streamName: string, error: Error): void;
}
export default BaseProvider;
