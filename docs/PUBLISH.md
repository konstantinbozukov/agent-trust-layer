# Publish agent-trust-layer to npm

Package is ready at `packages/core` as **`agent-trust-layer@0.1.1`**.

This machine was not logged into npm (`npm whoami` → ENEEDAUTH). One-time:

```bash
npm login
cd E:\AI\agent-trust-layer\packages\core
npm publish --access public
```

Then anywhere:

```bash
npm i agent-trust-layer
```

Until then, install from GitHub (dist is committed):

```bash
npm i "https://github.com/konstantinbozukov/agent-trust-layer/tarball/master"
# or use the packed file: agent-trust-layer-0.1.1.tgz from packages/core
```

Note: `github:…#path:packages/core` is unreliable on some npm versions; prefer npm registry or the tarball URL / local `.tgz`.
