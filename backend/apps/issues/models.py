import uuid
from django.db import models, transaction
from django.db.models import Max
from django.conf import settings
from django.core.exceptions import ValidationError

class Issue(models.Model):
    STATUS_TODO = 'todo'
    STATUS_IN_PROGRESS = 'in_progress'
    STATUS_IN_REVIEW = 'in_review'
    STATUS_DONE = 'done'

    STATUS_CHOICES = [
        (STATUS_TODO, 'To Do'),
        (STATUS_IN_PROGRESS, 'In Progress'),
        (STATUS_IN_REVIEW, 'In Review'),
        (STATUS_DONE, 'Done'),
    ]

    PRIORITY_LOW = 'low'
    PRIORITY_MEDIUM = 'medium'
    PRIORITY_HIGH = 'high'
    PRIORITY_URGENT = 'urgent'

    PRIORITY_CHOICES = [
        (PRIORITY_LOW, 'Low'),
        (PRIORITY_MEDIUM, 'Medium'),
        (PRIORITY_HIGH, 'High'),
        (PRIORITY_URGENT, 'Urgent'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    project = models.ForeignKey(
        'projects.Project',
        on_delete=models.CASCADE,
        related_name='issues'
    )
    sequence = models.PositiveIntegerField(editable=False)
    key = models.CharField(max_length=20, editable=False)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_TODO)
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default=PRIORITY_MEDIUM)
    reporter = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reported_issues'
    )
    assignee = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_issues'
    )
    due_at = models.DateTimeField(null=True, blank=True)
    position_key = models.CharField(max_length=64, default='10000.000000')
    version = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['project', 'sequence'], name='unique_project_issue_sequence')
        ]
        indexes = [
            models.Index(fields=['project', 'status', 'position_key']),
            models.Index(fields=['assignee', 'status', 'due_at']),
        ]
        ordering = ['position_key', 'created_at']

    def clean(self):
        # Invariant 1: Archived projects reject issue mutations
        if self.project.is_archived:
            raise ValidationError("Cannot create or modify issues in an archived project.")

        # Invariant 2: Assignee must be active member of the issue's workspace
        if self.assignee:
            from apps.workspaces.models import Membership
            is_member = Membership.objects.filter(
                workspace=self.project.workspace,
                user=self.assignee
            ).exists()
            if not is_member:
                raise ValidationError("Assignee must be an active member of the project workspace.")

    def save(self, *args, **kwargs):
        self.clean()
        if not self.sequence:
            with transaction.atomic():
                max_seq = Issue.objects.filter(project=self.project).aggregate(Max('sequence'))['sequence__max'] or 100
                self.sequence = max_seq + 1
                self.key = f"{self.project.key}-{self.sequence}"
                super().save(*args, **kwargs)
        else:
            if not self.key:
                self.key = f"{self.project.key}-{self.sequence}"
            super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.key}: {self.title}"

class Comment(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    issue = models.ForeignKey(
        Issue,
        on_delete=models.CASCADE,
        related_name='comments'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='issue_comments'
    )
    body = models.TextField()
    is_deleted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author.name} on {self.issue.key}"
