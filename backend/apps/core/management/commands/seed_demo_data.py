import uuid
from datetime import timedelta
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.db import transaction

from apps.workspaces.models import Workspace, Membership, Invitation
from apps.projects.models import Project
from apps.issues.models import Issue, Comment
from apps.activity.models import ActivityEvent

User = get_user_model()

def seed_database():
    with transaction.atomic():
        # Clear existing ProjectFlow demo entities
        ActivityEvent.objects.all().delete()
        Comment.objects.all().delete()
        Issue.objects.all().delete()
        Project.objects.all().delete()
        Invitation.objects.all().delete()
        Membership.objects.all().delete()
        Workspace.objects.all().delete()

        # Create or update users
        def get_or_create_user(email, name, password='password123'):
            email = email.lower()
            user, created = User.objects.get_or_create(email=email, defaults={'name': name})
            user.name = name
            user.set_password(password)
            user.save()
            return user

        owner = get_or_create_user('owner@projectflow.dev', 'Sarah Chen')
        member = get_or_create_user('member@projectflow.dev', 'Alex Rivera')
        viewer = get_or_create_user('viewer@projectflow.dev', 'Taylor Jordan')
        asha = get_or_create_user('asha@projectflow.dev', 'Asha Patel')
        beta_owner = get_or_create_user('beta-owner@betalabs.io', 'Marcus Vance')

        # 1. Main Workspace: Acme Engineering
        ws1 = Workspace.objects.create(
            name='Acme Engineering',
            slug='acme-engineering',
            created_by=owner
        )

        Membership.objects.create(workspace=ws1, user=owner, role=Membership.ROLE_OWNER)
        Membership.objects.create(workspace=ws1, user=member, role=Membership.ROLE_MEMBER)
        Membership.objects.create(workspace=ws1, user=viewer, role=Membership.ROLE_VIEWER)
        Membership.objects.create(workspace=ws1, user=asha, role=Membership.ROLE_MEMBER)

        # Active pending invite
        Invitation.objects.create(
            workspace=ws1,
            email='invited.collaborator@example.com',
            role=Membership.ROLE_MEMBER,
            token='demo-invite-token-12345',
            status=Invitation.STATUS_PENDING,
            created_by=owner,
            expires_at=timezone.now() + timedelta(days=7)
        )

        # Projects for Workspace 1
        p_core = Project.objects.create(
            workspace=ws1,
            key='PF',
            name='Core Platform',
            description='Core REST APIs, Kanban workflow engine, and responsive React frontend.',
            created_by=owner
        )

        p_archived = Project.objects.create(
            workspace=ws1,
            key='LEGACY',
            name='Legacy Mobile App',
            description='Archived repository for deprecated native mobile client.',
            is_archived=False,
            created_by=owner
        )

        # Issue in archived project created before archiving
        Issue.objects.create(
            project=p_archived,
            title='Deprecate legacy mobile sync protocol',
            description='Read-only history of mobile client deprecation.',
            status=Issue.STATUS_DONE,
            priority=Issue.PRIORITY_LOW,
            reporter=owner,
            assignee=asha,
            position_key='10000.000000',
            version=1
        )

        p_archived.is_archived = True
        p_archived.archived_at = timezone.now() - timedelta(days=30)
        p_archived.save(update_fields=['is_archived', 'archived_at'])

        # Issues for Core Platform
        now = timezone.now()
        i1 = Issue.objects.create(
            project=p_core,
            title='Setup multi-tenant authentication and JWT rotation',
            description='Implement secure authentication with short-lived access tokens and refresh rotation.',
            status=Issue.STATUS_DONE,
            priority=Issue.PRIORITY_HIGH,
            reporter=owner,
            assignee=asha,
            position_key='10000.000000',
            version=2,
            due_at=now - timedelta(days=2)
        )

        i2 = Issue.objects.create(
            project=p_core,
            title='Implement fractional card ordering on Kanban board',
            description='Use fractional keys so cards can be reordered at any position without renumbering columns.',
            status=Issue.STATUS_IN_PROGRESS,
            priority=Issue.PRIORITY_URGENT,
            reporter=owner,
            assignee=member,
            position_key='20000.000000',
            version=1,
            due_at=now + timedelta(days=3)
        )

        i3 = Issue.objects.create(
            project=p_core,
            title='Build version conflict detection and 409 recovery',
            description='Return 409 Conflict with current payload when a stale client attempts a status or detail update.',
            status=Issue.STATUS_IN_PROGRESS,
            priority=Issue.PRIORITY_HIGH,
            reporter=member,
            assignee=member,
            position_key='30000.000000',
            version=1,
            due_at=now + timedelta(days=5)
        )

        i4 = Issue.objects.create(
            project=p_core,
            title='Add accessible keyboard navigation to issue drawer',
            description='Ensure Tab, Escape, and focus rings conform to WCAG contrast and keyboard accessibility.',
            status=Issue.STATUS_TODO,
            priority=Issue.PRIORITY_MEDIUM,
            reporter=asha,
            assignee=asha,
            position_key='40000.000000',
            version=1,
            due_at=now + timedelta(days=7)
        )

        i5 = Issue.objects.create(
            project=p_core,
            title='Design responsive metrics dashboard',
            description='Provide issue counts by status, priority, and assignee, plus overdue metrics.',
            status=Issue.STATUS_IN_REVIEW,
            priority=Issue.PRIORITY_MEDIUM,
            reporter=owner,
            assignee=owner,
            position_key='50000.000000',
            version=1,
            due_at=now - timedelta(days=1)  # Overdue demo!
        )

        i6 = Issue.objects.create(
            project=p_core,
            title='Write role matrix permission regression tests',
            description='Verify Viewers cannot mutate endpoints and Owners have full administrative rights.',
            status=Issue.STATUS_TODO,
            priority=Issue.PRIORITY_HIGH,
            reporter=owner,
            assignee=None,
            position_key='60000.000000',
            version=1,
            due_at=now + timedelta(days=10)
        )

        # Comments
        Comment.objects.create(
            issue=i2,
            author=member,
            body="Investigating fractional LexoRank keys. Testing midpoint calculation on drop."
        )
        Comment.objects.create(
            issue=i2,
            author=owner,
            body="Looks great. Make sure optimistic rollback handles 409 status cleanly on the client."
        )
        Comment.objects.create(
            issue=i3,
            author=asha,
            body="Verified that 409 payload returns the updated server model so the UI can prompt for reload."
        )

        # Audit Activity Events
        ActivityEvent.objects.create(
            workspace=ws1,
            actor=owner,
            verb='created',
            entity_type='workspace',
            entity_id=str(ws1.id),
            metadata={'name': ws1.name}
        )
        ActivityEvent.objects.create(
            workspace=ws1,
            actor=owner,
            verb='created',
            entity_type='project',
            entity_id=str(p_core.id),
            metadata={'name': p_core.name, 'key': p_core.key}
        )
        ActivityEvent.objects.create(
            workspace=ws1,
            actor=member,
            verb='moved',
            entity_type='issue',
            entity_id=str(i2.id),
            metadata={'key': i2.key, 'title': i2.title, 'status': {'from': 'todo', 'to': 'in_progress'}}
        )
        ActivityEvent.objects.create(
            workspace=ws1,
            actor=owner,
            verb='commented',
            entity_type='comment',
            entity_id=str(i2.id),
            metadata={'issue_key': i2.key, 'issue_title': i2.title}
        )

        # 2. Second Workspace: Beta Labs (For tenant isolation testing)
        ws2 = Workspace.objects.create(
            name='Beta Labs',
            slug='beta-labs',
            created_by=beta_owner
        )
        Membership.objects.create(workspace=ws2, user=beta_owner, role=Membership.ROLE_OWNER)

        p_beta = Project.objects.create(
            workspace=ws2,
            key='BL',
            name='Research Engine',
            description='Confidential research initiative isolated in Beta Labs workspace.',
            created_by=beta_owner
        )
        Issue.objects.create(
            project=p_beta,
            title='Confidential algorithm spike',
            description='Private research issue inaccessible to Acme Engineering users.',
            status=Issue.STATUS_TODO,
            priority=Issue.PRIORITY_URGENT,
            reporter=beta_owner,
            position_key='10000.000000',
            version=1
        )

class Command(BaseCommand):
    help = 'Seeds deterministic demo fixtures for ProjectFlow'

    def handle(self, *args, **options):
        seed_database()
        self.stdout.write(self.style.SUCCESS('Successfully seeded ProjectFlow demo data!'))
