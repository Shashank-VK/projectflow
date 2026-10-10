import pytest
from apps.core.tasks import TaskRunner
from apps.core.models import BackgroundTask

@pytest.mark.django_db
class TestTaskRunner:
    def test_task_runner_success(self):
        def sample_success_task(payload):
            return {'result': f"Processed {payload.get('item')}"}

        task = TaskRunner.submit(
            name='test_success',
            task_func=sample_success_task,
            payload={'item': 'document-123'},
            sync=True
        )

        task_record = BackgroundTask.objects.get(id=task.id)
        assert task_record.status == 'completed'
        assert task_record.result == {'result': 'Processed document-123'}
        assert task_record.completed_at is not None
        assert task_record.error_message is None

    def test_task_runner_failure(self):
        def sample_failing_task(payload):
            raise ValueError("Invalid format in task")

        with pytest.raises(ValueError):
            TaskRunner.submit(
                name='test_failure',
                task_func=sample_failing_task,
                payload={'bad': 'input'},
                sync=True
            )

        task_record = BackgroundTask.objects.filter(name='test_failure').first()
        assert task_record is not None
        assert task_record.status == 'failed'
        assert "Invalid format in task" in task_record.error_message
