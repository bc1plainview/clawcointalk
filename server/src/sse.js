// SSE (Server-Sent Events) manager
// Extracted to avoid circular dependency with routes

const sseClients = new Set();
export const MAX_SSE_CLIENTS = 20; // Keep it low to avoid overload

export const getClientsCount = () => sseClients.size;

export const addClient = (res) => {
  sseClients.add(res);
};

export const removeClient = (res) => {
  sseClients.delete(res);
};

export const broadcast = (event) => {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  const deadClients = [];

  for (const client of sseClients) {
    try {
      client.write(data);
    } catch (err) {
      // Client is dead, mark for removal
      deadClients.push(client);
    }
  }

  // Clean up dead clients
  for (const client of deadClients) {
    sseClients.delete(client);
  }
};

// Periodic cleanup of stale connections
setInterval(() => {
  const deadClients = [];
  for (const client of sseClients) {
    try {
      client.write(':ping\n\n');
    } catch (err) {
      deadClients.push(client);
    }
  }
  for (const client of deadClients) {
    sseClients.delete(client);
  }
}, 60000); // Every minute
