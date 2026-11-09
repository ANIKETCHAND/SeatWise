/**
 * Google Identity Services (GIS) Client Integration.
 * 
 * Supports client-side Google One-Tap, official Google-rendered button,
 * and ID token JWT decoding for SeatWise university authentication.
 */

import { env } from '../config/env';

export interface GoogleJwtPayload {
  iss?: string;
  nbf?: number;
  aud?: string;
  sub: string;
  email: string;
  email_verified?: boolean;
  azp?: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

/**
 * Safely parse a Google ID Token (JWT) on the client without external libraries.
 */
export function parseGoogleJwt(token: string): GoogleJwtPayload | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload) as GoogleJwtPayload;
  } catch (error) {
    console.error('Failed to parse Google ID token:', error);
    return null;
  }
}

/**
 * Check if Google Identity Services script is available on the window.
 */
export function isGoogleGsiAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.google?.accounts?.id);
}

/**
 * Load Google Identity Services dynamically if not already loaded.
 */
export function loadGoogleScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (isGoogleGsiAvailable()) {
      resolve(true);
      return;
    }
    const existingScript = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(true));
      existingScript.addEventListener('error', () => resolve(false));
      // In case it already loaded in parallel
      if (isGoogleGsiAvailable()) resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });
}

/**
 * Initialize Google Identity Services with client ID and callback.
 */
export function initializeGoogleSignIn(
  callback: (response: { credential: string; select_by?: string }) => void,
  clientId: string = env.googleClientId
): void {
  if (!isGoogleGsiAvailable()) return;
  try {
    window.google!.accounts.id.initialize({
      client_id: clientId,
      callback,
      auto_select: false,
      cancel_on_tap_outside: true,
    });
  } catch (e) {
    console.error('Failed to initialize Google Sign-In:', e);
  }
}

/**
 * Render the official Google Sign-In button into a container element.
 */
export function renderGoogleButton(
  container: HTMLElement,
  options: {
    type?: 'standard' | 'icon';
    theme?: 'outline' | 'filled_blue' | 'filled_black';
    size?: 'large' | 'medium' | 'small';
    text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
    shape?: 'rectangular' | 'pill' | 'circle' | 'square';
    logo_alignment?: 'left' | 'center';
    width?: number;
  } = {}
): void {
  if (!isGoogleGsiAvailable()) return;
  try {
    window.google!.accounts.id.renderButton(container, {
      type: options.type || 'standard',
      theme: options.theme || 'outline',
      size: options.size || 'large',
      text: options.text || 'continue_with',
      shape: options.shape || 'rectangular',
      logo_alignment: options.logo_alignment || 'left',
      width: options.width || 300,
    });
  } catch (e) {
    console.error('Failed to render Google Sign-In button:', e);
  }
}
