# Listing Sniping Bot
When new tokens gets listed on a **DEX**, bots are able to detect this and be one of the first to buy the token at a very low price. 

This repo explores this idea by showing an implementation of a bot snipes specific tokens as soon as they are listed. This bot works under the assumption that *the name of the token that we snipe is known before launch.*

## Technolody Stack & Tools
- Javascript (bot script & testing)
- [Ethers.js](https://docs.ethers.io/v5/) (blockchain interaction)
- [Alchemy](https://docs.alchemy.com/alchemy/) (node provider)
- [Ganache-cli](https://github.com/trufflesuite/ganache-cli-archive) (personal local blockchain simulator)
- [Ethernal](https://doc.tryethernal.com/) (local blockchain explorer [optional])

## How To Run
### Installation
To install this repo and all its dependencies run
```
git clone https://github.com/NME-eth/Listing-Sniping-Bot
cd Listing-Sniping-Bot
npm install
```
### Setup + Config
Create a `.env` config file in the project home with the following variables 
- `MNEMONIC` 12 word wallet mnemonic phrase
- `NODE_URL` http url of the node we will connect to 
- `ROUTER_ADDR` dex router address
- `FACTORY_ADDR` dex factory address
- `TOKEN_IN_ADDR` address of token we are sending to router (token we are selling e.g. weth/matic/dai)
- `TOKEN_OUT_NAME` name of the token that we want to **snipe**
- `SELL_AMT` amount of token that we want to send to router 
- `MIN_LIQUIDITY` the minimum amount of liquidity the pool needs for a trade to be executed
- `IMPERSONATE` whale address used for testing to create liquidity pools

an example of `.env` config file 
```
MNEMONIC=<12-work-mnemonic-here>
NODE_URL=<node-provider-url-here>
ROUTER_ADDR=0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D // uni router
FACTORY_ADDR=0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f // uni factory
TOKEN_IN_ADDR=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2 // weth addr
TOKEN_OUT_NAME=<name-of-token-to-buy>
BUY_AMT=10
MIN_LIQUIDITY=100
IMPERSONATE=0xE78388b4CE79068e89Bf8aA7f218eF6b9AB0e9d0 // avax bridge used for testing to send weth
```
>it makes most sense to use a highly liquid token such as weth/matic/dai/... for the `TOKEN_IN_ADDR` so that we won't be hit as hard by slippage

>`MIN_LIQUIDITY` stops the bot from buying fake tokens with the same name as the token we are trying to snipe. Should be pretty high e.g. 200eth

## Testing
The test will be made using a real life token launch example. The 

### Background 
Milk is the native currency for the [Cool Cats](https://www.coolcatsnft.com/) NFT project, the token launched on the **Polygon** Network on **[QuickSwap](https://quickswap.exchange/#/)** through a **Weth/Milk token pair**.

