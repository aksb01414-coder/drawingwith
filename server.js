const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// 各ユーザーの「前回の座標」を記録する
const lastPositions = {};

io.on('connection', (socket) => {
  console.log('接続しました：' + socket.id);

  // 接続してきたユーザーの座標を初期化
  lastPositions[socket.id] = {};

  socket.on('draw', (data) => {
    const key = data.layer; // レイヤーごとに座標を管理

    // 前回の座標が記録されていればそれを使う
    // なければ今回のfromX/fromYをそのまま使う
    const fromX = lastPositions[socket.id][key]?.x ?? data.fromX;
    const fromY = lastPositions[socket.id][key]?.y ?? data.fromY;

    // 今回の座標を記録しておく
    lastPositions[socket.id][key] = { x: data.toX, y: data.toY };

    // 補完した座標を含めて全員に転送
    socket.broadcast.emit('draw', {
      ...data,
      fromX: fromX,
      fromY: fromY
    });
  });

  // マウスを離したとき座標をリセット（次の線が前の線とつながらないように）
  socket.on('draw-end', (data) => {
    if (lastPositions[socket.id]) {
      lastPositions[socket.id][data.layer] = null;
    }
  });

  socket.on('disconnect', () => {
    delete lastPositions[socket.id]; // 切断時に記録を削除
    console.log('切断しました：' + socket.id);
  });
});

server.listen(3000, () => {
  console.log('サーバー起動中：http://localhost:3000');
});