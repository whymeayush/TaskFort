// Server-Sent Events (SSE) Manager for Real-Time Multi-User Synchronization

export class EventStreamManager {
  constructor() {
    this.clients = new Set();
  }

  addClient(res) {
    this.clients.add(res);

    // Initial keep-alive ping
    res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date().toISOString(), clientCount: this.clients.size })}\n\n`);

    res.on('close', () => {
      this.clients.delete(res);
    });
  }

  broadcast(eventType, data) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.clients) {
      try {
        client.write(payload);
      } catch (err) {
        this.clients.delete(client);
      }
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

export const eventStream = new EventStreamManager();
export default eventStream;
