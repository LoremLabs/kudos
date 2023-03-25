## Dev Setup

`pnpm` (v7) is required.

Install dependencies

```bash
pnpm i -r
```

### Make `dosku`, `dosku.basic` commands available globally

```bash
cd services/dosku-cli && pnpm link --global; cd -
cd services/dosku-cli-basic && pnpm link --global; cd -
```

#### To unlink

```bash
pnpm remove -g @kudos-protocol/dosku-cli @kudos-protocol/dosku-cli-basic
```
