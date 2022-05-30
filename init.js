const { approve } = require('./trade');
var usdtAddress = '0x55d398326f99059ff775485246999027b3197955';
var busdAddress = '0xe9e7cea3dedca5984780bafc599bd69add087d56';
var usdcAddress = '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d';

const main = async () => {
  await approve(usdtAddress);
  await approve(busdAddress);
  await approve(usdcAddress);
};

main();
