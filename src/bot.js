const ethers = require('ethers');
const abi = require("./abi");
require('dotenv').config();

// setting up .env variables
const MNEMONIC = process.env.MNEMONIC;
const NODE_URL = process.env.NODE_URL;
const SELL_AMT = process.env.SELL_AMT;
const MIN_LIQUIDITY = process.env.MIN_LIQUIDITY;
const TOKEN_OUT_NAME = process.env.TOKEN_OUT_NAME;

// setting up node provider and account wallet for signing
const provider = new ethers.providers.JsonRpcProvider(NODE_URL);
const wallet = ethers.Wallet.fromMnemonic(MNEMONIC);
const signer = wallet.connect(provider);

const addresses = {
  receiver: signer.address,  
  tokenIn: process.env.TOKEN_IN_ADDR,
  router: process.env.ROUTER_ADDR,
  factory: process.env.FACTORY_ADDR, 
}

// instantiating our contracts
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
const tokenInContract = new ethers.Contract(
  addresses.tokenIn,
  abi['erc20'],
  signer
);

console.log('Signer Address : ', signer.address);
console.log('- - - - - ');
console.log('Waiting for new pairs');

// checking if the factory contract emits the PairCreated event
factory.on('PairCreated', async (token0, token1, pairAddress) => {

  // setting tokenIn's name
  tokenInSymbol = await tokenInContract.symbol();

  console.log(`
    New pair detected
    =================
    token0: ${token0}
    token1: ${token1}
    pairAddress: ${pairAddress}
  `);

  // finding the other pair token's address
  // tokenIn is the token address we are sending to router (token we are selling- deposit to liquidity pool)
  // tokenOut is the token address we are receive from trade (the token we are buying)
  let tokenIn, tokenOut;
  if(token0 === addresses.tokenIn) {
    tokenIn = token0; 
    tokenOut = token1;
  }
  if(token1 == addresses.tokenIn) {
    tokenIn = token1; 
    tokenOut = token0;
  }

  if(typeof tokenIn === 'undefined') {
    console.log(`not a ${tokenInSymbol} pair (ignoring it)`);
    return;
  }

  // extracting outToken's symbol to check if it equals the token we are looking for
  const tokenOutContract = new ethers.Contract(tokenOut, abi['erc20'], provider);
  let outTokenSymbol = await tokenOutContract.symbol();

  if(outTokenSymbol.toLowerCase() === TOKEN_OUT_NAME.toLowerCase()) {
    console.log(`Found ${TOKEN_OUT_NAME}'s Contract Addr... Now Waiting For Liquidity To Be Added`); 

    // finding tokenIn's index in pair contrat (either 0 or 1)
    // 0 means tokenIn addr < tokenOut addr
    // 1 means tokenIn addr > tokenOut addr
    let tokenInIndex = (tokenIn.toLowerCase() < tokenOut.toLowerCase()) ? 0 : 1;

    // waiting for liquidity to be added to the new the pair we found
    var timer = setInterval(async () => {
      const pairContract = new ethers.Contract(pairAddress, abi['pair'], provider);
      const rawReserves = await pairContract.getReserves();
      const tokenInReserves = ethers.utils.formatEther(ethers.BigNumber.from(rawReserves[tokenInIndex]));

      console.log(`${tokenInSymbol} reserves : ${tokenInReserves}`);
      
      // liquidity has been added once the pairContract tokenIn reserves >= MIN_LIQUIDITY
      if(tokenInReserves >= MIN_LIQUIDITY) {
        clearInterval(timer);
        console.log("\nSufficient Liquidity Has Been Added To Pool\n");

        // creating receive transaction
        const amountIn = ethers.utils.parseUnits(SELL_AMT, 'ether');
        const amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut]);
        const amountOutMin = amounts[1].sub(amounts[1].div(5)); // accept swap as long as change in amt received <5% 
        
        // approving the router to transfer our tokenIn.
        // this is normally done before running this bot to reduce latency but
        // for the sake of simplicity I am including it here 
       	const approve_tokenIn_tx = await tokenInContract.approve(addresses.router, "115792089237316195423570985008687907853269984665640564039457584007913129639935");
        const approve_tokenIn_promise = approve_tokenIn_tx.wait();
        const approve_tokenIn_receipt = await approve_tokenIn_promise;
 
        // sending our transaction
        const tx = await router.swapExactTokensForTokens(
          amountIn,
          amountOutMin,
          [tokenIn, tokenOut],
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
        let receipt = await promise;

        console.log("= ".repeat(12));
        console.log("[Swap Succesfully Made]")
        console.log("= ".repeat(12)+"\n");
        console.log(`sent \t\t: ${ethers.utils.formatEther(amountIn.toString())} ${tokenInSymbol}`);
        console.log(`received\t: ${ethers.utils.formatEther(await tokenOutContract.balanceOf(signer.address))} ${TOKEN_OUT_NAME}`);
        console.log("- ".repeat(12));
        console.log(`(tx:${receipt.transactionHash})`);
      } 
    }, 1000);
  } 
});
