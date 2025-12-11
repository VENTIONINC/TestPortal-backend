process.env.JWT_SECRET ??= "test-secret";

import type { Request, Response, NextFunction } from "express";
import {
  authMiddleware,
  type AuthenticatedRequest,
} from "@/middleware/authMiddleware";

export interface MockRequestOptions {
  method?: string;
  params?: Record<string, string>;
  query?: Record<string, string | string[]>;
  body?: unknown;
  headers?: Record<string, string | undefined>;
  user?: AuthenticatedRequest["user"];
}

export interface MockResponse<T = any> {
  statusCode: number;
  body?: T;
  headersSent: boolean;
  locals: Record<string, unknown>;
}

export type ControllerResponse<T = any> = Response & MockResponse<T>;

export const createMockRequest = (
  options: MockRequestOptions = {},
): Request => {
  const {
    method = "GET",
    params = {},
    query = {},
    body,
    headers = {},
    user,
  } = options;

  const headerStore: Record<string, string | undefined> = {};
  Object.entries(headers).forEach(([key, value]) => {
    headerStore[key.toLowerCase()] = value;
  });

  const req = {
    method,
    params: { ...params },
    query,
    body,
    headers: headerStore,
    get: (name: string) => headerStore[name.toLowerCase()],
  } as unknown as AuthenticatedRequest;

  if (user) {
    req.user = user;
  }

  return req as Request;
};

export const createMockResponse = <T = any>(): ControllerResponse<T> => {
  const headers: Record<string, string> = {};
  const res = {
    statusCode: 200,
    headersSent: false,
    locals: {} as Record<string, unknown>,
    body: undefined as T | undefined,
    status(this: ControllerResponse<T>, code: number) {
      this.statusCode = code;
      return this;
    },
    json(this: ControllerResponse<T>, payload: unknown) {
      this.body = payload as T;
      this.headersSent = true;
      return this;
    },
    send(this: ControllerResponse<T>, payload: unknown) {
      this.body = payload as T;
      this.headersSent = true;
      return this;
    },
    set(this: ControllerResponse<T>, field: string, value: string) {
      headers[field.toLowerCase()] = value;
      return this;
    },
    get(this: ControllerResponse<T>, field: string) {
      return headers[field.toLowerCase()];
    },
  } as Partial<Response> & ControllerResponse<T>;

  return res as ControllerResponse<T>;
};

export const executeController = async <T = any>(
  controller: (req: Request, res: Response) => Promise<void> | void,
  options: MockRequestOptions = {},
): Promise<ControllerResponse<T>> => {
  const req = createMockRequest(options);
  const res = createMockResponse<T>();
  await controller(req, res);
  return res;
};

export const executeProtectedController = async <T = any>(
  controller: (req: Request, res: Response) => Promise<void> | void,
  options: MockRequestOptions & { token?: string } = {},
): Promise<ControllerResponse<T>> => {
  const { token, headers = {}, ...rest } = options;
  const req = createMockRequest({
    ...rest,
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : headers.authorization,
    },
  }) as AuthenticatedRequest;

  const res = createMockResponse<T>();

  let controllerPromise: Promise<void> | void = undefined;
  let nextCalled = false;

  const next: NextFunction = () => {
    nextCalled = true;
    controllerPromise = controller(req as Request, res);
  };

  await authMiddleware(req, res, next);

  if (nextCalled && controllerPromise) {
    await controllerPromise;
  }

  return res;
};
