# PoolD

Daemon to read and write from your pool of data

### Usage

```
src/poold.js start --nodes 3
```

Or start individually, with debug:

```
DEBUG=libp2p:gossipsub src/poold.js start --nodeId 0  --nodeId 1
```

