/**
 * Google Identity Services Global Type Declarations.
 */

interface GoogleAccountsIdInitializeConfig {
  client_id: string;
  callback: (response: { credential: string; select_by?: string }) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  prompt_parent_id?: string;
}

interface GoogleAccountsIdRenderButtonOptions {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  width?: number;
  locale?: string;
}

interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (config: GoogleAccountsIdInitializeConfig) => void;
        renderButton: (parent: HTMLElement, options: GoogleAccountsIdRenderButtonOptions) => void;
        prompt: (momentListener?: (moment: any) => void) => void;
        cancel: () => void;
        disableAutoSelect?: () => void;
        revoke?: (hint: string, done?: () => void) => void;
      };
      oauth2?: {
        initTokenClient: (config: any) => any;
      };
    };
  };
}
