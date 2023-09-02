# Setler CLI

A CLI version of Setler. Setler is non-custodial identity wallet with built in Kudos support.

## How it works

Setler CLI is a non-custodial identity wallet that is used to send and receive payments as well as _"setling"_ kudos. Setling (intentional new spelling) is the act of distributing a fixed amount to a "pool" of identities. This _pool_ is the accumulation of _kudos_ which includes an identity identifier.

Because the wallet is non-custodial, the user is in control of their own funds and can send and receive payments as well as setle kudos without the need for a third party.

![Screen-Recording-2023-03-25-at-20 03 15](https://user-images.githubusercontent.com/170588/227736633-93f70b05-56d2-4993-9de2-9a446d19404c.gif)

# CLI Commands

## Usage

```
% npx @loremlabs/setler
```

```
% npx @loremlabs/setler help
```

### Wallet

To use you start by creating a wallet. This is a non-custodial wallet that is used to send and receive payments as well as perform the escrowed payments.

Setup a new wallet with:

```
% npx @loremlabs/setler wallet init
```

Then you can fund your wallet with:

```
% npx @loremlabs/setler wallet fund
```

Which (for testnet) will fund the wallet with 1000 XRP.

You can also receive payments to your wallet with:

```
% npx @loremlabs/setler wallet receive
```

### Kudos

You can create kudos with:

```
% npx @loremlabs/setler kudos create
```

This creates the data structure of a `kudos`. You can save it by appending to a file with:

```
% npx @loremlabs/setler kudos create --outFile "kudos.ndjson"
```

### Kudos Pool

Kudos can be stored in a _pool_. This is the accumulation of kudos that you've created. You can create a pool with:

```
% npx @loremlabs/setler pool create
```

### Inking: Storing Kudos in a Pool

You can store or _ink_ kudos in a _pool_ at the ident agency with:

```
% npx @loremlabs/setler pool ink --inFile kudos.ndjson
```

### Create and Ink in one step

You can create and ink kudos in one step with:

```
% npx @loremlabs/setler kudos create --identifier="email:matt@loremlabs.com"  --now | setler pool ink --poolId="AkfENzX4A8nVog5FDh4oGr"
```

### Setle: Distributing Funds to a Kudos Pool

To setle kudos you need to have a wallet setup and funded. You can then setle kudos with:

```
% npx @loremlabs/setler kudos send --poolId POOL_ID
```

### Setle: Distributing Funds to Kudos from a URL

You can also setle kudos from a URL containing an ndjson list of kudos with:

```
% npx @loremlabs/setler kudos send --url https://raw.githubusercontent.com/loremlabs/kudos/main/docs/example-kudos.ndjson
```
