declare module 'firebase/app' {
  export interface FirebaseApp {
    name: string;
    options: Record<string, any>;
  }

  export function getApps(): FirebaseApp[];
  export function initializeApp(options: Record<string, any>, name?: string): FirebaseApp;
}

declare module 'firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }

  export interface UserCredential {
    user: User;
    providerId?: string | null;
    operationType?: string;
  }

  export interface AuthCredential {
    accessToken?: string;
    idToken?: string;
    providerId?: string;
    signInMethod?: string;
  }

  export class GoogleAuthProvider {
    addScope(scope: string): this;
    static credentialFromResult(userCredential: UserCredential): AuthCredential | null;
  }

  export function getAuth(app?: any): any;
  export function onAuthStateChanged(
    auth: any,
    nextOrObserver: (user: User | null) => void
  ): () => void;
  export function signInWithPopup(auth: any, provider: any): Promise<UserCredential>;
  export function signOut(auth: any): Promise<void>;
}
