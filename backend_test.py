import requests
import sys
import json
from datetime import datetime

class TechGadgetsAPITester:
    def __init__(self, base_url="https://tech-marketplace-126.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.session = requests.Session()
        self.session.headers.update({'Content-Type': 'application/json'})

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None, use_admin=False):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = self.session.headers.copy()
        
        if headers:
            test_headers.update(headers)
            
        if use_admin and self.admin_token:
            test_headers['Authorization'] = f'Bearer {self.admin_token}'
        elif self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=test_headers)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = self.session.put(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = self.session.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json()
                except:
                    return True, response.text
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}...")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_categories_api(self):
        """Test categories API"""
        success, response = self.run_test(
            "Get Categories",
            "GET",
            "api/categories",
            200
        )
        if success and isinstance(response, list):
            print(f"   Found {len(response)} categories")
            if len(response) >= 6:
                print("✅ Categories API returns 6+ categories as expected")
                return True
            else:
                print(f"⚠️  Only {len(response)} categories found, expected 6+")
        return success

    def test_products_api(self):
        """Test products API"""
        success, response = self.run_test(
            "Get Products",
            "GET",
            "api/products",
            200
        )
        if success and isinstance(response, dict) and 'products' in response:
            products = response['products']
            print(f"   Found {len(products)} products")
            print(f"   Total pages: {response.get('pages', 1)}")
            if len(products) > 0:
                print("✅ Products API returns products correctly")
                return True
            else:
                print("⚠️  No products found")
        return success

    def test_featured_products(self):
        """Test featured products"""
        success, response = self.run_test(
            "Get Featured Products",
            "GET",
            "api/products?featured=true&limit=4",
            200
        )
        if success and isinstance(response, dict) and 'products' in response:
            products = response['products']
            print(f"   Found {len(products)} featured products")
            return True
        return success

    def test_user_registration(self):
        """Test user registration"""
        test_email = f"test_{datetime.now().strftime('%H%M%S')}@test.com"
        success, response = self.run_test(
            "User Registration",
            "POST",
            "api/auth/register",
            200,
            data={
                "email": test_email,
                "password": "TestPass123!",
                "name": "Test User"
            }
        )
        if success and isinstance(response, dict) and 'id' in response:
            print(f"✅ User registered successfully with ID: {response['id']}")
            return True, test_email
        return False, None

    def test_user_login(self, email=None):
        """Test user login"""
        if not email:
            # Try with a test email first
            reg_success, email = self.test_user_registration()
            if not reg_success:
                return False
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "api/auth/login",
            200,
            data={
                "identifier": email,
                "password": "TestPass123!"
            }
        )
        if success and isinstance(response, dict) and 'id' in response:
            print(f"✅ User login successful")
            # Extract token from cookies if available
            return True
        return False

    def test_admin_login(self):
        """Test admin login"""
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={
                "identifier": "admin@techgadgets.com",
                "password": "Admin@123"
            }
        )
        if success and isinstance(response, dict) and response.get('role') == 'admin':
            print(f"✅ Admin login successful - Role: {response['role']}")
            return True
        return False

    def test_cart_functionality(self):
        """Test cart add/view functionality"""
        # First get a product ID
        success, products_response = self.run_test(
            "Get Products for Cart Test",
            "GET",
            "api/products?limit=1",
            200
        )
        
        if not success or not products_response.get('products'):
            print("❌ Cannot test cart - no products available")
            return False
            
        product_id = products_response['products'][0]['id']
        print(f"   Using product ID: {product_id}")
        
        # Test add to cart
        add_success, _ = self.run_test(
            "Add to Cart",
            "POST",
            "api/cart/add",
            200,
            data={
                "product_id": product_id,
                "quantity": 1
            }
        )
        
        if not add_success:
            return False
            
        # Test view cart
        view_success, cart_response = self.run_test(
            "View Cart",
            "GET",
            "api/cart",
            200
        )
        
        if view_success and isinstance(cart_response, dict):
            items = cart_response.get('items', [])
            print(f"   Cart has {len(items)} items")
            print(f"   Cart total: ${cart_response.get('total', 0)}")
            return True
            
        return False

    def test_admin_stats(self):
        """Test admin dashboard statistics"""
        success, response = self.run_test(
            "Admin Dashboard Stats",
            "GET",
            "api/admin/stats",
            200,
            use_admin=True
        )
        if success and isinstance(response, dict):
            stats = ['total_orders', 'total_revenue', 'total_products', 'total_users']
            found_stats = [stat for stat in stats if stat in response]
            print(f"   Found stats: {found_stats}")
            if len(found_stats) >= 3:
                print("✅ Admin dashboard statistics working")
                return True
        return False

    def test_product_detail(self):
        """Test product detail page"""
        # Get a product ID first
        success, products_response = self.run_test(
            "Get Products for Detail Test",
            "GET",
            "api/products?limit=1",
            200
        )
        
        if not success or not products_response.get('products'):
            return False
            
        product_id = products_response['products'][0]['id']
        
        success, response = self.run_test(
            "Get Product Detail",
            "GET",
            f"api/products/{product_id}",
            200
        )
        
        if success and isinstance(response, dict) and 'id' in response:
            print(f"✅ Product detail loaded for: {response.get('name', 'Unknown')}")
            return True
        return False

    def test_search_functionality(self):
        """Test search functionality"""
        success, response = self.run_test(
            "Search Products",
            "GET",
            "api/products/search?q=iPhone",
            200
        )
        if success and isinstance(response, list):
            print(f"   Search returned {len(response)} results")
            return True
        return False

def main():
    print("🚀 Starting TechGadgets E-Commerce API Tests")
    print("=" * 50)
    
    tester = TechGadgetsAPITester()
    
    # Test sequence
    tests = [
        ("Categories API", tester.test_categories_api),
        ("Products API", tester.test_products_api),
        ("Featured Products", tester.test_featured_products),
        ("User Registration", lambda: tester.test_user_registration()[0]),
        ("User Login", lambda: tester.test_user_login()),
        ("Admin Login", tester.test_admin_login),
        ("Cart Functionality", tester.test_cart_functionality),
        ("Product Detail", tester.test_product_detail),
        ("Search Functionality", tester.test_search_functionality),
        ("Admin Stats", tester.test_admin_stats),
    ]
    
    passed_tests = []
    failed_tests = []
    
    for test_name, test_func in tests:
        print(f"\n{'='*20} {test_name} {'='*20}")
        try:
            if test_func():
                passed_tests.append(test_name)
            else:
                failed_tests.append(test_name)
        except Exception as e:
            print(f"❌ {test_name} failed with exception: {e}")
            failed_tests.append(test_name)
    
    # Print summary
    print(f"\n{'='*50}")
    print("📊 TEST SUMMARY")
    print(f"{'='*50}")
    print(f"Total Tests: {len(tests)}")
    print(f"Passed: {len(passed_tests)}")
    print(f"Failed: {len(failed_tests)}")
    print(f"Success Rate: {len(passed_tests)/len(tests)*100:.1f}%")
    
    if passed_tests:
        print(f"\n✅ PASSED TESTS:")
        for test in passed_tests:
            print(f"   - {test}")
    
    if failed_tests:
        print(f"\n❌ FAILED TESTS:")
        for test in failed_tests:
            print(f"   - {test}")
    
    return 0 if len(failed_tests) == 0 else 1

if __name__ == "__main__":
    sys.exit(main())