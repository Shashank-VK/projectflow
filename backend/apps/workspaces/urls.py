from django.urls import path
from .views import (
    WorkspaceListCreateView,
    WorkspaceDetailView,
    WorkspaceMemberListCreateView,
    WorkspaceMemberDetailView,
    WorkspaceInviteListCreateView,
    WorkspaceInviteRevokeView,
    WorkspaceInviteResendView,
    InvitationInspectView,
    InvitationAcceptView,
    WorkspaceDashboardView,
)

urlpatterns = [
    path('workspaces/', WorkspaceListCreateView.as_view(), name='workspace_list_create'),
    path('workspaces/<uuid:pk>/', WorkspaceDetailView.as_view(), name='workspace_detail'),
    path('workspaces/<uuid:workspace_id>/members/', WorkspaceMemberListCreateView.as_view(), name='workspace_members'),
    path('workspaces/<uuid:workspace_id>/members/<uuid:member_id>/', WorkspaceMemberDetailView.as_view(), name='workspace_member_detail'),
    path('workspaces/<uuid:workspace_id>/invites/', WorkspaceInviteListCreateView.as_view(), name='workspace_invites'),
    path('workspaces/<uuid:workspace_id>/invites/<uuid:invite_id>/revoke/', WorkspaceInviteRevokeView.as_view(), name='workspace_invite_revoke'),
    path('workspaces/<uuid:workspace_id>/invites/<uuid:invite_id>/resend/', WorkspaceInviteResendView.as_view(), name='workspace_invite_resend'),
    path('invitations/<str:token>/', InvitationInspectView.as_view(), name='invitation_inspect'),
    path('invitations/<str:token>/accept/', InvitationAcceptView.as_view(), name='invitation_accept'),
    path('workspaces/<uuid:workspace_id>/dashboard/', WorkspaceDashboardView.as_view(), name='workspace_dashboard'),
]
