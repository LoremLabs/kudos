# Send to Social (CLI)

![image](https://user-images.githubusercontent.com/170588/228046344-7e852b78-b91a-4de6-9e94-9575dc013312.png)

Use existing usernames (social media, email, etc.) to send money. This is a hackathon project for the [Unlocking the Potential of XRP Ledger Hackathon](https://unlockingxrpl.devpost.com/?utm_campaign=send-to-social).

## Overview

This is a simple service that allows you to send money to a user who may not yet have an XRP address. It's implemented as a command line tool that creates a non-custodial wallet as well as a backend service that watches for incoming payments and fulfills escrowed payments.

## How it works

To send money to an email for example, you'd issue a command requesting to send money to Distributed Identifiers (DIDs) which can be associated with a social media account or email address. The tool uses the escrow functionality of the XRPL to set aside funds, notifies our backend of the new user, and later creates a payment when we know the payment account for the user.

![Screen-Recording-2023-03-25-at-20 03 15](https://user-images.githubusercontent.com/170588/227736633-93f70b05-56d2-4993-9de2-9a446d19404c.gif)

# Send to Social CLI

This is a simple cli tool to help us implement the send-to-social idea.

## Usage

```
% npx @loremlabs/send-to-social
```

```
% npx @loremlabs/send-to-social help
```

### Wallet

To use you start by creating a wallet. This is a non-custodial wallet that is used to send and receive payments as well as perform the escrowed payments.

Setup a new wallet with:

```
% npx @loremlabs/send-to-social wallet init
```

Then you can fund your wallet with:

```
% npx @loremlabs/send-to-social wallet fund
```

Which (for testnet) will fund the wallet with 1000 XRP.

You can also receive payments to your wallet with:

```
% npx @loremlabs/send-to-social wallet receive
```

### Social Send

To send a social send you need to have a wallet setup and funded. You can then send a social send with:

```
% npx @loremlabs/send-to-social send social did:kudos:email:YOUR_EMAIL@YOUR_DOMAIN
```

```
% npx @loremlabs/send-to-social send social did:kudos:email:mankins+demo1@gmail.com did:kudos:email:matt+demo2@loremlabs.com...
```

## Repo Organization

The main repo for this project is at [loremlabs/sendtosocial](https://github.com/loremlabs/sendtosocial). The command line tool is in the `commands/setler-cli` directory and what is published to `npm`. The backend service is in the `src` directory.
