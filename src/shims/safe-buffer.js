// Tiny safe-buffer replacement.
//
// `safe-buffer` is a 5-line wrapper around `require('buffer').Buffer` that
// guards against missing Buffer.from/Buffer.alloc on ancient Node releases.
// Modern browsers and Node both have those statics, and we polyfill `Buffer`
// globally via vite-plugin-node-polyfills. The only reason safe-buffer hurts
// us is that it's CJS, so it pulls in the .cjs version of the buffer polyfill
// (~54 KB) on top of the .js version that ESM importers already brought in.
// Aliasing it to this ESM file collapses both into a single buffer copy.

import { Buffer } from 'buffer';

export { Buffer };
export const SlowBuffer = Buffer;
export const INSPECT_MAX_BYTES = 50;
export const kMaxLength = 0x7fffffff;
export default { Buffer, SlowBuffer, INSPECT_MAX_BYTES, kMaxLength };
