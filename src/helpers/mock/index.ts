import express from 'express';
import { OpenAPIBackend } from 'openapi-backend';
import { type Server } from 'http';
import { findFreePort } from "../port";
import { apiDb } from "../db/api-db";
import { type Request } from 'openapi-backend';

// Define the return type for mockApi
export interface MockApiResult {
    url: string;
    port: number;
    process: Server;
}

export async function mockApi(apiId: string): Promise<MockApiResult> {
    const api = await apiDb.getApiById(apiId);

    if (!api) {
        throw new Error("API not found");
    }

    const port = await findFreePort();
   
    const apiApp = express();
    apiApp.use(express.json());

    const apiBackend = new OpenAPIBackend({
        definition: api.originalFilePath,
        validate: false,
        strict: false,
    });

    // OpenAPIBackend validation is strict, additional fields will prevent endpoint registration
    const originalValidateDefinition = apiBackend.validateDefinition;
    apiBackend.validateDefinition = () => {
        try {
            return originalValidateDefinition();
        } catch (error) {
            return apiBackend.document;
        }
    };

    await apiBackend.init();
 
    // Register handlers
    apiBackend.register({
        // This handler is called when no handler is registered for an operation
        notImplemented: (c, req, res) => {
            const { status, mock } = c.api.mockResponseForOperation(c.operation.operationId!);
            return res.status(status).json(mock);
        },
        // This handler is called when no operation matches the request
        notFound: (c, req, res) => {
            return res.status(404).json({ error: 'Not found', path: req.path, method: req.method });
        },
        // This handler is called for validation errors
        validationFail: (c, req, res) => {
            return res.status(400).json({ error: 'Bad request', errors: c.validation.errors });
        }
    });

    // Use middleware to handle requests
    apiApp.use((req, res) => apiBackend.handleRequest(req as Request, req, res));

    // Create a promise that resolves when the server starts listening
    const serverStartPromise = new Promise<Server>((resolve) => {
        const server = apiApp.listen(port, () => {
            console.log(`Mock server for API ${apiId} started at http://localhost:${port}`);
            resolve(server);
        });
    });
    // Wait for the server to start listening
    const server = await serverStartPromise;

    return {
        url: `http://localhost:${port}`,
        port,
        process: server
    };
}
