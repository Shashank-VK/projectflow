from django.db import transaction
from django.db.models import Q, Max
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Issue, Comment
from .serializers import IssueSerializer, CommentSerializer
from apps.projects.models import Project
from apps.workspaces.models import Membership, Workspace
from apps.activity.models import ActivityEvent
from apps.core.exceptions import ConflictError

class IssueListCreateView(generics.ListCreateAPIView):
    serializer_class = IssueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_workspaces = Workspace.objects.filter(memberships__user=user)
        qs = Issue.objects.filter(project__workspace__in=user_workspaces).select_related(
            'project', 'project__workspace', 'reporter', 'assignee'
        )

        # Filters
        workspace_id = self.request.query_params.get('workspace')
        if workspace_id:
            qs = qs.filter(project__workspace_id=workspace_id)

        project_id = self.request.query_params.get('project')
        if project_id:
            qs = qs.filter(project_id=project_id)

        project_key = self.request.query_params.get('project_key')
        if project_key:
            qs = qs.filter(project__key=project_key)

        status_param = self.request.query_params.get('status')
        if status_param:
            qs = qs.filter(status=status_param)

        priority_param = self.request.query_params.get('priority')
        if priority_param:
            qs = qs.filter(priority=priority_param)

        assignee_param = self.request.query_params.get('assignee')
        if assignee_param:
            if assignee_param == 'unassigned':
                qs = qs.filter(assignee__isnull=True)
            else:
                qs = qs.filter(assignee_id=assignee_param)

        search_query = self.request.query_params.get('search')
        if search_query:
            qs = qs.filter(
                Q(title__icontains=search_query) |
                Q(description__icontains=search_query) |
                Q(key__icontains=search_query)
            )

        sort_by = self.request.query_params.get('sort', 'position_key')
        allowed_sorts = {
            'position_key': 'position_key',
            '-position_key': '-position_key',
            'created_at': 'created_at',
            '-created_at': '-created_at',
            'due_at': 'due_at',
            '-due_at': '-due_at',
            'priority': 'priority',
            '-priority': '-priority',
            'status': 'status',
        }
        order_field = allowed_sorts.get(sort_by, 'position_key')
        return qs.order_by(order_field)

    def perform_create(self, serializer):
        project = serializer.validated_data['project']
        membership = Membership.objects.filter(workspace=project.workspace, user=self.request.user).first()
        if not membership:
            raise PermissionDenied("You are not a member of this project's workspace.")
        if membership.role == Membership.ROLE_VIEWER:
            raise PermissionDenied("Viewers cannot create issues.")
        if project.is_archived:
            raise ValidationError({"project": "Cannot create issues in an archived project."})

        # Calculate initial position_key if not provided
        position_key = serializer.validated_data.get('position_key')
        if not position_key:
            max_pos = Issue.objects.filter(project=project).aggregate(Max('position_key'))['position_key__max']
            try:
                next_val = float(max_pos) + 10000.0 if max_pos else 10000.0
            except (ValueError, TypeError):
                next_val = 10000.0
            position_key = f"{next_val:.6f}"

        with transaction.atomic():
            issue = serializer.save(
                reporter=self.request.user,
                position_key=position_key,
                version=1
            )
            ActivityEvent.objects.create(
                workspace=project.workspace,
                actor=self.request.user,
                verb='created',
                entity_type='issue',
                entity_id=str(issue.id),
                metadata={'key': issue.key, 'title': issue.title, 'status': issue.status}
            )

class IssueDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = IssueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_workspaces = Workspace.objects.filter(memberships__user=user)
        return Issue.objects.filter(project__workspace__in=user_workspaces).select_related(
            'project', 'project__workspace', 'reporter', 'assignee'
        )

    def check_mutation_permissions(self, issue):
        membership = Membership.objects.filter(workspace=issue.project.workspace, user=self.request.user).first()
        if not membership:
            raise PermissionDenied("You are not a member of this workspace.")
        if membership.role == Membership.ROLE_VIEWER:
            raise PermissionDenied("Viewers cannot modify or delete issues.")
        if issue.project.is_archived:
            raise ValidationError({"detail": "Cannot modify issues in an archived project."})
        return membership

    def update(self, request, *args, **kwargs):
        issue = self.get_object()
        self.check_mutation_permissions(issue)

        # Optimistic Locking & Conflict Detection
        client_version = request.data.get('version')
        if client_version is not None:
            try:
                client_version = int(client_version)
            except (TypeError, ValueError):
                raise ValidationError({"version": "Version must be an integer."})

            if issue.version != client_version:
                # 409 Conflict with current representation!
                raise ConflictError(
                    detail="Conflict detected: this issue was modified by another user or session.",
                    current_data=IssueSerializer(issue).data
                )

        old_status = issue.status
        old_assignee = issue.assignee

        with transaction.atomic():
            serializer = self.get_serializer(issue, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            
            # Increment version on accepted mutation
            updated_issue = serializer.save(version=issue.version + 1)

            # Determine activity verb and metadata
            changes = {}
            if old_status != updated_issue.status:
                verb = 'moved'
                changes['status'] = {'from': old_status, 'to': updated_issue.status}
            elif old_assignee != updated_issue.assignee:
                verb = 'assigned'
                changes['assignee'] = {
                    'from': old_assignee.email if old_assignee else None,
                    'to': updated_issue.assignee.email if updated_issue.assignee else None
                }
            else:
                verb = 'updated'

            changes['key'] = updated_issue.key
            changes['title'] = updated_issue.title

            ActivityEvent.objects.create(
                workspace=updated_issue.project.workspace,
                actor=request.user,
                verb=verb,
                entity_type='issue',
                entity_id=str(updated_issue.id),
                metadata=changes
            )

            return Response(IssueSerializer(updated_issue).data)

    def perform_destroy(self, instance):
        membership = self.check_mutation_permissions(instance)

        # Only Owner or original Reporter can delete
        if membership.role != Membership.ROLE_OWNER and instance.reporter != self.request.user:
            raise PermissionDenied("Only workspace owners or the issue reporter can delete this issue.")

        workspace = instance.project.workspace
        issue_key = instance.key
        issue_title = instance.title
        issue_id = str(instance.id)

        with transaction.atomic():
            instance.delete()
            ActivityEvent.objects.create(
                workspace=workspace,
                actor=self.request.user,
                verb='deleted',
                entity_type='issue',
                entity_id=issue_id,
                metadata={'key': issue_key, 'title': issue_title}
            )

class CommentListCreateView(generics.ListCreateAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_issue(self):
        issue_id = self.kwargs.get('issue_id')
        user = self.request.user
        issue = get_object_or_404(Issue, id=issue_id)
        if not Membership.objects.filter(workspace=issue.project.workspace, user=user).exists():
            raise PermissionDenied("You do not have access to this issue.")
        return issue

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in permissions.SAFE_METHODS:
            issue = self.get_issue()
            membership = Membership.objects.filter(workspace=issue.project.workspace, user=request.user).first()
            if not membership:
                raise PermissionDenied("You are not a member of this workspace.")
            if membership.role == Membership.ROLE_VIEWER:
                raise PermissionDenied("Viewers cannot add comments.")

    def get_queryset(self):
        issue = self.get_issue()
        return Comment.objects.filter(issue=issue).select_related('author')

    def perform_create(self, serializer):
        issue = self.get_issue()
        membership = Membership.objects.filter(workspace=issue.project.workspace, user=self.request.user).first()
        if not membership:
            raise PermissionDenied("You are not a member of this workspace.")
        if membership.role == Membership.ROLE_VIEWER:
            raise PermissionDenied("Viewers cannot add comments.")
        if issue.project.is_archived:
            raise ValidationError({"detail": "Cannot add comments to an issue in an archived project."})

        with transaction.atomic():
            comment = serializer.save(issue=issue, author=self.request.user)
            ActivityEvent.objects.create(
                workspace=issue.project.workspace,
                actor=self.request.user,
                verb='commented',
                entity_type='comment',
                entity_id=str(comment.id),
                metadata={'issue_key': issue.key, 'issue_title': issue.title}
            )

class CommentDetailView(generics.DestroyAPIView):
    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_workspaces = Workspace.objects.filter(memberships__user=user)
        return Comment.objects.filter(issue__project__workspace__in=user_workspaces)

    def perform_destroy(self, instance):
        membership = Membership.objects.filter(
            workspace=instance.issue.project.workspace,
            user=self.request.user
        ).first()

        if not membership:
            raise PermissionDenied("You are not a member of this workspace.")
        if membership.role == Membership.ROLE_VIEWER:
            raise PermissionDenied("Viewers cannot delete comments.")
        if membership.role != Membership.ROLE_OWNER and instance.author != self.request.user:
            raise PermissionDenied("You can only delete your own comments.")

        # Soft delete per PRD policy
        instance.is_deleted = True
        instance.save(update_fields=['is_deleted'])
