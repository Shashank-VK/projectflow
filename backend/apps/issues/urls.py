from django.urls import path
from .views import (
    IssueListCreateView,
    IssueDetailView,
    CommentListCreateView,
    CommentDetailView,
)

urlpatterns = [
    path('issues/', IssueListCreateView.as_view(), name='issue_list_create'),
    path('issues/<uuid:pk>/', IssueDetailView.as_view(), name='issue_detail'),
    path('issues/<uuid:issue_id>/comments/', CommentListCreateView.as_view(), name='issue_comments'),
    path('comments/<uuid:pk>/', CommentDetailView.as_view(), name='comment_detail'),
]
