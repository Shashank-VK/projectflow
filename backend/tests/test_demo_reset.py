import pytest
from django.urls import reverse
from rest_framework import status
from django.conf import settings
from apps.workspaces.models import Workspace, Membership
from apps.projects.models import Project
from apps.issues.models import Issue

@pytest.mark.django_db(transaction=True)
class TestDemoReset:
    def test_demo_reset_requires_authentication(self, api_client):
        url = reverse('demo_reset')
        response = api_client.post(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_demo_reset_disabled_when_demo_mode_false(self, api_client, owner_user, settings):
        settings.DEMO_MODE = False
        api_client.force_authenticate(user=owner_user)

        url = reverse('demo_reset')
        response = api_client.post(url)
        assert response.status_code == status.HTTP_403_FORBIDDEN

    def test_demo_reset_reseeds_environment_cleanly(self, api_client, owner_user, settings):
        settings.DEMO_MODE = True
        api_client.force_authenticate(user=owner_user)

        url = reverse('demo_reset')
        response = api_client.post(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'ok'

        # Verify demo entities exist
        assert Workspace.objects.filter(slug='acme-engineering').exists()
        assert Workspace.objects.filter(slug='beta-labs').exists()
        assert Project.objects.filter(key='PF').exists()
        assert Issue.objects.filter(project__key='PF').count() >= 6
