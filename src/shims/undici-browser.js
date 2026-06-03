// Browser/service-worker shim for `undici`.
//
// `opnet/build/fetch/fetch.js` imports `Agent` and `fetch` from `undici` to
// build a Node-only HTTP client with connection pooling. In a browser/SW we
// have native `fetch` and there is no concept of a dispatcher Agent, so we
// stub Agent to a no-op and re-export the global fetch (stripping the
// `dispatcher` option that undici understands but the WHATWG Fetch does not).

export class Agent {
    constructor() {}
    async close() {}
    async destroy() {}
}

export function fetch(input, init) {
    if (init && 'dispatcher' in init) {
        const { dispatcher: _dispatcher, ...rest } = init;
        return globalThis.fetch(input, rest);
    }
    return globalThis.fetch(input, init);
}

export default { Agent, fetch };
