/**
 * Host loader entry for the browser implementation exported from `./client`.
 * The dsh-git UI has no host-side behavior of its own (git work lives in the
 * dsh-git service); this face exists so the package can be a
 * loader row scanned by clientModules.
 * @module dsh-git-client
 */

/** Host plugin body — no-op by design. */
export function apply(): void {}
