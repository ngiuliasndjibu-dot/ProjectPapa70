from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from enum import Enum

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ.get('JWT_SECRET', 'lumiere-pos-secret-key-2024')
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# Security
security = HTTPBearer()

app = FastAPI(title="Lumière POS API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== ENUMS ==============
class UserRole(str, Enum):
    ADMIN = "admin"
    CASHIER = "cashier"
    SERVER = "server"
    BARTENDER = "bartender"
    KITCHEN = "kitchen"

class TableStatus(str, Enum):
    FREE = "free"
    OCCUPIED = "occupied"
    RESERVED = "reserved"
    CLEANING = "cleaning"

class Department(str, Enum):
    KITCHEN = "kitchen"
    BAR = "bar"

class OrderStatus(str, Enum):
    PENDING = "pending"
    PREPARING = "preparing"
    READY = "ready"
    SERVED = "served"
    CANCELLED = "cancelled"

class PaymentMethod(str, Enum):
    CASH = "cash"
    MOBILE_MONEY = "mobile_money"
    CARD = "card"

class PrinterStatus(str, Enum):
    ONLINE = "online"
    OFFLINE = "offline"

# ============== CURRENCY & GROUPING MODELS ==============

# Currency Models
class CurrencyBase(BaseModel):
    code: str  # ISO code: USD, EUR, XOF, XAF, etc.
    name: str
    symbol: str
    decimal_places: int = 0
    is_reference: bool = False  # Devise de référence
    is_selling: bool = False    # Devise de vente
    exchange_rate: float = 1.0  # Taux par rapport à la devise de référence

class CurrencyCreate(CurrencyBase):
    pass

class CurrencyUpdate(BaseModel):
    code: Optional[str] = None
    name: Optional[str] = None
    symbol: Optional[str] = None
    decimal_places: Optional[int] = None
    is_reference: Optional[bool] = None
    is_selling: Optional[bool] = None
    exchange_rate: Optional[float] = None

class Currency(CurrencyBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Menu Family/Group Models (for hierarchical grouping)
class MenuFamilyBase(BaseModel):
    name: str
    description: str = ""
    display_order: int = 0
    is_active: bool = True

class MenuFamilyCreate(MenuFamilyBase):
    pass

class MenuFamilyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class MenuFamily(MenuFamilyBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Menu Category (belongs to a family)
class MenuCategoryBase(BaseModel):
    name: str
    family_id: str
    family_name: str = ""
    description: str = ""
    display_order: int = 0
    is_active: bool = True

class MenuCategoryCreate(MenuCategoryBase):
    pass

class MenuCategoryUpdate(BaseModel):
    name: Optional[str] = None
    family_id: Optional[str] = None
    family_name: Optional[str] = None
    description: Optional[str] = None
    display_order: Optional[int] = None
    is_active: Optional[bool] = None

class MenuCategory(MenuCategoryBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== MODELS ==============

# User Models
class UserBase(BaseModel):
    username: str
    full_name: str
    role: UserRole
    is_active: bool = True

class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: UserRole

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserResponse(UserBase):
    id: str
    created_at: str

# Table Models
class TableBase(BaseModel):
    number: int
    zone: str
    capacity: int
    status: TableStatus = TableStatus.FREE
    position_x: int = 0
    position_y: int = 0

class TableCreate(TableBase):
    pass

class TableUpdate(BaseModel):
    number: Optional[int] = None
    zone: Optional[str] = None
    capacity: Optional[int] = None
    status: Optional[TableStatus] = None
    position_x: Optional[int] = None
    position_y: Optional[int] = None

class Table(TableBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    current_order_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Menu Item Models
class MenuItemBase(BaseModel):
    name: str
    description: str
    price: float
    category: str
    department: Department
    image_url: Optional[str] = None
    variants: List[str] = []
    is_active: bool = True

class MenuItemCreate(MenuItemBase):
    pass

class MenuItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    category: Optional[str] = None
    department: Optional[Department] = None
    image_url: Optional[str] = None
    variants: Optional[List[str]] = None
    is_active: Optional[bool] = None

class MenuItem(MenuItemBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Order Item Models
class OrderItemBase(BaseModel):
    menu_item_id: str
    menu_item_name: str
    quantity: int
    unit_price: float
    notes: str = ""
    department: Department

class OrderItem(OrderItemBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    status: OrderStatus = OrderStatus.PENDING

# Order Models
class OrderBase(BaseModel):
    table_id: str
    table_number: int
    server_id: str
    server_name: str
    items: List[OrderItem] = []
    notes: str = ""

class OrderCreate(BaseModel):
    table_id: str
    table_number: int
    items: List[OrderItemBase]
    notes: str = ""

class OrderUpdate(BaseModel):
    items: Optional[List[OrderItemBase]] = None
    notes: Optional[str] = None
    status: Optional[OrderStatus] = None

class Order(OrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: int = 0
    status: OrderStatus = OrderStatus.PENDING
    total: float = 0.0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Payment Models
class PaymentBase(BaseModel):
    order_id: str
    amount: float
    method: PaymentMethod
    is_partial: bool = False

class PaymentCreate(PaymentBase):
    pass

class Payment(PaymentBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    cashier_id: str = ""
    cashier_name: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Stock Models
class StockItemBase(BaseModel):
    name: str
    unit: str
    quantity: float
    alert_threshold: float
    category: str

class StockItemCreate(StockItemBase):
    pass

class StockItemUpdate(BaseModel):
    name: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[float] = None
    alert_threshold: Optional[float] = None
    category: Optional[str] = None

class StockItem(StockItemBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StockMovement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    stock_item_id: str
    stock_item_name: str
    quantity_change: float
    reason: str
    user_id: str
    user_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Bottle Models
class BottleBase(BaseModel):
    name: str
    brand: str
    total_volume_ml: int
    purchase_price: float
    quantity_in_stock: int
    alert_threshold: int
    shot_size_ml: int = 30
    current_volume_ml: Optional[int] = None

class BottleCreate(BottleBase):
    pass

class BottleUpdate(BaseModel):
    name: Optional[str] = None
    brand: Optional[str] = None
    total_volume_ml: Optional[int] = None
    purchase_price: Optional[float] = None
    quantity_in_stock: Optional[int] = None
    alert_threshold: Optional[int] = None
    shot_size_ml: Optional[int] = None
    current_volume_ml: Optional[int] = None

class Bottle(BottleBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    theoretical_shots: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Printer Models
class PrinterBase(BaseModel):
    name: str
    department: Department
    ip_address: str
    port: int = 9100
    status: PrinterStatus = PrinterStatus.ONLINE

class PrinterCreate(PrinterBase):
    pass

class PrinterUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[Department] = None
    ip_address: Optional[str] = None
    port: Optional[int] = None
    status: Optional[PrinterStatus] = None

class Printer(PrinterBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Print Job Models
class PrintJob(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    printer_id: str
    department: Department
    order_id: str
    order_number: int
    table_number: int
    server_name: str
    items: List[Dict[str, Any]]
    notes: str = ""
    status: str = "pending"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Dashboard Models
class DashboardStats(BaseModel):
    daily_revenue: float
    total_orders: int
    kitchen_sales: float
    bar_sales: float
    top_items: List[Dict[str, Any]]
    stock_alerts: List[Dict[str, Any]]
    bottle_alerts: List[Dict[str, Any]]

# ============== HELPERS ==============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def serialize_doc(doc: dict) -> dict:
    """Remove MongoDB _id and convert datetime to ISO string"""
    if doc is None:
        return None
    result = {k: v for k, v in doc.items() if k != "_id"}
    for key, value in result.items():
        if isinstance(value, datetime):
            result[key] = value.isoformat()
    return result

# ============== AUTH ROUTES ==============

@api_router.post("/auth/register", response_model=dict)
async def register(user_data: UserCreate):
    existing = await db.users.find_one({"username": user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    user = User(
        username=user_data.username,
        full_name=user_data.full_name,
        role=user_data.role
    )
    user_dict = user.model_dump()
    user_dict["password"] = hash_password(user_data.password)
    user_dict["created_at"] = user_dict["created_at"].isoformat()
    
    await db.users.insert_one(user_dict)
    token = create_token(user.id, user.role)
    
    return {
        "token": token,
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active
        }
    }

@api_router.post("/auth/login", response_model=dict)
async def login(credentials: UserLogin):
    user = await db.users.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not user.get("is_active", True):
        raise HTTPException(status_code=401, detail="User account is disabled")
    
    token = create_token(user["id"], user["role"])
    
    return {
        "token": token,
        "user": {
            "id": user["id"],
            "username": user["username"],
            "full_name": user["full_name"],
            "role": user["role"],
            "is_active": user["is_active"]
        }
    }

@api_router.get("/auth/me", response_model=dict)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# ============== USERS ROUTES ==============

@api_router.get("/users", response_model=List[dict])
async def get_users(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(1000)
    return users

@api_router.put("/users/{user_id}", response_model=dict)
async def update_user(user_id: str, update_data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data.pop("password", None)
    update_data.pop("id", None)
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user

# ============== TABLES ROUTES ==============

@api_router.get("/tables", response_model=List[dict])
async def get_tables(current_user: dict = Depends(get_current_user)):
    tables = await db.tables.find({}, {"_id": 0}).to_list(1000)
    return [serialize_doc(t) for t in tables]

@api_router.post("/tables", response_model=dict)
async def create_table(table_data: TableCreate, current_user: dict = Depends(get_current_user)):
    table = Table(**table_data.model_dump())
    table_dict = table.model_dump()
    table_dict["created_at"] = table_dict["created_at"].isoformat()
    await db.tables.insert_one(table_dict)
    return serialize_doc(table_dict)

@api_router.put("/tables/{table_id}", response_model=dict)
async def update_table(table_id: str, update_data: TableUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.tables.update_one({"id": table_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    
    table = await db.tables.find_one({"id": table_id}, {"_id": 0})
    return serialize_doc(table)

@api_router.delete("/tables/{table_id}")
async def delete_table(table_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.tables.delete_one({"id": table_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Table not found")
    return {"message": "Table deleted"}

# ============== MENU ROUTES ==============

@api_router.get("/menu", response_model=List[dict])
async def get_menu_items(current_user: dict = Depends(get_current_user)):
    items = await db.menu_items.find({}, {"_id": 0}).to_list(1000)
    return [serialize_doc(i) for i in items]

@api_router.get("/menu/categories", response_model=List[str])
async def get_categories(current_user: dict = Depends(get_current_user)):
    categories = await db.menu_items.distinct("category")
    return categories

@api_router.post("/menu", response_model=dict)
async def create_menu_item(item_data: MenuItemCreate, current_user: dict = Depends(get_current_user)):
    item = MenuItem(**item_data.model_dump())
    item_dict = item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    await db.menu_items.insert_one(item_dict)
    return serialize_doc(item_dict)

@api_router.put("/menu/{item_id}", response_model=dict)
async def update_menu_item(item_id: str, update_data: MenuItemUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No update data provided")
    
    result = await db.menu_items.update_one({"id": item_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    
    item = await db.menu_items.find_one({"id": item_id}, {"_id": 0})
    return serialize_doc(item)

@api_router.delete("/menu/{item_id}")
async def delete_menu_item(item_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.menu_items.delete_one({"id": item_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Menu item not found")
    return {"message": "Menu item deleted"}

# ============== ORDERS ROUTES ==============

async def get_next_order_number():
    counter = await db.counters.find_one_and_update(
        {"name": "order_number"},
        {"$inc": {"value": 1}},
        upsert=True,
        return_document=True
    )
    return counter["value"]

@api_router.get("/orders", response_model=List[dict])
async def get_orders(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if status:
        query["status"] = status
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [serialize_doc(o) for o in orders]

@api_router.get("/orders/active", response_model=List[dict])
async def get_active_orders(current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"status": {"$in": ["pending", "preparing"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    return [serialize_doc(o) for o in orders]

@api_router.get("/orders/department/{department}", response_model=List[dict])
async def get_orders_by_department(department: Department, current_user: dict = Depends(get_current_user)):
    orders = await db.orders.find(
        {"status": {"$in": ["pending", "preparing"]}},
        {"_id": 0}
    ).sort("created_at", 1).to_list(1000)
    
    filtered_orders = []
    for order in orders:
        dept_items = [item for item in order.get("items", []) if item.get("department") == department]
        if dept_items:
            order_copy = order.copy()
            order_copy["items"] = dept_items
            filtered_orders.append(serialize_doc(order_copy))
    
    return filtered_orders

@api_router.post("/orders", response_model=dict)
async def create_order(order_data: OrderCreate, current_user: dict = Depends(get_current_user)):
    order_number = await get_next_order_number()
    
    items = []
    total = 0.0
    for item_data in order_data.items:
        item = OrderItem(**item_data.model_dump())
        items.append(item.model_dump())
        total += item.quantity * item.unit_price
    
    order = Order(
        table_id=order_data.table_id,
        table_number=order_data.table_number,
        server_id=current_user["id"],
        server_name=current_user["full_name"],
        items=items,
        notes=order_data.notes,
        order_number=order_number,
        total=total
    )
    
    order_dict = order.model_dump()
    order_dict["created_at"] = order_dict["created_at"].isoformat()
    order_dict["updated_at"] = order_dict["updated_at"].isoformat()
    
    await db.orders.insert_one(order_dict)
    
    # Update table status
    await db.tables.update_one(
        {"id": order_data.table_id},
        {"$set": {"status": TableStatus.OCCUPIED, "current_order_id": order.id}}
    )
    
    # Create print jobs for each department
    await create_print_jobs(order_dict)
    
    return serialize_doc(order_dict)

@api_router.put("/orders/{order_id}/items", response_model=dict)
async def add_items_to_order(order_id: str, new_items: List[OrderItemBase], current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    items_to_add = []
    additional_total = 0.0
    for item_data in new_items:
        item = OrderItem(**item_data.model_dump())
        items_to_add.append(item.model_dump())
        additional_total += item.quantity * item.unit_price
    
    await db.orders.update_one(
        {"id": order_id},
        {
            "$push": {"items": {"$each": items_to_add}},
            "$inc": {"total": additional_total},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    
    updated_order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    # Create print jobs for new items
    print_order = {**updated_order, "items": items_to_add}
    await create_print_jobs(print_order)
    
    return serialize_doc(updated_order)

@api_router.put("/orders/{order_id}/status", response_model=dict)
async def update_order_status(order_id: str, status: OrderStatus, current_user: dict = Depends(get_current_user)):
    result = await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return serialize_doc(order)

@api_router.put("/orders/{order_id}/item/{item_id}/status", response_model=dict)
async def update_item_status(order_id: str, item_id: str, status: OrderStatus, current_user: dict = Depends(get_current_user)):
    result = await db.orders.update_one(
        {"id": order_id, "items.id": item_id},
        {"$set": {"items.$.status": status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Order or item not found")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return serialize_doc(order)

@api_router.delete("/orders/{order_id}")
async def cancel_order(order_id: str, reason: str, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": OrderStatus.CANCELLED, "cancel_reason": reason, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Free up the table
    await db.tables.update_one(
        {"id": order["table_id"]},
        {"$set": {"status": TableStatus.FREE, "current_order_id": None}}
    )
    
    # Log cancellation
    await db.action_logs.insert_one({
        "id": str(uuid.uuid4()),
        "action": "order_cancelled",
        "order_id": order_id,
        "reason": reason,
        "user_id": current_user["id"],
        "user_name": current_user["full_name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"message": "Order cancelled"}

# ============== PRINT JOBS ==============

async def create_print_jobs(order: dict):
    """Create print jobs separated by department"""
    kitchen_items = [i for i in order.get("items", []) if i.get("department") == Department.KITCHEN]
    bar_items = [i for i in order.get("items", []) if i.get("department") == Department.BAR]
    
    for dept, items in [(Department.KITCHEN, kitchen_items), (Department.BAR, bar_items)]:
        if items:
            printer = await db.printers.find_one({"department": dept, "status": PrinterStatus.ONLINE}, {"_id": 0})
            printer_id = printer["id"] if printer else "default"
            
            print_job = PrintJob(
                printer_id=printer_id,
                department=dept,
                order_id=order["id"],
                order_number=order.get("order_number", 0),
                table_number=order.get("table_number", 0),
                server_name=order.get("server_name", ""),
                items=items,
                notes=order.get("notes", "")
            )
            
            job_dict = print_job.model_dump()
            job_dict["created_at"] = job_dict["created_at"].isoformat()
            await db.print_jobs.insert_one(job_dict)

@api_router.get("/print-jobs", response_model=List[dict])
async def get_print_jobs(department: Optional[Department] = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if department:
        query["department"] = department
    jobs = await db.print_jobs.find(query, {"_id": 0}).sort("created_at", -1).to_list(100)
    return [serialize_doc(j) for j in jobs]

@api_router.put("/print-jobs/{job_id}/status")
async def update_print_job_status(job_id: str, status: str, current_user: dict = Depends(get_current_user)):
    result = await db.print_jobs.update_one({"id": job_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Print job not found")
    return {"message": "Print job status updated"}

# ============== PRINTERS ROUTES ==============

@api_router.get("/printers", response_model=List[dict])
async def get_printers(current_user: dict = Depends(get_current_user)):
    printers = await db.printers.find({}, {"_id": 0}).to_list(100)
    return [serialize_doc(p) for p in printers]

@api_router.post("/printers", response_model=dict)
async def create_printer(printer_data: PrinterCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    printer = Printer(**printer_data.model_dump())
    printer_dict = printer.model_dump()
    printer_dict["created_at"] = printer_dict["created_at"].isoformat()
    await db.printers.insert_one(printer_dict)
    return serialize_doc(printer_dict)

@api_router.put("/printers/{printer_id}", response_model=dict)
async def update_printer(printer_id: str, update_data: PrinterUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    result = await db.printers.update_one({"id": printer_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    printer = await db.printers.find_one({"id": printer_id}, {"_id": 0})
    return serialize_doc(printer)

@api_router.delete("/printers/{printer_id}")
async def delete_printer(printer_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.printers.delete_one({"id": printer_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Printer not found")
    return {"message": "Printer deleted"}

# ============== PAYMENTS ROUTES ==============

@api_router.get("/payments", response_model=List[dict])
async def get_payments(current_user: dict = Depends(get_current_user)):
    payments = await db.payments.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [serialize_doc(p) for p in payments]

@api_router.post("/payments", response_model=dict)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    order = await db.orders.find_one({"id": payment_data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    payment = Payment(
        order_id=payment_data.order_id,
        amount=payment_data.amount,
        method=payment_data.method,
        is_partial=payment_data.is_partial,
        cashier_id=current_user["id"],
        cashier_name=current_user["full_name"]
    )
    
    payment_dict = payment.model_dump()
    payment_dict["created_at"] = payment_dict["created_at"].isoformat()
    await db.payments.insert_one(payment_dict)
    
    # Check if order is fully paid
    total_paid = await db.payments.aggregate([
        {"$match": {"order_id": payment_data.order_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    total_paid_amount = total_paid[0]["total"] if total_paid else 0
    
    if total_paid_amount >= order["total"]:
        await db.orders.update_one(
            {"id": payment_data.order_id},
            {"$set": {"status": OrderStatus.SERVED, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        # Free up the table
        await db.tables.update_one(
            {"id": order["table_id"]},
            {"$set": {"status": TableStatus.CLEANING, "current_order_id": None}}
        )
    
    return serialize_doc(payment_dict)

@api_router.get("/payments/daily-close", response_model=dict)
async def get_daily_close(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    payments = await db.payments.find(
        {"created_at": {"$gte": today.isoformat()}},
        {"_id": 0}
    ).to_list(10000)
    
    by_method = {}
    total = 0.0
    for p in payments:
        method = p["method"]
        by_method[method] = by_method.get(method, 0) + p["amount"]
        total += p["amount"]
    
    return {
        "date": today.isoformat(),
        "total": total,
        "by_method": by_method,
        "transaction_count": len(payments)
    }

# ============== STOCK ROUTES ==============

@api_router.get("/stock", response_model=List[dict])
async def get_stock_items(current_user: dict = Depends(get_current_user)):
    items = await db.stock.find({}, {"_id": 0}).to_list(1000)
    return [serialize_doc(i) for i in items]

@api_router.post("/stock", response_model=dict)
async def create_stock_item(item_data: StockItemCreate, current_user: dict = Depends(get_current_user)):
    item = StockItem(**item_data.model_dump())
    item_dict = item.model_dump()
    item_dict["created_at"] = item_dict["created_at"].isoformat()
    await db.stock.insert_one(item_dict)
    return serialize_doc(item_dict)

@api_router.put("/stock/{item_id}", response_model=dict)
async def update_stock_item(item_id: str, update_data: StockItemUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    result = await db.stock.update_one({"id": item_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stock item not found")
    
    item = await db.stock.find_one({"id": item_id}, {"_id": 0})
    return serialize_doc(item)

@api_router.post("/stock/{item_id}/movement", response_model=dict)
async def record_stock_movement(item_id: str, quantity_change: float, reason: str, current_user: dict = Depends(get_current_user)):
    item = await db.stock.find_one({"id": item_id}, {"_id": 0})
    if not item:
        raise HTTPException(status_code=404, detail="Stock item not found")
    
    new_quantity = item["quantity"] + quantity_change
    if new_quantity < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    await db.stock.update_one({"id": item_id}, {"$set": {"quantity": new_quantity}})
    
    movement = StockMovement(
        stock_item_id=item_id,
        stock_item_name=item["name"],
        quantity_change=quantity_change,
        reason=reason,
        user_id=current_user["id"],
        user_name=current_user["full_name"]
    )
    
    movement_dict = movement.model_dump()
    movement_dict["created_at"] = movement_dict["created_at"].isoformat()
    await db.stock_movements.insert_one(movement_dict)
    
    return serialize_doc(movement_dict)

@api_router.get("/stock/alerts", response_model=List[dict])
async def get_stock_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await db.stock.find(
        {"$expr": {"$lte": ["$quantity", "$alert_threshold"]}},
        {"_id": 0}
    ).to_list(100)
    return [serialize_doc(a) for a in alerts]

# ============== BOTTLES ROUTES ==============

@api_router.get("/bottles", response_model=List[dict])
async def get_bottles(current_user: dict = Depends(get_current_user)):
    bottles = await db.bottles.find({}, {"_id": 0}).to_list(1000)
    return [serialize_doc(b) for b in bottles]

@api_router.post("/bottles", response_model=dict)
async def create_bottle(bottle_data: BottleCreate, current_user: dict = Depends(get_current_user)):
    bottle = Bottle(**bottle_data.model_dump())
    bottle.theoretical_shots = bottle.total_volume_ml // bottle.shot_size_ml
    if bottle.current_volume_ml is None:
        bottle.current_volume_ml = bottle.total_volume_ml
    
    bottle_dict = bottle.model_dump()
    bottle_dict["created_at"] = bottle_dict["created_at"].isoformat()
    await db.bottles.insert_one(bottle_dict)
    return serialize_doc(bottle_dict)

@api_router.put("/bottles/{bottle_id}", response_model=dict)
async def update_bottle(bottle_id: str, update_data: BottleUpdate, current_user: dict = Depends(get_current_user)):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    result = await db.bottles.update_one({"id": bottle_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bottle not found")
    
    bottle = await db.bottles.find_one({"id": bottle_id}, {"_id": 0})
    return serialize_doc(bottle)

@api_router.post("/bottles/{bottle_id}/pour", response_model=dict)
async def pour_from_bottle(bottle_id: str, volume_ml: int, current_user: dict = Depends(get_current_user)):
    bottle = await db.bottles.find_one({"id": bottle_id}, {"_id": 0})
    if not bottle:
        raise HTTPException(status_code=404, detail="Bottle not found")
    
    current_volume = bottle.get("current_volume_ml", bottle["total_volume_ml"])
    new_volume = current_volume - volume_ml
    
    if new_volume < 0:
        raise HTTPException(status_code=400, detail="Insufficient volume in bottle")
    
    await db.bottles.update_one({"id": bottle_id}, {"$set": {"current_volume_ml": new_volume}})
    
    # Log the pour
    await db.bottle_pours.insert_one({
        "id": str(uuid.uuid4()),
        "bottle_id": bottle_id,
        "bottle_name": bottle["name"],
        "volume_ml": volume_ml,
        "user_id": current_user["id"],
        "user_name": current_user["full_name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    updated_bottle = await db.bottles.find_one({"id": bottle_id}, {"_id": 0})
    return serialize_doc(updated_bottle)

@api_router.get("/bottles/report", response_model=dict)
async def get_bottles_report(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    pours = await db.bottle_pours.find(
        {"created_at": {"$gte": today.isoformat()}},
        {"_id": 0}
    ).to_list(10000)
    
    total_poured = sum(p["volume_ml"] for p in pours)
    
    bottles = await db.bottles.find({}, {"_id": 0}).to_list(1000)
    
    report = {
        "date": today.isoformat(),
        "total_volume_poured_ml": total_poured,
        "bottles": []
    }
    
    for bottle in bottles:
        theoretical_remaining = bottle["total_volume_ml"] - (bottle["total_volume_ml"] - bottle.get("current_volume_ml", bottle["total_volume_ml"]))
        actual_remaining = bottle.get("current_volume_ml", bottle["total_volume_ml"])
        variance = actual_remaining - theoretical_remaining
        
        report["bottles"].append({
            "name": bottle["name"],
            "brand": bottle["brand"],
            "theoretical_remaining_ml": theoretical_remaining,
            "actual_remaining_ml": actual_remaining,
            "variance_ml": variance
        })
    
    return report

@api_router.get("/bottles/alerts", response_model=List[dict])
async def get_bottle_alerts(current_user: dict = Depends(get_current_user)):
    alerts = await db.bottles.find(
        {"$expr": {"$lte": ["$quantity_in_stock", "$alert_threshold"]}},
        {"_id": 0}
    ).to_list(100)
    return [serialize_doc(a) for a in alerts]

# ============== DASHBOARD ROUTES ==============

@api_router.get("/dashboard/stats", response_model=dict)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Daily revenue
    payments = await db.payments.find(
        {"created_at": {"$gte": today.isoformat()}},
        {"_id": 0}
    ).to_list(10000)
    
    daily_revenue = sum(p["amount"] for p in payments)
    
    # Total orders today
    orders = await db.orders.find(
        {"created_at": {"$gte": today.isoformat()}},
        {"_id": 0}
    ).to_list(10000)
    
    total_orders = len(orders)
    
    # Sales by department
    kitchen_sales = 0.0
    bar_sales = 0.0
    item_counts = {}
    
    for order in orders:
        for item in order.get("items", []):
            item_name = item.get("menu_item_name", "Unknown")
            item_total = item["quantity"] * item["unit_price"]
            
            if item.get("department") == Department.KITCHEN:
                kitchen_sales += item_total
            else:
                bar_sales += item_total
            
            if item_name in item_counts:
                item_counts[item_name]["quantity"] += item["quantity"]
                item_counts[item_name]["revenue"] += item_total
            else:
                item_counts[item_name] = {"quantity": item["quantity"], "revenue": item_total}
    
    # Top items
    top_items = sorted(
        [{"name": k, **v} for k, v in item_counts.items()],
        key=lambda x: x["revenue"],
        reverse=True
    )[:10]
    
    # Stock alerts
    stock_alerts = await db.stock.find(
        {"$expr": {"$lte": ["$quantity", "$alert_threshold"]}},
        {"_id": 0}
    ).to_list(10)
    
    # Bottle alerts
    bottle_alerts = await db.bottles.find(
        {"$expr": {"$lte": ["$quantity_in_stock", "$alert_threshold"]}},
        {"_id": 0}
    ).to_list(10)
    
    return {
        "daily_revenue": daily_revenue,
        "total_orders": total_orders,
        "kitchen_sales": kitchen_sales,
        "bar_sales": bar_sales,
        "top_items": top_items,
        "stock_alerts": [serialize_doc(a) for a in stock_alerts],
        "bottle_alerts": [serialize_doc(a) for a in bottle_alerts]
    }

@api_router.get("/dashboard/hourly-sales", response_model=List[dict])
async def get_hourly_sales(current_user: dict = Depends(get_current_user)):
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    orders = await db.orders.find(
        {"created_at": {"$gte": today.isoformat()}, "status": {"$ne": OrderStatus.CANCELLED}},
        {"_id": 0}
    ).to_list(10000)
    
    hourly = {}
    for order in orders:
        hour = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00")).hour
        hourly[hour] = hourly.get(hour, 0) + order.get("total", 0)
    
    return [{"hour": h, "sales": s} for h, s in sorted(hourly.items())]

# ============== SEED DATA ==============

@api_router.post("/seed", response_model=dict)
async def seed_database():
    """Seed database with initial data for testing"""
    
    # Clear existing data
    await db.users.delete_many({})
    await db.tables.delete_many({})
    await db.menu_items.delete_many({})
    await db.printers.delete_many({})
    await db.counters.delete_many({})
    
    # Create admin user
    admin = User(username="admin", full_name="Administrateur", role=UserRole.ADMIN)
    admin_dict = admin.model_dump()
    admin_dict["password"] = hash_password("admin123")
    admin_dict["created_at"] = admin_dict["created_at"].isoformat()
    await db.users.insert_one(admin_dict)
    
    # Create sample users
    users_data = [
        {"username": "serveur1", "full_name": "Jean Serveur", "role": UserRole.SERVER, "password": "123456"},
        {"username": "barman1", "full_name": "Pierre Barman", "role": UserRole.BARTENDER, "password": "123456"},
        {"username": "cuisine1", "full_name": "Marie Cuisine", "role": UserRole.KITCHEN, "password": "123456"},
        {"username": "caisse1", "full_name": "Sophie Caisse", "role": UserRole.CASHIER, "password": "123456"},
    ]
    
    for u in users_data:
        user = User(username=u["username"], full_name=u["full_name"], role=u["role"])
        user_dict = user.model_dump()
        user_dict["password"] = hash_password(u["password"])
        user_dict["created_at"] = user_dict["created_at"].isoformat()
        await db.users.insert_one(user_dict)
    
    # Create tables
    zones = ["Terrasse", "Intérieur", "VIP"]
    for i in range(1, 16):
        zone = zones[i % 3]
        table = Table(
            number=i,
            zone=zone,
            capacity=2 if i <= 5 else 4 if i <= 10 else 6,
            position_x=(i - 1) % 5 * 150 + 50,
            position_y=(i - 1) // 5 * 120 + 50
        )
        table_dict = table.model_dump()
        table_dict["created_at"] = table_dict["created_at"].isoformat()
        await db.tables.insert_one(table_dict)
    
    # Create menu items
    menu_items_data = [
        # Entrées (Kitchen)
        {"name": "Salade César", "description": "Laitue romaine, parmesan, croûtons, sauce César maison", "price": 8500, "category": "Entrées", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400"},
        {"name": "Soupe du jour", "description": "Préparée avec des légumes frais de saison", "price": 5000, "category": "Entrées", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400"},
        {"name": "Bruschetta", "description": "Pain grillé, tomates fraîches, basilic, huile d'olive", "price": 7000, "category": "Entrées", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400"},
        
        # Plats (Kitchen)
        {"name": "Steak Frites", "description": "Entrecôte 300g, frites maison, sauce au poivre", "price": 22000, "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400"},
        {"name": "Poulet Grillé", "description": "Poulet entier grillé aux herbes, légumes rôtis", "price": 18000, "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400"},
        {"name": "Poisson du jour", "description": "Selon arrivage, accompagné de riz parfumé", "price": 20000, "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400"},
        {"name": "Burger Gourmet", "description": "Bœuf 200g, cheddar, bacon, oignons caramélisés", "price": 15000, "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"},
        {"name": "Pâtes Carbonara", "description": "Spaghetti, guanciale, œuf, parmesan, poivre", "price": 14000, "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400"},
        
        # Desserts (Kitchen)
        {"name": "Tiramisu", "description": "Recette traditionnelle au mascarpone et café", "price": 7500, "category": "Desserts", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400"},
        {"name": "Crème Brûlée", "description": "Vanille de Madagascar, sucre caramélisé", "price": 7000, "category": "Desserts", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=400"},
        {"name": "Fondant Chocolat", "description": "Cœur coulant, glace vanille", "price": 8000, "category": "Desserts", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400"},
        
        # Boissons (Bar)
        {"name": "Coca-Cola", "description": "33cl", "price": 2000, "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400"},
        {"name": "Eau Minérale", "description": "50cl", "price": 1500, "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400"},
        {"name": "Jus d'Orange", "description": "Pressé frais", "price": 3500, "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400"},
        {"name": "Café Espresso", "description": "Simple ou double", "price": 2000, "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400", "variants": ["Simple", "Double"]},
        {"name": "Thé", "description": "Vert, noir ou menthe", "price": 2500, "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400", "variants": ["Vert", "Noir", "Menthe"]},
        
        # Cocktails (Bar)
        {"name": "Mojito", "description": "Rhum, menthe fraîche, citron vert, sucre de canne", "price": 8000, "category": "Cocktails", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400"},
        {"name": "Margarita", "description": "Tequila, triple sec, citron vert", "price": 9000, "category": "Cocktails", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=400"},
        {"name": "Piña Colada", "description": "Rhum, lait de coco, ananas", "price": 8500, "category": "Cocktails", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=400"},
        {"name": "Gin Tonic", "description": "Gin premium, tonic, citron", "price": 7500, "category": "Cocktails", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=400"},
        
        # Vins (Bar)
        {"name": "Vin Rouge Maison", "description": "Verre 15cl", "price": 5000, "category": "Vins", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400"},
        {"name": "Vin Blanc Maison", "description": "Verre 15cl", "price": 5000, "category": "Vins", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400"},
        {"name": "Champagne", "description": "Coupe 12cl", "price": 12000, "category": "Vins", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=400"},
        
        # Bières (Bar)
        {"name": "Bière Blonde", "description": "33cl", "price": 3500, "category": "Bières", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400"},
        {"name": "Bière Brune", "description": "33cl", "price": 4000, "category": "Bières", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400"},
        
        # Shots (Bar)
        {"name": "Tequila Shot", "description": "30ml", "price": 4000, "category": "Shots", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400"},
        {"name": "Vodka Shot", "description": "30ml", "price": 3500, "category": "Shots", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400"},
        {"name": "Whisky Shot", "description": "30ml", "price": 5000, "category": "Shots", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400"},
    ]
    
    for item_data in menu_items_data:
        item = MenuItem(**item_data)
        item_dict = item.model_dump()
        item_dict["created_at"] = item_dict["created_at"].isoformat()
        await db.menu_items.insert_one(item_dict)
    
    # Create printers
    printers_data = [
        {"name": "Imprimante Cuisine", "department": Department.KITCHEN, "ip_address": "192.168.1.100", "port": 9100},
        {"name": "Imprimante Bar", "department": Department.BAR, "ip_address": "192.168.1.101", "port": 9100},
    ]
    
    for p_data in printers_data:
        printer = Printer(**p_data)
        printer_dict = printer.model_dump()
        printer_dict["created_at"] = printer_dict["created_at"].isoformat()
        await db.printers.insert_one(printer_dict)
    
    # Initialize order counter
    await db.counters.insert_one({"name": "order_number", "value": 1000})
    
    return {"message": "Database seeded successfully", "admin_credentials": {"username": "admin", "password": "admin123"}}

# ============== MAIN ==============

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
