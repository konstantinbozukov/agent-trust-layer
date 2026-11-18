# Publish `@konstantinbozukov/agent-trust-layer` to npm

Package lives at `packages/core` as **`@konstantinbozukov/agent-trust-layer@0.1.1`**.

The legacy unscoped name `agent-trust-layer` is taken on npm by another maintainer — do **not** publish under that name.

One-time (human operator only; agents must not publish):

```bash
npm login
cd packages/core
npm publish --access public
```

Then:

```bash
npm i @konstantinbozukov/agent-trust-layer
```

Until publish, install from GitHub (dist is committed):

```bash
npm i "github:konstantinbozukov/agent-trust-layer#path:packages/core"
```

Note: `github:…#path:packages/core` is unreliable on some npm versions; prefer the scoped registry name after publish, or a tarball / local `.tgz`.