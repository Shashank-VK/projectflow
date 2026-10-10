from django.db import connection
from django.utils import timezone
from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from drf_spectacular.utils import extend_schema, inline_serializer
from rest_framework import serializers

from .management.commands.seed_demo_data import seed_database

class HealthCheckView(APIView):
    permission_classes = [permissions.AllowAny]

    @extend_schema(
        summary="Service health check",
        description="Returns liveness and database connectivity status.",
        responses={200: inline_serializer(
            name='HealthCheckResponse',
            fields={
                'status': serializers.CharField(),
                'database': serializers.CharField(),
                'version': serializers.CharField(),
                'demo_mode': serializers.BooleanField(),
                'timestamp': serializers.CharField(),
            }
        )}
    )
    def get(self, request):
        db_status = 'connected'
        try:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1;")
                row = cursor.fetchone()
                if not row:
                    db_status = 'unresponsive'
        except Exception as e:
            db_status = f"error: {str(e)}"

        is_healthy = db_status == 'connected'
        status_code = status.HTTP_200_OK if is_healthy else status.HTTP_503_SERVICE_UNAVAILABLE

        return Response({
            'status': 'healthy' if is_healthy else 'unhealthy',
            'database': db_status,
            'version': '1.0.0',
            'demo_mode': getattr(settings, 'DEMO_MODE', True),
            'timestamp': timezone.now().isoformat()
        }, status=status_code)

class DemoResetView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        summary="Reset demo environment",
        description="Reseeds deterministic demo fixtures and clears state (demo mode only).",
        request=None,
        responses={200: inline_serializer(
            name='DemoResetResponse',
            fields={
                'status': serializers.CharField(),
                'message': serializers.CharField(),
                'timestamp': serializers.CharField(),
            }
        )}
    )
    def post(self, request):
        if not getattr(settings, 'DEMO_MODE', False):
            raise PermissionDenied("Demo reset is disabled outside demo mode.")

        seed_database()

        return Response({
            'status': 'ok',
            'message': 'Demo data has been successfully reseeded.',
            'timestamp': timezone.now().isoformat()
        }, status=status.HTTP_200_OK)
