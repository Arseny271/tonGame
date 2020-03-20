const headerText = document.getElementById("header")
const squaresContainer = document.getElementsByClassName("game-container")[0]
const urlParams = getUrlParams()

if (!urlParams.address) {
  squaresContainer.createDiv("not-found", "Game not found")
  throw "game not found"
}

const gameplay = new GamePlayContainer(squaresContainer, urlParams.address)
headerText.innerText = `Game #${urlParams.address.slice(0, 4)}..${urlParams.address.slice(-4)}`

if (application.userWallet) updateUser(application.userWallet)
application.onlogin = (wallet) => updateUser(wallet)
application.onlogout = () => updateUser()

function updateUser(wallet) {
  gameplay.setPlayerWallet(wallet)
  gameplay.updateGameplay()
}

setInterval(() => {
  application.updateWallet()
  console.log("wall upd");
}, 10000)
/*
let loginForm = new LoginForm()


let playerWallet = loadWallet()
if (!playerWallet) {
  loginForm.show()
} else {
  gameplay.setPlayerWallet(playerWallet)
  gameplay.updateGameplay()
  console.log(gameplay);
}

console.log(playerWallet);

loginForm.onlogin = (wallet) => {
  gameplay.setPlayerWallet(wallet)
  gameplay.updateGameplay()
  playerWallet = wallet
}
*/
