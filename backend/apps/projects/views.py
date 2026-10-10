from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import Project
from .serializers import ProjectSerializer
from apps.workspaces.models import Membership, Workspace
from apps.activity.models import ActivityEvent

class ProjectListCreateView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        workspace_id = self.request.query_params.get('workspace')
        include_archived = self.request.query_params.get('include_archived', 'false').lower() == 'true'

        if workspace_id:
            if not Membership.objects.filter(workspace_id=workspace_id, user=user).exists():
                return Project.objects.none()
            qs = Project.objects.filter(workspace_id=workspace_id)
        else:
            user_workspaces = Workspace.objects.filter(memberships__user=user)
            qs = Project.objects.filter(workspace__in=user_workspaces)

        if not include_archived:
            qs = qs.filter(is_archived=False)

        return qs.select_related('created_by', 'workspace')

    def perform_create(self, serializer):
        workspace = serializer.validated_data['workspace']
        membership = Membership.objects.filter(workspace=workspace, user=self.request.user).first()
        if not membership:
            raise PermissionDenied("You are not a member of this workspace.")
        if membership.role == Membership.ROLE_VIEWER:
            raise PermissionDenied("Viewers cannot create projects.")

        project = serializer.save(created_by=self.request.user)

        ActivityEvent.objects.create(
            workspace=workspace,
            actor=self.request.user,
            verb='created',
            entity_type='project',
            entity_id=str(project.id),
            metadata={'name': project.name, 'key': project.key}
        )

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        user_workspaces = Workspace.objects.filter(memberships__user=user)
        return Project.objects.filter(workspace__in=user_workspaces).select_related('created_by', 'workspace')

    def perform_update(self, serializer):
        project = self.get_object()
        membership = Membership.objects.filter(workspace=project.workspace, user=self.request.user).first()
        if not membership or membership.role != Membership.ROLE_OWNER:
            raise PermissionDenied("Only workspace owners can update projects.")

        updated_project = serializer.save()
        ActivityEvent.objects.create(
            workspace=updated_project.workspace,
            actor=self.request.user,
            verb='updated',
            entity_type='project',
            entity_id=str(updated_project.id),
            metadata={'name': updated_project.name, 'key': updated_project.key}
        )

    def perform_destroy(self, instance):
        membership = Membership.objects.filter(workspace=instance.workspace, user=self.request.user).first()
        if not membership or membership.role != Membership.ROLE_OWNER:
            raise PermissionDenied("Only workspace owners can delete projects.")

        workspace = instance.workspace
        project_name = instance.name
        project_id = str(instance.id)
        instance.delete()

        ActivityEvent.objects.create(
            workspace=workspace,
            actor=self.request.user,
            verb='deleted',
            entity_type='project',
            entity_id=project_id,
            metadata={'name': project_name}
        )

class ProjectArchiveView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectSerializer

    def post(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        membership = Membership.objects.filter(workspace=project.workspace, user=request.user).first()
        if not membership or membership.role != Membership.ROLE_OWNER:
            raise PermissionDenied("Only workspace owners can archive projects.")

        project.is_archived = True
        project.archived_at = timezone.now()
        project.save(update_fields=['is_archived', 'archived_at'])

        ActivityEvent.objects.create(
            workspace=project.workspace,
            actor=request.user,
            verb='archived',
            entity_type='project',
            entity_id=str(project.id),
            metadata={'name': project.name, 'key': project.key}
        )

        return Response(ProjectSerializer(project).data)

class ProjectRestoreView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProjectSerializer

    def post(self, request, pk):
        project = get_object_or_404(Project, pk=pk)
        membership = Membership.objects.filter(workspace=project.workspace, user=request.user).first()
        if not membership or membership.role != Membership.ROLE_OWNER:
            raise PermissionDenied("Only workspace owners can restore projects.")

        project.is_archived = False
        project.archived_at = None
        project.save(update_fields=['is_archived', 'archived_at'])

        ActivityEvent.objects.create(
            workspace=project.workspace,
            actor=request.user,
            verb='restored',
            entity_type='project',
            entity_id=str(project.id),
            metadata={'name': project.name, 'key': project.key}
        )

        return Response(ProjectSerializer(project).data)
