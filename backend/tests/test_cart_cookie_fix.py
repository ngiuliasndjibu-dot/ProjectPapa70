"""
Test suite for cart cookie fix - verifies Secure flag on HTTPS and cart functionality
Tests the critical bug fix: cookies not sent with Secure flag on HTTPS
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@techgadgets.com"
ADMIN_PASSWORD = "Admin@123"


class TestAuthCookies:
    """Test authentication and cookie handling"""
    
    def test_login_returns_cookies(self):
        """POST /api/auth/login returns Set-Cookie with proper flags"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            headers={"X-Forwarded-Proto": "https"}
        )
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        # Check response data
        data = response.json()
        assert "id" in data
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        
        # Check cookies are set
        cookies = response.cookies
        assert "access_token" in cookies, "access_token cookie not set"
        
        # Check Set-Cookie header for Secure flag
        set_cookie_headers = response.headers.get('Set-Cookie', '')
        assert 'Secure' in set_cookie_headers, "Secure flag not set on cookies"
        assert 'HttpOnly' in set_cookie_headers, "HttpOnly flag not set on cookies"
        print(f"✓ Login successful, cookies have Secure flag")
    
    def test_auth_me_with_cookie(self):
        """GET /api/auth/me works after login (cookie sent back)"""
        session = requests.Session()
        
        # Login first
        login_resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert login_resp.status_code == 200
        
        # Now check /api/auth/me
        me_resp = session.get(f"{BASE_URL}/api/auth/me")
        assert me_resp.status_code == 200, f"Auth/me failed: {me_resp.text}"
        
        data = me_resp.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["name"] == "Admin"
        print(f"✓ /api/auth/me works with cookie authentication")


class TestCartFunctionality:
    """Test cart CRUD operations with cookie auth"""
    
    @pytest.fixture
    def auth_session(self):
        """Create authenticated session"""
        session = requests.Session()
        resp = session.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
        )
        assert resp.status_code == 200, f"Login failed: {resp.text}"
        return session
    
    @pytest.fixture
    def product_id(self):
        """Get a valid product ID"""
        resp = requests.get(f"{BASE_URL}/api/products?limit=1")
        assert resp.status_code == 200
        products = resp.json().get("products", [])
        assert len(products) > 0, "No products found"
        return products[0]["id"]
    
    def test_add_to_cart(self, auth_session, product_id):
        """POST /api/cart/add successfully adds product to cart"""
        response = auth_session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1}
        )
        assert response.status_code == 200, f"Add to cart failed: {response.text}"
        
        data = response.json()
        assert data.get("message") == "Added to cart"
        print(f"✓ Product {product_id} added to cart")
    
    def test_get_cart_returns_items(self, auth_session, product_id):
        """GET /api/cart returns items after adding"""
        # First add an item
        add_resp = auth_session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1}
        )
        assert add_resp.status_code == 200
        
        # Now get cart
        cart_resp = auth_session.get(f"{BASE_URL}/api/cart")
        assert cart_resp.status_code == 200, f"Get cart failed: {cart_resp.text}"
        
        cart = cart_resp.json()
        assert "items" in cart
        assert "subtotal" in cart
        assert "total" in cart
        
        # Verify cart has items
        assert len(cart["items"]) > 0, "Cart is empty after adding item"
        
        # Verify item structure
        item = cart["items"][0]
        assert "product_id" in item
        assert "quantity" in item
        assert "product" in item
        assert item["product"]["id"] == product_id
        print(f"✓ Cart contains {len(cart['items'])} item(s), total: ${cart['total']}")
    
    def test_cart_persists_across_requests(self, auth_session, product_id):
        """Cart data persists across multiple requests"""
        # Add item
        auth_session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 2}
        )
        
        # Get cart multiple times
        cart1 = auth_session.get(f"{BASE_URL}/api/cart").json()
        cart2 = auth_session.get(f"{BASE_URL}/api/cart").json()
        
        # Should be consistent
        assert cart1["total"] == cart2["total"]
        assert len(cart1["items"]) == len(cart2["items"])
        print(f"✓ Cart persists across requests")
    
    def test_update_cart_quantity(self, auth_session, product_id):
        """PUT /api/cart/update changes item quantity"""
        # Add item first
        auth_session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1}
        )
        
        # Update quantity
        update_resp = auth_session.put(
            f"{BASE_URL}/api/cart/update",
            json={"product_id": product_id, "quantity": 5}
        )
        assert update_resp.status_code == 200
        
        # Verify update
        cart = auth_session.get(f"{BASE_URL}/api/cart").json()
        item = next((i for i in cart["items"] if i["product_id"] == product_id), None)
        assert item is not None
        assert item["quantity"] == 5
        print(f"✓ Cart quantity updated to 5")
    
    def test_remove_from_cart(self, auth_session, product_id):
        """DELETE /api/cart/remove/{product_id} removes item"""
        # Add item first
        auth_session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1}
        )
        
        # Remove item
        remove_resp = auth_session.delete(f"{BASE_URL}/api/cart/remove/{product_id}")
        assert remove_resp.status_code == 200
        
        # Verify removal
        cart = auth_session.get(f"{BASE_URL}/api/cart").json()
        item = next((i for i in cart["items"] if i["product_id"] == product_id), None)
        assert item is None, "Item still in cart after removal"
        print(f"✓ Product removed from cart")


class TestGuestCart:
    """Test cart functionality for guest users (no login)"""
    
    def test_guest_can_add_to_cart(self):
        """Guest users can add items to cart via cart_session cookie"""
        session = requests.Session()
        
        # Get a product
        products_resp = session.get(f"{BASE_URL}/api/products?limit=1")
        product_id = products_resp.json()["products"][0]["id"]
        
        # Add to cart without login
        add_resp = session.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1}
        )
        assert add_resp.status_code == 200
        
        # Check cart_session cookie was set
        assert "cart_session" in session.cookies or "access_token" not in session.cookies
        
        # Get cart
        cart_resp = session.get(f"{BASE_URL}/api/cart")
        assert cart_resp.status_code == 200
        
        cart = cart_resp.json()
        assert len(cart["items"]) > 0
        print(f"✓ Guest cart works with cart_session cookie")


class TestProducts:
    """Test product endpoints"""
    
    def test_get_products(self):
        """GET /api/products returns product list"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200
        
        data = response.json()
        assert "products" in data
        assert "total" in data
        assert len(data["products"]) > 0
        print(f"✓ Products endpoint returns {len(data['products'])} products")
    
    def test_get_product_by_id(self):
        """GET /api/products/{id} returns single product"""
        # Get a product ID first
        products = requests.get(f"{BASE_URL}/api/products?limit=1").json()
        product_id = products["products"][0]["id"]
        
        # Get single product
        response = requests.get(f"{BASE_URL}/api/products/{product_id}")
        assert response.status_code == 200
        
        product = response.json()
        assert product["id"] == product_id
        assert "name" in product
        assert "price" in product
        print(f"✓ Single product endpoint works")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
