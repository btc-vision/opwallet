import pako from 'pako';

export function gzipSync(data, options = {}) {
    return Buffer.from(pako.gzip(data, { level: options.level || 6 }));
}

export function gunzipSync(data) {
    return Buffer.from(pako.ungzip(data));
}

export default {
    gzipSync,
    gunzipSync,
};
