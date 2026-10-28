import {
  InteractionRequiredAuthError,
  PublicClientApplication,
  type AccountInfo,
} from "@azure/msal-browser";

/** Read-only by design (ADR-0030 D12, ADR-0033 D2). A test asserts this exact list. */
export const SCOPES: string[] = ["User.Read", "Files.Read.All", "offline_access"];

export const CONFIG = {
  clientId: import.meta.env.VITE_CLIENT_ID as string,
  authority: (import.meta.env.VITE_AUTHORITY as string) ?? "https://login.microsoftonline.com/common",
  redirectUri: import.meta.env.VITE_REDIRECT_URI as string,
  folderName: (import.meta.env.VITE_SHARED_FOLDER_NAME as string) || "Recording_90-8",
};

export interface TokenResult {
  accessToken: string;
  scopes: string[];
}

/** The seam between the app and MSAL; tests and the e2e run inject their own. */
export interface AuthProvider {
  account(): { homeAccountId: string; name?: string } | null;
  signIn(): Promise<void>;
  signOut(): Promise<void>;
  getToken(): Promise<TokenResult>;
}

export async function createMsalAuth(): Promise<AuthProvider> {
  const msal = new PublicClientApplication({
    auth: {
      clientId: CONFIG.clientId,
      authority: CONFIG.authority,
      redirectUri: CONFIG.redirectUri,
    },
    cache: { cacheLocation: "localStorage" },
  });
  await msal.initialize();
  const redirected = await msal.handleRedirectPromise();
  let current: AccountInfo | null = redirected?.account ?? msal.getAllAccounts()[0] ?? null;
  if (current) msal.setActiveAccount(current);

  return {
    account: () => (current ? { homeAccountId: current.homeAccountId, name: current.name } : null),
    signIn: () => msal.loginRedirect({ scopes: SCOPES, prompt: "select_account" }),
    signOut: async () => {
      const a = current;
      current = null;
      await msal.logoutRedirect({ account: a ?? undefined });
    },
    getToken: async () => {
      if (!current) throw new Error("not signed in");
      try {
        const r = await msal.acquireTokenSilent({ scopes: SCOPES, account: current });
        return { accessToken: r.accessToken, scopes: r.scopes };
      } catch (e) {
        if (e instanceof InteractionRequiredAuthError) {
          await msal.acquireTokenRedirect({ scopes: SCOPES, account: current });
        }
        throw e;
      }
    },
  };
}
