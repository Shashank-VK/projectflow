from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import Workspace, Membership, Invitation
from .serializers import (
    WorkspaceSerializer,
    MembershipSerializer,
    InvitationSerializer,
    UpdateMemberRoleSerializer,
)
from .permissions import IsWorkspaceMember, IsWorkspaceOwner
from apps.activity.models import ActivityEvent
from apps.core.tasks import TaskRunner, send_invitation_email_task

class WorkspaceListCreateView(generics.ListCreateAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(memberships__user=self.request.user).distinct()

    def perform_create(self, serializer):
        with transaction.atomic():
            workspace = serializer.save()
            Membership.objects.create(
                workspace=workspace,
                user=self.request.user,
                role=Membership.ROLE_OWNER
            )
            ActivityEvent.objects.create(
                workspace=workspace,
                actor=self.request.user,
                verb='created',
                entity_type='workspace',
                entity_id=str(workspace.id),
                metadata={'name': workspace.name, 'slug': workspace.slug}
            )

class WorkspaceDetailView(generics.RetrieveUpdateAPIView):
    serializer_class = WorkspaceSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Workspace.objects.filter(memberships__user=self.request.user)

    def check_permissions(self, request):
        super().check_permissions(request)
        if request.method not in permissions.SAFE_METHODS:
            workspace = self.get_object()
            membership = Membership.objects.filter(workspace=workspace, user=request.user).first()
            if not membership or membership.role != Membership.ROLE_OWNER:
                raise PermissionDenied("Only workspace owners can update workspace settings.")

    def perform_update(self, serializer):
        workspace = serializer.save()
        ActivityEvent.objects.create(
            workspace=workspace,
            actor=self.request.user,
            verb='updated',
            entity_type='workspace',
            entity_id=str(workspace.id),
            metadata={'name': workspace.name}
        )

class WorkspaceMemberListCreateView(generics.ListAPIView):
    serializer_class = MembershipSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.kwargs.get('workspace_id')
        user = self.request.user
        if not Membership.objects.filter(workspace_id=workspace_id, user=user).exists():
            raise PermissionDenied("You are not a member of this workspace.")
        return Membership.objects.filter(workspace_id=workspace_id).select_related('user')

class WorkspaceMemberDetailView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = UpdateMemberRoleSerializer

    def get_membership(self):
        workspace_id = self.kwargs.get('workspace_id')
        member_id = self.kwargs.get('member_id')
        user = self.request.user
        
        # Check requester is owner
        requester_membership = Membership.objects.filter(
            workspace_id=workspace_id,
            user=user
        ).first()
        if not requester_membership or requester_membership.role != Membership.ROLE_OWNER:
            raise PermissionDenied("Only workspace owners can manage memberships.")

        return get_object_or_404(Membership, workspace_id=workspace_id, id=member_id)

    def patch(self, request, *args, **kwargs):
        target = self.get_membership()
        serializer = UpdateMemberRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_role = serializer.validated_data['role']

        # Rule: last owner cannot be demoted
        if target.role == Membership.ROLE_OWNER and new_role != Membership.ROLE_OWNER:
            owner_count = Membership.objects.filter(
                workspace=target.workspace,
                role=Membership.ROLE_OWNER
            ).count()
            if owner_count <= 1:
                raise ValidationError({"role": "The final workspace owner cannot be demoted."})

        old_role = target.role
        target.role = new_role
        target.save(update_fields=['role'])

        ActivityEvent.objects.create(
            workspace=target.workspace,
            actor=request.user,
            verb='updated_role',
            entity_type='membership',
            entity_id=str(target.id),
            metadata={'user_email': target.user.email, 'old_role': old_role, 'new_role': new_role}
        )

        return Response(MembershipSerializer(target).data)

    def delete(self, request, *args, **kwargs):
        target = self.get_membership()

        # Rule: last owner cannot be removed
        if target.role == Membership.ROLE_OWNER:
            owner_count = Membership.objects.filter(
                workspace=target.workspace,
                role=Membership.ROLE_OWNER
            ).count()
            if owner_count <= 1:
                raise ValidationError({"detail": "The final workspace owner cannot be removed."})

        target_workspace = target.workspace
        target_email = target.user.email
        target.delete()

        ActivityEvent.objects.create(
            workspace=target_workspace,
            actor=request.user,
            verb='removed',
            entity_type='membership',
            entity_id=str(target.id),
            metadata={'user_email': target_email}
        )

        return Response(status=status.HTTP_204_NO_CONTENT)

class WorkspaceInviteListCreateView(generics.ListCreateAPIView):
    serializer_class = InvitationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def check_owner(self):
        workspace_id = self.kwargs.get('workspace_id')
        membership = Membership.objects.filter(
            workspace_id=workspace_id,
            user=self.request.user,
            role=Membership.ROLE_OWNER
        ).first()
        if not membership:
            raise PermissionDenied("Only workspace owners can manage invitations.")
        return membership.workspace

    def get_queryset(self):
        workspace = self.check_owner()
        return Invitation.objects.filter(workspace=workspace)

    def perform_create(self, serializer):
        workspace = self.check_owner()
        email = serializer.validated_data['email']
        role = serializer.validated_data.get('role', Membership.ROLE_MEMBER)

        # Check if already a member
        if Membership.objects.filter(workspace=workspace, user__email=email).exists():
            raise ValidationError({"email": "This user is already a member of the workspace."})

        # Revoke previous pending invitations for this email
        Invitation.objects.filter(
            workspace=workspace,
            email=email,
            status=Invitation.STATUS_PENDING
        ).update(status=Invitation.STATUS_REVOKED)

        invite = serializer.save(
            workspace=workspace,
            created_by=self.request.user,
            role=role,
            status=Invitation.STATUS_PENDING
        )

        # Trigger async task to send invitation email
        invite_url = f"/invitations/{invite.token}/accept"
        TaskRunner.submit(
            name='send_invitation_email',
            task_func=send_invitation_email_task,
            payload={
                'email': invite.email,
                'workspace_name': workspace.name,
                'invite_url': invite_url,
                'role': invite.role,
            }
        )

        ActivityEvent.objects.create(
            workspace=workspace,
            actor=self.request.user,
            verb='invited',
            entity_type='invitation',
            entity_id=str(invite.id),
            metadata={'email': invite.email, 'role': invite.role}
        )

class WorkspaceInviteRevokeView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvitationSerializer

    def post(self, request, workspace_id, invite_id):
        membership = Membership.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role=Membership.ROLE_OWNER
        ).first()
        if not membership:
            raise PermissionDenied("Only workspace owners can revoke invitations.")

        invite = get_object_or_404(Invitation, id=invite_id, workspace_id=workspace_id)
        if invite.status == Invitation.STATUS_ACCEPTED:
            raise ValidationError({"detail": "Cannot revoke an already accepted invitation."})

        invite.status = Invitation.STATUS_REVOKED
        invite.save(update_fields=['status'])

        ActivityEvent.objects.create(
            workspace=invite.workspace,
            actor=request.user,
            verb='revoked',
            entity_type='invitation',
            entity_id=str(invite.id),
            metadata={'email': invite.email}
        )

        return Response({'status': 'revoked', 'id': str(invite.id)})

