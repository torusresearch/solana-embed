import { JRPCRequest } from "@toruslabs/openlogin-jrpc";

export const LOGIN_PROVIDER = {
  GOOGLE: "google",
  FACEBOOK: "facebook",
  TWITCH: "twitch",
  REDDIT: "reddit",
  DISCORD: "discord",
} as const;

export const PAYMENT_PROVIDER = {
  MOONPAY: "moonpay",
  WYRE: "wyre",
  RAMPNETWORK: "rampnetwork",
  XANPOOL: "xanpool",
  MERCURYO: "mercuryo",
  TRANSAK: "transak",
} as const;

export const TORUS_BUILD_ENV = {
  PRODUCTION: "production",
  DEVELOPMENT: "development",
  TESTING: "testing",
} as const;

export type PAYMENT_PROVIDER_TYPE = typeof PAYMENT_PROVIDER[keyof typeof PAYMENT_PROVIDER];

export type TORUS_BUILD_ENV_TYPE = typeof TORUS_BUILD_ENV[keyof typeof TORUS_BUILD_ENV];

export const BUTTON_POSITION = {
  BOTTOM_LEFT: "bottom-left",
  TOP_LEFT: "top-left",
  BOTTOM_RIGHT: "bottom-right",
  TOP_RIGHT: "top-right",
} as const;

export type EMBED_TRANSLATION_ITEM = {
  continue: string;
  actionRequired: string;
  pendingAction: string;
  cookiesRequired: string;
  enableCookies: string;
  clickHere: string;
};

export type BUTTON_POSITION_TYPE = typeof BUTTON_POSITION[keyof typeof BUTTON_POSITION];

export type WALLET_PATH = "transfer" | "topup" | "home" | "settings" | "history";

export interface TorusCtorArgs {
  /**
   * Determines where the torus widget is visible on the page.
   * @default bottom-left
   */
  buttonPosition?: BUTTON_POSITION_TYPE;

  /**
   * Z-index of the modal and iframe
   * @default 99999
   */
  modalZIndex?: number;

  /**
   * Api key
   * Get yours today at {@link https://developer.tor.us | Dashboard}
   */
  apiKey?: string;
}

export interface NetworkInterface {
  /**
   * Block explorer url for the chain
   * @example https://ropsten.etherscan.io
   */
  blockExplorerUrl: string;
  /**
   * Logo url for the base token
   */
  logo: string;
  /**
   * Name for ticker
   * @example 'Binance Token', 'Ethereum', 'Matic Network Token'
   */
  tickerName: string;
  /**
   * Symbol for ticker
   * @example BNB, ETH
   */
  ticker: string;
  /**
   * RPC target Url for the chain
   * @example https://ropsten.infura.io/v3/YOUR_API_KEY
   */
  rpcTarget: string;
  /**
   * Chain Id parameter(hex with 0x prefix) for the network. Mandatory for all networks. (assign one with a map to network identifier for platforms)
   * @example 0x1 for mainnet, 'loading' if not connected to anything yet or connection fails
   * @defaultValue 'loading'
   */
  chainId: string;
  /**
   * Display name for the network
   */
  displayName: string;

  /**
   * Casper Network Key
   */
  networkKey: string;
}

export interface PaymentParams {
  /**
   * Address to send the funds to
   */
  selectedAddress?: string;
  /**
   * Default fiat currency for the user to make the payment in
   */
  selectedCurrency?: string;
  /**
   * Amount to buy in the selectedCurrency
   */
  fiatValue?: number;
  /**
   * Cryptocurrency to buy
   */
  selectedCryptoCurrency?: string;
}

export interface LoginParams {
  loginProvider?: string;
}

export interface UserInfo {
  /**
   * Email of the logged in user
   */
  email: string;
  /**
   * Full name of the logged in user
   */
  name: string;
  /**
   * Profile image of the logged in user
   */
  profileImage: string;
  /**
   * verifier of the logged in user (google, facebook etc)
   */
  verifier: string;
  /**
   * Verifier Id of the logged in user
   *
   * email for google,
   * id for facebook,
   * username for reddit,
   * id for twitch,
   * id for discord
   */
  verifierId: string;
}

export interface LocaleLinks<T> {
  /**
   * Item corresponding to english
   */
  en?: T;
  /**
   * Item corresponding to japanese
   */
  ja?: T;
  /**
   * Item corresponding to korean
   */
  ko?: T;
  /**
   * Item corresponding to german
   */
  de?: T;
  /**
   * Item corresponding to chinese (simplified)
   */
  zh?: T;
  /**
   * Item corresponding to spanish
   */
  es?: T;
}

export interface TorusParams {
  /**
   * Torus Network Object
   */
  network?: NetworkInterface;
  /**
   * Build Environment of Torus.
   *
   * production uses https://casper.tor.us,
   *
   * development uses http://localhost:4050 (expects torus-website to be run locally),
   *
   * testing uses https://casper-testing.tor.us (latest internal build)
   * @default production
   */
  buildEnv?: TORUS_BUILD_ENV_TYPE;
  /**
   * Enables or disables logging.
   *
   * Defaults to false in prod and true in other environments
   */
  enableLogging?: boolean;
  /**
   * whether to show/hide torus widget.
   *
   * Defaults to true
   * @default true
   */
  showTorusButton?: boolean;
  /**
   * Prefers to use localStorage instead of sessionStorage for torus iframe. Allows longer lived sessions
   *
   * Defaults to false
   * @default false
   */
  useLocalStorage?: boolean;
}

export interface ProviderOptions {
  /**
   * The name of the stream used to connect to the wallet.
   */
  jsonRpcStreamName?: string;

  /**
   * The maximum number of event listeners.
   */
  maxEventListeners?: number;
  /**
   * Whether the provider should send page metadata.
   */
  shouldSendMetadata?: boolean;
}

export interface BaseProviderState {
  accounts: null | string[];
  isConnected: boolean;
  isUnlocked: boolean;
  initialized: boolean;
  isPermanentlyDisconnected: boolean;
  hasEmittedConnection: boolean;
}

export type Maybe<T> = Partial<T> | null | undefined;

export type WalletProviderState = {
  accounts: string[];
  chainId: string;
  isUnlocked: boolean;
};

export interface UnvalidatedJsonRpcRequest extends JRPCRequest<unknown> {
  windowId?: string;
}

export interface RequestArguments {
  /** The RPC method to request. */
  method: string;

  /** The params of the RPC method, if any. */
  params?: unknown[] | Record<string, unknown>;
}

export interface IStreamData<T> {
  /**
   * Name of the stream chunk
   */
  name: string;
  /**
   * Payload of the stream
   */
  data: T;
  /**
   * Error if any of the stream
   */
  error?: string;
}
