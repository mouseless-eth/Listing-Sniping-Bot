const ethers = require('ethers');
const milkInfo = require('./MILK.json');
require('dotenv').config();

const addresses = {
  wETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
  router: '0xa5E0829CaCEd8fFDD4De3c43696c57F7D7A678ff',  
  factory: '0x5757371414417b8C6CAad45bAeF941aBc7d3Ab32', 
  impersonate: '0x3EDC6fE5e041B9ED01e35CD644b395f6419A2f8a'
}

let bytecode = milkInfo['bytecode'];
let abi = milkInfo['abi'];

// setting up .env variables
const MNEMONIC = process.env.MNEMONIC;
const NODEURL = process.env.NODEURL;

// setting up node provider and account wallet for signing
const provider = new ethers.providers.JsonRpcProvider(NODEURL);
// setting up the account we want to impersonate
const signer = provider.getSigner(addresses.impersonate);

const MilkContract = new ethers.ContractFactory(abi, bytecode, signer);

const factoryAbi = [
	"function createPair(address tokenA, address tokenB) external returns (address pair)",
];

async function main() {
  // deploying TEST MILK
  const milkContract = await MilkContract.deploy(60000000);
  console.log("milk deployed to ",milkContract.address);

  // creating new pair
	const factory = new ethers.Contract(addresses.factory, factoryAbi, signer);

  const tx = await factory.createPair(addresses.wETH, milkContract.address);
  const receipt = tx.wait();
  console.log(receipt);

}

main();
