# Mapping Data

You can add your own mappings here. All `.yml` files share the same namespace.

Format:

```
dnslink:
    key: value
    key2: value2
```

All keys need to be globally unique.

For instance:

```
dnslink:
    test: /ipfs/QmTaEZMHiM8eukWs2EQ7BwFyyMdDHdkLEdfiiduqCwhX22
```

Would convert to:

```
_dnslink.test.lorem.computer. 30 IN	TXT	"dnslink=/ipfs/QmTaEZMHiM8eukWs2EQ7BwFyyMdDHdkLEdfiiduqCwhX22"
```
