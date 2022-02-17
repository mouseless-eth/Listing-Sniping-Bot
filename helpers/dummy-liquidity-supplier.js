const ethers = require('ethers');
const milkInfo = require('./MILK.json');
require('dotenv').config();

// setting up .env variables
const NODEURL = process.env.NODEURL;
const IMPERSONATE = process.env.IMPERSONATE_0;

const addresses = {
  wETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',  
  factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', 
  impersonate: IMPERSONATE // random account that we will at on behalf of
}

// setting up node provider and account wallet for signing
const provider = new ethers.providers.JsonRpcProvider(NODEURL);
// setting up the account we want to impersonate
const signer = provider.getSigner(addresses.impersonate);


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

let bytecode = milkInfo['bytecode'];
let abi = milkInfo['abi'];

const MilkContract = new ethers.ContractFactory(abi, bytecode, signer);

async function main() {
  // deploying TEST MILK
  const milkContract = await MilkContract.deploy(ethers.utils.parseUnits("60000000"));
  console.log("milk deployed to ",milkContract.address);

  // creating new pair
	const factory = new ethers.Contract(addresses.factory, factoryAbi, signer);

  const make_pair_tx = await factory.createPair(addresses.wETH, milkContract.address);
  const make_pair_promise = make_pair_tx.wait();
  const make_pair_receipt = await make_pair_promise;
  console.log("new milk + weth pair created - tx:", make_pair_receipt.transactionHash);

  // adding liquidity to new pair
	const wEthContract = new ethers.Contract(addresses.wETH, erc20Abi, signer);
  const approve_weth_tx = await wEthContract.approve(addresses.router, "115792089237316195423570985008687907853269984665640564039457584007913129639935");
  const approve_weth_promise = approve_weth_tx.wait();
  const approve_weth_receipt = await approve_weth_promise;
  console.log("approved router to use weth - tx:", approve_weth_receipt.transactionHash);

  const approve_milk_tx = await milkContract.approve(addresses.router, "115792089237316195423570985008687907853269984665640564039457584007913129639935");
  const approve_milk_promise = approve_milk_tx.wait();
  const approve_milk_receipt = await approve_milk_promise;
  console.log("approved router to use milk ", approve_milk_receipt.transactionHash);

  console.log("allowance:", await milkContract.allowance(addresses.impersonate, addresses.router));
  console.log("allowance:", await wEthContract.allowance(addresses.impersonate, addresses.router));
  console.log();
  console.log("weth balance: ", await wEthContract.balanceOf(addresses.impersonate));
  console.log("milk balance: ", await milkContract.balanceOf(addresses.impersonate));
  console.log();
  console.log("ether deposit: ",ethers.utils.parseUnits("200"));
  console.log("milk deposit: ",ethers.utils.parseUnits("50000"));
  const router = new ethers.Contract(addresses.router, routerAbi, signer);
  const add_liquidity_tx = await router.addLiquidity(
    addresses.wETH,
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
  console.log(add_liquidity_receipt);
}

main();
