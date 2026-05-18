// Copyright 2026 Vention
// SPDX-License-Identifier: Apache-2.0

// Re-export all types from different modules
export * from "@/types/database";
export * from "@/types/api";
export * from "@/types/mcp";
export * from "@/types/tests";
export * from "@/types/ctrf";
export * from "@/types/skills";

// Express types extensions
import type { Request } from "express";
import { IssueCategory } from "./enums";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    role: string;
  };
}

export interface RequestWithPagination extends Request {
  pagination?: {
    page: number;
    limit: number;
    offset: number;
  };
}

// Service layer types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ServiceOptions {
  include?: string[];
  orderBy?: Record<string, "asc" | "desc">;
}

// Common utility types
export type ID = number | string;

export type DateRange = {
  from?: Date | string;
  to?: Date | string;
};

export type SortOrder = "asc" | "desc";

export type FilterOperator =
  | "equals"
  | "contains"
  | "startsWith"
  | "endsWith"
  | "gt"
  | "gte"
  | "lt"
  | "lte";

export interface Filter {
  field: string;
  operator: FilterOperator;
  value: unknown;
}

export interface CreateIssueParams {
  name: string;
  category: IssueCategory;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  projectId: string;
  createdById?: string;
  updatedById?: string;
}

export interface UpdateIssueParams {
  name?: string;
  category?: IssueCategory;
  description?: string;
  portal?: string;
  service?: string;
  ticket?: string;
  updatedById?: string;
}

export interface UserIntegrations {
  reportPortalUrl?: string | null;
  reportPortalEnabled?: boolean;
  monitoringPortalUrl?: string | null;
  monitoringPortalEnabled?: boolean;
  analyzeEnabled?: boolean;
}
