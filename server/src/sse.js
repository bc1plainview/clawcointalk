// SSE (Server-Sent Events) manager
// Extracted to avoid circular dependency with routes

const sseClients = new Set();
export const MAX_SSE_CLIENTS = 100;

export const getClientsCount = () => sseClients.size;

export const addClient = (res) => {
  sseClients.add(res);
};

export const removeClient = (res) => {
  sseClients.delete(res);
};

export const broadcast = (event) => {
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const client of sseClients) {
    client.write(data);
  }
};
