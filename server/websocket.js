const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

class LavaWebSocket {
  constructor() {
    this.wss = null;
    this.clients = new Map(); // userId -> Set<WebSocket>
  }

  initialize(server) {
    this.wss = new WebSocket.Server({ server });

    this.wss.on('connection', (ws, req) => {
      // Authenticate via token query param or first message
      let authenticated = false;
      let userId = null;

      // Try query param auth
      const url = new URL(req.url, 'http://localhost');
      const token = url.searchParams.get('token');
      if (token) {
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          userId = decoded.userId;
          authenticated = true;
          this._addClient(userId, ws);
        } catch (e) {
          // Token invalid — wait for auth message
        }
      }

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === 'auth') {
            try {
              const decoded = jwt.verify(msg.token, process.env.JWT_SECRET);
              userId = decoded.userId;
              authenticated = true;
              this._addClient(userId, ws);
              ws.send(JSON.stringify({ type: 'auth', status: 'ok', userId }));
            } catch (e) {
              ws.send(JSON.stringify({ type: 'auth', status: 'error', message: 'Invalid token' }));
            }
            return;
          }

          if (!authenticated) {
            ws.send(JSON.stringify({ type: 'error', message: 'Not authenticated' }));
            return;
          }

          // Handle subscription messages
          if (msg.type === 'subscribe' && msg.serverId) {
            ws._subscribedServers = ws._subscribedServers || new Set();
            ws._subscribedServers.add(msg.serverId);
            ws.send(JSON.stringify({ type: 'subscribed', serverId: msg.serverId }));
          }

          if (msg.type === 'unsubscribe' && msg.serverId) {
            if (ws._subscribedServers) {
              ws._subscribedServers.delete(msg.serverId);
            }
            ws.send(JSON.stringify({ type: 'unsubscribed', serverId: msg.serverId }));
          }
        } catch (e) {
          ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
      });

      ws.on('close', () => {
        if (userId) {
          this._removeClient(userId, ws);
        }
      });

      // Send welcome message after a short delay to allow auth
      setTimeout(() => {
        if (authenticated) {
          ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to LavaPanel WebSocket' }));
        }
      }, 100);
    });

    console.log('🌋 WebSocket server initialized');
  }

  _addClient(userId, ws) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    this.clients.get(userId).add(ws);
  }

  _removeClient(userId, ws) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(ws);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
  }

  /**
   * Broadcast to all clients of a specific user
   */
  sendToUser(userId, message) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const payload = JSON.stringify(message);
    for (const ws of userClients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  /**
   * Broadcast to all clients subscribed to a specific server
   */
  sendToServer(serverId, message, userId) {
    const payload = JSON.stringify({ ...message, serverId });
    
    if (userId) {
      // Send to specific user's clients that are subscribed to this server
      const userClients = this.clients.get(userId);
      if (userClients) {
        for (const ws of userClients) {
          if (ws.readyState === WebSocket.OPEN && 
              ws._subscribedServers && 
              ws._subscribedServers.has(serverId)) {
            ws.send(payload);
          }
        }
      }
    } else {
      // Broadcast to all subscribed clients
      for (const [, clients] of this.clients) {
        for (const ws of clients) {
          if (ws.readyState === WebSocket.OPEN && 
              ws._subscribedServers && 
              ws._subscribedServers.has(serverId)) {
            ws.send(payload);
          }
        }
      }
    }
  }

  /**
   * Broadcast server status change to all user's clients (not just subscribed)
   */
  broadcastServerStatus(userId, serverId, status) {
    this.sendToUser(userId, {
      type: 'server:status',
      serverId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Send server log line to subscribed clients
   */
  sendServerLog(userId, serverId, line) {
    this.sendToServer(serverId, {
      type: 'server:log',
      line,
      timestamp: new Date().toISOString()
    }, userId);
  }

  /**
   * Broadcast stats update
   */
  broadcastStats(userId, stats) {
    this.sendToUser(userId, {
      type: 'stats:update',
      ...stats,
      timestamp: new Date().toISOString()
    });
  }
}

// Singleton instance
const lavaWs = new LavaWebSocket();

module.exports = lavaWs;
