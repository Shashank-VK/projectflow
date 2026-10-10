from rest_framework import serializers
from .models import ActivityEvent
from apps.accounts.serializers import UserSerializer

class ActivityEventSerializer(serializers.ModelSerializer):
    actor = UserSerializer(read_only=True)

    class Meta:
        model = ActivityEvent
        fields = ['id', 'workspace', 'actor', 'verb', 'entity_type', 'entity_id', 'metadata', 'created_at']
        read_only_fields = fields
