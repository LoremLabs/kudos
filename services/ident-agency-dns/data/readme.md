# Mapping Data

This is for quick development of dns services for XRP / Identity mapping.

Filenames correspond with the DNS query type. For instance, `txt.yml` will be for text queries.

Format:

```
tree:
    key: value
    key2: value2
```

All keys need to be globally unique.

For instance:

```
_kudos:
    test: XRPaddressHere
```

Would convert to:

```
_kudos.test 30 IN	TXT	"XRPaddressHere"
```
