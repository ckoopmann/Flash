# Flash
Flash is a USD payment app on blockchain rails.
It's core goal is to provide a maximally simplified UI without compromising on decentralization.
In addition  it lets users earn yield on their balance protecting their purchasing power.

 
## Disclaimer
This code is being provided as is. No guarantee, representation or warranty is being made, express or implied, as to the safety or correctness of the code. It has not been audited and as such there can be no assurance it will work as intended, and users may experience delays, failures, errors, omissions or loss of transmitted information.

## How does it work ? 
Flash achieves a simple UI by combining easy signup / authentication (via [Web3Auth](https://web3auth.io/)) with a gasless settlement logic based on [ERC2612](https://eips.ethereum.org/EIPS/eip-2612) permit signatures that are shared via QR Code and then submitted to the [Gelato Relay](https://docs.gelato.network/developer-services/relay).
Balances and payments are handled in the SDai Token which enables users to earn yield via the [Dai Savings  Rate](https://docs.sparkprotocol.io/faq/dai-savings-rate-dsr).

## Repo structore
- [frontend](/frontend): Frontend implementation as a Next.js app
- [contracts](/contracts): Smart contract for payment settlement
- [subgraph](/subgraph): [Subgraph](https://thegraph.com/) used for querying users payment history
