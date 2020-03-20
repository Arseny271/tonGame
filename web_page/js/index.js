let startButton = document.getElementsByClassName("button")[0];
startButton.onclick = () => {
  if (application.getUserWallet()) location.href = "active_games.html"
}


application.onlogin = () => location.href = "active_games.html"

new GoToUpButton()
