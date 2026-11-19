import type { FirebaseApp } from 'firebase/app';
import type { User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const GMAIL_SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'] as const;

export interface GmailMessageSummary {
  id: string;
  threadId: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  isUnread: boolean;
}

export interface GmailMessageDetail extends GmailMessageSummary {
  to: string;
  htmlBody: string;
  textBody: string;
}

const resolvedConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || firebaseConfig.apiKey || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || firebaseConfig.storageBucket,
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || firebaseConfig.messagingSenderId,
  appId: import.meta.env.VITE_FIREBASE_APP_ID || firebaseConfig.appId,
};

const GMAIL_SESSION_ENDPOINT = '/api/workspace/gmail-session';

// Keep OAuth token strictly in memory (never localStorage or sessionStorage)
let isSigningIn = false;
let cachedAccessToken: string | null = null;
let cachedSessionEmail: string | null = null;
let cachedCurrentUser: User | null = null;
let authCheckSeq = 0;

interface FirebaseAuthBundle {
  auth: any;
  provider: InstanceType<typeof import('firebase/auth').GoogleAuthProvider>;
  GoogleAuthProvider: typeof import('firebase/auth').GoogleAuthProvider;
  onAuthStateChanged: typeof import('firebase/auth').onAuthStateChanged;
  signInWithPopup: typeof import('firebase/auth').signInWithPopup;
}

let firebaseAuthBundlePromise: Promise<FirebaseAuthBundle> | null = null;

async function ensureFirebaseAuth(): Promise<FirebaseAuthBundle> {
  if (!resolvedConfig.apiKey) {
    throw new Error(
      'Firebase API key is not configured. Set VITE_FIREBASE_API_KEY in your environment.'
    );
  }
  if (!firebaseAuthBundlePromise) {
    firebaseAuthBundlePromise = (async () => {
      const [firebaseAppMod, firebaseAuthMod] = await Promise.all([
        import('firebase/app'),
        import('firebase/auth'),
      ]);
      const app: FirebaseApp =
        firebaseAppMod.getApps().length > 0
          ? firebaseAppMod.getApps()[0]
          : firebaseAppMod.initializeApp(resolvedConfig);
      const auth = firebaseAuthMod.getAuth(app);
      const provider = new firebaseAuthMod.GoogleAuthProvider();
      for (const scope of GMAIL_SCOPES) {
        provider.addScope(scope);
      }
      cachedCurrentUser = auth.currentUser;
      return {
        auth,
        provider,
        GoogleAuthProvider: firebaseAuthMod.GoogleAuthProvider,
        onAuthStateChanged: firebaseAuthMod.onAuthStateChanged,
        signInWithPopup: firebaseAuthMod.signInWithPopup,
      };
    })().catch((err) => {
      firebaseAuthBundlePromise = null;
      throw err;
    });
  }
  return firebaseAuthBundlePromise;
}

interface RestoredGmailSession {
  accessToken: string;
  email: string;
  uid: string;
}

async function persistGmailSessionToServer(accessToken: string, user: User): Promise<void> {
  try {
    await fetch(GMAIL_SESSION_ENDPOINT, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        accessToken,
        uid: user.uid,
        email: user.email || '',
      }),
    });
  } catch {
    // Non-fatal: in-memory token remains active for the current session
  }
}

async function restoreGmailSessionFromServer(
  user: User | null
): Promise<RestoredGmailSession | null> {
  try {
    const query = user?.uid ? `?uid=${encodeURIComponent(user.uid)}` : '';
    const res = await fetch(`${GMAIL_SESSION_ENDPOINT}${query}`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      authenticated?: boolean;
      accessToken?: string;
      email?: string;
      uid?: string;
    };
    if (!data?.authenticated || typeof data.accessToken !== 'string' || !data.accessToken.trim()) {
      return null;
    }
    if (user?.uid && data.uid && data.uid !== user.uid) {
      return null;
    }
    return {
      accessToken: data.accessToken.trim(),
      email: typeof data.email === 'string' ? data.email : '',
      uid: typeof data.uid === 'string' ? data.uid : '',
    };
  } catch {
    return null;
  }
}

