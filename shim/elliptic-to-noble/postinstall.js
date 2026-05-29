try {
    const resolved = require.resolve('elliptic');
    const pkgJsonPath = require('path').join(require('path').dirname(resolved), '..', 'package.json');
    const pkg = require(pkgJsonPath);

    // If we found the real elliptic (not our shim), block it
    if (pkg.name === 'elliptic' && !pkg.version.startsWith('99')) {
        console.error('\nSECURITY BLOCK');
        console.error('   The unsafe original "elliptic" package was detected.');
        console.error('   @soatok/elliptic-to-noble (powered by @noble/curves) is in use instead.');
        console.error('   This installation has been aborted for security.\n');
        process.exit(1);
    }
} catch (e) {
}
