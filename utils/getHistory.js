var axios = require('axios');

const getData = async (query) => {
  opts = {
    url: 'https://graphql.bitquery.io/',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-KEY': 'BQY8kVNKv9HZhrLjpzXjghFo7Ttoml2C',
    },
    data: JSON.stringify({
      query,
    }),
  };
  const response = await axios(opts);
  return response;
};

const getHistory = async (token0, token1) => {
  let symbol;

  /**************************************************************************************************************/
  var timeCurrent = new Date();
  var time = [];
  timeCurrent.setHours(timeCurrent.getHours() - 24);
  time[0] = timeCurrent.toISOString();

  timeCurrent = new Date();
  timeCurrent.setHours(timeCurrent.getHours() - 12);
  time[1] = timeCurrent.toISOString();

  timeCurrent = new Date();
  timeCurrent.setHours(timeCurrent.getHours() - 1);
  time[2] = timeCurrent.toISOString();
  timeCurrent = new Date();
  timeCurrent.setMinutes(timeCurrent.getMinutes() - 5 - 3); // 3min is delay
  time[3] = timeCurrent;
  var price = [];
  const queryMake = (time) => `{
    ethereum(network: bsc) {
      dexTrades(
        options: {limit: 100000}
        baseCurrency: {is: "${token0}"}
        quoteCurrency: {is: "${token1}"}
        date: {since: "${time}"}
        
      ) {
        timeInterval{
          minute(count:1)
        }
        baseCurrency {
          symbol
        }
        quoteCurrency {
          symbol
        }
        quotePrice
        maximum_price: quotePrice(calculate: maximum)
        minimum_price: quotePrice(calculate: minimum)
        open_price: minimum(of: block, get: quote_price)
        close_price: maximum(of: block, get: quote_price)
      }
    }
  }
  `;
  var query;
  for (let x = 0; x < 3; x++) {
    query = queryMake(time[x]);

    var result = await getData(query);
    result = result.data;
    price[x] = result['data']['ethereum']['dexTrades'];
  }
  try {
    symbol = price[0][0].baseCurrency.symbol;
    /**************************************************************************************************************/
    /********************************************* Calculate Price ************************************************/
    if (price[1].length < 1) {
      price[1] =
        price[2] =
        price[3] =
        price[4] =
          price[0][price[0].length - 1]['close_price'];
      price[0] = price[0][0]['maximum_price'];
    } else {
      let length = price[2].length;
      if (length == 0) {
        price[0] = price[0][0]['maximum_price'];
        price[2] =
          price[3] =
          price[4] =
            price[1][price[1].length - 1]['close_price'];
        price[1] = price[1][0]['open_price'];
      } else {
        price[0] = price[0][0]['maximum_price'];
        price[1] = price[1][0]['open_price'];
        var str = price[2][length - 1]['timeInterval']['minute'];
        str = str.slice(0, 10) + 'T' + str.slice(11);
        var tradeTime = new Date(str);
        tradeTime.setHours(
          tradeTime.getHours() - tradeTime.getTimezoneOffset() / 60
        );
        if (time[3] > tradeTime) {
          price[3] = price[4] = price[2][length - 1]['close_price'];
        } else if (length > 1) price[3] = price[2][length - 2]['close_price'];
        else price[3] = price[2][length - 1]['open_price'];
        price[4] = price[2][length - 1]['close_price'];

        price[2] = price[2][0]['open_price'];
      }
    }
    var rate = [];
    for (let i = 0; i < 4; i++) {
      rate[i] = ((price[4] - price[i]) / price[i]) * 100;
    }

    /**************************************************************************************************************/
    var result = {
      symbol: symbol,
      priceChange: {
        '5min': rate[3],
        '1hr': rate[2],
        '12hr': rate[1],
        '24hr': rate[0],
      },
    };
  } catch (error) {
    var result = { error: '' };
  }
  // console.log(result);
  return result;
};

module.exports = {
  getHistory: function (token0, token1) {
    return getHistory(token0, token1);
  },
};
