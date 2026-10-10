import pytest
from django.urls import reverse
from rest_framework import status
from apps.issues.models import Issue

@pytest.mark.django_db(transaction=True)
class TestIssuesConcurrencyAndVersionConflict:
    def test_version_conflict_409_on_stale_update(self, api_client, issue, member_user):
        """
        Two clients attempt to mutate the card with version=1.
        First succeeds (advances to version=2).
        Second gets 409 Conflict with the current representation in the payload.
        """
        detail_url = reverse('issue_detail', kwargs={'pk': issue.id})
        api_client.force_authenticate(user=member_user)

        # Client 1 updates card to in_progress
        res1 = api_client.patch(detail_url, {
            'status': 'in_progress',
            'version': 1
        })
        assert res1.status_code == status.HTTP_200_OK
        assert res1.data['version'] == 2
        assert res1.data['status'] == 'in_progress'

        # Client 2 attempts update with stale version=1
        res2 = api_client.patch(detail_url, {
            'status': 'done',
            'version': 1
        })
        assert res2.status_code == status.HTTP_409_CONFLICT
        assert res2.data['error']['code'] == 'conflict'
        # Contains current server representation
        assert 'data' in res2.data['error']
        assert res2.data['error']['data']['version'] == 2
        assert res2.data['error']['data']['status'] == 'in_progress'

        # Client 2 recovers by applying change with current version=2
        res2_retry = api_client.patch(detail_url, {
            'status': 'done',
            'version': 2
        })
        assert res2_retry.status_code == status.HTTP_200_OK
        assert res2_retry.data['version'] == 3
        assert res2_retry.data['status'] == 'done'

    def test_fractional_position_key_reordering(self, api_client, issue, member_user):
        """
        Tests updating position_key with fractional order string.
        """
        detail_url = reverse('issue_detail', kwargs={'pk': issue.id})
        api_client.force_authenticate(user=member_user)

        res = api_client.patch(detail_url, {
            'position_key': '15000.500000',
            'version': issue.version
        })
        assert res.status_code == status.HTTP_200_OK
        assert res.data['position_key'] == '15000.500000'

    def test_archived_project_rejects_issue_mutation(self, api_client, project, issue, owner_user):
        """
        Archived project rejects mutations to issues.
        """
        project.is_archived = True
        project.save(update_fields=['is_archived'])

        detail_url = reverse('issue_detail', kwargs={'pk': issue.id})
        api_client.force_authenticate(user=owner_user)

        response = api_client.patch(detail_url, {
            'title': 'New Title',
            'version': issue.version
        })
        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert "archived" in response.data['error']['message']
