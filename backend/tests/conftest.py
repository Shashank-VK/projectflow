import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.workspaces.models import Workspace, Membership, Invitation
from apps.projects.models import Project
from apps.issues.models import Issue, Comment

User = get_user_model()

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def owner_user(db):
    return User.objects.create_user(email='owner@test.com', password='password123', name='Alice Owner')

@pytest.fixture
def member_user(db):
    return User.objects.create_user(email='member@test.com', password='password123', name='Bob Member')

@pytest.fixture
def viewer_user(db):
    return User.objects.create_user(email='viewer@test.com', password='password123', name='Charlie Viewer')

@pytest.fixture
def outsider_user(db):
    return User.objects.create_user(email='outsider@test.com', password='password123', name='Dave Outsider')

@pytest.fixture
def workspace(db, owner_user, member_user, viewer_user):
    ws = Workspace.objects.create(name='Test Workspace', slug='test-workspace', created_by=owner_user)
    Membership.objects.create(workspace=ws, user=owner_user, role=Membership.ROLE_OWNER)
    Membership.objects.create(workspace=ws, user=member_user, role=Membership.ROLE_MEMBER)
    Membership.objects.create(workspace=ws, user=viewer_user, role=Membership.ROLE_VIEWER)
    return ws

@pytest.fixture
def project(db, workspace, owner_user):
    return Project.objects.create(
        workspace=workspace,
        key='TEST',
        name='Test Project',
        created_by=owner_user
    )

@pytest.fixture
def issue(db, project, owner_user, member_user):
    return Issue.objects.create(
        project=project,
        title='Initial Task',
        description='Details for task',
        status=Issue.STATUS_TODO,
        priority=Issue.PRIORITY_MEDIUM,
        reporter=owner_user,
        assignee=member_user,
        position_key='10000.000000',
        version=1
    )
