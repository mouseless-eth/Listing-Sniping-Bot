const ethers = require('ethers');
const abi = require("./abi");
require('dotenv').config();

// setting up .env variables
const MNEMONIC = process.env.MNEMONIC;
const NODEURL = process.env.NODEURL;
const BUYAMT = process.env.BUYAMT;

// setting up node provider and account wallet for signing
const provider = new ethers.providers.JsonRpcProvider(NODEURL);
const wallet = ethers.Wallet.fromMnemonic(MNEMONIC);
const signer = wallet.connect(provider);

const addresses = {
  receiver: signer.address,  
  wETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',  
  factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', 
}

// instantiating Quickswap contracts
const factory = new ethers.Contract(
  addresses.factory,
  abi['factory'],
  signer
);
const router = new ethers.Contract(
  addresses.router,
  abi['router'],
  signer
);

console.log('Signer Address : ', signer.address);
console.log('- - - - - ');
console.log('Sniffing for new pairs');

// checking if the factory contract emits the PairCreated event
factory.on('PairCreated', async (token0, token1, pairAddress) => {
  console.log(`
    New pair detected
    =================
    token0: ${token0}
    token1: ${token1}
    pairAddress: ${pairAddress}
  `);

  // finding the other pair token's address
  // inTokenAddr will always equal wETH's addr
  // outTokenAddr will equal the other token pair's addr
  let inTokenAddr, outTokenAddr;
  if(token0 === addresses.wETH) {
    inTokenAddr = token0; 
    outTokenAddr = token1;
  }
  if(token1 == addresses.wETH) {
    inTokenAddr = token1; 
    outTokenAddr = token0;
  }

  if(typeof inTokenAddr === 'undefined') {
    console.log("not a wETH pair (ignoring it)");
    return;
  }

  // extracting outToken's symbol to check if it equals 'milk'
  const outTokenContract = new ethers.Contract(outTokenAddr, abi['erc20'], provider);
  let outTokenSymbol = await outTokenContract.symbol();

  if(outTokenSymbol.toLowerCase() === 'milk') {
    console.log("Found Milk Contract Addr... Now Waiting For Liquidity To Be Added"); 
    // renaming variables now that we confirm outToken is Milk 
    wethAddr = inTokenAddr;
    milkAddr = outTokenAddr;

    // finding weth's token index in pair contract (either 0 or 1)
    // 0 means weth addr < milk addr
    // 1 means weth addr > milk addr
    let wethIndex = (wethAddr.toLowerCase() < milkAddr.toLowerCase()) ? 0 : 1;

    // waiting for liquidity to be added to the new weth-milk pair
    var timer = setInterval(async () => {
      const pairContract = new ethers.Contract(pairAddress, abi['pair'], provider);
      const rawReserves = await pairContract.getReserves();
      const wethReserves = ethers.utils.formatEther(ethers.BigNumber.from(rawReserves[wethIndex]));

      console.log("wETH reserves : ", wethReserves);
      
      // liquidity has been added once the pairContract weth reserves >= 100weth
      if(wethReserves >= 100) {
        clearInterval(timer);
        console.log("Liquidity Has Been Added To Pool");

        // creating buy transaction
        const amountIn = ethers.utils.parseUnits(BUYAMT, 'ether');
        const amounts = await router.getAmountsOut(amountIn, [wethAddr, milkAddr]);
        const amountOutMin = amounts[1].sub(amounts[1].div(30)); // accept swap as long as change in amt received <30% 
        console.log(`
          Buying new token
          =================
          wethAddr: ${amountIn.toString()} ${wethAddr} 
          milkAddr: ${amountOutMin.toString()} ${milkAddr}
        `);

        // approving the router to transfer our Weth.
        // this is normally done before running this bot to reduce latency but
        // for the sake of simplicity I am including it here 
        const wethContract = new ethers.Contract(wethAddr, abi['erc20'], signer);
       	const approve_weth_tx = await wethContract.approve(addresses.router, "115792089237316195423570985008687907853269984665640564039457584007913129639935");
        const approve_weth_promise = approve_weth_tx.wait();
        const approve_weth_receipt = await approve_weth_promise;
        console.log("approved router to use weth - tx:", approve_weth_receipt.transactionHash);
 
        // sending our transaction
        const tx = await router.swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          [wethAddr, milkAddr],
          addresses.receiver,
          Date.now() + 1000 * 60 * 1, 
          //{
            // tweak these values for faster confirmation
           // gasLimit : 331240,
            //maxFeePerGas : ethers.utils.parseUnits("32", "gwei"),
            //maxPriorityFeePerGas: ethers.utils.parseUnits("32", "gwei")
          //}
        );

        const promise = tx.wait(); 
        const receipt = await promise;
        console.log('Transaction receipt');
        console.log(receipt);
      } 
    }, 1000);
  } 
});
