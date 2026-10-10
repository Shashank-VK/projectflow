from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.core.views import HealthCheckView, DemoResetView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # Health checks
    path('api/health/', HealthCheckView.as_view(), name='health_check'),
    path('api/v1/health/', HealthCheckView.as_view(), name='api_v1_health_check'),
    
    # Demo reset endpoint
    path('api/demo/reset/', DemoResetView.as_view(), name='demo_reset'),
    path('api/v1/demo/reset/', DemoResetView.as_view(), name='api_v1_demo_reset'),

    # OpenAPI 3 Schema & Interactive Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),

    # API v1
    path('api/v1/auth/', include('apps.accounts.urls')),
    path('api/v1/', include('apps.workspaces.urls')),
    path('api/v1/', include('apps.projects.urls')),
    path('api/v1/', include('apps.issues.urls')),
    path('api/v1/', include('apps.activity.urls')),
]
