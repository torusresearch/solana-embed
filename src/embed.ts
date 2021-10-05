import { setAPIKey } from "@toruslabs/http-helpers";
import { JRPCRequest, ObjectMultiplex, PostMessageStream, setupMultiplex, Substream } from "@toruslabs/openlogin-jrpc";

import configuration from "./config";
import { documentReady, handleStream, htmlToElement } from "./embedUtils";
import TorusInpageProvider from "./inpage-provider";
import {
  BUTTON_POSITION,
  BUTTON_POSITION_TYPE,
  EMBED_TRANSLATION_ITEM,
  IStreamData,
  NetworkInterface,
  PAYMENT_PROVIDER_TYPE,
  PaymentParams,
  TORUS_BUILD_ENV,
  TorusCtorArgs,
  TorusParams,
  UnvalidatedJsonRpcRequest,
  UserInfo,
  WALLET_PATH,
} from "./interfaces";
import log from "./loglevel";
import PopupHandler from "./PopupHandler";
import sendSiteMetadata from "./siteMetadata";
import {
  FEATURES_CONFIRM_WINDOW,
  FEATURES_DEFAULT_WALLET_WINDOW,
  FEATURES_PROVIDER_CHANGE_WINDOW,
  getTorusUrl,
  getUserLanguage,
  getWindowId,
  storageAvailable,
} from "./utils";

// TODO
const UNSAFE_METHODS = ["account_put_deploy"];

const isLocalStorageAvailable = storageAvailable("localStorage");

// preload for iframe doesn't work https://bugs.chromium.org/p/chromium/issues/detail?id=593267
(async function preLoadIframe() {
  try {
    if (typeof document === "undefined") return;
    const torusIframeHtml = document.createElement("link");
    const { torusUrl } = await getTorusUrl("production");
    torusIframeHtml.href = `${torusUrl}/popup`;
    torusIframeHtml.crossOrigin = "anonymous";
    torusIframeHtml.type = "text/html";
    torusIframeHtml.rel = "prefetch";
    if (torusIframeHtml.relList && torusIframeHtml.relList.supports) {
      if (torusIframeHtml.relList.supports("prefetch")) {
        document.head.appendChild(torusIframeHtml);
      }
    }
  } catch (error) {
    log.warn(error);
  }
})();

class Torus {
  buttonPosition: BUTTON_POSITION_TYPE = BUTTON_POSITION.BOTTOM_LEFT;

  torusUrl: string;

  torusIframe: HTMLIFrameElement;

  styleLink: HTMLLinkElement;

  isLoggedIn: boolean;

  isInitialized: boolean;

  torusWidgetVisibility: boolean;

  torusAlert: HTMLDivElement;

  apiKey: string;

  modalZIndex: number;

  alertZIndex: number;

  private torusAlertContainer: HTMLDivElement;

  private isIframeFullScreen: boolean;

  public requestedLoginProvider: string;

  public currentLoginProvider: string;

  embedTranslations: EMBED_TRANSLATION_ITEM;

  provider: TorusInpageProvider;

  communicationMux: ObjectMultiplex;

  isLoginCallback: () => void;

  dappStorageKey: string;

  constructor({ buttonPosition = BUTTON_POSITION.BOTTOM_LEFT, modalZIndex = 99999, apiKey = "torus-default" }: TorusCtorArgs = {}) {
    this.buttonPosition = buttonPosition;
    this.torusUrl = "";
    this.isLoggedIn = false;
    this.isInitialized = false; // init done
    this.torusWidgetVisibility = true;
    this.requestedLoginProvider = "";
    this.currentLoginProvider = "";
    this.apiKey = apiKey;
    setAPIKey(apiKey);
    this.modalZIndex = modalZIndex;
    this.alertZIndex = modalZIndex + 1000;
    this.isIframeFullScreen = false;
    this.dappStorageKey = "";
  }

