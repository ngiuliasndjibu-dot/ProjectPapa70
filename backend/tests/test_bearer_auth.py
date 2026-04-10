"""
Test Bearer Token Authentication Flow
Tests the new auth mechanism: login returns token in body, stored in localStorage, 
axios interceptor adds Authorization Bearer header to all requests.
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials from test_credentials.md
ADMIN_EMAIL = "admin@techgadgets.com"
ADMIN_PASSWORD = "Admin@123"


class TestBearerTokenAuth:
    """Test Bearer token authentication flow"""
    
    def test_login_returns_token_in_body(self):
        """POST /api/auth/login should return 'token' field in response body"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        
        # Verify token is in response body
        assert "token" in data, f"Response missing 'token' field: {data.keys()}"
        assert isinstance(data["token"], str), "Token should be a string"
        assert len(data["token"]) > 20, "Token seems too short"
        
        # Verify user data is also returned
        assert "id" in data, "Response missing 'id' field"
        assert "email" in data, "Response missing 'email' field"
        assert "name" in data, "Response missing 'name' field"
        assert "role" in data, "Response missing 'role' field"
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        
        print(f"✓ Login returns token in body (length: {len(data['token'])})")
    
    def test_auth_me_with_bearer_header(self):
        """GET /api/auth/me should work with Authorization: Bearer header"""
        # First login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Now call /api/auth/me with Bearer token
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Auth/me failed: {response.text}"
        data = response.json()
        
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        assert "password_hash" not in data, "Password hash should not be returned"
        
        print(f"✓ GET /api/auth/me works with Bearer token")
    
    def test_auth_me_without_token_fails(self):
        """GET /api/auth/me should fail without token"""
        response = requests.get(f"{BASE_URL}/api/auth/me")
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ GET /api/auth/me correctly rejects unauthenticated requests")
    
    def test_auth_me_with_invalid_token_fails(self):
        """GET /api/auth/me should fail with invalid token"""
        response = requests.get(
            f"{BASE_URL}/api/auth/me",
            headers={"Authorization": "Bearer invalid_token_here"}
        )
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ GET /api/auth/me correctly rejects invalid tokens")


class TestCartWithBearerToken:
    """Test cart operations with Bearer token authentication"""
    
    @pytest.fixture
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200
        return response.json()["token"]
    
    @pytest.fixture
    def auth_headers(self, auth_token):
        """Get headers with Bearer token"""
        return {"Authorization": f"Bearer {auth_token}"}
    
    def test_add_to_cart_with_bearer_token(self, auth_headers):
        """POST /api/cart/add should work with Bearer token"""
        # First get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products")
        assert products_response.status_code == 200
        products = products_response.json()["products"]
        assert len(products) > 0, "No products found"
        
        product_id = products[0]["id"]
        
        # Add to cart with Bearer token
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Add to cart failed: {response.text}"
        data = response.json()
        assert "message" in data
        
        print(f"✓ POST /api/cart/add works with Bearer token")
    
    def test_get_cart_with_bearer_token(self, auth_headers):
        """GET /api/cart should return items with Bearer token"""
        response = requests.get(
            f"{BASE_URL}/api/cart",
            headers=auth_headers
        )
        
        assert response.status_code == 200, f"Get cart failed: {response.text}"
        data = response.json()
        
        assert "items" in data, "Response missing 'items' field"
        assert "subtotal" in data, "Response missing 'subtotal' field"
        assert "total" in data, "Response missing 'total' field"
        
        print(f"✓ GET /api/cart works with Bearer token (items: {len(data['items'])})")
    
    def test_cart_without_token_returns_empty(self):
        """GET /api/cart without token should return empty cart (guest cart)"""
        response = requests.get(f"{BASE_URL}/api/cart")
        
        # Should return 200 with empty cart for guests
        assert response.status_code == 200, f"Get cart failed: {response.text}"
        data = response.json()
        
        assert "items" in data
        print(f"✓ GET /api/cart without token returns cart structure")


class TestLogoutFlow:
    """Test logout clears session"""
    
    def test_logout_endpoint(self):
        """POST /api/auth/logout should work"""
        # Login first
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert login_response.status_code == 200
        token = login_response.json()["token"]
        
        # Logout
        response = requests.post(
            f"{BASE_URL}/api/auth/logout",
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200, f"Logout failed: {response.text}"
        data = response.json()
        assert "message" in data
        
        print(f"✓ POST /api/auth/logout works")


class TestProductsEndpoint:
    """Test products endpoint (public)"""
    
    def test_get_products(self):
        """GET /api/products should return products"""
        response = requests.get(f"{BASE_URL}/api/products")
        
        assert response.status_code == 200, f"Get products failed: {response.text}"
        data = response.json()
        
        assert "products" in data
        assert "total" in data
        assert len(data["products"]) > 0, "No products returned"
        
        # Verify product structure
        product = data["products"][0]
        assert "id" in product
        assert "name" in product
        assert "price" in product
        assert "images" in product
        
        print(f"✓ GET /api/products returns {len(data['products'])} products")
    
    def test_get_single_product(self):
        """GET /api/products/{id} should return product details"""
        # First get a product ID
        products_response = requests.get(f"{BASE_URL}/api/products")
        product_id = products_response.json()["products"][0]["id"]
        
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        
        assert response.status_code == 200, f"Get product failed: {response.text}"
        data = response.json()
        
        assert data["id"] == product_id
        assert "name" in data
        assert "price" in data
        assert "description" in data
        
        print(f"✓ GET /api/products/{product_id} returns product details")


class TestInvalidCredentials:
    """Test login with invalid credentials"""
    
    def test_login_wrong_password(self):
        """Login with wrong password should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": ADMIN_EMAIL,
            "password": "wrong_password"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Login with wrong password correctly returns 401")
    
    def test_login_nonexistent_user(self):
        """Login with nonexistent user should fail"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "nonexistent@example.com",
            "password": "any_password"
        })
        
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print(f"✓ Login with nonexistent user correctly returns 401")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
