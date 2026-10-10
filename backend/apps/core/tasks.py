import logging
import traceback
from concurrent.futures import ThreadPoolExecutor
from django.utils import timezone
from django.core.mail import send_mail
from django.conf import settings
from .models import BackgroundTask

logger = logging.getLogger(__name__)

class TaskRunner:
    """
    A simple, bounded thread runner behind a clean TaskRunner interface.
    Logs execution lifecycle and results into the BackgroundTask model.
    """
    _executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix='projectflow-worker')

    @classmethod
    def execute_task(cls, task_id, task_func, payload):
        try:
            task = BackgroundTask.objects.get(id=task_id)
            task.status = 'running'
            task.save(update_fields=['status'])

            result = task_func(payload)

            task.status = 'completed'
            task.result = result if isinstance(result, dict) else {'output': str(result)}
            task.completed_at = timezone.now()
            task.save(update_fields=['status', 'result', 'completed_at'])
            return task
        except Exception as exc:
            logger.error(f"Task {task_id} failed: {exc}", exc_info=True)
            try:
                task = BackgroundTask.objects.get(id=task_id)
                task.status = 'failed'
                task.error_message = f"{str(exc)}\n{traceback.format_exc()}"
                task.completed_at = timezone.now()
                task.save(update_fields=['status', 'error_message', 'completed_at'])
            except Exception:
                pass
            raise

    @classmethod
    def submit(cls, name, task_func, payload=None, sync=False):
        payload = payload or {}
        task = BackgroundTask.objects.create(
            name=name,
            status='pending',
            payload=payload
        )

        if sync or getattr(settings, 'TASK_RUNNER_SYNC', False):
            cls.execute_task(task.id, task_func, payload)
        else:
            cls._executor.submit(cls.execute_task, task.id, task_func, payload)

        return task

# Built-in tasks
def send_invitation_email_task(payload):
    email = payload.get('email')
    workspace_name = payload.get('workspace_name')
    invite_url = payload.get('invite_url')
    subject = f"Invitation to join {workspace_name} on ProjectFlow"
    message = (
        f"You have been invited to collaborate on {workspace_name} on ProjectFlow.\n\n"
        f"Click the link below to accept your invitation:\n{invite_url}\n\n"
        f"If you did not expect this invitation, you can safely ignore this email."
    )
    send_mail(
        subject=subject,
        message=message,
        from_email='notifications@projectflow.dev',
        recipient_list=[email],
        fail_silently=True
    )
    return {'email_sent': True, 'recipient': email}

def send_due_date_reminder_task(payload):
    issue_id = payload.get('issue_id')
    assignee_email = payload.get('assignee_email')
    issue_title = payload.get('issue_title')
    due_at = payload.get('due_at')
    subject = f"Reminder: Issue '{issue_title}' is due soon"
    message = (
        f"Your assigned issue '{issue_title}' is scheduled for completion at {due_at}.\n"
        f"Please check your ProjectFlow board to update progress."
    )
    if assignee_email:
        send_mail(
            subject=subject,
            message=message,
            from_email='notifications@projectflow.dev',
            recipient_list=[assignee_email],
            fail_silently=True
        )
    return {'reminder_sent': True, 'issue_id': issue_id}
