<img width="1111" alt="Screen Shot 2022-03-28 at 11 27 40 PM" src="https://user-images.githubusercontent.com/170588/160490271-ffdfb4f7-acd3-499a-9184-185cbf7deb9f.png">

# Kudos for Code

Kudos for Code enables programmers to automatically get paid for their open source contributions. Kudos is a scheme for rewarding creation while keeping the best parts of the “free Internet”. End users fund their accounts with a monthly fee which will be proportionally distributed to all kudos they generate for that month.

Integrated into the build process via Kudos for Code, kudos are created per git contributor and added to the XRPL.




## Services

Kudos is composed of several services: 

- `Ident.Agency` maps Social Identifiers (email, url, twitter, etc.) to an XRPL Address.
- `Kudos Builder` is a GitHub Action that parses contributors from a code base.
- `Kudos Inker` is a process that takes a contributor file and records Kudos transactions.
- `Kudos Exchange` takes care of settling a user's balance on a monthly basis, converting between XRP and off-ledger balances.


### Ident.Agency

DNS-based lookup service to map emails, handles, and other identifiers to a payment address. (XRP Account, etc.)

```
% dig @127.0.0.1 -p5053 -t txt _kudos.mankins.twitter.ident.agency

;; QUESTION SECTION:
;_kudos.mankins.twitter.ident.agency. IN	TXT

;; ANSWER SECTION:
_kudos.mankins.twitter.ident.agency. 30	IN TXT	"rrrrrrrrrrrrrrrrrrrrBZbvji"
```

