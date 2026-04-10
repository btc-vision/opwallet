// Re-export protobufjs from the pre-built minified bundle.
// The source files in protobufjs/src/ individually require("@protobufjs/inquire")
// which breaks in bundlers even with a shim. The dist build has inquire baked in.
import protobuf from 'protobufjs/full';

export default protobuf;
export const Reader = protobuf.Reader;
export const Writer = protobuf.Writer;
export const util = protobuf.util;
export const roots = protobuf.roots;
export const configure = protobuf.configure;
export const rpc = protobuf.rpc;
