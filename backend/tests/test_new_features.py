"""Tests for new POS features: merge/split orders, reservations, loyalty, ingredients, recipes, reports, restaurant settings."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://resto-pos-hub-13.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"


@pytest.fixture(scope="session")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    # Ensure DB seeded
    try:
        s.post(f"{API}/seed", timeout=20)
    except Exception:
        pass
    r = s.post(f"{API}/auth/login", json={"username": "admin", "password": "admin123"}, timeout=15)
    assert r.status_code == 200, f"Login failed: {r.status_code} {r.text}"
    token = r.json().get("token")
    assert token, "No token returned"
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s


def _assert_no_objectid(obj):
    """Recursively verify _id is not present in response JSON."""
    if isinstance(obj, dict):
        assert "_id" not in obj, f"_id leaked in response: keys={list(obj.keys())}"
        for v in obj.values():
            _assert_no_objectid(v)
    elif isinstance(obj, list):
        for x in obj:
            _assert_no_objectid(x)


# -------- New module CRUD: simple GETs --------
class TestNewModuleGETs:
    def test_get_reservations(self, session):
        r = session.get(f"{API}/reservations", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        _assert_no_objectid(data)

    def test_get_loyalty_settings(self, session):
        r = session.get(f"{API}/loyalty/settings", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, dict)
        _assert_no_objectid(data)

    def test_get_loyalty_customers(self, session):
        r = session.get(f"{API}/loyalty/customers", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        _assert_no_objectid(data)

    def test_get_ingredients(self, session):
        r = session.get(f"{API}/ingredients", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        _assert_no_objectid(data)

    def test_get_recipes(self, session):
        r = session.get(f"{API}/recipes", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, list)
        _assert_no_objectid(data)

    def test_get_restaurant_settings(self, session):
        r = session.get(f"{API}/settings/restaurant", timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert isinstance(data, dict)
        _assert_no_objectid(data)

    def test_get_daily_sales(self, session):
        r = session.get(f"{API}/reports/daily-sales", timeout=15)
        assert r.status_code == 200, r.text
        _assert_no_objectid(r.json())

    def test_get_stock_report(self, session):
        r = session.get(f"{API}/reports/stock", timeout=15)
        assert r.status_code == 200, r.text
        _assert_no_objectid(r.json())


# -------- Merge / Split flows --------
def _get_table_ids(session):
    r = session.get(f"{API}/tables", timeout=15)
    assert r.status_code == 200, r.text
    tables = r.json()
    assert len(tables) >= 2, "Need at least 2 tables"
    return [t["id"] for t in tables]


def _get_menu_items(session, n=3):
    r = session.get(f"{API}/menu", timeout=15)
    assert r.status_code == 200, r.text
    items = r.json()
    assert len(items) >= n, f"Need at least {n} menu items"
    return items[:n]


def _create_order(session, table_id, items, count=2, table_number=1):
    payload_items = []
    for i, it in enumerate(items[:count]):
        price = it.get("price_selling", it.get("price", 1000)) or 1000
        payload_items.append({
            "menu_item_id": it["id"],
            "menu_item_name": it["name"],
            "name": it["name"],
            "quantity": 1,
            "unit_price": price,
            "price": price,
            "price_selling": price,
            "category": it.get("category", "Plats"),
            "department": it.get("department", "kitchen"),
        })
    body = {
        "table_id": table_id,
        "table_number": table_number,
        "items": payload_items,
        "notes": "TEST_ORDER",
    }
    r = session.post(f"{API}/orders", json=body, timeout=15)
    assert r.status_code in (200, 201), f"Create order failed: {r.status_code} {r.text}"
    return r.json()


class TestMergeSplit:
    def test_merge_two_orders(self, session):
        tables = _get_table_ids(session)
        menu = _get_menu_items(session, 3)
        o1 = _create_order(session, tables[0], menu, count=2)
        o2 = _create_order(session, tables[1], menu, count=2)
        body = {"order_ids": [o1["id"], o2["id"]], "target_table_id": tables[0]}
        r = session.post(f"{API}/orders/merge", json=body, timeout=15)
        assert r.status_code == 200, f"Merge failed: {r.status_code} {r.text}"
        merged = r.json()
        _assert_no_objectid(merged)
        assert "id" in merged
        assert merged.get("table_id") == tables[0]
        assert len(merged.get("items", [])) >= 2

    def test_split_by_items(self, session):
        tables = _get_table_ids(session)
        menu = _get_menu_items(session, 3)
        order = _create_order(session, tables[0], menu, count=3)
        item_ids = [it.get("id") or it.get("menu_item_id") for it in order["items"][:1]]
        body = {
            "split_type": "by_items",
            "split_data": {
                "parts": [
                    {"item_ids": item_ids, "table_id": tables[1]},
                ]
            },
        }
        r = session.post(f"{API}/orders/{order['id']}/split", json=body, timeout=15)
        assert r.status_code == 200, f"Split by_items failed: {r.status_code} {r.text}"
        data = r.json()
        _assert_no_objectid(data)
        assert "new_orders" in data
        assert isinstance(data["new_orders"], list)
        assert len(data["new_orders"]) >= 1

    def test_split_equal(self, session):
        tables = _get_table_ids(session)
        menu = _get_menu_items(session, 2)
        order = _create_order(session, tables[0], menu, count=2)
        body = {
            "split_type": "equal",
            "split_data": {"num_parts": 3},
        }
        r = session.post(f"{API}/orders/{order['id']}/split", json=body, timeout=15)
        assert r.status_code == 200, f"Split equal failed: {r.status_code} {r.text}"
        data = r.json()
        _assert_no_objectid(data)
        assert "new_orders" in data
        assert len(data["new_orders"]) == 3

    def test_merge_validation_min_2(self, session):
        tables = _get_table_ids(session)
        body = {"order_ids": ["fake-id-only"], "target_table_id": tables[0]}
        r = session.post(f"{API}/orders/merge", json=body, timeout=15)
        assert r.status_code == 400, f"Expected 400, got {r.status_code} {r.text}"
