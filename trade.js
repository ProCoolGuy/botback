const Web3 = require('web3');
const abi = require('./abi/routeAbi');
const testAbi = require('./abi/testAbi');
const tokenAbi = require('./abi/tokenAbi');
const BN = require('bn.js');
require('dotenv').config();

const rpcURL = 'https://bsc-dataseed.binance.org/';
// const testURL = 'https://rinkeby.infura.io/v3/9d001c94ec7c434dab3b0cc4d0bf4dc0';

const routerAddress = '0x10ED43C718714eb63d5aA57B78B54704E256024E';
// const testAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

const web3 = new Web3(rpcURL);
var routeContract = new web3.eth.Contract(abi, routerAddress);
var wbnbAddress = '0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c';
//usdtAddress, batAddress, weth, cart
// testAdd = [
//   '0x3b00ef435fa4fcff5c209a37d1f3dcff37c705ad',
//   '0xda5b056cfb861282b4b59d29c9b395bcc238d29b',
//   '0xc778417E063141139Fce010982780140Aa0cD5Ab',
//   '0x20438c3f67a541e111df5d89c4179cd71406aff7',
// ];

let approveMax = new BN(
  'ffffffffffffffffffffffffffffffffffffffffffffffffff',
  16
);

exports.buyWithTokens = async (token0, token1, amount) => {
  let amountIn = new BN(10).pow(new BN(18)).mul(new BN(amount)).toString();
  console.log('POINT A');
  const account = await web3.eth.accounts.privateKeyToAccount(process.env.key);
  console.log('POINT B');
  let result = routeContract.methods
    .swapExactTokensForTokens(
      amountIn,
      0,
      [token1, token0],
      account.address,
      Math.round(new Date().getTime() / 1000) + 3600 * 3
    )
    .encodeABI();
  console.log('POINT C');

  const tx = {
    from: account.address,
    to: routerAddress,
    gas: '200000',
    data: result,
  };

  const dataSigned = await account.signTransaction(tx);
  console.log('POINT D');

  result = await web3.eth.sendSignedTransaction(dataSigned.rawTransaction);
};

exports.buyWithEth = async (token0, price, amount) => {
  console.log('POINT A');

  const account = await web3.eth.accounts.privateKeyToAccount(process.env.key);
  let sendValue = new BN(10)
    .pow(new BN(18))
    .div(new BN(price))
    .mul(new BN(amount))
    .toString();

  console.log('POINT B');
  let result = routeContract.methods
    .swapExactETHForTokens(
      0,
      [wbnbAddress, token0],
      account.address,
      Math.round(new Date().getTime() / 1000) + 3600 * 3
    )
    .encodeABI();
  console.log('POINT C');

  const tx = {
    from: account.address,
    to: routerAddress,
    value: sendValue,
    gas: '200000',
    data: result,
  };

  const dataSigned = await account.signTransaction(tx);
  console.log('POINT D');

  result = await web3.eth.sendSignedTransaction(dataSigned.rawTransaction);
};

exports.approve = async (token) => {
  var tokenContract = new web3.eth.Contract(tokenAbi, token);
  console.log('POINT A');
  const account = await web3.eth.accounts.privateKeyToAccount(process.env.key);
  console.log('POINT B');
  let result = tokenContract.methods
    .approve(routerAddress, approveMax)
    .encodeABI();
  console.log('POINT C');

  const tx = {
    from: account.address,
    to: token,
    gas: '200000',
    data: result,
  };

  const dataSigned = await account.signTransaction(tx);
  console.log('POINT D');

  result = await web3.eth.sendSignedTransaction(dataSigned.rawTransaction);
};

exports.sellToTokens = async (token0, token1) => {
  console.log('POINT A');

  const account = await web3.eth.accounts.privateKeyToAccount(process.env.key);
  var tokenContract = new web3.eth.Contract(tokenAbi, token0);
  let sendValue = await tokenContract.methods.balanceOf(account.address).call();
  console.log(sendValue);

  console.log('POINT B');

  let result = routeContract.methods
    .swapExactTokensForTokens(
      sendValue,
      0,
      [token0, token1],
      account.address,
      Math.round(new Date().getTime() / 1000) + 3600 * 3
    )
    .encodeABI();
  console.log('POINT C');

  const tx = {
    from: account.address,
    to: routerAddress,
    gas: '200000',
    data: result,
  };

  const dataSigned = await account.signTransaction(tx);
  console.log('POINT D');

  result = await web3.eth.sendSignedTransaction(dataSigned.rawTransaction);
};

exports.sellToEth = async (token0) => {
  console.log('POINT A');

  const account = await web3.eth.accounts.privateKeyToAccount(process.env.key);
  var tokenContract = new web3.eth.Contract(tokenAbi, token0);
  console.log('ewrewjrwjrpoijtsponegr[gnesoirng', token0);
  let sendValue = await tokenContract.methods.balanceOf(account.address).call();
  console.log(sendValue);

  console.log('POINT B');
  let result = routeContract.methods
    .swapExactTokensForETH(
      sendValue,
      0,
      [token0, wbnbAddress],
      account.address,
      Math.round(new Date().getTime() / 1000) + 3600 * 3
    )
    .encodeABI();
  console.log('POINT C');

  const tx = {
    from: account.address,
    to: routerAddress,
    gas: '200000',
    data: result,
  };

  const dataSigned = await account.signTransaction(tx);
  console.log('POINT D');

  result = await web3.eth.sendSignedTransaction(dataSigned.rawTransaction);
};
