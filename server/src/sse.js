// SSE disabled for stability - these are no-op functions

export const MAX_SSE_CLIENTS = 0;
export const getClientsCount = () => 0;
export const addClient = () => {};
export const removeClient = () => {};
export const broadcast = () => {}; // No-op - SSE disabled