async function clearGmailSessionFromServer(): Promise<void> {
  try {
    await fetch(GMAIL_SESSION_ENDPOINT, {
      method: 'DELETE',
      credentials: 'include',
    });
  } catch {
    // Ignore network errors when clearing session cookie
  }
}

export function subscribeGmailAuthState(
  onAuthSuccess?: (user: User | null, token: string, restoredEmail?: string) => void,
  onAuthFailure?: (signedInUser?: User | null) => void,
  onRestoringChange?: (restoring: boolean) => void
): () => void {
  let disposed = false;
  let unsubscribeInner: (() => void) | null = null;

  onRestoringChange?.(true);
  void ensureFirebaseAuth()
    .then(({ auth, onAuthStateChanged }) => {
      if (disposed) return;
      unsubscribeInner = onAuthStateChanged(auth, (user: User | null) => {
        if (disposed) return;
        cachedCurrentUser = user;
        const seq = ++authCheckSeq;

        if (user && cachedAccessToken) {
          cachedSessionEmail = user.email || cachedSessionEmail;
          onRestoringChange?.(false);
          onAuthSuccess?.(user, cachedAccessToken, cachedSessionEmail || undefined);
          return;
        }

        if (isSigningIn) {
          return;
        }

        onRestoringChange?.(true);
        void restoreGmailSessionFromServer(user).then((restored) => {
          if (disposed || seq !== authCheckSeq || isSigningIn) return;
          if (restored?.accessToken) {
            cachedAccessToken = restored.accessToken;
            cachedSessionEmail = user?.email || restored.email || null;
            onRestoringChange?.(false);
            onAuthSuccess?.(user, restored.accessToken, cachedSessionEmail || undefined);
            return;
          }
          cachedAccessToken = null;
          cachedSessionEmail = null;
          onRestoringChange?.(false);
          onAuthFailure?.(user);
        });
      });
    })
    .catch(() => {
      if (disposed) return;
      onRestoringChange?.(false);
      onAuthFailure?.(null);
    });

  return () => {
    disposed = true;
    unsubscribeInner?.();
  };
}

export function getGmailCachedToken(): string | null {
  return cachedAccessToken;
}

export function getGmailCachedEmail(): string | null {
  return cachedSessionEmail || cachedCurrentUser?.email || null;
}

export function getGmailCurrentUser(): User | null {
  return cachedCurrentUser;
}

export function notifyGmailBrowserRefresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supremeai-gmail-refresh'));
  }
}

export async function clearExpiredGmailSession(): Promise<void> {
  cachedAccessToken = null;
  cachedSessionEmail = null;
  await clearGmailSessionFromServer();
}

export async function connectGmailWithGooglePopup(): Promise<{
  user: User;
  accessToken: string;
} | null> {
  try {
    isSigningIn = true;
    const { auth, provider, GoogleAuthProvider, signInWithPopup } = await ensureFirebaseAuth();
    const result = await signInWithPopup(auth, provider);
    cachedCurrentUser = result.user;
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Gmail access token from Google sign-in.');
    }
    const token = credential.accessToken;
    cachedAccessToken = token;
    cachedSessionEmail = result.user.email || null;
    await persistGmailSessionToServer(token, result.user);
    return { user: result.user, accessToken: token };
  } finally {
    isSigningIn = false;
  }
}

export async function disconnectGmailAccount(): Promise<void> {
  cachedAccessToken = null;
  cachedSessionEmail = null;
  cachedCurrentUser = null;
  await clearGmailSessionFromServer();
  try {
    const { auth } = await ensureFirebaseAuth();
    await auth.signOut();
  } catch {
    // Ignore if firebase auth wasn't initialized
  }
}

function getHeaderValue(
  headers: Array<{ name?: string; value?: string }> | undefined,
  headerName: string
): string {
  if (!Array.isArray(headers)) return '';
  const target = headerName.toLowerCase();
  const found = headers.find((h) => (h.name || '').toLowerCase() === target);
  return found?.value || '';
}

function decodeBase64UrlUtf8(encoded?: string): string {
  if (!encoded) return '';
  try {
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  } catch {
    return '';
  }
}

interface GmailMimePart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailMimePart[];
}

