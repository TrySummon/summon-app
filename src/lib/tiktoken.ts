import { Tiktoken } from "js-tiktoken/lite";
import o200k_base from "js-tiktoken/ranks/o200k_base";

const encoder = new Tiktoken(o200k_base);

export const calculateTokenCount = (str: string): number => {
  const estimatedTokens = encoder.encode(JSON.stringify(str)).length;
  return estimatedTokens;
};