  async init({
    buildEnv = TORUS_BUILD_ENV.PRODUCTION,
    enableLogging = false,
    network,
    showTorusButton = true,
    useLocalStorage = false,
  }: TorusParams = {}): Promise<void> {
    if (this.isInitialized) throw new Error("Already initialized");
    const { torusUrl, logLevel } = await getTorusUrl(buildEnv);
    log.info(torusUrl, "url loaded");
    this.torusUrl = torusUrl;
    log.setDefaultLevel(logLevel);
    if (enableLogging) log.enableAll();
    else log.disableAll();
    this.torusWidgetVisibility = showTorusButton;

    const dappStorageKey = this.handleDappStorageKey(useLocalStorage);

    const torusIframeUrl = new URL(torusUrl);
    if (torusIframeUrl.pathname.endsWith("/")) torusIframeUrl.pathname += "popup";
    else torusIframeUrl.pathname += "/popup";

    const hashParams = new URLSearchParams();
    if (dappStorageKey) hashParams.append("dappStorageKey", dappStorageKey);
    hashParams.append("origin", window.location.origin);

    torusIframeUrl.hash = hashParams.toString();

    // Iframe code
    this.torusIframe = htmlToElement<HTMLIFrameElement>(
      `<iframe
        id="torusIframe"
        class="torusIframe"
        src="${torusIframeUrl.href}"
        style="display: none; position: fixed; top: 0; right: 0; width: 100%;
        height: 100%; border: none; border-radius: 0; z-index: ${this.modalZIndex.toString()}"
      ></iframe>`
    );

    this.torusAlertContainer = htmlToElement<HTMLDivElement>(
      `<div id="torusAlertContainer style="display:none; z-index: ${this.alertZIndex.toString()}"></div>`
    );

    this.styleLink = htmlToElement<HTMLLinkElement>(`<link href="${torusUrl}/css/widget.css" rel="stylesheet" type="text/css">`);

    const languageTranslations = configuration.translations[getUserLanguage()];
    this.embedTranslations = languageTranslations.embed;

    const handleSetup = async () => {
      window.document.head.appendChild(this.styleLink);
      window.document.body.appendChild(this.torusIframe);
      window.document.body.appendChild(this.torusAlertContainer);
      this.torusIframe.onload = () => {
        // only do this if iframe is not full screen
        if (!this.isIframeFullScreen) this._displayIframe();
      };
      this._setupWeb3();
      const initStream = this.communicationMux.getStream("init") as Substream;
      const initCompletePromise = new Promise<void>((resolve, reject) => {
        const initHandler = (chunk: IStreamData<string>) => {
          const { name, data, error } = chunk;
          if (name === "init" && data === "success") {
            // resolve promise
            resolve();
          } else if (error) {
            reject(new Error(error));
          }
          // Otherwise, it's not me who will handle this.
        };
        handleStream(initStream, "data", initHandler);
      });
      initStream.write({
        name: "init",
        data: {
          buttonPosition: this.buttonPosition,
          torusWidgetVisibility: this.torusWidgetVisibility,
          apiKey: this.apiKey,
          network,
        },
      } as IStreamData<{
        buttonPosition: string;
        torusWidgetVisibility: boolean;
        apiKey: string;
        network?: NetworkInterface;
      }>);
      await initCompletePromise;
      this.isInitialized = true;
    };

    await documentReady();
    await handleSetup();

    return undefined;
  }

  private handleDappStorageKey(useLocalStorage: boolean) {
    let dappStorageKey = "";
    if (isLocalStorageAvailable && useLocalStorage) {
      const storedKey = window.localStorage.getItem(configuration.localStorageKey);
      if (storedKey) dappStorageKey = storedKey;
      else {
        const generatedKey = `torus-app-${getWindowId()}`;
        window.localStorage.setItem(configuration.localStorageKey, generatedKey);
        dappStorageKey = generatedKey;
      }
    }
    this.dappStorageKey = dappStorageKey;
    return dappStorageKey;
  }

  login({ verifier = "" } = {}): Promise<string[]> {
    if (!this.isInitialized) throw new Error("Call init() first");
    this.requestedLoginProvider = verifier;
    return this.provider.enable();
  }

  logout(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isLoggedIn) {
        reject(new Error("User has not logged in yet"));
        return;
      }

