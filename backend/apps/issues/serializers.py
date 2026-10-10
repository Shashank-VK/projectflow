from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from django.contrib.auth import get_user_model
from .models import Issue, Comment
from apps.accounts.serializers import UserSerializer
from apps.workspaces.models import Membership

User = get_user_model()

class CommentSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)

    class Meta:
        model = Comment
        fields = ['id', 'issue', 'author', 'body', 'is_deleted', 'created_at', 'updated_at']
        read_only_fields = ['id', 'issue', 'author', 'is_deleted', 'created_at', 'updated_at']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if instance.is_deleted:
            data['body'] = '[This comment has been deleted]'
        return data

class IssueSerializer(serializers.ModelSerializer):
    reporter = UserSerializer(read_only=True)
    assignee = UserSerializer(read_only=True)
    assignee_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assignee',
        write_only=True,
        required=False,
        allow_null=True
    )
    project_key = serializers.CharField(source='project.key', read_only=True)
    project_name = serializers.CharField(source='project.name', read_only=True)
    workspace_id = serializers.UUIDField(source='project.workspace.id', read_only=True)
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Issue
        fields = [
            'id', 'project', 'project_key', 'project_name', 'workspace_id',
            'sequence', 'key', 'title', 'description', 'status', 'priority',
            'reporter', 'assignee', 'assignee_id', 'due_at', 'position_key',
            'version', 'comment_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'sequence', 'key', 'reporter', 'created_at', 'updated_at']

    @extend_schema_field(serializers.IntegerField)
    def get_comment_count(self, obj):
        return obj.comments.filter(is_deleted=False).count()

    def validate(self, attrs):
        project = attrs.get('project') or (self.instance.project if self.instance else None)
        if project and project.is_archived:
            raise serializers.ValidationError("Cannot create or modify issues in an archived project.")

        assignee = attrs.get('assignee')
        if assignee and project:
            if not Membership.objects.filter(workspace=project.workspace, user=assignee).exists():
                raise serializers.ValidationError({"assignee_id": "Assignee must be an active member of the workspace."})

        return attrs
