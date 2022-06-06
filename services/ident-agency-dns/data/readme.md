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

## Dig

```
% dig @127.0.0.1 -p5053 -t txt _kudos.mankins.twitter.ident.agency
```

```
;; QUESTION SECTION:
;_kudos.mankins.twitter.ident.agency. IN	TXT

;; ANSWER SECTION:
_kudos.mankins.twitter.ident.agency. 30	IN TXT	"rrrrrrrrrrrrrrrrrrrrBZbvji"
```