class WorkspaceInviteResendView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvitationSerializer

    def post(self, request, workspace_id, invite_id):
        membership = Membership.objects.filter(
            workspace_id=workspace_id,
            user=request.user,
            role=Membership.ROLE_OWNER
        ).first()
        if not membership:
            raise PermissionDenied("Only workspace owners can resend invitations.")

        invite = get_object_or_404(Invitation, id=invite_id, workspace_id=workspace_id)
        if invite.status == Invitation.STATUS_ACCEPTED:
            raise ValidationError({"detail": "Cannot resend an already accepted invitation."})

        invite.status = Invitation.STATUS_PENDING
        invite.expires_at = timezone.now() + timezone.timedelta(days=7)
        invite.save(update_fields=['status', 'expires_at'])

        invite_url = f"/invitations/{invite.token}/accept"
        TaskRunner.submit(
            name='resend_invitation_email',
            task_func=send_invitation_email_task,
            payload={
                'email': invite.email,
                'workspace_name': invite.workspace.name,
                'invite_url': invite_url,
                'role': invite.role,
            }
        )

        return Response(InvitationSerializer(invite).data)

class InvitationInspectView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = InvitationSerializer

    def get(self, request, token):
        invite = get_object_or_404(Invitation, token=token)
        invite.is_expired()  # updates status if expired
        return Response(InvitationSerializer(invite).data)

