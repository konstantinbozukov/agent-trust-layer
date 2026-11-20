# Publish `@konstantinbozukov/agent-trust-layer` to npm

Package lives at `packages/core` as **`@konstantinbozukov/agent-trust-layer`**.

**Current public release:** `@konstantinbozukov/agent-trust-layer@0.1.1` is on the npm registry. Install with:

```bash
npm i @konstantinbozukov/agent-trust-layer
```

The legacy unscoped name `agent-trust-layer` is taken on npm by another maintainer — do **not** publish under that name.

## Publishing a new version (human operator only; agents must not publish)

```bash
npm login
cd packages/core
# bump version in packages/core/package.json when appropriate
npm publish --access public
```

`prepublishOnly` runs the TypeScript build (`tsc`). `publishConfig.access` is `public`.

## Install without the registry

Git fallback (dist is committed in the repo):

```bash
npm i "github:konstantinbozukov/agent-trust-layer#path:packages/core"
```

Note: `github:…#path:packages/core` is unreliable on some npm versions; prefer the scoped registry name, or a tarball / local `.tgz`.