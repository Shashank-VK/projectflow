from django.urls import path
from .views import WorkspaceActivityListView

urlpatterns = [
    path('workspaces/<uuid:workspace_id>/activity/', WorkspaceActivityListView.as_view(), name='workspace_activity'),
]
