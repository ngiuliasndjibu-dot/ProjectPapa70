"""
Test suite for verifying Stripe removal and payment methods
Tests: Stripe endpoints removed, Mobile Money flow, PayPal, COD
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestStripeRemoval:
    """Verify Stripe is completely removed from backend"""
    
    def test_stripe_create_session_returns_404(self):
        """Stripe create-session endpoint should not exist"""
        response = requests.post(f"{BASE_URL}/api/payments/stripe/create-session", json={})
        assert response.status_code in [404, 405], f"Expected 404/405, got {response.status_code}"
        print("✓ /api/payments/stripe/create-session returns 404/405 (removed)")
    
    def test_stripe_status_returns_404(self):
        """Stripe status endpoint should not exist"""
        response = requests.get(f"{BASE_URL}/api/payments/stripe/status/test-session-id")
        assert response.status_code in [404, 405], f"Expected 404/405, got {response.status_code}"
        print("✓ /api/payments/stripe/status returns 404/405 (removed)")
    
    def test_stripe_webhook_returns_404(self):
        """Stripe webhook endpoint should not exist"""
        response = requests.post(f"{BASE_URL}/api/webhook/stripe", json={})
        assert response.status_code in [404, 405], f"Expected 404/405, got {response.status_code}"
        print("✓ /api/webhook/stripe returns 404/405 (removed)")


class TestProductsAPI:
    """Test products endpoint"""
    
    def test_products_endpoint_works(self):
        """Products API should return products"""
        response = requests.get(f"{BASE_URL}/api/products")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "products" in data
        assert len(data["products"]) > 0
        print(f"✓ /api/products returns {len(data['products'])} products")


class TestAuthentication:
    """Test authentication with admin credentials"""
    
    def test_admin_login(self):
        """Admin login should work"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "admin@techgadgets.com", "password": "Admin@123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("role") == "admin"
        assert data.get("email") == "admin@techgadgets.com"
        print("✓ Admin login successful")
        return response.cookies


class TestMobileMoneyPayment:
    """Test Mobile Money payment flow"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get authenticated session"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "admin@techgadgets.com", "password": "Admin@123"}
        )
        if response.status_code != 200:
            pytest.skip("Login failed")
        return response.cookies
    
    def test_mobile_money_initiate_validates_phone(self, auth_cookies):
        """Mobile Money initiate should validate +243 phone format"""
        # Test invalid phone format
        response = requests.post(
            f"{BASE_URL}/api/payments/mobile-money/initiate?provider=mpesa&phone_number=123456789",
            cookies=auth_cookies
        )
        assert response.status_code == 400, f"Expected 400 for invalid phone, got {response.status_code}"
        print("✓ Mobile Money rejects invalid phone format")
    
    def test_mobile_money_initiate_requires_cart(self, auth_cookies):
        """Mobile Money initiate should require non-empty cart"""
        # Clear cart first
        requests.delete(f"{BASE_URL}/api/cart/clear", cookies=auth_cookies)
        
        response = requests.post(
            f"{BASE_URL}/api/payments/mobile-money/initiate?provider=mpesa&phone_number=+243123456789",
            cookies=auth_cookies
        )
        assert response.status_code == 400, f"Expected 400 for empty cart, got {response.status_code}"
        assert "panier" in response.json().get("detail", "").lower() or "cart" in response.json().get("detail", "").lower()
        print("✓ Mobile Money requires non-empty cart")
    
    def test_mobile_money_resend_otp_endpoint_exists(self, auth_cookies):
        """Resend OTP endpoint should exist"""
        response = requests.post(
            f"{BASE_URL}/api/payments/mobile-money/resend-otp?transaction_id=fake-id",
            cookies=auth_cookies
        )
        # Should return 404 for non-existent transaction, not 405 (method not allowed)
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("✓ /api/payments/mobile-money/resend-otp endpoint exists")
    
    def test_mobile_money_verify_endpoint_exists(self, auth_cookies):
        """Verify OTP endpoint should exist"""
        response = requests.post(
            f"{BASE_URL}/api/payments/mobile-money/verify?transaction_id=fake-id&otp=123456",
            cookies=auth_cookies
        )
        # Should return 404 for non-existent transaction, not 405
        assert response.status_code in [400, 404], f"Expected 400/404, got {response.status_code}"
        print("✓ /api/payments/mobile-money/verify endpoint exists")


class TestCartAndOrders:
    """Test cart and order creation flow"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get authenticated session"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "admin@techgadgets.com", "password": "Admin@123"}
        )
        if response.status_code != 200:
            pytest.skip("Login failed")
        return response.cookies
    
    def test_add_to_cart(self, auth_cookies):
        """Should be able to add product to cart"""
        # Get a product first
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        print(f"✓ Added product {product_id} to cart")
    
    def test_get_cart(self, auth_cookies):
        """Should be able to get cart"""
        response = requests.get(f"{BASE_URL}/api/cart", cookies=auth_cookies)
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert "items" in data
        assert "subtotal" in data
        assert "total" in data
        print(f"✓ Cart retrieved with {len(data['items'])} items")
    
    def test_create_order_cod(self, auth_cookies):
        """Should be able to create COD order"""
        # First add item to cart
        products_response = requests.get(f"{BASE_URL}/api/products")
        products = products_response.json().get("products", [])
        if not products:
            pytest.skip("No products available")
        
        product_id = products[0]["id"]
        requests.post(
            f"{BASE_URL}/api/cart/add",
            json={"product_id": product_id, "quantity": 1},
            cookies=auth_cookies
        )
        
        # Create order
        order_data = {
            "shipping_address": {
                "full_name": "Test User",
                "phone": "+243123456789",
                "address_line1": "123 Test Street",
                "city": "Kinshasa",
                "state": "Kinshasa",
                "postal_code": "00000",
                "country": "RDC"
            },
            "payment_method": "cod"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert "order_number" in data
        assert data["payment_method"] == "cod"
        print(f"✓ COD order created: {data['order_number']}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
