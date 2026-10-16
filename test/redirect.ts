// test/redirect.ts
// Stand-in for the control-flow error Next's redirect() throws.
export class RedirectError extends Error {
  constructor(public url: string) {
    super(`redirect: ${url}`);
  }
}
