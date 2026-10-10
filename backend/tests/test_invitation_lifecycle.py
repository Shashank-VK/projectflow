import pytest
from datetime import timedelta
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.workspaces.models import Invitation, Membership

User = get_user_model()

@pytest.mark.django_db(transaction=True)
class TestInvitationLifecycle:
    def test_successful_invitation_and_accept(self, api_client, workspace, owner_user):
        # 1. Owner sends invite
        api_client.force_authenticate(user=owner_user)
        invite_url = reverse('workspace_invites', kwargs={'workspace_id': workspace.id})
        res_invite = api_client.post(invite_url, {'email': 'invited@example.com', 'role': 'member'})
        assert res_invite.status_code == status.HTTP_201_CREATED
        token = res_invite.data['token']

        # 2. Inspect invite before accept
        inspect_url = reverse('invitation_inspect', kwargs={'token': token})
        res_inspect = api_client.get(inspect_url)
        assert res_inspect.status_code == status.HTTP_200_OK
        assert res_inspect.data['email'] == 'invited@example.com'
        assert res_inspect.data['status'] == 'pending'

        # 3. Invited user registers and accepts
        invited_user = User.objects.create_user(email='invited@example.com', password='password123', name='Invited User')
        api_client.force_authenticate(user=invited_user)

        accept_url = reverse('invitation_accept', kwargs={'token': token})
        res_accept = api_client.post(accept_url)
        assert res_accept.status_code == status.HTTP_200_OK
        assert res_accept.data['role'] == 'member'

        # Verified in database
        assert Membership.objects.filter(workspace=workspace, user=invited_user, role='member').exists()
        invitation = Invitation.objects.get(token=token)
        assert invitation.status == Invitation.STATUS_ACCEPTED

    def test_mismatched_signed_in_email_is_rejected(self, api_client, workspace, owner_user, member_user):
        invite = Invitation.objects.create(
            workspace=workspace,
            email='intended.recipient@example.com',
            role=Membership.ROLE_MEMBER,
            created_by=owner_user
        )

        # Authenticated as different user
        api_client.force_authenticate(user=member_user)  # email is member@test.com
        accept_url = reverse('invitation_accept', kwargs={'token': invite.token})
        response = api_client.post(accept_url)

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        error_msg = response.data['error']['message']
        assert "intended.recipient@example.com" in error_msg
        assert "member@test.com" in error_msg

    def test_expired_invitation_is_rejected(self, api_client, workspace, owner_user):
        invite = Invitation.objects.create(
            workspace=workspace,
            email='late@example.com',
            role=Membership.ROLE_MEMBER,
            created_by=owner_user,
            expires_at=timezone.now() - timedelta(days=1)
        )
        user = User.objects.create_user(email='late@example.com', password='password123', name='Late User')
        api_client.force_authenticate(user=user)

        accept_url = reverse('invitation_accept', kwargs={'token': invite.token})
        response = api_client.post(accept_url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "expired" in response.data['error']['message']

    def test_revoked_invitation_is_rejected(self, api_client, workspace, owner_user):
        invite = Invitation.objects.create(
            workspace=workspace,
            email='revoked@example.com',
            role=Membership.ROLE_MEMBER,
            created_by=owner_user,
            status=Invitation.STATUS_REVOKED
        )
        user = User.objects.create_user(email='revoked@example.com', password='password123', name='Revoked User')
        api_client.force_authenticate(user=user)

        accept_url = reverse('invitation_accept', kwargs={'token': invite.token})
        response = api_client.post(accept_url)
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "revoked" in response.data['error']['message']

    def test_idempotent_concurrent_acceptance(self, api_client, workspace, owner_user):
        """
        Accepting an already-accepted invite by the same user returns the existing membership (idempotent).
        """
        user = User.objects.create_user(email='concurrent@example.com', password='password123', name='Concurrent User')
        invite = Invitation.objects.create(
            workspace=workspace,
            email='concurrent@example.com',
            role=Membership.ROLE_MEMBER,
            created_by=owner_user
        )
        api_client.force_authenticate(user=user)
        accept_url = reverse('invitation_accept', kwargs={'token': invite.token})

        res1 = api_client.post(accept_url)
        assert res1.status_code == status.HTTP_200_OK

        # Second request (e.g. concurrent tab)
        res2 = api_client.post(accept_url)
        assert res2.status_code == status.HTTP_200_OK
        assert res2.data['id'] == res1.data['id']

        # Exactly one membership exists
        assert Membership.objects.filter(workspace=workspace, user=user).count() == 1
