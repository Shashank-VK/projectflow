import re
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Project
from apps.accounts.serializers import UserSerializer

class ProjectSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    issue_count = serializers.SerializerMethodField()

    class Meta:
        model = Project
        fields = [
            'id', 'workspace', 'key', 'name', 'description',
            'is_archived', 'archived_at', 'created_by', 'issue_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_archived', 'archived_at', 'created_by', 'created_at', 'updated_at']

    @extend_schema_field(serializers.IntegerField)
    def get_issue_count(self, obj):
        return obj.issues.count()

    def validate_key(self, value):
        val = value.strip().upper()
        if not re.match(r'^[A-Z0-9]{2,10}$', val):
            raise serializers.ValidationError("Project key must be 2-10 alphanumeric uppercase characters (e.g. TF, PF, APP).")
        return val

    def validate(self, attrs):
        workspace = attrs.get('workspace')
        key = attrs.get('key')
        if workspace and key:
            qs = Project.objects.filter(workspace=workspace, key=key)
            if self.instance:
                qs = qs.exclude(id=self.instance.id)
            if qs.exists():
                raise serializers.ValidationError({"key": "A project with this key already exists in this workspace."})
        return attrs
