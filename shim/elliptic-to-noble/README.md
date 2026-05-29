# Elliptic to Noble

[![Build Status](https://github.com/soatok/elliptic-to-noble/actions/workflows/ci.yml/badge.svg)](https://github.com/soatok/elliptic-to-noble/actions/workflows/ci.yml)

API-compatible replacement library for migrating from [elliptic](https://github.com/indutny/elliptic) to
[noble-curves](https://github.com/paulmillr/noble-curves).

## Installation

First, add this repository as a dependency in your `package.json` file:

```json5
{
  "dependencies": {
    "elliptic": "@soatok/elliptic-to-noble"
  }
}
```

Then, add this to your package.json to ensure all child dependencies use this shim:

```json5
{
  "overrides": {
    "elliptic": "$elliptic"
  }
}
```

This will prevent the original `elliptic` from being installed (even by dependencies). Instead, an API-compatible shim
(provided in this repository) will be used instead, backed by the much more secure `noble-curves` library.