      const logOutStream = this.communicationMux.getStream("logout") as Substream;
      logOutStream.write({ name: "logOut" });
      const statusStream = this.communicationMux.getStream("status") as Substream;
      const statusStreamHandler = (status) => {
        if (!status.loggedIn) {
          this.isLoggedIn = false;
          this.currentLoginProvider = "";
          this.requestedLoginProvider = "";
          resolve();
        } else reject(new Error("Some Error Occured"));
      };
      handleStream(statusStream, "data", statusStreamHandler);
    });
  }

  async cleanUp(): Promise<void> {
    if (this.isLoggedIn) {
      await this.logout();
    }
    this.clearInit();
  }

  clearInit(): void {
    function isElement(element: unknown) {
      return element instanceof Element || element instanceof Document;
    }
    if (isElement(this.styleLink) && window.document.body.contains(this.styleLink)) {
      this.styleLink.remove();
      this.styleLink = undefined;
    }
    if (isElement(this.torusIframe) && window.document.body.contains(this.torusIframe)) {
      this.torusIframe.remove();
      this.torusIframe = undefined;
    }
    if (isElement(this.torusAlertContainer) && window.document.body.contains(this.torusAlertContainer)) {
      this.torusAlert = undefined;
      this.torusAlertContainer.remove();
      this.torusAlertContainer = undefined;
    }
    this.isInitialized = false;
  }

  /** @ignore */
  _createPopupBlockAlert(preopenInstanceId: string, url: string): void {
    const logoUrl = this._getLogoUrl();
    const torusAlert = htmlToElement<HTMLDivElement>(
      '<div id="torusAlert" class="torus-alert--v2">' +
        `<div id="torusAlert__logo"><img src="${logoUrl}" /></div>` +
        "<div>" +
        `<h1 id="torusAlert__title">${this.embedTranslations.actionRequired}</h1>` +
        `<p id="torusAlert__desc">${this.embedTranslations.pendingAction}</p>` +
        "</div>" +
        "</div>"
    );

    const successAlert = htmlToElement(`<div><a id="torusAlert__btn">${this.embedTranslations.continue}</a></div>`);
    const btnContainer = htmlToElement('<div id="torusAlert__btn-container"></div>');
    btnContainer.appendChild(successAlert);
    torusAlert.appendChild(btnContainer);
    const bindOnLoad = () => {
      successAlert.addEventListener("click", () => {
        this._handleWindow(preopenInstanceId, {
          url,
          target: "_blank",
          features: FEATURES_CONFIRM_WINDOW,
        });
        torusAlert.remove();

        if (this.torusAlertContainer.children.length === 0) this.torusAlertContainer.style.display = "none";
      });
    };

    this._setEmbedWhiteLabel(torusAlert);

    const attachOnLoad = () => {
      this.torusAlertContainer.style.display = "block";
      this.torusAlertContainer.appendChild(torusAlert);
    };

    runOnLoad(attachOnLoad);
    runOnLoad(bindOnLoad);
  }

  /** @ignore */
  _sendWidgetVisibilityStatus(status: boolean): void {
    const torusWidgetVisibilityStream = this.communicationMux.getStream("torus-widget-visibility") as Substream;
    torusWidgetVisibilityStream.write({
      data: status,
    });
  }

  hideTorusButton(): void {
    this.torusWidgetVisibility = false;
    this._sendWidgetVisibilityStatus(false);
    this._displayIframe();
  }

  showTorusButton(): void {
    this.torusWidgetVisibility = true;
    this._sendWidgetVisibilityStatus(true);
    this._displayIframe();
  }

  /** @ignore */
  _displayIframe(isFull = false): void {
    const style: Partial<CSSStyleDeclaration> = {};
    // set phase
    if (!isFull) {
      style.display = this.torusWidgetVisibility ? "block" : "none";
      style.height = "70px";
      style.width = "70px";
      switch (this.buttonPosition) {
        case BUTTON_POSITION.TOP_LEFT:
          style.top = "0px";
          style.left = "0px";
          style.right = "auto";
          style.bottom = "auto";
          break;
        case BUTTON_POSITION.TOP_RIGHT:
          style.top = "0px";
          style.right = "0px";
          style.left = "auto";
          style.bottom = "auto";
          break;
        case BUTTON_POSITION.BOTTOM_RIGHT:
          style.bottom = "0px";
          style.right = "0px";
          style.top = "auto";
          style.left = "auto";
          break;
        case BUTTON_POSITION.BOTTOM_LEFT:
        default:
          style.bottom = "0px";
          style.left = "0px";
          style.top = "auto";
          style.right = "auto";
          break;
      }
    } else {
      style.display = "block";
      style.width = "100%";
      style.height = "100%";
      style.top = "0px";
      style.right = "0px";
      style.left = "0px";
      style.bottom = "0px";
    }
    Object.assign(this.torusIframe.style, style);
    this.isIframeFullScreen = isFull;
  }

  /** @ignore */
  _setupWeb3(): void {
    log.info("setupWeb3 running");
    // setup background connection
    const metamaskStream = new PostMessageStream({
      name: "embed_torus",
      target: "iframe_torus",
      targetWindow: this.torusIframe.contentWindow,
    });

    // Due to compatibility reasons, we should not set up multiplexing on window.metamaskstream
    // because the MetamaskInpageProvider also attempts to do so.
    // We create another LocalMessageDuplexStream for communication between dapp <> iframe
    const communicationStream = new PostMessageStream({
      name: "embed_comm",
      target: "iframe_comm",
      targetWindow: this.torusIframe.contentWindow,
    });

    // compose the inpage provider
    const inpageProvider = new TorusInpageProvider(metamaskStream);

    // detect eth_requestAccounts and pipe to enable for now
    const detectAccountRequestPrototypeModifier = (m) => {
      const originalMethod = inpageProvider[m];
      inpageProvider[m] = function providerFunc(method, ...args) {
        if (method && method === "casper_requestAccounts") {
          return inpageProvider.enable();
        }
        return originalMethod.apply(this, [method, ...args]);
      };
    };

    detectAccountRequestPrototypeModifier("send");
    detectAccountRequestPrototypeModifier("sendAsync");

    inpageProvider.enable = () => {
      return new Promise((resolve, reject) => {
        // If user is already logged in, we assume they have given access to the website
        inpageProvider.sendAsync({ jsonrpc: "2.0", id: getWindowId(), method: "casper_requestAccounts", params: [] }, (err, response) => {
          const { result: res } = (response as { result: unknown }) || {};
          if (err) {
            setTimeout(() => {
              reject(err);
            }, 50);
          } else if (Array.isArray(res) && res.length > 0) {
            // If user is already rehydrated, resolve this
            // else wait for something to be written to status stream
            const handleLoginCb = () => {
              if (this.requestedLoginProvider !== "" && this.currentLoginProvider !== this.requestedLoginProvider) {
                const { requestedLoginProvider: requestedVerifier } = this;
                // eslint-disable-next-line promise/no-promise-in-callback
                this.logout()
                  // eslint-disable-next-line promise/always-return
                  .then((_) => {
                    this.requestedLoginProvider = requestedVerifier;
                    this._showLoginPopup(true, resolve, reject);
                  })
                  .catch((error) => reject(error));
              } else {
                resolve(res);
              }
            };
            if (this.isLoggedIn) {
              handleLoginCb();
            } else {
              this.isLoginCallback = handleLoginCb;
            }
          } else {
            // set up listener for login
            this._showLoginPopup(true, resolve, reject);
          }
        });
      });
    };

    inpageProvider.tryPreopenHandle = (payload: UnvalidatedJsonRpcRequest | UnvalidatedJsonRpcRequest[], cb: (...args: any[]) => void) => {
      const _payload = payload;
      if (!Array.isArray(_payload) && UNSAFE_METHODS.includes(_payload.method)) {
        const preopenInstanceId = getWindowId();
        this._handleWindow(preopenInstanceId, {
          target: "_blank",
          features: FEATURES_CONFIRM_WINDOW,
        });
        _payload.windowId = preopenInstanceId;
      }
      inpageProvider._rpcEngine.handle(_payload as JRPCRequest<unknown>[], cb);
    };

    // Work around for web3@1.0 deleting the bound `sendAsync` but not the unbound
    // `sendAsync` method on the prototype, causing `this` reference issues with drizzle
    const proxiedInpageProvider = new Proxy(inpageProvider, {
      // straight up lie that we deleted the property so that it doesn't
      // throw an error in strict mode
      deleteProperty: () => true,
    });

    const communicationMux = setupMultiplex(communicationStream);

    this.communicationMux = communicationMux;

    const windowStream = communicationMux.getStream("window") as Substream;
    windowStream.on("data", (chunk) => {
      if (chunk.name === "create_window") {
        // url is the url we need to open
        // we can pass the final url upfront so that it removes the step of redirecting to /redirect and waiting for finalUrl
        this._createPopupBlockAlert(chunk.data.preopenInstanceId, chunk.data.url);
      }
    });

    // show torus widget if button clicked
    const widgetStream = communicationMux.getStream("widget") as Substream;
    widgetStream.on("data", (chunk) => {
      const { data } = chunk;
      this._displayIframe(data);
    });

    // Show torus button if wallet has been hydrated/detected
    const statusStream = communicationMux.getStream("status") as Substream;
    statusStream.on("data", (status) => {
      // login
      if (status.loggedIn) {
        this.isLoggedIn = status.loggedIn;
        this.currentLoginProvider = status.verifier;
      } // logout
      else this._displayIframe();
      if (this.isLoginCallback) {
        this.isLoginCallback();
        delete this.isLoginCallback;
      }
    });

    this.provider = proxiedInpageProvider;

    if (this.provider.shouldSendMetadata) sendSiteMetadata(this.provider._rpcEngine);
    inpageProvider._initializeState();
    log.debug("Torus - injected provider");
  }

  /** @ignore */
  _showLoginPopup(calledFromEmbed: boolean, resolve: (a: string[]) => void, reject: (err: Error) => void): void {
    const loginHandler = (data) => {
      const { err, selectedAddress } = data;
      if (err) {
        log.error(err);
        if (reject) reject(err);
      }
      // returns an array (cause accounts expects it)
      else if (resolve) resolve([selectedAddress]);
      if (this.isIframeFullScreen) this._displayIframe();
    };
    const oauthStream = this.communicationMux.getStream("oauth");
    if (!this.requestedLoginProvider) {
      this._displayIframe(true);
      handleStream(oauthStream, "data", loginHandler);
      oauthStream.write({ name: "oauth_modal", data: { calledFromEmbed } });
    } else {
      handleStream(oauthStream, "data", loginHandler);
      const preopenInstanceId = getPreopenInstanceId();
      this._handleWindow(preopenInstanceId);
      oauthStream.write({ name: "oauth", data: { calledFromEmbed, verifier: this.requestedLoginProvider, preopenInstanceId } });
    }
  }

  setProvider({ host = "mainnet", chainId = null, networkName = "", ...rest } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      const providerChangeStream = this.communicationMux.getStream("provider_change");
      const handler = (chunk) => {
        const { err, success } = chunk.data;
        log.info(chunk);
        if (err) {
          reject(err);
        } else if (success) {
          resolve();
        } else reject(new Error("some error occured"));
      };
      handleStream(providerChangeStream, "data", handler);
      const preopenInstanceId = getPreopenInstanceId();
      this._handleWindow(preopenInstanceId, {
        target: "_blank",
        features: FEATURES_PROVIDER_CHANGE_WINDOW,
      });
      providerChangeStream.write({
        name: "show_provider_change",
        data: {
          network: {
            host,
            chainId,
            networkName,
            ...rest,
          },
          preopenInstanceId,
          override: false,
        },
      });
    });
  }

  /** @ignore */
  _setProvider({ host = "mainnet", chainId = null, networkName = "", ...rest } = {}): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        const providerChangeStream = this.communicationMux.getStream("provider_change");
        const handler = (ev) => {
          log.info(ev);
          const { err, success } = ev.data;
          if (err) {
            reject(err);
          } else if (success) {
            resolve();
          } else reject(new Error("some error occured"));
        };
        handleStream(providerChangeStream, "data", handler);
        providerChangeStream.write({
          name: "show_provider_change",
          data: {
            network: {
              host,
              chainId,
              networkName,
              ...rest,
            },
            override: true,
          },
        });
      } else reject(new Error("Already initialized"));
    });
  }

  showWallet(path: WALLET_PATH, params: Record<string, string> = {}): void {
    const showWalletStream = this.communicationMux.getStream("show_wallet");
    const finalPath = path ? `/${path}` : "";
    showWalletStream.write({ name: "show_wallet", data: { path: finalPath } });

    const showWalletHandler = (chunk) => {
      if (chunk.name === "show_wallet_instance") {
        // Let the error propogate up (hence, no try catch)
        const { instanceId } = chunk.data;
        const finalUrl = new URL(`${this.torusUrl}/wallet${finalPath}`);
        // Using URL constructor to prevent js injection and allow parameter validation.!
        finalUrl.searchParams.append("integrity", "true");
        finalUrl.searchParams.append("instanceId", instanceId);
        Object.keys(params).forEach((x) => {
          finalUrl.searchParams.append(x, params[x]);
        });
        if (this.dappStorageKey) {
          finalUrl.hash = `#dappStorageKey=${this.dappStorageKey}`;
        }
        const walletWindow = new PopupHandler({ url: finalUrl, features: FEATURES_DEFAULT_WALLET_WINDOW });
        walletWindow.open();
      }
    };

    handleStream(showWalletStream, "data", showWalletHandler);
  }

  getUserInfo(message: string): Promise<UserInfo> {
    return new Promise((resolve, reject) => {
      if (this.isLoggedIn) {
        const userInfoAccessStream = this.communicationMux.getStream("user_info_access");
        userInfoAccessStream.write({ name: "user_info_access_request" });
        const userInfoAccessHandler = (chunk) => {
          const {
            name,
            data: { approved, payload, rejected, newRequest },
          } = chunk;
          if (name === "user_info_access_response") {
            if (approved) {
              resolve(payload);
            } else if (rejected) {
              reject(new Error("User rejected the request"));
            } else if (newRequest) {
              const userInfoStream = this.communicationMux.getStream("user_info");
              const userInfoHandler = (handlerChunk) => {
                if (handlerChunk.name === "user_info_response") {
                  if (handlerChunk.data.approved) {
                    resolve(handlerChunk.data.payload);
                  } else {
                    reject(new Error("User rejected the request"));
                  }
                }
              };
              handleStream(userInfoStream, "data", userInfoHandler);
              const preopenInstanceId = getPreopenInstanceId();
              this._handleWindow(preopenInstanceId, {
                target: "_blank",
                features: FEATURES_PROVIDER_CHANGE_WINDOW,
              });
              userInfoStream.write({ name: "user_info_request", data: { message, preopenInstanceId } });
            }
          }
        };
        handleStream(userInfoAccessStream, "data", userInfoAccessHandler);
      } else reject(new Error("User has not logged in yet"));
    });
  }

  /** @ignore */
  _handleWindow(preopenInstanceId: string, { url, target, features }: { url?: string; target?: string; features?: string } = {}): void {
    if (preopenInstanceId) {
      const windowStream = this.communicationMux.getStream("window");
      const finalUrl = new URL(url || `${this.torusUrl}/redirect?preopenInstanceId=${preopenInstanceId}`);
      if (this.dappStorageKey) {
        // If multiple instances, it returns the first one
        if (finalUrl.hash) finalUrl.hash += `&dappStorageKey=${this.dappStorageKey}`;
        else finalUrl.hash = `#dappStorageKey=${this.dappStorageKey}`;
      }
      const handledWindow = new PopupHandler({ url: finalUrl, target, features });
      handledWindow.open();
      if (!handledWindow.window) {
        this._createPopupBlockAlert(preopenInstanceId, finalUrl.href);
        return;
      }
      windowStream.write({
        name: "opened_window",
        data: {
          preopenInstanceId,
        },
      });
      const closeHandler = ({ preopenInstanceId: receivedId, close }) => {
        if (receivedId === preopenInstanceId && close) {
          handledWindow.close();
          windowStream.removeListener("data", closeHandler);
        }
      };
      windowStream.on("data", closeHandler);
      handledWindow.once("close", () => {
        windowStream.write({
          data: {
            preopenInstanceId,
            closed: true,
          },
        });
        windowStream.removeListener("data", closeHandler);
      });
    }
  }

  paymentProviders = configuration.paymentProviders;

  initiateTopup(provider: PAYMENT_PROVIDER_TYPE, params: PaymentParams): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (this.isInitialized) {
        const topupStream = this.communicationMux.getStream("topup");
        const topupHandler = (chunk) => {
          if (chunk.name === "topup_response") {
            if (chunk.data.success) {
              resolve(chunk.data.success);
            } else {
              reject(new Error(chunk.data.error));
            }
          }
        };
        handleStream(topupStream, "data", topupHandler);
        const preopenInstanceId = getPreopenInstanceId();
        this._handleWindow(preopenInstanceId);
        topupStream.write({ name: "topup_request", data: { provider, params, preopenInstanceId } });
      } else reject(new Error("Torus is not initialized yet"));
    });
  }
}

export default Torus;
