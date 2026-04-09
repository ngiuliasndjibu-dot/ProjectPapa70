"""
Test suite for Upload and Categories CRUD functionality
Tests: Single/Multiple image upload, Categories CRUD (admin)
"""
import pytest
import requests
import os
import io

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAuthentication:
    """Test authentication for admin access"""
    
    def test_admin_login(self):
        """Admin login should work with identifier field"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "admin@techgadgets.com", "password": "Admin@123"}
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("role") == "admin"
        print("✓ Admin login successful")


class TestCategoriesPublic:
    """Test public categories endpoint"""
    
    def test_get_categories_returns_list(self):
        """GET /api/categories should return categories list"""
        response = requests.get(f"{BASE_URL}/api/categories")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        data = response.json()
        assert isinstance(data, list), "Expected list of categories"
        assert len(data) >= 6, f"Expected at least 6 seeded categories, got {len(data)}"
        
        # Verify category structure
        cat = data[0]
        assert "id" in cat, "Category should have id"
        assert "name" in cat, "Category should have name"
        assert "slug" in cat, "Category should have slug"
        print(f"✓ GET /api/categories returns {len(data)} categories")


class TestCategoriesCRUD:
    """Test admin categories CRUD operations"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get authenticated admin session"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "admin@techgadgets.com", "password": "Admin@123"}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.cookies
    
    def test_create_category(self, auth_cookies):
        """POST /api/admin/categories should create a new category"""
        category_data = {
            "name": "TEST_Categorie Test",
            "name_en": "TEST_Test Category",
            "slug": "test-category-pytest",
            "image": "https://example.com/test.jpg",
            "description": "Test category description"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/admin/categories",
            json=category_data,
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == category_data["name"]
        assert data["slug"] == category_data["slug"]
        assert "id" in data
        print(f"✓ Created category: {data['name']} (id: {data['id']})")
        
        # Verify it appears in GET /api/categories
        get_response = requests.get(f"{BASE_URL}/api/categories")
        categories = get_response.json()
        found = any(c["slug"] == "test-category-pytest" for c in categories)
        assert found, "Created category should appear in categories list"
        print("✓ Category verified in GET /api/categories")
        
        return data["id"]
    
    def test_create_category_duplicate_slug_fails(self, auth_cookies):
        """POST /api/admin/categories with duplicate slug should fail"""
        # First create a category
        category_data = {
            "name": "TEST_Duplicate Test",
            "slug": "test-duplicate-slug",
        }
        requests.post(
            f"{BASE_URL}/api/admin/categories",
            json=category_data,
            cookies=auth_cookies
        )
        
        # Try to create another with same slug
        response = requests.post(
            f"{BASE_URL}/api/admin/categories",
            json=category_data,
            cookies=auth_cookies
        )
        assert response.status_code == 400, f"Expected 400 for duplicate slug, got {response.status_code}"
        print("✓ Duplicate slug correctly rejected")
    
    def test_update_category(self, auth_cookies):
        """PUT /api/admin/categories/{id} should update category"""
        # First create a category
        create_data = {
            "name": "TEST_Update Test",
            "slug": "test-update-category",
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/categories",
            json=create_data,
            cookies=auth_cookies
        )
        if create_response.status_code != 200:
            pytest.skip("Could not create category for update test")
        
        category_id = create_response.json()["id"]
        
        # Update the category
        update_data = {
            "name": "TEST_Updated Name",
            "name_en": "TEST_Updated Name EN",
            "slug": "test-update-category",  # Keep same slug
            "description": "Updated description"
        }
        
        response = requests.put(
            f"{BASE_URL}/api/admin/categories/{category_id}",
            json=update_data,
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert data["name"] == "TEST_Updated Name"
        assert data["description"] == "Updated description"
        print(f"✓ Updated category: {data['name']}")
        
        # Verify update persisted
        get_response = requests.get(f"{BASE_URL}/api/categories")
        categories = get_response.json()
        updated_cat = next((c for c in categories if c["id"] == category_id), None)
        assert updated_cat is not None
        assert updated_cat["name"] == "TEST_Updated Name"
        print("✓ Update verified in GET /api/categories")
    
    def test_delete_category(self, auth_cookies):
        """DELETE /api/admin/categories/{id} should delete category"""
        # First create a category
        create_data = {
            "name": "TEST_Delete Test",
            "slug": "test-delete-category",
        }
        create_response = requests.post(
            f"{BASE_URL}/api/admin/categories",
            json=create_data,
            cookies=auth_cookies
        )
        if create_response.status_code != 200:
            pytest.skip("Could not create category for delete test")
        
        category_id = create_response.json()["id"]
        
        # Delete the category
        response = requests.delete(
            f"{BASE_URL}/api/admin/categories/{category_id}",
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"✓ Deleted category: {category_id}")
        
        # Verify deletion
        get_response = requests.get(f"{BASE_URL}/api/categories")
        categories = get_response.json()
        found = any(c["id"] == category_id for c in categories)
        assert not found, "Deleted category should not appear in categories list"
        print("✓ Deletion verified - category no longer in list")
    
    def test_delete_category_with_products_fails(self, auth_cookies):
        """DELETE /api/admin/categories should fail if products use it"""
        # Try to delete 'smartphones' category which has products
        get_response = requests.get(f"{BASE_URL}/api/categories")
        categories = get_response.json()
        smartphones_cat = next((c for c in categories if c["slug"] == "smartphones"), None)
        
        if smartphones_cat:
            response = requests.delete(
                f"{BASE_URL}/api/admin/categories/{smartphones_cat['id']}",
                cookies=auth_cookies
            )
            # Should fail because products use this category
            assert response.status_code == 400, f"Expected 400 when deleting category with products, got {response.status_code}"
            print("✓ Cannot delete category with products (correctly rejected)")
    
    def test_create_category_requires_auth(self):
        """POST /api/admin/categories without auth should fail"""
        response = requests.post(
            f"{BASE_URL}/api/admin/categories",
            json={"name": "Test", "slug": "test"}
        )
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Create category requires authentication")


class TestFileUpload:
    """Test file upload endpoints"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get authenticated admin session"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "admin@techgadgets.com", "password": "Admin@123"}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.cookies
    
    def test_single_upload_requires_auth(self):
        """POST /api/upload without auth should fail"""
        # Create a simple test image
        files = {'file': ('test.jpg', b'\xff\xd8\xff\xe0\x00\x10JFIF', 'image/jpeg')}
        response = requests.post(f"{BASE_URL}/api/upload", files=files)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Upload requires authentication")
    
    def test_single_upload_requires_admin(self, auth_cookies):
        """POST /api/upload should work for admin"""
        # Create a minimal valid JPEG
        # JPEG header bytes
        jpeg_bytes = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0xFF,
            0xD9
        ])
        
        files = {'file': ('test_upload.jpg', jpeg_bytes, 'image/jpeg')}
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "url" in data, "Response should contain url"
        assert data["url"].startswith("/uploads/"), f"URL should start with /uploads/, got {data['url']}"
        assert "filename" in data, "Response should contain filename"
        print(f"✓ Single upload successful: {data['url']}")
        
        # Verify file is accessible
        file_url = f"{BASE_URL}{data['url']}"
        file_response = requests.get(file_url)
        assert file_response.status_code == 200, f"Uploaded file should be accessible, got {file_response.status_code}"
        print(f"✓ Uploaded file accessible at {data['url']}")
    
    def test_upload_rejects_invalid_type(self, auth_cookies):
        """POST /api/upload should reject non-image files"""
        files = {'file': ('test.txt', b'This is not an image', 'text/plain')}
        response = requests.post(
            f"{BASE_URL}/api/upload",
            files=files,
            cookies=auth_cookies
        )
        assert response.status_code == 400, f"Expected 400 for invalid file type, got {response.status_code}"
        print("✓ Invalid file type correctly rejected")
    
    def test_multiple_upload(self, auth_cookies):
        """POST /api/upload/multiple should upload multiple files"""
        # Create minimal JPEG bytes
        jpeg_bytes = bytes([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
            0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
            0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
            0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
            0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
            0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
            0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x0B, 0x08, 0x00, 0x01,
            0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xFF, 0xC4, 0x00, 0x1F, 0x00, 0x00,
            0x01, 0x05, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00,
            0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08,
            0x09, 0x0A, 0x0B, 0xFF, 0xC4, 0x00, 0xB5, 0x10, 0x00, 0x02, 0x01, 0x03,
            0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7D,
            0xFF, 0xDA, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3F, 0x00, 0x7F, 0xFF,
            0xD9
        ])
        
        files = [
            ('files', ('test1.jpg', jpeg_bytes, 'image/jpeg')),
            ('files', ('test2.jpg', jpeg_bytes, 'image/jpeg')),
        ]
        
        response = requests.post(
            f"{BASE_URL}/api/upload/multiple",
            files=files,
            cookies=auth_cookies
        )
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        
        data = response.json()
        assert "uploaded" in data, "Response should contain uploaded array"
        assert "count" in data, "Response should contain count"
        assert data["count"] == 2, f"Expected 2 files uploaded, got {data['count']}"
        
        for item in data["uploaded"]:
            assert "url" in item
            assert item["url"].startswith("/uploads/")
        
        print(f"✓ Multiple upload successful: {data['count']} files")
    
    def test_multiple_upload_requires_auth(self):
        """POST /api/upload/multiple without auth should fail"""
        jpeg_bytes = b'\xff\xd8\xff\xe0\x00\x10JFIF'
        files = [('files', ('test.jpg', jpeg_bytes, 'image/jpeg'))]
        response = requests.post(f"{BASE_URL}/api/upload/multiple", files=files)
        assert response.status_code == 401, f"Expected 401, got {response.status_code}"
        print("✓ Multiple upload requires authentication")


class TestUploadedFilesServing:
    """Test that uploaded files are served correctly"""
    
    def test_uploads_path_accessible(self):
        """Files in /uploads/ should be accessible"""
        # Check if any files exist in uploads
        response = requests.get(f"{BASE_URL}/uploads/")
        # Either 200 (directory listing) or 404 (no index) is acceptable
        # The important thing is it doesn't return 500
        assert response.status_code in [200, 403, 404], f"Uploads path should be configured, got {response.status_code}"
        print("✓ /uploads/ path is configured")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture
    def auth_cookies(self):
        """Get authenticated admin session"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"identifier": "admin@techgadgets.com", "password": "Admin@123"}
        )
        if response.status_code != 200:
            pytest.skip("Admin login failed")
        return response.cookies
    
    def test_cleanup_test_categories(self, auth_cookies):
        """Clean up TEST_ prefixed categories"""
        get_response = requests.get(f"{BASE_URL}/api/categories")
        categories = get_response.json()
        
        deleted_count = 0
        for cat in categories:
            if cat.get("name", "").startswith("TEST_") or cat.get("slug", "").startswith("test-"):
                delete_response = requests.delete(
                    f"{BASE_URL}/api/admin/categories/{cat['id']}",
                    cookies=auth_cookies
                )
                if delete_response.status_code == 200:
                    deleted_count += 1
        
        print(f"✓ Cleaned up {deleted_count} test categories")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
