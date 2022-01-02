const http = require("http");
const express = require("express");
const socketIO = require("socket.io");

const app = express();

const PORT = process.env.PORT || 3000;
const server = http.Server(app);
server.listen(PORT, () => {
  console.log(`App listening on ${PORT}`);
});
const io = socketIO(server);

app.use(express.static("./public"));

const rooms = {};

function createRoom(id, data) {
  const roomID = Math.random().toString(36).substring(2, 7).toUpperCase();
  rooms[roomID] = {
    playerNames: [
      data?.name ||
        `Player-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
    ],
    roomID: roomID,
    symbol: ["X", "0"],
    players: 1,
    playerSocketIDs: [id],
    board: [
      ["_", "_", "_"],
      ["_", "_", "_"],
      ["_", "_", "_"],
    ],
    gameOver: false,
  };
  return { roomID, playerName: rooms[roomID].playerNames[0] };
}

function joinRoom(data, id) {
  const room = rooms[data.roomID];
  room.playerNames.push(
    data?.name ||
      `Player-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  );
  room.players = 2;
  room.playerSocketIDs.push(id);
  room.turn = Math.random() < 0.5 ? 0 : 1; // player 0 OR player 1
  console.log("Room Joined : ", room);
  return room;
}

io.on("connection", (socket) => {
  socket.on("createRoom", (data) => {
    const { roomID, playerName } = createRoom(socket.id, data);
    io.to(socket.id).emit("roomCreated", { roomID, playerName });
  });

  socket.on("joinRoom", (data) => {
    if (!(data && data.roomID && rooms[data.roomID]))
      return io.to(socket.id).emit("failed", { msg: "No Room found" });
    if (rooms[data.roomID].players >= 2)
      return io.to(socket.id).emit("failed", { msg: "Room is full" });
    if (rooms[data.roomID].playerSocketIDs[0] == socket.id)
      return io.to(socket.id).emit("failed", { msg: "Invalid request" });
    const room = joinRoom(data, socket.id);
    room.playerSocketIDs.forEach((id) =>
      io.to(id).emit("roomJoined", {
        roomID: room.roomID,
        turnPlayerID: room.playerSocketIDs[room.turn],
      })
    );
  });

  socket.on("newMove", (roomID, cell) => {
    const room = rooms[roomID];
    if (!room || room.players < 2)
      return io.to(socket.id).emit("failed", { msg: "Create a room first" });
    if (room.gameOver)
      return io.to(socket.id).emit("failed", { msg: "Game Over" });

    const playerNo = room.playerSocketIDs.indexOf(socket.id);
    if (playerNo === -1)
      return io.to(socket.id).emit("failed", { msg: "Invalid request" });
    if (room.turn != playerNo)
      return io.to(socket.id).emit("failed", { msg: "Its not your turn" });

    room.board[cell[0]][cell[1]] = room.symbol[playerNo];
    room.turn = !room.turn;

    room.playerSocketIDs.forEach((id) =>
      io.to(id).emit("moveMade", room.board, room.playerSocketIDs[playerNo])
    );

    const isPlayerWon = isPlayerWonFn(room.board);
    if (isPlayerWon == 0 || isPlayerWon == 1) {
      room.playerSocketIDs.forEach((id) =>
        io
          .to(id)
          .emit("playerWon", { playerID: room.playerSocketIDs[isPlayerWon] })
      );
      room.gameOver = true;
    } else if (isPlayerWon == -1) {
      room.gameOver = true;
      room.playerSocketIDs.forEach((id) => io.to(id).emit("draw"));
    }
  });

  socket.on("allrooms", () => {
    console.log(rooms);
  });

  socket.on("disconnect", (socket) => {
    Object.values(rooms).forEach((room) => {
      console.log(room, socket);
      if (room.playerSocketIDs.includes(socket.id)) {
        console.log("s");
        delete rooms[room.roomID];
      }
    });
  });
});

function isPlayerWonFn(board) {
  const result = ["XXX", "000"];
  const rows = [
    board[0][0] + board[0][1] + board[0][2], // 1st line
    board[1][0] + board[1][1] + board[1][2], // 2nd line
    board[2][0] + board[2][1] + board[2][2], // 3rd line
    board[0][0] + board[1][0] + board[2][0], // 1st column
    board[0][1] + board[1][1] + board[2][1], // 2nd column
    board[0][2] + board[1][2] + board[2][2], // 3rd column
    board[0][0] + board[1][1] + board[2][2], // Primary diagonal
    board[0][2] + board[1][1] + board[2][0], // Secondary diagonal
  ];
  // Loop through all the rows looking for a match
  for (let i = 0; i < rows.length; i++) {
    if (rows[i] === result[0]) return 0;
    else if (rows[i] === result[1]) return 1;
  }

  let filledCells = 0;
  board.forEach((row) => {
    filledCells += row.reduce(function (prev, curr) {
      if (curr != "_") return prev + 1;
      return prev;
    }, 0);
  });
  if (filledCells == 9) return -1;

  return -2;
}
