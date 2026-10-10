import uuid
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status
from rest_framework.response import Response

class ConflictError(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'A conflict occurred while updating the resource.'
    default_code = 'conflict'

    def __init__(self, detail=None, code=None, current_data=None):
        super().__init__(detail, code)
        self.current_data = current_data

def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    request = context.get('request')
    request_id = getattr(request, 'request_id', str(uuid.uuid4()))

    if response is not None:
        error_payload = {
            'request_id': request_id,
            'code': getattr(exc, 'default_code', 'error'),
            'message': '',
            'field_errors': {},
        }

        if isinstance(exc, ConflictError):
            error_payload['code'] = 'conflict'
            error_payload['message'] = str(exc.detail) if exc.detail else 'Conflict detected: the resource has been modified by another request.'
            if exc.current_data is not None:
                error_payload['data'] = exc.current_data

        elif isinstance(response.data, dict):
            field_errors = {}
            messages = []
            for key, val in response.data.items():
                if key in ('detail', 'non_field_errors'):
                    if isinstance(val, list):
                        messages.extend([str(item) for item in val])
                    else:
                        messages.append(str(val))
                else:
                    field_errors[key] = val
                    if isinstance(val, list):
                        messages.append(f"{key}: {', '.join([str(item) for item in val])}")
                    else:
                        messages.append(f"{key}: {str(val)}")
            
            error_payload['message'] = '; '.join(messages) if messages else 'An error occurred processing your request.'
            if field_errors:
                error_payload['field_errors'] = field_errors

        elif isinstance(response.data, list):
            error_payload['message'] = '; '.join([str(item) for item in response.data])
        else:
            error_payload['message'] = str(response.data)

        # Standardize error response structure
        response.data = {'error': error_payload}

    return response
