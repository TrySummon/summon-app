import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";
import { Tool } from "@modelcontextprotocol/sdk/types.js";

const encoder = new Tiktoken(o200k_base);

export const calculateTokenCount = (tool: Tool): number => {
  const estimatedTokens = encoder.encode(JSON.stringify(tool)).length;
  return estimatedTokens;
};