function extractGmailBodies(part?: GmailMimePart): { htmlBody: string; textBody: string } {
  let htmlBody = '';
  let textBody = '';
  if (!part) return { htmlBody, textBody };

  const mime = (part.mimeType || '').toLowerCase();
  if (mime === 'text/html' && part.body?.data) {
    htmlBody = decodeBase64UrlUtf8(part.body.data);
  } else if (mime === 'text/plain' && part.body?.data) {
    textBody = decodeBase64UrlUtf8(part.body.data);
  }

  if (Array.isArray(part.parts)) {
    for (const child of part.parts) {
      const nested = extractGmailBodies(child);
      if (!htmlBody && nested.htmlBody) htmlBody = nested.htmlBody;
      if (!textBody && nested.textBody) textBody = nested.textBody;
    }
  }

  return { htmlBody, textBody };
}

export async function fetchGmailInbox(
  accessToken: string,
  options?: { maxResults?: number; query?: string }
): Promise<GmailMessageSummary[]> {
  const maxResults = options?.maxResults ?? 15;
  const query = (options?.query || '').trim();
  const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages');
  listUrl.searchParams.set('maxResults', String(maxResults));
  if (query) {
    listUrl.searchParams.set('q', query);
  } else {
    listUrl.searchParams.set('labelIds', 'INBOX');
  }

  const listRes = await fetch(listUrl.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!listRes.ok) {
    const errText = await listRes.text().catch(() => '');
    throw new Error(
      listRes.status === 401
        ? 'Gmail session expired. Please sign in with Google again.'
        : `Gmail API error (${listRes.status}): ${errText.slice(0, 180)}`
    );
  }

  const listData = (await listRes.json()) as {
    messages?: Array<{ id: string; threadId: string }>;
  };
  const items = Array.isArray(listData.messages) ? listData.messages : [];
  if (items.length === 0) return [];

  const details = await Promise.all(
    items.map(async (item) => {
      const msgUrl = new URL(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(item.id)}`
      );
      msgUrl.searchParams.set('format', 'metadata');
      msgUrl.searchParams.append('metadataHeaders', 'Subject');
      msgUrl.searchParams.append('metadataHeaders', 'From');
      msgUrl.searchParams.append('metadataHeaders', 'Date');

      const msgRes = await fetch(msgUrl.toString(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!msgRes.ok) return null;

      const msgJson = (await msgRes.json()) as {
        id: string;
        threadId: string;
        snippet?: string;
        labelIds?: string[];
        payload?: { headers?: Array<{ name?: string; value?: string }> };
      };
      const headers = msgJson.payload?.headers;
      return {
        id: msgJson.id,
        threadId: msgJson.threadId,
        subject: getHeaderValue(headers, 'Subject') || '(No subject)',
        from: getHeaderValue(headers, 'From') || 'Unknown sender',
        date: getHeaderValue(headers, 'Date') || '',
        snippet: msgJson.snippet || '',
        isUnread: Array.isArray(msgJson.labelIds) && msgJson.labelIds.includes('UNREAD'),
      } satisfies GmailMessageSummary;
    })
  );

  return details.filter((item): item is GmailMessageSummary => item !== null);
}

export async function fetchGmailMessageDetail(
  accessToken: string,
  messageId: string
): Promise<GmailMessageDetail> {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${encodeURIComponent(messageId)}?format=full`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Could not load message (${res.status}).`);
  }
  const msgJson = (await res.json()) as {
    id: string;
    threadId: string;
    snippet?: string;
    labelIds?: string[];
    payload?: GmailMimePart & { headers?: Array<{ name?: string; value?: string }> };
  };
  const headers = msgJson.payload?.headers;
  const { htmlBody, textBody } = extractGmailBodies(msgJson.payload);

  return {
    id: msgJson.id,
    threadId: msgJson.threadId,
    subject: getHeaderValue(headers, 'Subject') || '(No subject)',
    from: getHeaderValue(headers, 'From') || 'Unknown sender',
    to: getHeaderValue(headers, 'To') || '',
    date: getHeaderValue(headers, 'Date') || '',
    snippet: msgJson.snippet || '',
    isUnread: Array.isArray(msgJson.labelIds) && msgJson.labelIds.includes('UNREAD'),
    htmlBody,
    textBody,
  };
}
