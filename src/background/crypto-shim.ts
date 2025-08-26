// @ts-expect-error good to go
import * as cryptoBrowserify from 'crypto-browserify';

// @ts-expect-error good to go
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
globalThis.__crypto = cryptoBrowserify;

// Export it for use in your code
export default cryptoBrowserify;
