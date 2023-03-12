export const getExchangeRate = async (currency) => {
  // currency = usd
  const url = `https://www.binance.com/api/v3/ticker/price?symbol=${currency}USDT`;
  const response = await fetch(url);
  const data = await response.json();
  // console.log('getExchangeRate', { data });
  return data.price;
};
