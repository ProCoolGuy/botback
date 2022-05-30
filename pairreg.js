const Web3 = require('web3');
const abi = require('./abi/panAbi');
const mysql = require('mysql');
const { approve } = require('./trade');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'newpairs',
});
connection.connect();

const rpcURL = 'https://bsc-dataseed.binance.org/';

const web3 = new Web3(rpcURL);
var firstBlockNumber;

var usdtAddress = 0x55d398326f99059ff775485246999027b3197955;
var busdAddress = 0xe9e7cea3dedca5984780bafc599bd69add087d56;
var wbnbAddress = 0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c;
var usdcAddress = 0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d;
var panContract = new web3.eth.Contract(
  abi,
  '0xcA143Ce32Fe78f1f7019d7d551a6402fC5350c73'
);

const getNewPair = async () => {
  const events = await panContract.getPastEvents(
    'PairCreated',
    {
      fromBlock: firstBlockNumber,
      toBlock: 'latest',
    }
    // function (error, events) {
    //   console.log(events);
    // }
  );
  console.log(firstBlockNumber);
  const length = events.length;
  if (length > 0) {
    firstBlockNumber = events[length - 1].blockNumber + 1;
    for (let i = 0; i < length; i++) {
      let token0 = events[i].returnValues.token0;
      let token1 = events[i].returnValues.token1;

      if (
        token0 == wbnbAddress ||
        token0 == usdtAddress ||
        token0 == usdcAddress ||
        token0 == busdAddress
      ) {
        [token0, token1] = [token1, token0];
      }

      if (
        token1 != wbnbAddress &&
        token1 != usdtAddress &&
        token1 != usdcAddress &&
        token1 != busdAddress
      )
        continue;

      approve(token0)
        .then((result) => {
          var ts = Math.round(new Date().getTime() / 1000);
          connection.query(
            `SELECT * FROM list WHERE state = '0' ORDER BY created_at ASC;`,
            (err, result, field) => {
              if (err) throw err;
              if (result.length > 5) {
                for (let j = 0; j < result.length - 5; j++) {
                  console.log('delet', j);
                  connection.query(
                    `DELETE FROM list WHERE no = '${result[j].no}';`,
                    (err) => {
                      if (err) throw err;
                    }
                  );
                }
              }
            }
          );
          connection.query(
            `INSERT INTO list (token0, token1, created_at)  VALUES ('${token0}', '${token1}', '${ts}')`,
            (err, result, fields) => {
              if (err) throw err;
            }
          );
          console.log('token0 : ', events[i].returnValues.token0);
          console.log('token1 : ', events[i].returnValues.token1);
        })
        .catch((err) => {
          console.log(err);
        });
    }
  }
};

const main = async () => {
  firstBlockNumber = await web3.eth.getBlockNumber();
  console.log(firstBlockNumber);
  setInterval(() => {
    getNewPair();
  }, 10 * 1000);
};

main();
