const headerText = document.getElementById("header")
const loadMore = document.getElementById("load-more")
const historyCont = document.getElementsByClassName("histoty-container")[0]
const urlParams = getUrlParams()

const loadMoreButt = new DefaultButton(loadMore, "Load more", true)
loadMoreButt.onclick = async function() {
  if (loadMoreButt.loading) return;
  loadMoreButt.loading = true
  await loadTransactions()
  loadMoreButt.loading = false
}


if (!urlParams.address) {
  headerText.innerText = "Address Not Found"
  throw "addr not found"
}

headerText.innerText = `History #${urlParams.address.slice(0, 4)}..${urlParams.address.slice(-4)}`

async function loadTransactions() {

  let history = await getHistory(urlParams.address)
  for (let transaction of history)
    createRecord(transaction)

}

let last_transaction_id;
async function getHistory(addr) {
  let params = {
    address: addr,
    limit: 10
  }

  if (last_transaction_id) {
    params.hash = base64toHex(last_transaction_id.hash)
    params.lt = last_transaction_id.lt
  }


  const answer = await callToncenter("getTransactions", params)

  if (!answer.ok) return
  let history = answer.result

  if (last_transaction_id)
    history = history.slice(1)

  let transactions = []
  for (let transaction of history) {
    last_transaction_id = transaction.transaction_id;
    const in_msg = transaction.in_msg
    if (in_msg.source != "") {
      transactions.push({
        type: "incoming",
        value: new BigInteger(in_msg.value),
        address: in_msg.source,
        utime: transaction.utime
      })
    }
    for (let out_msg of transaction.out_msgs) {
      if (out_msg.destination != "") {
        transactions.push({
          type: "outgoing",
          value: new BigInteger(out_msg.value),
          address: out_msg.destination,
          utime: transaction.utime
        })
      }
    }
  }


  //console.log(transactions, history);
  return transactions
}

function createRecord(transaction) {
  let cont = historyCont.createDiv("transaction-record")

  const className = `type-${transaction.type}`
  const sing = (transaction.type == "incoming") ? "+" : "-"

  cont.createDiv("transaction-address", transaction.address)

  let info = cont.createDiv("transaction-info")
  info.createChildren("p", "", unixToString(transaction.utime))
  info.createChildren("b", className, `${sing}${gramsToReadView(transaction.value)}`)
}

new GoToUpButton()


loadTransactions()
