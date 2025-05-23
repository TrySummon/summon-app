import { contextBridge, ipcRenderer } from 'electron';
import {
  CREATE_MCP_CHANNEL,
  LIST_MCPS_CHANNEL,
  GET_MCP_CHANNEL,
  UPDATE_MCP_CHANNEL,
  DELETE_MCP_CHANNEL,
  MCP_GET_CREDENTIALS_CHANNEL,
  MCP_SAVE_CREDENTIALS_CHANNEL,
  MCP_CLEAR_CREDENTIALS_CHANNEL,
  GET_MCP_SERVER_STATUS_CHANNEL,
  GET_ALL_MCP_SERVER_STATUSES_CHANNEL,
  START_MCP_SERVER_CHANNEL,
  STOP_MCP_SERVER_CHANNEL,
  RESTART_MCP_SERVER_CHANNEL
} from './mcp-channels';
import { McpData } from '@/helpers/db/mcp-db';

export function exposeMcpContext() {
  contextBridge.exposeInMainWorld('mcpApi', {
    createMcp: (mcpData: Omit<McpData, 'id' | 'createdAt' | 'updatedAt'>) => 
      ipcRenderer.invoke(CREATE_MCP_CHANNEL, mcpData),
      
    listMcps: () => 
      ipcRenderer.invoke(LIST_MCPS_CHANNEL),
      
    getMcp: (id: string) => 
      ipcRenderer.invoke(GET_MCP_CHANNEL, id),
      
    updateMcp: (id: string, data: Partial<Omit<McpData, 'id' | 'createdAt' | 'updatedAt'>>) => 
      ipcRenderer.invoke(UPDATE_MCP_CHANNEL, { id, data }),
      
    deleteMcp: (id: string) => 
      ipcRenderer.invoke(DELETE_MCP_CHANNEL, id),
      
    getCredentials: (mcpId: string) => 
      ipcRenderer.invoke(MCP_GET_CREDENTIALS_CHANNEL, mcpId),
      
    saveCredentials: (mcpId: string, credentials: any) => 
      ipcRenderer.invoke(MCP_SAVE_CREDENTIALS_CHANNEL, mcpId, credentials),
      
    clearCredentials: (mcpId: string) => 
      ipcRenderer.invoke(MCP_CLEAR_CREDENTIALS_CHANNEL, mcpId),
      
    // MCP server operations
    getMcpServerStatus: (mcpId: string) => 
      ipcRenderer.invoke(GET_MCP_SERVER_STATUS_CHANNEL, mcpId),
      
    getAllMcpServerStatuses: () => 
      ipcRenderer.invoke(GET_ALL_MCP_SERVER_STATUSES_CHANNEL),
      
    startMcpServer: (mcpId: string) => 
      ipcRenderer.invoke(START_MCP_SERVER_CHANNEL, mcpId),
      
    stopMcpServer: (mcpId: string) => 
      ipcRenderer.invoke(STOP_MCP_SERVER_CHANNEL, mcpId),
      
    restartMcpServer: (mcpId: string) => 
      ipcRenderer.invoke(RESTART_MCP_SERVER_CHANNEL, mcpId)
  });
}
