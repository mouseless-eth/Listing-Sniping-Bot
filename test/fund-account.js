const ethers = require('ethers');
require('dotenv').config();

if(process.argv.length < 4)
  usage();

// setting up .env variables
const NODEURL = process.env.NODEURL;
const IMPERSONATE = process.env.IMPERSONATE;

// getting command line argument
let receiverAddr = process.argv[2]; // the addr we want to fund
let fundAmount = process.argv[3]; // the amount we want to fund in ETH

let wethAddr = '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619';

// setting up node provider and account wallet for signing
const provider = new ethers.providers.JsonRpcProvider(NODEURL);
// setting up the account we want to impersonate
const signer = provider.getSigner(IMPERSONATE);

const erc20Abi = [
  "function transfer(address to, uint256 amount) external returns (bool)",
  "function balanceOf(address account) external view returns (uint256)"
];

function usage() {
  console.log("usage : ");
  console.log("node helper/fund-account.js <Reciever Addr> <Amount>")
  exit();
}

async function main() {
  const wethContract = new ethers.Contract(wethAddr, erc20Abi, signer);
  let senderOldBalance = ethers.utils.formatEther(await wethContract.balanceOf(IMPERSONATE)); 
  let receiverOldBalance = ethers.utils.formatEther(await wethContract.balanceOf(receiverAddr)); 
  let tx = await wethContract.transfer(receiverAddr, ethers.utils.parseUnits(fundAmount.toString()));
  tx.wait();

  console.log(`unlocked address has given receiver a total of ${fundAmount} ETH`);
  console.log("= = = = = = = = = =");
  console.log(`(unlocked) ${IMPERSONATE} old balance : ${senderOldBalance}`);
  console.log(`(receiver) ${receiverAddr} old balance : ${receiverOldBalance}`);
  console.log()
  console.log(`(unlocked)${IMPERSONATE} new balance : ${ethers.utils.formatEther(await wethContract.balanceOf(IMPERSONATE))}`);
  console.log(`(receiver)${receiverAddr} new balance : ${ethers.utils.formatEther(await wethContract.balanceOf(receiverAddr))}`);
};

main();
