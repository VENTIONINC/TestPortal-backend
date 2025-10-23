import { IssueCategory } from "@/types/enums";

export function buildIssueParams(query: Record<string, string | undefined>) {
  const params: {
    projectId: string;
    category?: IssueCategory;
    name?: string;
    page?: number;
    limit?: number;
    statFrom?: string;
    statTo?: string;
  } = { projectId: query.projectId || "" };

  if (query.category) params.category = query.category as IssueCategory;
  if (query.name) params.name = query.name;
  if (query.page) params.page = Number(query.page);
  if (query.limit) params.limit = Number(query.limit);
  if (query.statFrom) params.statFrom = query.statFrom;
  if (query.statTo) params.statTo = query.statTo;

  return params;
}
