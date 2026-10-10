import pytest
from django.urls import reverse
from rest_framework import status
from apps.workspaces.models import Membership, Invitation
from apps.projects.models import Project
from apps.issues.models import Issue, Comment

@pytest.mark.django_db
class TestRoleMatrixPermissions:
    # 1. Workspace settings mutation
    def test_workspace_settings_update_permissions(self, api_client, workspace, owner_user, member_user, viewer_user):
        url = reverse('workspace_detail', kwargs={'pk': workspace.id})
        payload = {'name': 'Updated Name'}

        # Owner succeeds
        api_client.force_authenticate(user=owner_user)
        res_owner = api_client.patch(url, payload)
        assert res_owner.status_code == status.HTTP_200_OK

        # Member rejected
        api_client.force_authenticate(user=member_user)
        res_member = api_client.patch(url, payload)
        assert res_member.status_code == status.HTTP_403_FORBIDDEN

        # Viewer rejected
        api_client.force_authenticate(user=viewer_user)
        res_viewer = api_client.patch(url, payload)
        assert res_viewer.status_code == status.HTTP_403_FORBIDDEN

    # 2. Member management permissions
    def test_member_role_update_permissions(self, api_client, workspace, owner_user, member_user, viewer_user):
        member_membership = Membership.objects.get(workspace=workspace, user=member_user)
        url = reverse('workspace_member_detail', kwargs={'workspace_id': workspace.id, 'member_id': member_membership.id})
        payload = {'role': 'viewer'}

        # Viewer rejected
        api_client.force_authenticate(user=viewer_user)
        res_viewer = api_client.patch(url, payload)
        assert res_viewer.status_code == status.HTTP_403_FORBIDDEN

        # Member rejected
        api_client.force_authenticate(user=member_user)
        res_member = api_client.patch(url, payload)
        assert res_member.status_code == status.HTTP_403_FORBIDDEN

        # Owner succeeds
        api_client.force_authenticate(user=owner_user)
        res_owner = api_client.patch(url, payload)
        assert res_owner.status_code == status.HTTP_200_OK
        assert res_owner.data['role'] == 'viewer'

    def test_final_owner_cannot_be_demoted_or_removed(self, api_client, workspace, owner_user):
        owner_membership = Membership.objects.get(workspace=workspace, user=owner_user)
        url = reverse('workspace_member_detail', kwargs={'workspace_id': workspace.id, 'member_id': owner_membership.id})
        api_client.force_authenticate(user=owner_user)

        # Attempt to demote only owner
        res_demote = api_client.patch(url, {'role': 'member'})
        assert res_demote.status_code == status.HTTP_400_BAD_REQUEST

        # Attempt to remove only owner
        res_remove = api_client.delete(url)
        assert res_remove.status_code == status.HTTP_400_BAD_REQUEST

    # 3. Invitations permissions
    def test_invite_creation_permissions(self, api_client, workspace, owner_user, member_user, viewer_user):
        url = reverse('workspace_invites', kwargs={'workspace_id': workspace.id})
        payload = {'email': 'collab@example.com', 'role': 'member'}

        # Viewer rejected
        api_client.force_authenticate(user=viewer_user)
        assert api_client.post(url, payload).status_code == status.HTTP_403_FORBIDDEN

        # Member rejected
        api_client.force_authenticate(user=member_user)
        assert api_client.post(url, payload).status_code == status.HTTP_403_FORBIDDEN

        # Owner succeeds
        api_client.force_authenticate(user=owner_user)
        res_owner = api_client.post(url, payload)
        assert res_owner.status_code == status.HTTP_201_CREATED

    # 4. Project creation and archiving
    def test_project_mutations_permissions(self, api_client, workspace, owner_user, member_user, viewer_user, project):
        create_url = reverse('project_list_create')

        # Viewer cannot create project
        api_client.force_authenticate(user=viewer_user)
        assert api_client.post(create_url, {'workspace': str(workspace.id), 'key': 'VW', 'name': 'Viewer Proj'}).status_code == status.HTTP_403_FORBIDDEN

        # Member CAN create project
        api_client.force_authenticate(user=member_user)
        res_member_proj = api_client.post(create_url, {'workspace': str(workspace.id), 'key': 'MB', 'name': 'Member Proj'})
        assert res_member_proj.status_code == status.HTTP_201_CREATED

        archive_url = reverse('project_archive', kwargs={'pk': project.id})

        # Viewer cannot archive
        api_client.force_authenticate(user=viewer_user)
        assert api_client.post(archive_url).status_code == status.HTTP_403_FORBIDDEN

        # Member cannot archive
        api_client.force_authenticate(user=member_user)
        assert api_client.post(archive_url).status_code == status.HTTP_403_FORBIDDEN

        # Owner can archive
        api_client.force_authenticate(user=owner_user)
        assert api_client.post(archive_url).status_code == status.HTTP_200_OK

    # 5. Issue creation and modification permissions
    def test_issue_mutations_permissions(self, api_client, project, issue, owner_user, member_user, viewer_user):
        create_url = reverse('issue_list_create')
        payload = {
            'project': str(project.id),
            'title': 'New Task',
            'status': 'todo',
            'priority': 'high'
        }

        # Viewer cannot create issue
        api_client.force_authenticate(user=viewer_user)
        assert api_client.post(create_url, payload).status_code == status.HTTP_403_FORBIDDEN

        # Member can create issue
        api_client.force_authenticate(user=member_user)
        res_member = api_client.post(create_url, payload)
        assert res_member.status_code == status.HTTP_201_CREATED

        detail_url = reverse('issue_detail', kwargs={'pk': issue.id})

        # Viewer cannot modify issue
        api_client.force_authenticate(user=viewer_user)
        assert api_client.patch(detail_url, {'status': 'in_progress', 'version': issue.version}).status_code == status.HTTP_403_FORBIDDEN

        # Member can modify issue
        api_client.force_authenticate(user=member_user)
        res_update = api_client.patch(detail_url, {'status': 'in_progress', 'version': issue.version})
        assert res_update.status_code == status.HTTP_200_OK
        assert res_update.data['status'] == 'in_progress'

    # 6. Commenting permissions
    def test_comment_permissions(self, api_client, issue, owner_user, member_user, viewer_user):
        comments_url = reverse('issue_comments', kwargs={'issue_id': issue.id})
        payload = {'body': 'A comment.'}

        # Viewer cannot comment
        api_client.force_authenticate(user=viewer_user)
        assert api_client.post(comments_url, payload).status_code == status.HTTP_403_FORBIDDEN

        # Member can comment
        api_client.force_authenticate(user=member_user)
        assert api_client.post(comments_url, payload).status_code == status.HTTP_201_CREATED

        # Owner can comment
        api_client.force_authenticate(user=owner_user)
        assert api_client.post(comments_url, payload).status_code == status.HTTP_201_CREATED

    # 7. Viewer read-only access is fully allowed
    def test_viewer_can_read_all_workspace_resources(self, api_client, workspace, project, issue, viewer_user):
        api_client.force_authenticate(user=viewer_user)

        # Can read projects
        res_proj = api_client.get(reverse('project_list_create') + f"?workspace={workspace.id}")
        assert res_proj.status_code == status.HTTP_200_OK

        # Can read issues
        res_issues = api_client.get(reverse('issue_list_create') + f"?project={project.id}")
        assert res_issues.status_code == status.HTTP_200_OK

        # Can read comments
        res_comments = api_client.get(reverse('issue_comments', kwargs={'issue_id': issue.id}))
        assert res_comments.status_code == status.HTTP_200_OK

        # Can read dashboard
        res_dash = api_client.get(reverse('workspace_dashboard', kwargs={'workspace_id': workspace.id}))
        assert res_dash.status_code == status.HTTP_200_OK
