Element.prototype.createChildren = function(tagName, className, innerText ) {
  let elem = document.createElement(tagName);
  if (className) elem.className = className;
  if (innerText) elem.innerText = innerText;
  this.appendChild(elem);
  return elem;
}
Element.prototype.prependChildren = function(tagName, className, innerText ) {
  let elem = document.createElement(tagName);
  if (className) elem.className = className;
  if (innerText) elem.innerText = innerText;
  this.prepend(elem);
  return elem;
}
Element.prototype.createDiv = function(className, innerText) {
  return this.createChildren("div", className, innerText)
}
Element.prototype.prependDiv = function(className, innerText) {
  return this.prependChildren("div", className, innerText)
}
Element.prototype.removeAllChildrens = function() {
	while (this.firstChild){
		this.removeChild(this.firstChild)}
}
String.prototype.replaceAll = function(search, replacement) {
  search = escapeRegExp(search);
  var target = this;
  return target.replace(new RegExp(search, 'g'), replacement);
  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }
};
Element.prototype.createChildrenSVG = function(className, svgId){
	let svg = document.createElement("div")
	svg.innerHTML = '<svg class="' + className + '"><use xlink:href="#' + svgId + '"></use></svg>'
	svg = svg.firstChild
	this.appendChild(svg)
	return svg
}

class Defer {
  constructor() {
    var self = this;
    this.promise = new Promise((r, e) => {
      self.resolve = r;
      self.reject = e;
    })
  }
}

function saveWallet(wallet) {
  localStorage.setItem("walletParams", JSON.stringify({
    address: wallet.address,
    keyPair: wallet.keyPair,
  }));
}
function loadWallet() {
  let data = localStorage.getItem("walletParams")
  if (data) {
    data = JSON.parse(data)

    let new_data = {
      address: new Uint8Array(36),
      keyPair: {
        publicKey: new Uint8Array(32),
        secretKey: new Uint8Array(64)
      }
    }

    for (let i = 0; i < 36; i++)
      new_data.address.set([data.address[i]], i)

    for (let i = 0; i < 32; i++)
      new_data.keyPair.publicKey.set([data.keyPair.publicKey[i]], i)

    for (let i = 0; i < 64; i++)
      new_data.keyPair.secretKey.set([data.keyPair.secretKey[i]], i)

    let wallet = new Wallet(new_data.address, new_data.keyPair)
    return wallet
  }

}

const GRAMM_P = new BigInteger("10000000")
const mGRAMM  = new BigInteger("1000000")

function zero(val) {
  return (val < 10) ? ('0' + val) : val
}
function gramsToReadView(bigInt) {
  let intVal = bigInt.divide(GRAMM_P).intValue()
  if (intVal > 99) return `${intVal / 100} GRM`
  else return `${bigInt.divide(mGRAMM).intValue() / 1000} GRM`

}
function secondsToTime(sec) {
  const days    = Math.floor( sec / 86400)
  const hours   = Math.floor((sec % 86400) / 3600)
  const minutes = Math.floor((sec % 3600) / 60)
  const seconds = (sec % 60)

  if (days) return `${days}:${zero(hours)}:${zero(minutes)}:${zero(seconds)}`
  else if (hours) return `${hours}:${zero(minutes)}:${zero(seconds)}`
  else return `${minutes}:${zero(seconds)}`
}

function createRandomArray(len) {
	arr = []
	for (let i=0;i<len;i++){
		arr.push(Math.floor(Math.random() * 256));
	}
	return arr;
}

function unixToString(unix) {
  const date = new Date(unix * 1000)
  const MONTH = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ]

  return `${date.getDate()} ${MONTH[date.getMonth()]}. ${date.getFullYear()} - ${zero(date.getHours())}:${zero(date.getMinutes())}:${zero(date.getSeconds())}`
}

function getUrlParams() {
  return window.location.search.replace('?','').split('&').reduce((p,e) => {
    var a = e.split('=');
    p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
    return p;
  }, {});
}

function numberBorders(num, min, max) {
  if (num < min) num = min
  if (num > max) num = max
  return num
}
