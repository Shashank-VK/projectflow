from django.urls import path
from .views import (
    ProjectListCreateView,
    ProjectDetailView,
    ProjectArchiveView,
    ProjectRestoreView,
)

urlpatterns = [
    path('projects/', ProjectListCreateView.as_view(), name='project_list_create'),
    path('projects/<uuid:pk>/', ProjectDetailView.as_view(), name='project_detail'),
    path('projects/<uuid:pk>/archive/', ProjectArchiveView.as_view(), name='project_archive'),
    path('projects/<uuid:pk>/restore/', ProjectRestoreView.as_view(), name='project_restore'),
]
