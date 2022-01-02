const btnContainers = document.querySelectorAll(".btn-container");
const steps = document.querySelectorAll(".step-container");
const backBtn = document.querySelector(".backBtn");
const spinner = document.querySelector(".spinner");
const progressBar = document.querySelector(".progressBar");
progressBar.style.width = "33%";
const socket = io.connect(window.location.origin);
let currRoomID;

socket.on("roomCreated", ({ roomID, playerName }) => {
  currRoomID = roomID;
  document.querySelector(".roomID").value = roomID;
  document.querySelector(".playerName").innerText = playerName;
  steps[0].style.transform = "translateY(-100vh)";
  steps[2].style.transform = "translateY(-200vh)";
  progressBar.style.width = "66%";
});

socket.on("roomJoined", ({ roomID, turnPlayerID }) => {
  currRoomID = roomID;
  if (turnPlayerID != socket.id)
    document.querySelector(".board").classList.add("board-blocked");
  steps.forEach((step, i) => (step.style.transform = `translateY(-300vh)`));
  progressBar.style.width = "100%";
});

socket.on("playerWon", ({ playerID }) => {
  const overlay = document.querySelector(".board-overlay");
  overlay.classList.remove("hide", "winner", "lose");
  if (socket.id == playerID) {
    overlay.children[0].src = "/winner.png";
    overlay.children[1].innerText = "You win !!!";
    overlay.classList.add("winner");
    progressBar.style.background = "#2ecc71";
  } else {
    overlay.children[0].src = "/lose.png";
    overlay.children[1].innerText = "You lose !!!";
    overlay.classList.add("lose");
    progressBar.style.background = "#e74c3c";
  }

  document.querySelector(".board").classList.add("board-blocked");
});

socket.on("draw", () => {
  console.log("Game draw");
  document.querySelector(".board").classList.add("board-blocked");
});

socket.on("failed", showError);

socket.on("moveMade", updateBoard);

document
  .querySelector(".createroom")
  .addEventListener("click", (e) =>
    socket.emit("createRoom", { name: document.querySelector(".name").value })
  );

document.querySelector(".joinroom").addEventListener("click", (e) => {
  socket.emit("joinRoom", {
    name: document.querySelector(".name").value,
    roomID: document.querySelector(".joinRoom_ID").value,
  });
});

document.querySelector(".homeBtn").addEventListener("click", (e) => {
  steps.forEach((elem) => (elem.style.transform = "translateY(0vh)"));
  progressBar.style.width = "33%";
  progressBar.style.background = "#2b80ff";
});

document.querySelector(".enterroom").addEventListener("click", (e) => {
  steps[0].style.transform = "translateY(-100vh)";
  steps[1].style.transform = "translateY(-100vh)";
  progressBar.style.width = "66%";
});

document.querySelector(".backBtn").addEventListener("click", (e) => {
  steps[0].style.transform = "translateY(0vh)";
  steps[1].style.transform = "translateY(0vh)";
  progressBar.style.width = "33%";
});

document.querySelector(".board").addEventListener("click", (e) => {
  if (!e.target.classList.contains("cell")) return;
  if (e.target.innerText != "_") return;
  if (e.target.classList.contains("board-blocked")) return;

  socket.emit("newMove", currRoomID, [
    e.target.dataset.row,
    e.target.dataset.col,
  ]);
});

document.querySelector(".copyBtn").addEventListener("click", (e) => {
  const copyBtn = e.target.closest(".copyBtn");
  navigator.clipboard.writeText(currRoomID);
  copyBtn.style.background = "#2ecc71";
  copyBtn.innerText = "Copied !";
  setTimeout(() => {
    copyBtn.style.background = "#e4e8ee";
    copyBtn.innerText = "Copy";
  }, 500);
});

document.querySelector(".im-sun").addEventListener("click", toggleDarkMode);

function toggleDarkMode() {
  btnContainers.forEach((btnContainer) => {
    btnContainer.children[0]?.classList.toggle("btn-dark");
    btnContainer.children[1]?.classList.toggle("btn-dark");
    btnContainer.previousElementSibling.classList.toggle("input-dark");
  });
  document.body.classList.toggle("bg-dark");
  spinner?.children[0].classList.toggle("hide");
  spinner?.children[1].classList.toggle("hide");
}

function updateBoard(board, playerID) {
  if (playerID == socket.id)
    document.querySelector(".board").classList.add("board-blocked");
  else document.querySelector(".board").classList.remove("board-blocked");

  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const cell = document.querySelector(`#r${i}c${j}`);
      cell.innerText = board[i][j];
      cell.style.color = board[i][j] == "_" ? "rgba(0, 0, 0, 0)" : "#ffa3a5";
    }
  }
}

function showError({ msg }) {
  const alert = document.querySelector(".error-alert");
  alert.classList.remove("hide");
  alert.innerText = msg;
  setTimeout(() => {
    alert.classList.add("hide");
  }, 3000);
}
