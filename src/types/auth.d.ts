export type AuthType = "noAuth" | "basicAuth" | "bearerToken" | "apiKey";

export interface AuthCredentials {
  apiId: string;
  type: AuthType;
  basicAuth?: {
    username: string;
    password: string;
  };
  bearerToken?: {
    token: string;
  };
  apiKey?: {
    key: string;
    in: "header" | "query";
    name: string;
  };
}