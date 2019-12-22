function sendBagOfCells(data) {
  let params = 'data=' + encodeURIComponent(data)
  return fetch("/sendboc?" + params)
    .then(response => response.json())
}
function getAccountState(address) {
  let params = 'address=' + encodeURIComponent(address)
  return fetch("/getAccount?" + params)
    .then(response => response.json())
    .then(response => {
      response.data = DeserializeBOC(base64toBytes(response.data))
      console.log("response", response)
      response.balance = new BigInteger(response.balance)

      return response
    })
}
