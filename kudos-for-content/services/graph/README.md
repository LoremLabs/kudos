# Send to Social

Use Social Media usernames to send money.

## Overview

This is a simple service that allows you to send money to a social media user. It uses the XRPL to receive funds and then sends the funds to the social media user
if we know the payment account for the user.

## How it works

An escrowed payment, sent to our "payment address", is created on the XRPL. This transaction is created with a `did` encoded tag of the identifier (username, email, etc.) of the person
they want to send the funds to. The escrow's pre-image and identifier are sent to api so that it can fulfill the escrow when the identifier adds their payment addresss. If the identifier does not add their payment address, the escrow will expire and the funds will be returned to the sender.

## Basic flow

1. Create an account on the XRPL
2. Fund the account with enough XRP to cover the escrowed payment
3. Create a DID from the identifier you want to send the funds to (`did:kudos:email:...` or `did:kudos:twitter:...`)
4. Issue the `send social` command and follow the prompts

```bash
$ setler send social did:kudos:email:matt@loremlabs.com ...
```

## What happens

1. The escrowed payment is received by the XRPL.
2. Th watcher service watches our payment address for new transactions.
3. When we receive a transaction, we check to see if it is a DID we know about. If it is, we check to see if the DID has a payment address associated with it.
4. If the DID has a payment address in our database, we fulfill the escrowed payment with the pre-image. We then send the funds to the DID's payment address.
5. If the DID does not have a payment address in our database, the funds can be returned when the escrow expires.

## Overview Architecture

![Architecture](./docs/send-to-social-overview.svg)
