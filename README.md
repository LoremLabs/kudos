# Kudos for Code GitHub Action

GitHub Action for https://github.com/LoremLabs/kudos-for-code

## Example

```yaml
name: Kudos
on:
  push: { branches: ["main"] }

jobs:
  kudos:
    name: Find contributors and Ink Kudos
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm i # required as we search package.json files through node_modules folder (and rootg)
      - uses: LoremLabs/kudos-for-code-action@main
```
