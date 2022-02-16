const ethers = require('ethers');
const abiJson = require("./abi");
require('dotenv').config();

// Setting up .env variables
const MNEMONIC = process.env.MNEMONIC;
const NODEURL = process.env.NODEURL;

// Setting up node provider and account wallet for signing
const provider = new ethers.providers.JsonRpcProvider(NODEURL);
const wallet = ethers.Wallet.fromMnemonic(MNEMONIC);
const account = wallet.connect(provider);

const addresses = {
  receiver: account.address,  
  wETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',  
  factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', 
}

// Parsing contract ABI from abi.json file
const abi = JSON.parse(abiJson);

// Instantiating Quickswap contracts
const factory = new ethers.Contract(
  addresses.factory,
  abi['factory'],
  account
);
const router = new ethers.Contract(
  addresses.router,
  abi['router'],
  account
);

console.log('Signer Account : ', account.address);
console.log('- '*5);
console.log('Sniffing for new pairs');

factory.on('PairCreated', async (token0, token1, pairAddress) => {
  console.log(`
    New pair detected
    =================
    token0: ${token0}
    token1: ${token1}
    pairAddress: ${pairAddress}
  `);

  let tokenIn, tokenOut;
  let wEthIndex;
  if(token0 === addresses.wETH) {
    tokenIn = token0; 
    tokenOut = token1;
    wEthIndex = 0;
  }

  if(token1 == addresses.wETH) {
    tokenIn = token1; 
    tokenOut = token0;
    wEthIndex = 1;
  }

  // The incoming token is not wETH (we are not interested in this pair)
  if(typeof tokenIn === 'undefined') {
    return;
  }

  const tokenOutContract = new ethers.Contract(tokenOut, erc20_abi, provider);
  let tokenOutSymbol = await tokenOutContract.symbol();

  if(tokenOutSymbol.toLowerCase() === 'milk') {
    console.log("Found Milk Now Sniping Liquidity");
    setInterval(async () => {
      const pairContract = new ethers.Contract(pairAddress, abi['pair'], provider);
      const rawReserves = await pairContract.getReserves();
      const wEthReserves = ethers.utils.formatEther(ethers.BigNumber.from(rawReserves[wEthIndex]));

      console.log("Reserves ", wEthReserves);
      
      if(wEthReserves >= 100) {
          console.log("Liquidity Has Been Added");
          const amountIn = ethers.utils.parseUnits('7.5', 'ether');
          const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
          const amountOutMin = amounts[1].sub(amounts[1].div(70));
          console.log(`
            Buying new token
            =================
            tokenIn: ${amountIn.toString()} ${tokenIn} (wETH)
            tokenOut: ${amountOutMin.toString()} ${tokenOut}
          `);

          const tx = await router.swapExactTokensForTokens(
            amountIn,
            amountOutMin,
            [tokenIn, tokenOut],
            addresses.receiver,
            Date.now() + 1000 * 60 * 1, 
            {
              gasLimit : 250107,
              maxFeePerGas : ethers.parseUints(200000, "gwei"),
              maxPriorityFeePerGas: ethers.parseUnits(255000, "gwei")
            }
          );

          const receipt = await tx.wait(); 
          console.log('Transaction receipt');
          console.log(receipt);
        } 
    }, 1000);
  } 
});
