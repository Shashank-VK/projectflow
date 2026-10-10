import uuid
from django.db import models
from django.conf import settings

class Project(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    workspace = models.ForeignKey(
        'workspaces.Workspace',
        on_delete=models.CASCADE,
        related_name='projects'
    )
    key = models.CharField(max_length=10)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default='')
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(null=True, blank=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_projects'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=['workspace', 'key'], name='unique_workspace_project_key')
        ]
        ordering = ['name']

    def save(self, *args, **kwargs):
        self.key = self.key.upper().strip()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} [{self.key}]"
