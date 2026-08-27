import { createTRPCReact } from "@trpc/react-query";

/**
 * The client communicates with the Render tRPC API over HTTP. The compile-time
 * router shape is deliberately local to this static repository so it does not
 * import backend source or leak server implementation details.
 */
// The generated tRPC React helper uses router keys at the type level. The
// backend is intentionally in a separate repository, so keep this boundary
// dynamic rather than importing server source into the static build.
export const trpc: any = createTRPCReact<any>() as any;
