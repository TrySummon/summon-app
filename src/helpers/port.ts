import * as net from 'net';

/**
 * Finds a free port by attempting to bind to it
 * @param startPort - Port to start searching from (default: 3000)
 * @param maxPort - Maximum port to try (default: 65535)
 * @returns Promise that resolves to a free port number
 */
export async function findFreePort(startPort: number = 3000, maxPort: number = 65535): Promise<number> {
  for (let port = startPort; port <= maxPort; port++) {
    if (await isPortFree(port)) {
      return port;
    }
  }
  throw new Error(`No free port found between ${startPort} and ${maxPort}`);
}

/**
 * Checks if a specific port is free using both server and client connection tests
 * @param port - Port number to check
 * @returns Promise that resolves to true if port is free
 */
function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    // First, try to create a server on the port
    const server = net.createServer();
    
    server.once('error', (err: NodeJS.ErrnoException) => {
      // If we get EADDRINUSE, the port is definitely in use
      if (err.code === 'EADDRINUSE') {
        resolve(false);
      } else {
        // For other errors, try the client connection test
        checkClientConnection(port).then(inUse => resolve(!inUse));
      }
    });
    
    server.once('listening', () => {
      // Even if we can bind to it, double-check with a client connection
      // as some services might only bind to specific interfaces
      server.close(() => {
        checkClientConnection(port).then(inUse => resolve(!inUse));
      });
    });
    
    server.listen(port, '0.0.0.0');
  });
}

/**
 * Attempts to connect to a port as a client to check if it's in use
 * @param port - Port number to check
 * @returns Promise that resolves to true if a connection can be established (port is in use)
 */
function checkClientConnection(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const client = new net.Socket();
    const timeout = setTimeout(() => {
      client.destroy();
      resolve(false); // Connection timed out, port is likely not in use
    }, 300);
    
    client.once('connect', () => {
      clearTimeout(timeout);
      client.destroy();
      resolve(true); // Connection successful, port is in use
    });
    
    client.once('error', () => {
      clearTimeout(timeout);
      client.destroy();
      resolve(false); // Connection failed, port is likely not in use
    });
    
    client.connect(port, '127.0.0.1');
  });
}