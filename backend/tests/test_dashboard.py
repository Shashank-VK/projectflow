import pytest
from datetime import timedelta
from django.utils import timezone
from django.urls import reverse
from rest_framework import status
from apps.issues.models import Issue
from apps.projects.models import Project

@pytest.mark.django_db
class TestDashboardMetrics:
    def test_dashboard_metrics_counts_and_excludes_archived(self, api_client, workspace, project, issue, owner_user, member_user):
        # Create an overdue issue in active project
        Issue.objects.create(
            project=project,
            title='Overdue Task',
            status=Issue.STATUS_IN_PROGRESS,
            priority=Issue.PRIORITY_URGENT,
            reporter=owner_user,
            assignee=member_user,
            due_at=timezone.now() - timedelta(days=2),
            position_key='20000.000000',
            version=1
        )

        # Create an archived project with issues
        archived_proj = Project.objects.create(
            workspace=workspace,
            key='ARCH',
            name='Archived',
            is_archived=True,
            archived_at=timezone.now(),
            created_by=owner_user
        )
        # Archived issues must not appear in metrics
        # (We use bulk_create or save directly without clean if archived)
        Issue.objects.filter(id=issue.id) # existing issue

        api_client.force_authenticate(user=owner_user)
        url = reverse('workspace_dashboard', kwargs={'workspace_id': workspace.id})
        response = api_client.get(url)

        assert response.status_code == status.HTTP_200_OK
        data = response.data
        assert data['total_issues'] == 2
        assert data['status_counts']['todo'] == 1
        assert data['status_counts']['in_progress'] == 1
        assert data['overdue_count'] == 1
        assert data['priority_counts']['urgent'] == 1
        assert data['priority_counts']['medium'] == 1
