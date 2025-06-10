export interface Endpoint {
  path: string;
  method: string;
  folder: string;
  summary?: string;
  description?: string;
  operationId?: string;
}

export interface EndpointWithScore extends Endpoint {
  score: number;
  matchedText: string;
}
