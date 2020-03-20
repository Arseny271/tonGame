/*const GAMES_LIST = [    // old
  "0QC2WXAVy0u6fvtO1k3EpQosmPmN5FWjVLGE4TjAoUl1H6N4",
  "0QBsWGQsaLife9bLMtwsBDw21s-G1Otr-ww2-ht738_z-71v",
  "0QCaZfxCs1S-SdXgSgT61Y5OR3dbUdqGCxvg8lTQL9pP1gcG",
  "0QCY1d001jL6eCpYB5qv4bB_dTw0JoboeoVMG8Tm1pPKm5jG",
  "0QCMOh2qxWRybngDCyw44meJp7cJA-8C70p5ObixJKrhl6Aa",
  "0QAHjGltU9FPRoQPRFSi0u1p5QdI5QMjmh43A-aYWSI3eZhU",
  "0QAOX9QjZ5DkwcMyYPyhWBsLgiLMgtpaxrvnMcR2edDuZqhU",
  "0QCvqg-PX2-4pcmH0ljvc47eEyz2EMKEIpKDfZoVELGrfQsA",
  "0QDrFaIPiS2kdlVnPismbqCXw6vvttW0Norn7EzXDZfxF7Aq",
  "0QAbwB8oWhNR0G8BqsF3WpG2VNsHpXLD6B30QGjk6usNO2-0"
]*/
const GAMES_LIST = [
  "0QCycE_5FZv08rNUU5ZiEgcnY4hk_-c8bJpEUcfdD-GbI_pU", // bigBigGame
  "0QC4QitckUcPo5XhND3xKvS4F83WYVvb_fo_NDxHXI-HumPb",
  "0QCxyciQXliBrMg4bG-4ZiqLZcLAoaifSLEaQaWcdHuGH-sb",
  "0QAUDSMTi1gzDha8gg0fyxT9ei8GOgK2zEzJjEW_UhqagbGX",
  "0QDXjLGeevW4xgsf4DscF7wR7W_JWpYWXUhaxkhFG63aMHjR",
  "0QBIJm8mBTEUyWYMJpfIzP7zSxoR4LuKW5DkB11g8HwYKPYe",
  "0QCpNjtVgEy0RvL4sGBcPrzqPVwcSijlN_8MsFrZtlj0vdSa",
  "0QCfrrYmTdqx_lbbsfgwFQs4F2ntOT2Icw6t-VEhRp1SUaPi",
  "0QDGi_uzp3kd9ABbInwibXwmauWEwoCPlkeGMXrWaHE2bxdA",
  "0QACzkL6_6leWmRbCo7EJ9Ok06FwzENuHi7xjVAQJHFiK6La"/*,
  "0QDG84kbrxPs284FCS7GXnxNtrb8eR4272uqMB7ZiHXBFdD6"*/
]

new GoToUpButton()

const previewsContainer = document.getElementsByClassName("game-previews-container")[0]
const filtersContainer = document.getElementsByClassName("filters-container")[0]

let onlyActive = new Checkbox(filtersContainer, "Only active")
let onlyFinish = new Checkbox(filtersContainer, "Only finished")
let onlyWithMe = new Checkbox(filtersContainer, "Only with me")

let minPrice = new BigInteger("43103448000000000"), maxPrice = new BigInteger("0");
let priceSlice = new PriceSlider(filtersContainer, "Price", maxPrice, minPrice)

onlyActive.onchange = () => {
  if (onlyActive.checked) onlyFinish.setOff()
  filtrateAll()
}
onlyFinish.onchange = () => {
  if (onlyFinish.checked) onlyActive.setOff()
  filtrateAll()
}
onlyWithMe.onchange = () => {
  filtrateAll()
}
priceSlice.onchange = () => {
  filtrateAll()
}

function filtrate(game) {
  if ((onlyFinish.checked && game.status != GAME_FINISHED) ||
      (onlyActive.checked && game.status != GAME_ACTIVE) ||
      (onlyWithMe.checked && !game.hasBoughtMe) ||
      (game.squarePrice && priceSlice.maxValue.compareTo(game.squarePrice) < 0) ||
      (game.squarePrice && priceSlice.minValue.compareTo(game.squarePrice) > 0))
    game.hide()
  else game.show()
}
function filtrateAll() {
  for (let game of games)
    filtrate(game)
}


let games = []
for (let gameAddr of GAMES_LIST) {
  let gameRpev = new GamePreviewer(previewsContainer, gameAddr)
  gameRpev.onupdateSqr = (game) => {
    if (game.squarePrice) {
      if (game.squarePrice.compareTo(minPrice) < 0) minPrice = game.squarePrice
      if (game.squarePrice.compareTo(maxPrice) > 0) maxPrice = game.squarePrice
      priceSlice.setMaxValue(maxPrice)
      priceSlice.setMinValue(minPrice)
    }
    filtrate(game)
  }
  games.push(gameRpev)
}

//games[0].gameCont.setAttribute("winner", true)

function updateUser(wallet) {
  for (let game of games)
    game.setPlayerWallet(wallet)
}
if (application.userWallet) updateUser(application.userWallet)
application.onlogin = (wallet) => updateUser(wallet)
application.onlogout = () => updateUser()
