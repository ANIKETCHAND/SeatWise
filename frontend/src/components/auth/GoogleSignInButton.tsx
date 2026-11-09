import React, { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import {
  isGoogleGsiAvailable,
  loadGoogleScript,
  initializeGoogleSignIn,
  renderGoogleButton,
} from '../../services/googleAuth';
import { env } from '../../config/env';

interface GoogleSignInButtonProps {
  preferredRole?: UserRole;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  shape?: 'rectangular' | 'pill';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  width?: number;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  preferredRole,
  onSuccess,
  onError,
  className = '',
  shape = 'rectangular',
  text = 'continue_with',
  width = 280,
}) => {
  const { loginWithGoogle, isLoading } = useAuth();
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(isGoogleGsiAvailable());
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    loadGoogleScript().then((loaded) => {
      if (!mounted) return;
      if (loaded) {
        setScriptLoaded(true);
        if (containerRef.current) {
          try {
            initializeGoogleSignIn(async (response) => {
              try {
                if (!response.credential) {
                  throw new Error('No credential returned from Google Sign-In.');
                }
                await loginWithGoogle(response.credential);
                onSuccess?.();
              } catch (err: any) {
                console.error('Google Sign-In failed:', err);
                onError?.(err);
              }
            }, env.googleClientId);

            renderGoogleButton(containerRef.current, {
              type: 'standard',
              theme: 'outline',
              size: 'large',
              shape,
              text,
              width,
            });
          } catch (e: any) {
            console.error('Failed to render Google button:', e);
            setInitError(e.message || 'Initialization error');
          }
        }
      } else {
        setInitError('Could not load Google authentication service.');
      }
    });

    return () => {
      mounted = false;
    };
  }, [preferredRole, shape, text, width, loginWithGoogle, onSuccess, onError]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      {/* Official Google GSI Render Target */}
      <div
        ref={containerRef}
        className="min-h-[44px] flex items-center justify-center transition-opacity"
        style={{ width: `${width}px` }}
      />

      {/* Fallback Custom Google Button (if script is loading or blocked by adblock) */}
      {!scriptLoaded && !initError && (
        <button
          disabled={isLoading}
          className="flex items-center justify-center gap-3 w-full py-2.5 px-4 bg-white border border-zinc-300 rounded-lg text-sm font-medium text-zinc-700 shadow-xs hover:bg-zinc-50 transition-colors cursor-wait"
          style={{ maxWidth: `${width}px` }}
        >
          <svg className="w-4 h-4 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <span>Loading Google Sign In...</span>
        </button>
      )}

      {initError && (
        <div className="text-xs text-zinc-500 mt-2 text-center">
          <span>{initError}</span>
        </div>
      )}
    </div>
  );
};
