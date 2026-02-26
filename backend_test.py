#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class POSAPITester:
    def __init__(self, base_url="https://resto-pos-pro.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.admin_user = None
        self.test_table_id = None
        self.test_menu_item_id = None
        self.test_order_id = None

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {method} {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"   Error: {error_data}")
                except:
                    print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_seed_database(self):
        """Test database seeding"""
        print("\n=== TESTING DATABASE SEEDING ===")
        success, response = self.run_test(
            "Seed Database",
            "POST",
            "api/seed",
            200
        )
        return success

    def test_authentication(self):
        """Test authentication endpoints"""
        print("\n=== TESTING AUTHENTICATION ===")
        
        # Test login with admin credentials
        success, response = self.run_test(
            "Admin Login",
            "POST",
            "api/auth/login",
            200,
            data={"username": "admin", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.admin_user = response['user']
            print(f"   Token obtained for user: {self.admin_user['full_name']}")
            
            # Test get current user
            success2, _ = self.run_test(
                "Get Current User",
                "GET",
                "api/auth/me",
                200
            )
            return success and success2
        
        return False

    def test_tables_api(self):
        """Test tables management"""
        print("\n=== TESTING TABLES API ===")
        
        # Get all tables
        success1, response = self.run_test(
            "Get All Tables",
            "GET",
            "api/tables",
            200
        )
        
        if success1 and response:
            self.test_table_id = response[0]['id'] if response else None
            print(f"   Found {len(response)} tables")
        
        return success1

    def test_menu_api(self):
        """Test menu management"""
        print("\n=== TESTING MENU API ===")
        
        # Get all menu items
        success1, response = self.run_test(
            "Get All Menu Items",
            "GET",
            "api/menu",
            200
        )
        
        if success1 and response:
            self.test_menu_item_id = response[0]['id'] if response else None
            print(f"   Found {len(response)} menu items")
        
        # Get categories
        success2, response2 = self.run_test(
            "Get Menu Categories",
            "GET",
            "api/menu/categories",
            200
        )
        
        if success2:
            print(f"   Found categories: {response2}")
        
        return success1 and success2

    def test_orders_api(self):
        """Test orders management"""
        print("\n=== TESTING ORDERS API ===")
        
        if not self.test_table_id or not self.test_menu_item_id:
            print("❌ Cannot test orders - missing table or menu item")
            return False
        
        # Create test order
        order_data = {
            "table_id": self.test_table_id,
            "table_number": 1,
            "items": [
                {
                    "menu_item_id": self.test_menu_item_id,
                    "menu_item_name": "Test Item",
                    "quantity": 2,
                    "unit_price": 10000,
                    "department": "kitchen",
                    "notes": "Test note"
                }
            ],
            "notes": "Test order"
        }
        
        success1, response = self.run_test(
            "Create Order",
            "POST",
            "api/orders",
            200,
            data=order_data
        )
        
        if success1 and response:
            self.test_order_id = response['id']
            print(f"   Created order #{response.get('order_number')}")
        
        # Get all orders
        success2, _ = self.run_test(
            "Get All Orders",
            "GET",
            "api/orders",
            200
        )
        
        # Get active orders
        success3, _ = self.run_test(
            "Get Active Orders",
            "GET",
            "api/orders/active",
            200
        )
        
        # Get kitchen orders
        success4, _ = self.run_test(
            "Get Kitchen Orders",
            "GET",
            "api/orders/department/kitchen",
            200
        )
        
        # Get bar orders
        success5, _ = self.run_test(
            "Get Bar Orders",
            "GET",
            "api/orders/department/bar",
            200
        )
        
        return success1 and success2 and success3 and success4 and success5

    def test_dashboard_api(self):
        """Test dashboard endpoints"""
        print("\n=== TESTING DASHBOARD API ===")
        
        # Get dashboard stats
        success1, response = self.run_test(
            "Get Dashboard Stats",
            "GET",
            "api/dashboard/stats",
            200
        )
        
        if success1:
            print(f"   Daily revenue: {response.get('daily_revenue', 0)}")
            print(f"   Total orders: {response.get('total_orders', 0)}")
        
        # Get hourly sales
        success2, _ = self.run_test(
            "Get Hourly Sales",
            "GET",
            "api/dashboard/hourly-sales",
            200
        )
        
        return success1 and success2

    def test_users_api(self):
        """Test users management"""
        print("\n=== TESTING USERS API ===")
        
        # Get all users (admin only)
        success1, response = self.run_test(
            "Get All Users",
            "GET",
            "api/users",
            200
        )
        
        if success1:
            print(f"   Found {len(response)} users")
        
        return success1

    def test_printers_api(self):
        """Test printers management"""
        print("\n=== TESTING PRINTERS API ===")
        
        # Get all printers
        success1, response = self.run_test(
            "Get All Printers",
            "GET",
            "api/printers",
            200
        )
        
        if success1:
            print(f"   Found {len(response)} printers")
        
        return success1

    def test_stock_api(self):
        """Test stock management"""
        print("\n=== TESTING STOCK API ===")
        
        # Get all stock items
        success1, response = self.run_test(
            "Get All Stock Items",
            "GET",
            "api/stock",
            200
        )
        
        if success1:
            print(f"   Found {len(response)} stock items")
        
        # Get stock alerts
        success2, _ = self.run_test(
            "Get Stock Alerts",
            "GET",
            "api/stock/alerts",
            200
        )
        
        return success1 and success2

    def test_bottles_api(self):
        """Test bottles management"""
        print("\n=== TESTING BOTTLES API ===")
        
        # Get all bottles
        success1, response = self.run_test(
            "Get All Bottles",
            "GET",
            "api/bottles",
            200
        )
        
        if success1:
            print(f"   Found {len(response)} bottles")
        
        # Get bottle alerts
        success2, _ = self.run_test(
            "Get Bottle Alerts",
            "GET",
            "api/bottles/alerts",
            200
        )
        
        # Get bottles report
        success3, _ = self.run_test(
            "Get Bottles Report",
            "GET",
            "api/bottles/report",
            200
        )
        
        return success1 and success2 and success3

    def test_payments_api(self):
        """Test payments management"""
        print("\n=== TESTING PAYMENTS API ===")
        
        # Get all payments
        success1, response = self.run_test(
            "Get All Payments",
            "GET",
            "api/payments",
            200
        )
        
        if success1:
            print(f"   Found {len(response)} payments")
        
        # Get daily close
        success2, _ = self.run_test(
            "Get Daily Close",
            "GET",
            "api/payments/daily-close",
            200
        )
        
        return success1 and success2

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting POS API Tests")
        print(f"Base URL: {self.base_url}")
        print("=" * 50)
        
        # Test sequence
        tests = [
            ("Database Seeding", self.test_seed_database),
            ("Authentication", self.test_authentication),
            ("Tables API", self.test_tables_api),
            ("Menu API", self.test_menu_api),
            ("Orders API", self.test_orders_api),
            ("Dashboard API", self.test_dashboard_api),
            ("Users API", self.test_users_api),
            ("Printers API", self.test_printers_api),
            ("Stock API", self.test_stock_api),
            ("Bottles API", self.test_bottles_api),
            ("Payments API", self.test_payments_api),
        ]
        
        failed_tests = []
        
        for test_name, test_func in tests:
            try:
                if not test_func():
                    failed_tests.append(test_name)
            except Exception as e:
                print(f"❌ {test_name} failed with exception: {str(e)}")
                failed_tests.append(test_name)
        
        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} tests passed")
        
        if failed_tests:
            print(f"❌ Failed test categories: {', '.join(failed_tests)}")
            return 1
        else:
            print("✅ All test categories passed!")
            return 0

def main():
    tester = POSAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())