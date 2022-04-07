import { JRPCEngineNextCallback, JRPCRequest, JRPCResponse, SafeEventEmitter } from "@toruslabs/openlogin-jrpc";
import log from "loglevel";

import { LOGIN_PROVIDER_TYPE, Maybe, RequestArguments } from "./interfaces";

export type BlockData = string | string[];

export type Block = Record<string, BlockData>;

export type InPageWalletProviderState = {
  accounts: string[];
  chainId: string;
  isUnlocked: boolean;
};

export const PROVIDER_JRPC_METHODS = {
  GET_PROVIDER_STATE: "wallet_get_provider_state",
};

export const PROVIDER_NOTIFICATIONS = {
  ACCOUNTS_CHANGED: "wallet_accounts_changed",
  CHAIN_CHANGED: "wallet_chain_changed",
  UNLOCK_STATE_CHANGED: "wallet_unlock_state_changed",
};

export const COMMUNICATION_NOTIFICATIONS = {
  IFRAME_STATUS: "iframe_status",

  // Tell embed to create the window
  CREATE_WINDOW: "create_window",
  // Tell embed to close the window
  CLOSE_WINDOW: "close_window",

  USER_LOGGED_IN: "user_logged_in",
  USER_LOGGED_OUT: "user_logged_out",
};

export const COMMUNICATION_JRPC_METHODS = {
  LOGOUT: "logout",
  WALLET_INSTANCE_ID: "wallet_instance_id",
  USER_INFO: "user_info",
  SET_PROVIDER: "set_provider",
  TOPUP: "topup",
  IFRAME_STATUS: "iframe_status",
  // embed has opened the window as requested
  OPENED_WINDOW: "opened_window",
  // user has closed the window from embed's side
  CLOSED_WINDOW: "closed_window",
  GET_PROVIDER_STATE: "get_provider_state",
  LOGIN_WITH_PRIVATE_KEY: "login_with_private_key",
};

export type CommunicationWalletProviderState = {
  isLoggedIn: boolean;
  currentLoginProvider: LOGIN_PROVIDER_TYPE;
};
export type SendAsyncCallBack = (err: Error, providerRes: JRPCResponse<Block>) => void;

export type SendCallBack<U> = (err: any, providerRes: U) => void;

export interface LoggerMiddlewareOptions {
  origin: string;
}

export function createLoggerMiddleware(options: LoggerMiddlewareOptions) {
  return function loggerMiddleware(request: JRPCRequest<unknown>, response: JRPCResponse<unknown>, next: JRPCEngineNextCallback): void {
    next((callback) => {
      if (response.error) {
        log.warn("Error in RPC response:\n", response);
      }
      if ((request as unknown as { isTorusInternal: boolean }).isTorusInternal) return;
      log.info(`RPC (${options.origin}):`, request, "->", response);
      callback();
    });
  };
}

export interface SafeEventEmitterProvider extends SafeEventEmitter {
  sendAsync: <T, U>(req: JRPCRequest<T>) => Promise<U>;
  send: <T, U>(req: JRPCRequest<T>, callback: SendCallBack<U>) => void;
  request: <T, U>(args: RequestArguments<T>) => Promise<Maybe<U>>;
}
