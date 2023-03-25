## Build

```
% npm run build
```

This will run the mermaid, html, and pdf builds in all directories starting with three digits (000) and containing a .md file.

## Install

```
npm i
npm install --global mermaid-filter
```


## Kudos.latex template

You can edit the various pandoc settings:

```
pandoc -D latex > kudos.latex  
```

Our default edited paragraph spacing, increasing it.

