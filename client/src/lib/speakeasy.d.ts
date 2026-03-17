declare module 'speakeasy' {
  export function generateSecret(options?: any): any;
  export function totp(options: any): string;
  export namespace totp {
    export function verify(options: any): boolean;
  }
}
