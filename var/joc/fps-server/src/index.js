// ============================================================
// MATCHMAKING DURABLE OBJECT
// ============================================================
export class MatchmakingDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.queues = new Map(); // mode -> [{ws, id, name}]
    this.nextId = 1;
  }

  async fetch(request) {
    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }

    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') || '1v1';
    const rawName = (url.searchParams.get('name') || 'Player').slice(0, 20).replace(/[<>&"]/g, '');
    const playerId = 'p' + (this.nextId++);

    const { 0: client, 1: server } = new WebSocketPair();
    server.accept();

    if (!this.queues.has(mode)) this.queues.set(mode, []);
    const queue = this.queues.get(mode);
    const entry = { ws: server, id: playerId, name: rawName, mode };
    queue.push(entry);

    server.send(JSON.stringify({ type: 'queued', playerId, name: rawName, mode, pos: queue.length }));

    const required = { '1v1': 2, '2v2': 4, '3v3': 6, 'custom': 2 }[mode] ?? 2;

    if (queue.length >= required) {
      const players = queue.splice(0, required);
      this.createGame(players, mode);
    } else {
      // Broadcast queue status to waiting players
      queue.forEach(p => {
        try { p.ws.send(JSON.stringify({ type: 'queue_pos', pos: queue.length, required })); } catch(e) {}
      });
    }

    server.addEventListener('close', () => {
      const q = this.queues.get(mode) || [];
      const i = q.indexOf(entry);
      if (i !== -1) q.splice(i, 1);
    });

    server.addEventListener('message', evt => {
      try {
        const msg = JSON.parse(evt.data);
        if (msg.type === 'ping') server.send(JSON.stringify({ type: 'pong' }));
      } catch(e) {}
    });

    return new Response(null, { status: 101, webSocket: client });
  }

  async createGame(players, mode) {
    const roomId = 'room-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    const playerData = players.map((p, i) => ({
      id: p.id,
      name: p.name,
      team: i < Math.ceil(players.length / 2) ? 0 : 1,
    }));

    try {
      const stub = this.env.GAME_ROOM.get(this.env.GAME_ROOM.idFromName(roomId));
      await stub.fetch(new Request('http://do-internal/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, mode, players: playerData }),
      }));
    } catch(e) {
      players.forEach(p => {
        try { p.ws.send(JSON.stringify({ type: 'error', msg: 'Eroare la creare cameră' })); } catch(e2) {}
      });
      return;
    }

    players.forEach((p, i) => {
      try {
        p.ws.send(JSON.stringify({
          type: 'matched',
          roomId,
          playerId: p.id,
          team: playerData[i].team,
          players: playerData,
          mode,
        }));
      } catch(e) {}
    });
  }
}

