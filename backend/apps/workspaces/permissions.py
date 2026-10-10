from rest_framework import permissions
from .models import Membership

class IsWorkspaceMember(permissions.BasePermission):
    """
    Allows access only to active members of the workspace.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        workspace_id = view.kwargs.get('workspace_id') or view.kwargs.get('id') or request.query_params.get('workspace')
        if not workspace_id:
            return True
        return Membership.objects.filter(workspace_id=workspace_id, user=request.user).exists()

    def has_object_permission(self, request, view, obj):
        workspace = getattr(obj, 'workspace', obj)
        return Membership.objects.filter(workspace=workspace, user=request.user).exists()

class IsWorkspaceOwner(permissions.BasePermission):
    """
    Allows access only to workspace owners.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        workspace_id = view.kwargs.get('workspace_id') or view.kwargs.get('id') or request.query_params.get('workspace')
        if not workspace_id:
            return True
        return Membership.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role=Membership.ROLE_OWNER
        ).exists()

    def has_object_permission(self, request, view, obj):
        workspace = getattr(obj, 'workspace', obj)
        return Membership.objects.filter(
            workspace=workspace,
            user=request.user,
            role=Membership.ROLE_OWNER
        ).exists()

class CanMutateWorkspaceResource(permissions.BasePermission):
    """
    Read access (GET, HEAD, OPTIONS) allowed for all workspace members (including Viewers).
    Write mutations (POST, PUT, PATCH, DELETE) strictly require Owner or Member role.
    Viewers are strictly rejected with 403 Forbidden on mutations.
    """
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        
        workspace_id = view.kwargs.get('workspace_id') or view.kwargs.get('id') or request.query_params.get('workspace')
        if not workspace_id:
            return True

        membership = Membership.objects.filter(workspace_id=workspace_id, user=request.user).first()
        if not membership:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return membership.role in (Membership.ROLE_OWNER, Membership.ROLE_MEMBER)

    def has_object_permission(self, request, view, obj):
        workspace = getattr(obj, 'workspace', None)
        if hasattr(obj, 'project'):
            workspace = obj.project.workspace
        elif not workspace and hasattr(obj, 'membership'):
            workspace = obj.membership.workspace

        if not workspace:
            return True

        membership = Membership.objects.filter(workspace=workspace, user=request.user).first()
        if not membership:
            return False

        if request.method in permissions.SAFE_METHODS:
            return True

        return membership.role in (Membership.ROLE_OWNER, Membership.ROLE_MEMBER)
