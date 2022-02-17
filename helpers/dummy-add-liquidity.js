const ethers = require('ethers');
const milkInfo = require('./MILK.json');
require('dotenv').config();

// setting up .env variables
const NODEURL = process.env.NODEURL;
const IMPERSONATE = process.env.IMPERSONATE;

const addresses = {
  weth: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',  
  factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', 
  impersonate: IMPERSONATE // random account that we will at on behalf of
}

// setting up node provider and account wallet for signing
const provider = new ethers.providers.JsonRpcProvider(NODEURL);
// setting up the account we want to impersonate
const signer = provider.getSigner(addresses.impersonate);

// all contract abis
const routerAbi = [
	"function addLiquidity(address tokenA, address tokenB, uint amountADesired, uint amountBDesired, uint amountAMin, uint amountBMin, address to, uint deadline) external returns (uint amountA, uint amountB, uint liquidity)",
];
const factoryAbi = [
	"function createPair(address tokenA, address tokenB) external returns (address pair)",
	"function getPair(address tokenA, address tokenB) external view returns (address pair)",
];
const erc20Abi = [
	"function approve(address spender, uint256 amount) external returns (bool)",
  "function allowance(address owner, address spender) external view returns (uint256)",
  "function balanceOf(address account) external view returns (uint256)"
];
const pairAbi = [
	'function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)',
];

let bytecode = milkInfo['bytecode'];
let abi = milkInfo['abi'];

const MilkContract = new ethers.ContractFactory(abi, bytecode, signer);

async function main() {
  // deploying TEST MILK
  await createLoadingMsg("Deploying MILK Contract", "Deployed MILK Contract", 3000);
  const milkContract = await MilkContract.deploy(ethers.utils.parseUnits("60000000"));
  let deploy_receipt = await milkContract.deployTransaction.wait();
  console.log(`Deployed To: ${milkContract.address}`);
  console.log(`(tx:${deploy_receipt.transactionHash})\n\n`);

  // creating new pair
  await createLoadingMsg("Creating Weth/Milk Trading Pair", "Created Weth/Milk Trading Pair", 2500);
	const factory = new ethers.Contract(addresses.factory, factoryAbi, signer);

  const make_pair_tx = await factory.createPair(addresses.weth, milkContract.address);
  const make_pair_promise = make_pair_tx.wait();
  const make_pair_receipt = await make_pair_promise;
  console.log("Pair Address:", await factory.getPair(addresses.weth, milkContract.address));
  console.log(`(tx:${make_pair_receipt.transactionHash})\n\n`);
  

  // adding liquidity to new pair
  await createLoadingMsg("Adding Initial Liquditiy To Weth/Milk Pool", "Added Initial Liquidity To Weth/Milk Pool", 6000);
	const wEthContract = new ethers.Contract(addresses.weth, erc20Abi, signer);
  const approve_weth_tx = await wEthContract.approve(addresses.router, "115792089237316195423570985008687907853269984665640564039457584007913129639935");
  const approve_weth_promise = approve_weth_tx.wait();
  const approve_weth_receipt = await approve_weth_promise;

  const approve_milk_tx = await milkContract.approve(addresses.router, "115792089237316195423570985008687907853269984665640564039457584007913129639935");
  const approve_milk_promise = approve_milk_tx.wait();
  const approve_milk_receipt = await approve_milk_promise;

  const router = new ethers.Contract(addresses.router, routerAbi, signer);
  const add_liquidity_tx = await router.addLiquidity(
    addresses.weth,
    milkContract.address,
    ethers.utils.parseUnits("200"),
    ethers.utils.parseUnits("60000000"),
    ethers.utils.parseUnits("1"),
    ethers.utils.parseUnits("1"),
    addresses.impersonate,
    Date.now() + 1000 * 60 * 1,
  );

  const add_liquidity_promise = await add_liquidity_tx.wait();
  const add_liquidity_receipt = await add_liquidity_promise;

  // verbose log
  const pairAddr = await factory.getPair(addresses.weth, milkContract.address);
  const pairContract = new ethers.Contract(pairAddr, pairAbi, signer);
  [token0Reserves, token1Reserves] = await pairContract.getReserves();
  [wethReserves, milkReserves] = (addresses.weth.toLowerCase() < milkContract.address.toLowerCase()) ? 
    [token0Reserves, token1Reserves] : [token1Reserves, token0Reserves] ; 
  console.log(`WETH Reserves: ${ethers.utils.formatUnits(wethReserves)}`);
  console.log(`MILK Reserves: ${ethers.utils.formatUnits(milkReserves)}`);
  console.log(`(tx:${add_liquidity_receipt.transactionHash})\n\n`);
};

// create the loading effect
// @param startMsg the message to print whilst loading
// @param endMsg the message to print once loading is done
// @returns Promise stalls program for 4 seconds
const createLoadingMsg = (startMsg, endMsg, seconds) => {
  let loader = loadingAnimation(startMsg);
  return new Promise( resolve => {
    setTimeout(() => {
      clearInterval(loader); 

      // clearing loading line
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      console.log(endMsg);
      console.log("= ".repeat(Math.ceil(endMsg.length / 2) + 1));
      resolve();
    }, seconds);
  });
};

// function to handle loading animation
function loadingAnimation(
    text = "",
    chars = ["⠙", "⠘", "⠰", "⠴", "⠤", "⠦", "⠆", "⠃", "⠋", "⠉"],
    delay = 100
) {
    let x = 0;

    return setInterval(function() {
        process.stdout.write("\r" + chars[x++] + " " + text);
        x = x % chars.length;
    }, delay);
}

main();
