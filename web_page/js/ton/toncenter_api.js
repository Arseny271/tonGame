const TONCENTER_URL = "https://toncenter.com/api/test/v2/"

async function callToncenter(method, params, methodName = "GET", isJson = true) {
  let paramsForGetMethod = ""
  let requestHeaders = {
    'Content-Type': 'application/json'
  }

  if (methodName == "GET") {
    let paramsList = []
    for (param in params)
      paramsList.push(`${param}=${params[param]}`)
    paramsForGetMethod = paramsList.length ? `?${paramsList.join("&")}` : ""
  } else {
    requestHeaders = {
      'Content-Type': 'application/json',
      'body': isJson ? JSON.stringify(params) : params,
      'method': methodName
    }
  }

  return fetch(`${TONCENTER_URL}${method}${paramsForGetMethod}`,
    requestHeaders).then(r => r.json())
}
