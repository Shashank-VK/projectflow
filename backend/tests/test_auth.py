import pytest
from django.urls import reverse
from rest_framework import status

@pytest.mark.django_db
class TestAuthentication:
    def test_register_user(self, api_client):
        url = reverse('auth_register')
        payload = {
            'email': 'newuser@test.com',
            'name': 'New User',
            'password': 'SecurePassword123!'
        }
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_201_CREATED
        assert response.data['email'] == 'newuser@test.com'
        assert response.data['name'] == 'New User'

    def test_register_duplicate_email_fails(self, api_client, owner_user):
        url = reverse('auth_register')
        payload = {
            'email': owner_user.email,
            'name': 'Duplicate',
            'password': 'SecurePassword123!'
        }
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_token_obtain_and_refresh(self, api_client, owner_user):
        url = reverse('token_obtain_pair')
        payload = {
            'email': 'owner@test.com',
            'password': 'password123'
        }
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_200_OK
        assert 'access' in response.data
        assert 'refresh' in response.data

        # Refresh
        refresh_url = reverse('token_refresh')
        refresh_res = api_client.post(refresh_url, {'refresh': response.data['refresh']})
        assert refresh_res.status_code == status.HTTP_200_OK
        assert 'access' in refresh_res.data

    def test_me_endpoint(self, api_client, owner_user):
        url = reverse('auth_me')
        api_client.force_authenticate(user=owner_user)
        response = api_client.get(url)
        assert response.status_code == status.HTTP_200_OK
        assert response.data['email'] == owner_user.email

    def test_change_password(self, api_client, owner_user):
        url = reverse('auth_change_password')
        api_client.force_authenticate(user=owner_user)
        payload = {
            'old_password': 'password123',
            'new_password': 'NewPassword987!'
        }
        response = api_client.post(url, payload)
        assert response.status_code == status.HTTP_200_OK
        owner_user.refresh_from_db()
        assert owner_user.check_password('NewPassword987!')
