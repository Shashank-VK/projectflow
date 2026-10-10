export type Role = 'owner' | 'member' | 'viewer';
export type IssueStatus = 'todo' | 'in_progress' | 'in_review' | 'done';
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';
export type InviteStatus = 'pending' | 'accepted' | 'revoked' | 'expired';

export interface User {
  id: string;
  email: string;
  name: string;
  created_at: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  created_by: string;
  role: Role | null;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface Membership {
  id: string;
  workspace: string;
  user: User;
  role: Role;
  joined_at: string;
}

export interface Invitation {
  id: string;
  workspace: string;
  workspace_name: string;
  email: string;
  role: Role;
  token: string;
  status: InviteStatus;
  created_by: User;
  expires_at: string;
  created_at: string;
  accepted_at: string | null;
}

export interface Project {
  id: string;
  workspace: string;
  key: string;
  name: string;
  description: string;
  is_archived: boolean;
  archived_at: string | null;
  created_by: User;
  issue_count: number;
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: string;
  project: string;
  project_key: string;
  project_name: string;
  workspace_id: string;
  sequence: number;
  key: string;
  title: string;
  description: string;
  status: IssueStatus;
  priority: IssuePriority;
  reporter: User;
  assignee: User | null;
  due_at: string | null;
  position_key: string;
  version: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface Comment {
  id: string;
  issue: string;
  author: User;
  body: string;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface ActivityEvent {
  id: string;
  workspace: string;
  actor: User | null;
  verb: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface DashboardStats {
  workspace_id: string;
  total_issues: number;
  overdue_count: number;
  status_counts: {
    todo: number;
    in_progress: number;
    in_review: number;
    done: number;
  };
  priority_counts: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  assignees: Array<{
    assignee__id: string | null;
    assignee__name: string | null;
    assignee__email: string | null;
    count: number;
  }>;
  recent_activity: ActivityEvent[];
}
