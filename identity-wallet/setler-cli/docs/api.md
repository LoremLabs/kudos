# API in use

Setler uses external services to provide the functionality of the wallet. The following services are used:

# Ident Agency

- [Enola](https://www.github.com/loremlabs/kudos/ident-agency/packages/enola) - Implementation of the "Ident Agency", a GraphQL and REST endpoint that provides access to Kudos data, leaderboards, and other identity wallet services. It is part of the Kudos for Content ecosystem which rewards content creators and is the mechanism that users "settle" their kudos for either "fame" or "fortune". "Fame" is a reputation score that is used to rank content creators and "fortune" is a payment that is sent to the content creator.

  - By default the Setler CLI uses the public endpoint at `https://graph.ident.agency`. You can also run your own instance of Enola and point the Setler CLI to that instance.

# External services in use

- [Binance](https://www.binance.com/api/v3/ticker/price?symbol=XRPUSDT) - Binance is used to get the current price of XRP in USD. This is used to calculate the amount of XRP to send when funding the wallet.

- [XRP Ledger](https://xrpl.org/) - The XRP Ledger is used to send and receive payments as well as escrowed payments.
