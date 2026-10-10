from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from django.utils.text import slugify
from .models import Workspace, Membership, Invitation
from apps.accounts.serializers import UserSerializer

class MembershipSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = Membership
        fields = ['id', 'workspace', 'user', 'role', 'joined_at']
        read_only_fields = ['id', 'workspace', 'user', 'joined_at']

class WorkspaceSerializer(serializers.ModelSerializer):
    role = serializers.SerializerMethodField()
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Workspace
        fields = ['id', 'name', 'slug', 'created_by', 'role', 'member_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_by', 'created_at', 'updated_at']

    @extend_schema_field(serializers.CharField(allow_null=True))
    def get_role(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        membership = Membership.objects.filter(workspace=obj, user=request.user).first()
        return membership.role if membership else None

    @extend_schema_field(serializers.IntegerField)
    def get_member_count(self, obj):
        return obj.memberships.count()

    def create(self, validated_data):
        user = self.context['request'].user
        name = validated_data['name']
        slug = validated_data.get('slug')
        if not slug:
            base_slug = slugify(name)
            slug = base_slug
            counter = 1
            while Workspace.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
        validated_data['slug'] = slug
        validated_data['created_by'] = user
        return super().create(validated_data)

class InvitationSerializer(serializers.ModelSerializer):
    created_by = UserSerializer(read_only=True)
    workspace_name = serializers.CharField(source='workspace.name', read_only=True)

    class Meta:
        model = Invitation
        fields = [
            'id', 'workspace', 'workspace_name', 'email', 'role',
            'token', 'status', 'created_by', 'expires_at', 'created_at', 'accepted_at'
        ]
        read_only_fields = ['id', 'workspace', 'token', 'status', 'created_by', 'expires_at', 'created_at', 'accepted_at']

    def validate_email(self, value):
        return value.strip().lower()

class UpdateMemberRoleSerializer(serializers.Serializer):
    role = serializers.ChoiceField(choices=Membership.ROLE_CHOICES)