// ============================================================
// GAME ROOM DURABLE OBJECT
// ============================================================
export class GameRoomDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
    this.conns = new Map(); // playerId -> conn object
    this.roomInfo = null;
    this.scores = [0, 0];
    this.gameActive = false;
  }

  getSpawnPos(team) {
    const spawns = [
      [[-24, 1.7, -4], [-24, 1.7, 0], [-24, 1.7, 4], [-22, 1.7, -8], [-22, 1.7, 8]],
      [[ 24, 1.7, -4], [ 24, 1.7, 0], [ 24, 1.7, 4], [ 22, 1.7, -8], [ 22, 1.7, 8]],
    ];
    const s = spawns[team];
    return s[Math.floor(Math.random() * s.length)];
  }

  playersState() {
    const r = {};
    this.conns.forEach((c, id) => {
      r[id] = { name: c.name, team: c.team, hp: c.hp, pos: c.pos, rot: c.rot, alive: c.alive, weapon: c.weapon };
    });
    return r;
  }

  broadcast(data, excludeId = null) {
    const msg = JSON.stringify(data);
    this.conns.forEach((c, id) => {
      if (id !== excludeId) try { c.ws.send(msg); } catch(e) {}
    });
  }

  startGame() {
    this.gameActive = true;
    const spawns = {};
    this.conns.forEach((c, id) => {
      const pos = this.getSpawnPos(c.team);
      c.pos = pos; c.hp = 100; c.alive = true;
      spawns[id] = pos;
    });
    this.broadcast({ type: 'game_start', spawns, scores: this.scores });
  }

  handleHit(fromId, msg) {
    if (!this.gameActive) return;
    const from = this.conns.get(fromId);
    const target = this.conns.get(msg.targetId);
    if (!from || !target || !target.alive || target.team === from.team) return;

    const dmg = Math.max(0, Math.min(120, msg.damage));
    target.hp = Math.max(0, target.hp - dmg);

    target.ws.send(JSON.stringify({ type: 'you_hit', by: fromId, byName: from.name, damage: dmg, hp: target.hp }));
    this.broadcast({ type: 'player_hit', id: msg.targetId, hp: target.hp, by: fromId });

    if (target.hp <= 0) {
      target.alive = false;
      this.scores[from.team]++;
      this.broadcast({ type: 'player_killed', id: msg.targetId, by: fromId, byName: from.name, targetName: target.name, scores: [...this.scores] });

      const maxKills = { '1v1': 5, '2v2': 8, '3v3': 10, 'custom': 8 }[this.roomInfo.mode] ?? 5;
      if (this.scores[0] >= maxKills || this.scores[1] >= maxKills) {
        this.gameActive = false;
        this.broadcast({ type: 'game_over', winner: this.scores[0] >= maxKills ? 0 : 1, scores: [...this.scores] });
        return;
      }

      setTimeout(() => {
        const t = this.conns.get(msg.targetId);
        if (!t) return;
        t.hp = 100; t.alive = true;
        const pos = this.getSpawnPos(t.team);
        t.pos = pos;
        t.ws.send(JSON.stringify({ type: 'respawn', pos }));
        this.broadcast({ type: 'player_respawn', id: msg.targetId, pos }, msg.targetId);
      }, 3000);
    }
  }

  async fetch(request) {
    // Internal init from MatchmakingDO
    if (request.method === 'POST') {
      const data = await request.json();
      this.roomInfo = data;
      this.scores = [0, 0];
      this.gameActive = false;
      return new Response('OK');
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Game Room', { status: 200 });
    }

    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');

    if (!this.roomInfo) return new Response('Room not ready', { status: 503 });
    const pInfo = this.roomInfo.players.find(p => p.id === playerId);
    if (!pInfo) return new Response('Not in room', { status: 403 });

    const { 0: client, 1: server } = new WebSocketPair();
    server.accept();

    const conn = {
      ws: server, id: playerId, name: pInfo.name, team: pInfo.team,
      hp: 100, pos: this.getSpawnPos(pInfo.team), rot: [0, 0],
      alive: true, weapon: 0,
    };
    this.conns.set(playerId, conn);

    server.send(JSON.stringify({
      type: 'room_state', roomId: this.roomInfo.roomId, mode: this.roomInfo.mode,
      playerId, team: pInfo.team, players: this.playersState(), scores: this.scores,
    }));

    this.broadcast({ type: 'player_joined', id: playerId, name: pInfo.name, team: pInfo.team, pos: conn.pos }, playerId);

    if (this.conns.size >= this.roomInfo.players.length && !this.gameActive) {
      setTimeout(() => this.startGame(), 3000);
    }

    server.addEventListener('message', evt => {
      try {
        const msg = JSON.parse(evt.data);
        const c = this.conns.get(playerId);
        if (!c) return;
        switch(msg.type) {
          case 'move':
            c.pos = msg.pos; c.rot = msg.rot; c.weapon = msg.weapon;
            this.broadcast({ type: 'player_move', id: playerId, pos: msg.pos, rot: msg.rot, weapon: msg.weapon, crouching: msg.crouching }, playerId);
            break;
          case 'shoot':
            if (this.gameActive && c.alive)
              this.broadcast({ type: 'player_shoot', id: playerId, pos: msg.pos, dir: msg.dir, weapon: msg.weapon }, playerId);
            break;
          case 'hit':
            this.handleHit(playerId, msg);
            break;
          case 'chat': {
            const text = (msg.text || '').slice(0, 100).replace(/[<>&]/g, '');
            this.broadcast({ type: 'chat', id: playerId, name: c.name, team: c.team, text });
            break;
          }
          case 'ping':
            server.send(JSON.stringify({ type: 'pong' }));
            break;
        }
      } catch(e) {}
    });

    server.addEventListener('close', () => {
      this.conns.delete(playerId);
      this.broadcast({ type: 'player_left', id: playerId });
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}

// ============================================================
// WORKER
// ============================================================
export default {
  async fetch(request, env) {
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
    };

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);

    if (url.pathname === '/matchmaking') {
      if (request.headers.get('Upgrade') !== 'websocket')
        return new Response('WebSocket required', { status: 426, headers: cors });
      const id = env.MATCHMAKING.idFromName('global');
      return env.MATCHMAKING.get(id).fetch(request);
    }

    if (url.pathname.startsWith('/room/')) {
      const roomId = url.pathname.slice(6).replace(/\/.*/, '');
      if (!roomId) return new Response('Bad room', { status: 400 });
      const id = env.GAME_ROOM.idFromName(roomId);
      return env.GAME_ROOM.get(id).fetch(request);
    }

    return new Response('FPS Arena Server v1.0', { status: 200, headers: cors });
  },
};
