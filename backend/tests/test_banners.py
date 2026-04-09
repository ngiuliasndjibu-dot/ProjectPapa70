"""
Test suite for Banner CRUD operations
Tests: GET /api/banners, GET /api/admin/banners, POST/PUT/DELETE /api/admin/banners
"""
import pytest
import requests
import os
import uuid

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestBannerEndpoints:
    """Banner API endpoint tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        # Login as admin
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@techgadgets.com",
            "password": "Admin@123"
        })
        assert login_resp.status_code == 200, f"Admin login failed: {login_resp.text}"
        self.admin_user = login_resp.json()
        assert self.admin_user["role"] == "admin"
        
        yield
        
        # Cleanup: delete test banners
        try:
            banners = self.session.get(f"{BASE_URL}/api/admin/banners").json()
            for banner in banners:
                if banner.get("title", "").startswith("TEST_"):
                    self.session.delete(f"{BASE_URL}/api/admin/banners/{banner['id']}")
        except:
            pass
    
    # ==================== PUBLIC BANNERS API ====================
    
    def test_get_public_banners_returns_active_only(self):
        """GET /api/banners returns only active banners"""
        response = requests.get(f"{BASE_URL}/api/banners")
        assert response.status_code == 200
        
        banners = response.json()
        assert isinstance(banners, list)
        assert len(banners) >= 1, "Should have at least 1 seeded banner"
        
        # All returned banners should be active
        for banner in banners:
            assert banner.get("is_active") == True, f"Banner {banner.get('id')} should be active"
    
    def test_get_public_banners_sorted_by_position(self):
        """GET /api/banners returns banners sorted by position"""
        response = requests.get(f"{BASE_URL}/api/banners")
        assert response.status_code == 200
        
        banners = response.json()
        if len(banners) > 1:
            positions = [b.get("position", 0) for b in banners]
            assert positions == sorted(positions), "Banners should be sorted by position"
    
    def test_public_banners_have_required_fields(self):
        """GET /api/banners returns banners with all required fields"""
        response = requests.get(f"{BASE_URL}/api/banners")
        assert response.status_code == 200
        
        banners = response.json()
        required_fields = ["id", "title", "gradient", "is_active", "position"]
        
        for banner in banners:
            for field in required_fields:
                assert field in banner, f"Banner missing required field: {field}"
    
    # ==================== ADMIN BANNERS API ====================
    
    def test_get_admin_banners_requires_auth(self):
        """GET /api/admin/banners requires authentication"""
        # Use a new session without cookies
        response = requests.get(f"{BASE_URL}/api/admin/banners")
        assert response.status_code == 401
    
    def test_get_admin_banners_returns_all(self):
        """GET /api/admin/banners returns all banners (including inactive)"""
        response = self.session.get(f"{BASE_URL}/api/admin/banners")
        assert response.status_code == 200
        
        banners = response.json()
        assert isinstance(banners, list)
        assert len(banners) >= 3, "Should have at least 3 seeded banners"
    
    # ==================== CREATE BANNER ====================
    
    def test_create_banner_success(self):
        """POST /api/admin/banners creates a new banner"""
        banner_data = {
            "title": "TEST_BANNER_CREATE",
            "subtitle": "Test subtitle for banner",
            "image": "https://example.com/test.jpg",
            "gradient": "from-[#FF3B30] to-[#FF6B5B]",
            "link": "/shop?test=true",
            "button_text": "Test Button",
            "is_active": True,
            "position": 99
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/banners", json=banner_data)
        assert response.status_code == 200, f"Create banner failed: {response.text}"
        
        created = response.json()
        assert "id" in created
        assert created["title"] == banner_data["title"]
        assert created["subtitle"] == banner_data["subtitle"]
        assert created["gradient"] == banner_data["gradient"]
        assert created["link"] == banner_data["link"]
        assert created["button_text"] == banner_data["button_text"]
        assert created["is_active"] == True
        assert created["position"] == 99
        
        # Verify it appears in admin list
        all_banners = self.session.get(f"{BASE_URL}/api/admin/banners").json()
        banner_ids = [b["id"] for b in all_banners]
        assert created["id"] in banner_ids
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/banners/{created['id']}")
    
    def test_create_banner_requires_auth(self):
        """POST /api/admin/banners requires authentication"""
        response = requests.post(f"{BASE_URL}/api/admin/banners", json={
            "title": "TEST_UNAUTHORIZED",
            "gradient": "from-[#0066FF] to-[#3385FF]"
        })
        assert response.status_code == 401
    
    def test_create_inactive_banner_not_in_public(self):
        """Inactive banner should not appear in public /api/banners"""
        banner_data = {
            "title": "TEST_INACTIVE_BANNER",
            "subtitle": "This should not be public",
            "gradient": "from-[#0066FF] to-[#3385FF]",
            "is_active": False,
            "position": 100
        }
        
        response = self.session.post(f"{BASE_URL}/api/admin/banners", json=banner_data)
        assert response.status_code == 200
        created = response.json()
        
        # Check it's NOT in public banners
        public_banners = requests.get(f"{BASE_URL}/api/banners").json()
        public_ids = [b["id"] for b in public_banners]
        assert created["id"] not in public_ids, "Inactive banner should not appear in public API"
        
        # But it IS in admin banners
        admin_banners = self.session.get(f"{BASE_URL}/api/admin/banners").json()
        admin_ids = [b["id"] for b in admin_banners]
        assert created["id"] in admin_ids, "Inactive banner should appear in admin API"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/banners/{created['id']}")
    
    # ==================== UPDATE BANNER ====================
    
    def test_update_banner_success(self):
        """PUT /api/admin/banners/{id} updates a banner"""
        # First create a banner
        create_resp = self.session.post(f"{BASE_URL}/api/admin/banners", json={
            "title": "TEST_UPDATE_ORIGINAL",
            "subtitle": "Original subtitle",
            "gradient": "from-[#0066FF] to-[#3385FF]",
            "is_active": True,
            "position": 50
        })
        assert create_resp.status_code == 200
        banner_id = create_resp.json()["id"]
        
        # Update the banner
        update_data = {
            "title": "TEST_UPDATE_MODIFIED",
            "subtitle": "Modified subtitle",
            "gradient": "from-[#FF3B30] to-[#FF6B5B]",
            "link": "/shop?updated=true",
            "button_text": "Updated Button",
            "is_active": False,
            "position": 51
        }
        
        update_resp = self.session.put(f"{BASE_URL}/api/admin/banners/{banner_id}", json=update_data)
        assert update_resp.status_code == 200, f"Update failed: {update_resp.text}"
        
        updated = update_resp.json()
        assert updated["title"] == "TEST_UPDATE_MODIFIED"
        assert updated["subtitle"] == "Modified subtitle"
        assert updated["gradient"] == "from-[#FF3B30] to-[#FF6B5B]"
        assert updated["is_active"] == False
        assert updated["position"] == 51
        
        # Verify persistence with GET
        get_resp = self.session.get(f"{BASE_URL}/api/admin/banners")
        all_banners = get_resp.json()
        found = next((b for b in all_banners if b["id"] == banner_id), None)
        assert found is not None
        assert found["title"] == "TEST_UPDATE_MODIFIED"
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/banners/{banner_id}")
    
    def test_update_banner_not_found(self):
        """PUT /api/admin/banners/{id} returns 404 for non-existent banner"""
        fake_id = str(uuid.uuid4())
        response = self.session.put(f"{BASE_URL}/api/admin/banners/{fake_id}", json={
            "title": "TEST_NONEXISTENT",
            "gradient": "from-[#0066FF] to-[#3385FF]"
        })
        assert response.status_code == 404
    
    # ==================== DELETE BANNER ====================
    
    def test_delete_banner_success(self):
        """DELETE /api/admin/banners/{id} deletes a banner"""
        # First create a banner
        create_resp = self.session.post(f"{BASE_URL}/api/admin/banners", json={
            "title": "TEST_DELETE_ME",
            "gradient": "from-[#0066FF] to-[#3385FF]",
            "is_active": True,
            "position": 99
        })
        assert create_resp.status_code == 200
        banner_id = create_resp.json()["id"]
        
        # Delete the banner
        delete_resp = self.session.delete(f"{BASE_URL}/api/admin/banners/{banner_id}")
        assert delete_resp.status_code == 200
        
        # Verify it's gone
        all_banners = self.session.get(f"{BASE_URL}/api/admin/banners").json()
        banner_ids = [b["id"] for b in all_banners]
        assert banner_id not in banner_ids, "Deleted banner should not appear in list"
    
    def test_delete_banner_not_found(self):
        """DELETE /api/admin/banners/{id} returns 404 for non-existent banner"""
        fake_id = str(uuid.uuid4())
        response = self.session.delete(f"{BASE_URL}/api/admin/banners/{fake_id}")
        assert response.status_code == 404
    
    def test_delete_banner_requires_auth(self):
        """DELETE /api/admin/banners/{id} requires authentication"""
        # Get a real banner ID first
        banners = self.session.get(f"{BASE_URL}/api/admin/banners").json()
        if banners:
            banner_id = banners[0]["id"]
            # Try to delete without auth
            response = requests.delete(f"{BASE_URL}/api/admin/banners/{banner_id}")
            assert response.status_code == 401


class TestBannerDataIntegrity:
    """Test banner data integrity and edge cases"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup session and login as admin"""
        self.session = requests.Session()
        self.session.headers.update({"Content-Type": "application/json"})
        
        login_resp = self.session.post(f"{BASE_URL}/api/auth/login", json={
            "identifier": "admin@techgadgets.com",
            "password": "Admin@123"
        })
        assert login_resp.status_code == 200
        
        yield
        
        # Cleanup
        try:
            banners = self.session.get(f"{BASE_URL}/api/admin/banners").json()
            for banner in banners:
                if banner.get("title", "").startswith("TEST_"):
                    self.session.delete(f"{BASE_URL}/api/admin/banners/{banner['id']}")
        except:
            pass
    
    def test_banner_with_minimal_fields(self):
        """Create banner with only required fields"""
        response = self.session.post(f"{BASE_URL}/api/admin/banners", json={
            "title": "TEST_MINIMAL"
        })
        assert response.status_code == 200
        
        created = response.json()
        assert created["title"] == "TEST_MINIMAL"
        # Check defaults
        assert created.get("gradient") == "from-[#0066FF] to-[#3385FF]"  # default
        assert created.get("button_text") == "Acheter maintenant"  # default
        assert created.get("is_active") == True  # default
        assert created.get("position") == 0  # default
        
        # Cleanup
        self.session.delete(f"{BASE_URL}/api/admin/banners/{created['id']}")
    
    def test_seeded_banners_exist(self):
        """Verify 3 default banners are seeded on startup"""
        response = requests.get(f"{BASE_URL}/api/banners")
        assert response.status_code == 200
        
        banners = response.json()
        assert len(banners) >= 3, "Should have at least 3 seeded banners"
        
        # Check seeded banner titles
        titles = [b["title"] for b in banners]
        expected_titles = ["VENTE FLASH", "NOUVEAUTES", "LIVRAISON GRATUITE"]
        for expected in expected_titles:
            assert expected in titles, f"Missing seeded banner: {expected}"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
