# Did It (Distributed)

This implements a network to store DIDs, Documents, and other bits as required to persist Kudos.

### Usage

```
src/diditd.js start --nodes 3
```

Or start individually, with debug:

```
DEBUG=libp2p:gossipsub src/diditd.js start --nodeId 0  --nodeId 1
```