class InvitationAcceptView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MembershipSerializer

    def post(self, request, token):
        with transaction.atomic():
            # Lock the invite row for concurrency safety
            try:
                invite = Invitation.objects.select_for_update().get(token=token)
            except Invitation.DoesNotExist:
                raise ValidationError({"detail": "Invitation not found."})

            # Check normalized email match
            user_email = request.user.email.strip().lower()
            invite_email = invite.email.strip().lower()

            if user_email != invite_email:
                raise ValidationError({
                    "detail": (
                        f"This invitation was sent to {invite.email}. "
                        f"You are currently signed in as {request.user.email}. "
                        f"Please sign in with {invite.email} or ask the workspace owner to invite your account."
                    )
                })

            # Idempotency check: if user is already a member
            existing_membership = Membership.objects.filter(
                workspace=invite.workspace,
                user=request.user
            ).first()

            if invite.status == Invitation.STATUS_ACCEPTED:
                if existing_membership:
                    return Response(MembershipSerializer(existing_membership).data, status=status.HTTP_200_OK)
                raise ValidationError({"detail": "This invitation has already been accepted."})

            if invite.status == Invitation.STATUS_REVOKED:
                raise ValidationError({"detail": "This invitation has been revoked."})

            if invite.is_expired():
                raise ValidationError({"detail": "This invitation has expired."})

            # Atomically create or retrieve membership
            membership, created = Membership.objects.get_or_create(
                workspace=invite.workspace,
                user=request.user,
                defaults={'role': invite.role}
            )

            invite.status = Invitation.STATUS_ACCEPTED
            invite.accepted_at = timezone.now()
            invite.save(update_fields=['status', 'accepted_at'])

            if created:
                ActivityEvent.objects.create(
                    workspace=invite.workspace,
                    actor=request.user,
                    verb='joined',
                    entity_type='membership',
                    entity_id=str(membership.id),
                    metadata={'role': membership.role, 'email': request.user.email}
                )

            return Response(MembershipSerializer(membership).data, status=status.HTTP_200_OK)

class WorkspaceDashboardView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = WorkspaceSerializer

    def get(self, request, workspace_id):
        # Verify membership
        membership = Membership.objects.filter(workspace_id=workspace_id, user=request.user).first()
        if not membership:
            raise PermissionDenied("You are not a member of this workspace.")

        from apps.issues.models import Issue
        from apps.projects.models import Project

        # Metrics strictly exclude archived projects and are scoped to this workspace
        active_projects = Project.objects.filter(workspace_id=workspace_id, is_archived=False)
        issues = Issue.objects.filter(project__in=active_projects)

        # Status counts
        status_counts = {
            'todo': issues.filter(status='todo').count(),
            'in_progress': issues.filter(status='in_progress').count(),
            'in_review': issues.filter(status='in_review').count(),
            'done': issues.filter(status='done').count(),
        }

        # Priority counts
        priority_counts = {
            'low': issues.filter(priority='low').count(),
            'medium': issues.filter(priority='medium').count(),
            'high': issues.filter(priority='high').count(),
            'urgent': issues.filter(priority='urgent').count(),
        }

        # Overdue count (due_at before now, status not done)
        now = timezone.now()
        overdue_count = issues.filter(due_at__lt=now).exclude(status='done').count()

        # Assignee counts
        from django.db.models import Count
        assignee_stats = issues.values('assignee__id', 'assignee__name', 'assignee__email').annotate(
            count=Count('id')
        ).order_by('-count')

        # Recent activities (last 10)
        recent_activities = ActivityEvent.objects.filter(
            workspace_id=workspace_id
        ).select_related('actor')[:10]
        from apps.activity.serializers import ActivityEventSerializer

        return Response({
            'workspace_id': str(workspace_id),
            'total_issues': issues.count(),
            'overdue_count': overdue_count,
            'status_counts': status_counts,
            'priority_counts': priority_counts,
            'assignees': list(assignee_stats),
            'recent_activity': ActivityEventSerializer(recent_activities, many=True).data
        })
