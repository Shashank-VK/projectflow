import pytest
from django.urls import reverse
from rest_framework import status
from apps.workspaces.models import Workspace, Membership
from apps.projects.models import Project
from apps.issues.models import Issue

@pytest.mark.django_db
class TestTenantIsolation:
    @pytest.fixture
    def second_workspace_setup(self, db, outsider_user):
        ws2 = Workspace.objects.create(name='Beta Labs', slug='beta-labs', created_by=outsider_user)
        Membership.objects.create(workspace=ws2, user=outsider_user, role=Membership.ROLE_OWNER)
        p2 = Project.objects.create(workspace=ws2, key='BL', name='Beta Proj', created_by=outsider_user)
        i2 = Issue.objects.create(
            project=p2,
            title='Confidential Beta Issue',
            reporter=outsider_user,
            position_key='10000.000000',
            version=1
        )
        return ws2, p2, i2

    def test_cannot_access_foreign_workspace_detail(self, api_client, owner_user, second_workspace_setup):
        ws2, _, _ = second_workspace_setup
        api_client.force_authenticate(user=owner_user)

        url = reverse('workspace_detail', kwargs={'pk': ws2.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_list_foreign_workspace_projects(self, api_client, owner_user, second_workspace_setup):
        ws2, _, _ = second_workspace_setup
        api_client.force_authenticate(user=owner_user)

        url = reverse('project_list_create') + f"?workspace={ws2.id}"
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['count'] == 0

    def test_cannot_read_foreign_project_detail(self, api_client, owner_user, second_workspace_setup):
        _, p2, _ = second_workspace_setup
        api_client.force_authenticate(user=owner_user)

        url = reverse('project_detail', kwargs={'pk': p2.id})
        response = api_client.get(url)
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_read_or_mutate_foreign_issue(self, api_client, owner_user, second_workspace_setup):
        _, _, i2 = second_workspace_setup
        api_client.force_authenticate(user=owner_user)

        detail_url = reverse('issue_detail', kwargs={'pk': i2.id})
        # Cannot read
        assert api_client.get(detail_url).status_code == status.HTTP_404_NOT_FOUND

        # Cannot mutate
        assert api_client.patch(detail_url, {'title': 'Hacked'}).status_code == status.HTTP_404_NOT_FOUND

        # Cannot delete
        assert api_client.delete(detail_url).status_code == status.HTTP_404_NOT_FOUND

    def test_cannot_access_foreign_members_or_invites(self, api_client, owner_user, second_workspace_setup):
        ws2, _, _ = second_workspace_setup
        api_client.force_authenticate(user=owner_user)

        members_url = reverse('workspace_members', kwargs={'workspace_id': ws2.id})
        assert api_client.get(members_url).status_code == status.HTTP_403_FORBIDDEN

        invites_url = reverse('workspace_invites', kwargs={'workspace_id': ws2.id})
        assert api_client.get(invites_url).status_code == status.HTTP_403_FORBIDDEN

    def test_cannot_access_foreign_dashboard(self, api_client, owner_user, second_workspace_setup):
        ws2, _, _ = second_workspace_setup
        api_client.force_authenticate(user=owner_user)

        dash_url = reverse('workspace_dashboard', kwargs={'workspace_id': ws2.id})
        assert api_client.get(dash_url).status_code == status.HTTP_403_FORBIDDEN
