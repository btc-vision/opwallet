// Browser shim for @protobufjs/inquire - returns null since we can't
// dynamically require in browser. Must work with both CJS and ESM consumers:
// protobufjs does `util.inquire = require("@protobufjs/inquire")` and then
// calls `util.inquire("buffer")`, so the module's default export must be the
// function itself.
function inquire() {
    return null;
}

// CJS compat: `require(...)` returns the function directly
module.exports = inquire;
// ESM compat: `import inquire from '...'` also gets the function
module.exports.default = inquire;
