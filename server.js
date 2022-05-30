const express = require('express');
const cors = require('cors');
const mysql = require('mysql');
const axios = require('axios');
const history = require('./utils/getHistory');
const {
  buyWithEth,
  buyWithTokens,
  approve,
  sellToEth,
  sellToTokens,
} = require('./trade');

const app = express();
app.use(cors());

const port = 5000;
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'newpairs',
});
connection.connect();

const wbnbAddress = 0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c;
const tradingMaxLength = 4;
var sellingPercentage = -10; //If the percentage goes down below 0
var sellingAge = 3600 * 3; //After 3hours
var tradeAmount = 1; //Trading Amount
var price = 308;
setInterval(() => {
  getPrice();
}, 10 * 1000);

const getPrice = async () => {
  //
  let result;
  try {
    result = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=wbnb&vs_currencies=usd'
    );
  } catch (error) {
    console.log(error);
  }
  price = result.data.wbnb.usd;
};

//0.created, 1.buying, 2.bought, 3.selling, 4.finished

app.get('/getData', (req, res) => {
  try {
    connection.query(
      `SELECT * FROM LIST WHERE state != '4' ORDER BY NO DESC`,
      (err, rows, fields) => {
        result = [];
        const getHistory = async () => {
          let flag = [];
          for (const index in rows) {
            history
              .getHistory(rows[index].token0, rows[index].token1)
              .then((historyResult) => {
                console.log(index);

                var age =
                  Math.round(new Date().getTime() / 1000) -
                  rows[index].created_at;

                result[index] = {
                  no: rows[index].no,
                  token0: rows[index].token0,
                  token1: rows[index].token1,
                  ...historyResult,
                  age: age,
                  state: rows[index].state,
                };
                flag[index] = true;
                // console.log(index, result[index]);
                let end = true;
                for (let i = 0; i < rows.length; i++) {
                  if (flag[i] !== true) {
                    end = false;
                    break;
                  }
                }
                if (end) {
                  bot(result).then((bottingResult) => res.json(bottingResult));
                }
              })
              .catch((reason) => {
                console.log('error occurred');
                res.json();
              });
          }
        };
        getHistory();
      }
    );
  } catch (error) {
    // next(error);
  }
});

const bot = async (data) => {
  data = data
    .filter((item) => {
      return typeof item.error === 'undefined';
    })
    .sort((a, b) => a.no - b.no);

  /************************************************************************************************/
  let boughtPairs = data.filter((item) => item.state === '2');
  boughtPairs.map((item, index) => {
    if (
      item.priceChange['1hr'] < sellingPercentage ||
      item.age > sellingAge ||
      item.priceChange['5min'] < sellingPercentage
    ) {
      connection.query(
        `UPDATE list SET state = '3', symbol = '${item.symbol}' WHERE no = '${item.no}'`
      );

      /****************************Sell Here********************/
      if (item.token1 == wbnbAddress)
        (function (qwe) {
          sellToEth(qwe.token0)
            .then(() => {
              connection.query(
                `UPDATE list SET state = '4' WHERE no = '${qwe.no}'`
              );
            })
            .catch((error) => {
              console.log(error);
              connection.query(`DELETE FROM list WHERE no = '${qwe.no}';`);
            });
        })(item);
      else
        (function (qwe) {
          sellToTokens(qwe.token0, qwe.token1)
            .then(() => {
              connection.query(
                `UPDATE list SET state = '4' WHERE no = '${qwe.no}'`
              );
            })
            .catch((error) => {
              console.log(error);
              connection.query(`DELETE FROM list WHERE no = '${qwe.no}';`);
            });
        })(item);

      /*********************************************************/
      item.state = 3;
    }
    return item;
  });
  let tradingLength = data.filter((item) => item.state !== '0').length;
  let newPairs = data.filter((item) => item.state === '0');
  let newPairLength = newPairs.length;
  let newPairIndex = 0;

  while (tradingLength < tradingMaxLength && newPairIndex !== newPairLength) {
    connection.query(
      `UPDATE list SET state = '1' WHERE no = '${newPairs[newPairIndex].no}'`,
      (err, rows, fields) => {
        if (err) throw err;
      }
    );
    /***********************BUYING*************************************/
    if (newPairs[newPairIndex].token1 == wbnbAddress)
      (function (index) {
        buyWithEth(newPairs[index].token0, price, tradeAmount)
          .then(() => {
            connection.query(
              `UPDATE list SET state = '2' WHERE no = '${newPairs[index].no}'`
            );
          })
          .catch((error) => {
            console.log(
              '!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!'
            );
            console.log(error);
            connection.query(
              `DELETE FROM list WHERE no = '${newPairs[index].no}';`
            );
          });
      })(newPairIndex);
    else
      (function (index) {
        buyWithTokens(
          newPairs[newPairIndex].token0,
          newPairs[newPairIndex].token1,
          tradeAmount
        )
          .then(() => {
            connection.query(
              `UPDATE list SET state = '2' WHERE no = '${newPairs[newPairIndex].no}'`
            );
          })
          .catch((error) => {
            console.log(error);
            connection.query(
              `DELETE FROM list WHERE no = '${newPairs[index].no}';`
            );
          });
      })(newPairIndex);

    /***********************END BUYING*************************************/

    newPairs[newPairIndex].state = 1;
    tradingLength++;
    newPairIndex++;
  }

  /************************************************************************************************/
  return data;
};

app.get('/getOldTrade', (req, res) => {
  connection.query(
    `SELECT * FROM LIST WHERE state = '4' ORDER BY created_at DESC`,
    (err, rows, field) => {
      result = rows.map((item, index) => {
        let age =
          Math.round(new Date().getTime() / 1000) - rows[index].created_at;
        return {
          no: item.no,
          symbol: item.symbol,
          age: age,
          state: item.state,
        };
      });
      res.json(result);
    }
  );
});

app.get('/getPer', (req, res) => {
  res.json(sellingPercentage);
});

app.get('/setPer', (req, res) => {
  sellingPercentage = req.query.per;
  res.json('OK');
});

app.get('/getAmount', (req, res) => {
  res.json(tradeAmount);
});

app.get('/setAmount', (req, res) => {
  tradeAmount = req.query.amount;
  res.json('OK');
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});
