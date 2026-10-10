from rest_framework import generics, permissions
from .models import ActivityEvent
from .serializers import ActivityEventSerializer
from apps.workspaces.models import Membership

class WorkspaceActivityListView(generics.ListAPIView):
    serializer_class = ActivityEventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        workspace_id = self.kwargs.get('workspace_id')
        user = self.request.user
        
        # Verify user belongs to workspace
        if not Membership.objects.filter(workspace_id=workspace_id, user=user).exists():
            return ActivityEvent.objects.none()

        return ActivityEvent.objects.filter(workspace_id=workspace_id).select_related('actor')
