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
    price: float  # Prix en devise de référence
    price_selling: Optional[float] = None  # Prix en devise de vente (si différent)
    family_id: Optional[str] = None
    family_name: str = ""
    category_id: Optional[str] = None
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
    price_selling: Optional[float] = None
    family_id: Optional[str] = None
    family_name: Optional[str] = None
    category_id: Optional[str] = None
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
    unit_price: float  # Prix en devise de référence
    unit_price_selling: Optional[float] = None  # Prix en devise de vente
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
    currency_code: str = "XOF"  # Devise utilisée pour cette commande

class OrderCreate(BaseModel):
    table_id: str
    table_number: int
    items: List[OrderItemBase]
    notes: str = ""
    currency_code: str = "XOF"

class OrderUpdate(BaseModel):
    items: Optional[List[OrderItemBase]] = None
    notes: Optional[str] = None
    status: Optional[OrderStatus] = None

class MergeOrdersRequest(BaseModel):
    order_ids: List[str]
    target_table_id: str

class SplitOrderRequest(BaseModel):
    split_type: str  # 'by_items' or 'equal'
    split_data: dict

class Order(OrderBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: int = 0
    status: OrderStatus = OrderStatus.PENDING
    total: float = 0.0  # Total en devise de référence
    total_selling: float = 0.0  # Total en devise de vente
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Payment Models
class PaymentBase(BaseModel):
    order_id: str
    amount: float  # Montant en devise de référence
    amount_selling: Optional[float] = None  # Montant en devise de vente
    currency_code: str = "XOF"  # Devise utilisée pour ce paiement
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

# ============== RESTAURANT SETTINGS MODELS ==============

class RestaurantSettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="restaurant_settings")
    name: str = "Mon Restaurant"
    address: str = ""
    city: str = ""
    phone: str = ""
    email: str = ""
    website: str = ""
    tax_id: str = ""  # NIF/RCCM
    logo_url: str = ""
    receipt_footer: str = "Merci de votre visite!"
    currency_symbol: str = "FC"
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== RESERVATION MODELS ==============

class ReservationStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"
    COMPLETED = "completed"
    NO_SHOW = "no_show"

class ReservationCreate(BaseModel):
    customer_name: str
    customer_phone: str
    customer_email: str = ""
    table_id: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    party_size: int
    notes: str = ""

class Reservation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    customer_phone: str
    customer_email: str = ""
    table_id: str
    table_number: int = 0
    date: str
    time: str
    party_size: int
    notes: str = ""
    status: ReservationStatus = ReservationStatus.PENDING
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== LOYALTY PROGRAM MODELS ==============

class LoyaltyCustomer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    email: str = ""
    points: int = 0
    total_spent: float = 0
    visit_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    last_visit: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoyaltyTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_id: str
    order_id: str = ""
    points_earned: int = 0
    points_spent: int = 0
    amount: float = 0
    description: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoyaltyReward(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str = ""
    points_required: int
    reward_type: str = "discount"  # discount, free_item, percentage
    reward_value: float = 0  # Amount or percentage
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class LoyaltySettings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default="loyalty_settings")
    is_enabled: bool = True
    points_per_unit: int = 1  # 1 point per X currency units spent
    currency_per_point: float = 100  # Spend 100 FC = 1 point
    welcome_bonus: int = 10  # Points for new customers
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ============== RECIPE/INGREDIENT MODELS ==============

class Ingredient(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    unit: str  # kg, g, l, ml, piece
    quantity_in_stock: float = 0
    cost_per_unit: float = 0
    alert_threshold: float = 10
    supplier: str = ""
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class RecipeItem(BaseModel):
    ingredient_id: str
    ingredient_name: str = ""
    quantity: float
    unit: str

class Recipe(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    menu_item_id: str
    menu_item_name: str = ""
    ingredients: List[RecipeItem] = []
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    
    # Don't allow changing id
    update_data.pop("id", None)
    
    # Handle password change separately
    if "password" in update_data and update_data["password"]:
        update_data["password"] = hash_password(update_data["password"])
    else:
        update_data.pop("password", None)
    
    result = await db.users.update_one({"id": user_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password": 0})
    return user

@api_router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Prevent deleting yourself
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
    
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"message": "User deleted successfully"}

@api_router.put("/users/{user_id}/toggle-status")
async def toggle_user_status(user_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Prevent disabling yourself
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot disable your own account")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user.get("is_active", True)
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"User {'activated' if new_status else 'deactivated'}", "is_active": new_status}

@api_router.post("/users", response_model=dict)
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    """Create a new user (admin only)"""
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
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
    user_dict["is_active"] = True
    user_dict["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.users.insert_one(user_dict)
    
    # Return user without password
    user_dict.pop("password", None)
    user_dict.pop("_id", None)
    return user_dict

# Role permissions definition
ROLE_PERMISSIONS = {
    UserRole.ADMIN: {
        "name": "Administrateur",
        "description": "Accès total au système",
        "permissions": [
            "dashboard.view", "dashboard.stats",
            "tables.view", "tables.create", "tables.edit", "tables.delete",
            "menu.view", "menu.create", "menu.edit", "menu.delete",
            "orders.view", "orders.create", "orders.edit", "orders.cancel",
            "payments.view", "payments.create", "payments.daily_close",
            "stock.view", "stock.create", "stock.edit",
            "bottles.view", "bottles.create", "bottles.edit", "bottles.pour",
            "printers.view", "printers.create", "printers.edit", "printers.delete",
            "users.view", "users.create", "users.edit", "users.delete",
            "settings.view", "settings.edit",
            "reports.view", "reports.print"
        ]
    },
    UserRole.CASHIER: {
        "name": "Caissier",
        "description": "Gestion des paiements et clôture de caisse",
        "permissions": [
            "dashboard.view", "dashboard.stats",
            "tables.view",
            "menu.view",
            "orders.view", "orders.create",
            "payments.view", "payments.create", "payments.daily_close",
            "reports.view"
        ]
    },
    UserRole.SERVER: {
        "name": "Serveur",
        "description": "Prise de commandes et gestion des tables",
        "permissions": [
            "tables.view", "tables.edit",
            "menu.view",
            "orders.view", "orders.create", "orders.edit"
        ]
    },
    UserRole.BARTENDER: {
        "name": "Barman",
        "description": "Gestion du bar et des boissons",
        "permissions": [
            "menu.view",
            "orders.view",
            "bottles.view", "bottles.pour"
        ]
    },
    UserRole.KITCHEN: {
        "name": "Cuisine",
        "description": "Affichage des commandes cuisine",
        "permissions": [
            "orders.view"
        ]
    }
}

@api_router.get("/roles")
async def get_roles(current_user: dict = Depends(get_current_user)):
    """Get all roles with their permissions"""
    roles = []
    for role, info in ROLE_PERMISSIONS.items():
        roles.append({
            "code": role.value,
            "name": info["name"],
            "description": info["description"],
            "permissions": info["permissions"]
        })
    return roles

@api_router.get("/permissions")
async def get_all_permissions(current_user: dict = Depends(get_current_user)):
    """Get all available permissions grouped by module"""
    return {
        "dashboard": [
            {"code": "dashboard.view", "name": "Voir le tableau de bord"},
            {"code": "dashboard.stats", "name": "Voir les statistiques"}
        ],
        "tables": [
            {"code": "tables.view", "name": "Voir les tables"},
            {"code": "tables.create", "name": "Créer des tables"},
            {"code": "tables.edit", "name": "Modifier les tables"},
            {"code": "tables.delete", "name": "Supprimer des tables"}
        ],
        "menu": [
            {"code": "menu.view", "name": "Voir le menu"},
            {"code": "menu.create", "name": "Créer des articles"},
            {"code": "menu.edit", "name": "Modifier des articles"},
            {"code": "menu.delete", "name": "Supprimer des articles"}
        ],
        "orders": [
            {"code": "orders.view", "name": "Voir les commandes"},
            {"code": "orders.create", "name": "Créer des commandes"},
            {"code": "orders.edit", "name": "Modifier des commandes"},
            {"code": "orders.cancel", "name": "Annuler des commandes"}
        ],
        "payments": [
            {"code": "payments.view", "name": "Voir les paiements"},
            {"code": "payments.create", "name": "Enregistrer des paiements"},
            {"code": "payments.daily_close", "name": "Clôture de caisse"}
        ],
        "stock": [
            {"code": "stock.view", "name": "Voir le stock"},
            {"code": "stock.create", "name": "Ajouter au stock"},
            {"code": "stock.edit", "name": "Modifier le stock"}
        ],
        "bottles": [
            {"code": "bottles.view", "name": "Voir les bouteilles"},
            {"code": "bottles.create", "name": "Ajouter des bouteilles"},
            {"code": "bottles.edit", "name": "Modifier des bouteilles"},
            {"code": "bottles.pour", "name": "Enregistrer les services"}
        ],
        "printers": [
            {"code": "printers.view", "name": "Voir les imprimantes"},
            {"code": "printers.create", "name": "Ajouter des imprimantes"},
            {"code": "printers.edit", "name": "Modifier les imprimantes"},
            {"code": "printers.delete", "name": "Supprimer des imprimantes"}
        ],
        "users": [
            {"code": "users.view", "name": "Voir les utilisateurs"},
            {"code": "users.create", "name": "Créer des utilisateurs"},
            {"code": "users.edit", "name": "Modifier des utilisateurs"},
            {"code": "users.delete", "name": "Supprimer des utilisateurs"}
        ],
        "settings": [
            {"code": "settings.view", "name": "Voir les paramètres"},
            {"code": "settings.edit", "name": "Modifier les paramètres"}
        ],
        "reports": [
            {"code": "reports.view", "name": "Voir les rapports"},
            {"code": "reports.print", "name": "Imprimer les rapports"}
        ]
    }

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

# ============== MENU FAMILIES ROUTES ==============

@api_router.get("/menu/families", response_model=List[dict])
async def get_menu_families(current_user: dict = Depends(get_current_user)):
    families = await db.menu_families.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return [serialize_doc(f) for f in families]

@api_router.post("/menu/families", response_model=dict)
async def create_menu_family(family_data: MenuFamilyCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    family = MenuFamily(**family_data.model_dump())
    family_dict = family.model_dump()
    family_dict["created_at"] = family_dict["created_at"].isoformat()
    await db.menu_families.insert_one(family_dict)
    return serialize_doc(family_dict)

@api_router.put("/menu/families/{family_id}", response_model=dict)
async def update_menu_family(family_id: str, update_data: MenuFamilyUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    result = await db.menu_families.update_one({"id": family_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Family not found")
    
    # Update family_name in all related items and categories
    if "name" in update_dict:
        await db.menu_categories.update_many({"family_id": family_id}, {"$set": {"family_name": update_dict["name"]}})
        await db.menu_items.update_many({"family_id": family_id}, {"$set": {"family_name": update_dict["name"]}})
    
    family = await db.menu_families.find_one({"id": family_id}, {"_id": 0})
    return serialize_doc(family)

@api_router.delete("/menu/families/{family_id}")
async def delete_menu_family(family_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.menu_families.delete_one({"id": family_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Family not found")
    return {"message": "Family deleted"}

# ============== MENU CATEGORIES ROUTES ==============

@api_router.get("/menu/categories-full", response_model=List[dict])
async def get_menu_categories_full(current_user: dict = Depends(get_current_user)):
    categories = await db.menu_categories.find({}, {"_id": 0}).sort("display_order", 1).to_list(100)
    return [serialize_doc(c) for c in categories]

@api_router.post("/menu/categories-full", response_model=dict)
async def create_menu_category(category_data: MenuCategoryCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Get family name
    family = await db.menu_families.find_one({"id": category_data.family_id}, {"_id": 0})
    if family:
        category_data.family_name = family["name"]
    
    category = MenuCategory(**category_data.model_dump())
    category_dict = category.model_dump()
    category_dict["created_at"] = category_dict["created_at"].isoformat()
    await db.menu_categories.insert_one(category_dict)
    return serialize_doc(category_dict)

@api_router.put("/menu/categories-full/{category_id}", response_model=dict)
async def update_menu_category(category_id: str, update_data: MenuCategoryUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # Update family_name if family_id changed
    if "family_id" in update_dict:
        family = await db.menu_families.find_one({"id": update_dict["family_id"]}, {"_id": 0})
        if family:
            update_dict["family_name"] = family["name"]
    
    result = await db.menu_categories.update_one({"id": category_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    
    category = await db.menu_categories.find_one({"id": category_id}, {"_id": 0})
    return serialize_doc(category)

@api_router.delete("/menu/categories-full/{category_id}")
async def delete_menu_category(category_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.menu_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# ============== CURRENCIES ROUTES ==============

@api_router.get("/currencies", response_model=List[dict])
async def get_currencies(current_user: dict = Depends(get_current_user)):
    currencies = await db.currencies.find({}, {"_id": 0}).to_list(100)
    return [serialize_doc(c) for c in currencies]

@api_router.get("/currencies/active", response_model=dict)
async def get_active_currencies(current_user: dict = Depends(get_current_user)):
    reference = await db.currencies.find_one({"is_reference": True}, {"_id": 0})
    selling = await db.currencies.find_one({"is_selling": True}, {"_id": 0})
    return {
        "reference": serialize_doc(reference) if reference else None,
        "selling": serialize_doc(selling) if selling else None
    }

@api_router.post("/currencies", response_model=dict)
async def create_currency(currency_data: CurrencyCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # If this is reference currency, unset others
    if currency_data.is_reference:
        await db.currencies.update_many({}, {"$set": {"is_reference": False}})
    
    # If this is selling currency, unset others
    if currency_data.is_selling:
        await db.currencies.update_many({}, {"$set": {"is_selling": False}})
    
    currency = Currency(**currency_data.model_dump())
    currency_dict = currency.model_dump()
    currency_dict["created_at"] = currency_dict["created_at"].isoformat()
    await db.currencies.insert_one(currency_dict)
    return serialize_doc(currency_dict)

@api_router.put("/currencies/{currency_id}", response_model=dict)
async def update_currency(currency_id: str, update_data: CurrencyUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    # If setting as reference, unset others
    if update_dict.get("is_reference"):
        await db.currencies.update_many({"id": {"$ne": currency_id}}, {"$set": {"is_reference": False}})
    
    # If setting as selling, unset others
    if update_dict.get("is_selling"):
        await db.currencies.update_many({"id": {"$ne": currency_id}}, {"$set": {"is_selling": False}})
    
    result = await db.currencies.update_one({"id": currency_id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    currency = await db.currencies.find_one({"id": currency_id}, {"_id": 0})
    return serialize_doc(currency)

@api_router.delete("/currencies/{currency_id}")
async def delete_currency(currency_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    currency = await db.currencies.find_one({"id": currency_id}, {"_id": 0})
    if currency and (currency.get("is_reference") or currency.get("is_selling")):
        raise HTTPException(status_code=400, detail="Cannot delete active reference or selling currency")
    
    result = await db.currencies.delete_one({"id": currency_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Currency not found")
    return {"message": "Currency deleted"}

@api_router.post("/currencies/convert", response_model=dict)
async def convert_currency(amount: float, from_code: str, to_code: str, current_user: dict = Depends(get_current_user)):
    """Convert amount from one currency to another"""
    from_currency = await db.currencies.find_one({"code": from_code}, {"_id": 0})
    to_currency = await db.currencies.find_one({"code": to_code}, {"_id": 0})
    
    if not from_currency or not to_currency:
        raise HTTPException(status_code=404, detail="Currency not found")
    
    # Convert to reference first, then to target
    reference_amount = amount / from_currency["exchange_rate"]
    target_amount = reference_amount * to_currency["exchange_rate"]
    
    return {
        "from_amount": amount,
        "from_currency": from_code,
        "to_amount": round(target_amount, to_currency["decimal_places"]),
        "to_currency": to_code,
        "exchange_rate": to_currency["exchange_rate"] / from_currency["exchange_rate"]
    }

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

# ============== PRINTING ROUTES (ESC/POS) ==============

from printer_service import printer_service, PrinterConfig, PrinterType

@api_router.post("/printers/{printer_id}/test")
async def test_printer_connection(printer_id: str, current_user: dict = Depends(get_current_user)):
    """Test connection to a printer"""
    printer = await db.printers.find_one({"id": printer_id}, {"_id": 0})
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    # Register printer with service if not already
    config = PrinterConfig(
        name=printer["name"],
        ip_address=printer["ip_address"],
        port=printer.get("port", 9100),
        printer_type=PrinterType.NETWORK
    )
    printer_service.add_printer(printer_id, config)
    
    # Check status
    status = await printer_service.check_printer_status(printer_id)
    
    # Update printer status in database
    new_status = "online" if status["status"] == "online" else "offline"
    await db.printers.update_one({"id": printer_id}, {"$set": {"status": new_status}})
    
    return status

@api_router.post("/printers/{printer_id}/print-test")
async def print_test_page(printer_id: str, current_user: dict = Depends(get_current_user)):
    """Print a test page"""
    printer = await db.printers.find_one({"id": printer_id}, {"_id": 0})
    if not printer:
        raise HTTPException(status_code=404, detail="Printer not found")
    
    # Register printer
    config = PrinterConfig(
        name=printer["name"],
        ip_address=printer["ip_address"],
        port=printer.get("port", 9100),
        printer_type=PrinterType.NETWORK
    )
    printer_service.add_printer(printer_id, config)
    
    # Create test ticket
    test_ticket = printer_service.create_kitchen_ticket(
        order_number=0,
        table_number=0,
        server_name="TEST",
        items=[
            {"quantity": 1, "menu_item_name": "Test Article 1"},
            {"quantity": 2, "menu_item_name": "Test Article 2", "notes": "Note de test"},
        ],
        notes="Ceci est un test d'impression"
    )
    
    # Print
    result = await printer_service.print_raw(printer_id, test_ticket)
    
    if result["success"]:
        return {"message": "Test page printed successfully", "printer": printer["name"]}
    else:
        raise HTTPException(status_code=500, detail=result.get("error", "Print failed"))

@api_router.post("/print-jobs/{job_id}/print")
async def execute_print_job(job_id: str, current_user: dict = Depends(get_current_user)):
    """Execute a pending print job and send to printer"""
    job = await db.print_jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Print job not found")
    
    printer_id = job.get("printer_id", "default")
    
    # Get printer config
    printer = await db.printers.find_one({"id": printer_id}, {"_id": 0})
    if not printer:
        # Try to get any online printer for this department
        printer = await db.printers.find_one(
            {"department": job["department"], "status": "online"},
            {"_id": 0}
        )
    
    if not printer:
        # Mark job as failed
        await db.print_jobs.update_one({"id": job_id}, {"$set": {"status": "no_printer"}})
        return {"success": False, "error": "No printer available for this department"}
    
    # Register printer
    config = PrinterConfig(
        name=printer["name"],
        ip_address=printer["ip_address"],
        port=printer.get("port", 9100),
        printer_type=PrinterType.NETWORK
    )
    printer_service.add_printer(printer["id"], config)
    
    # Generate ticket based on department
    if job["department"] == "kitchen":
        ticket_data = printer_service.create_kitchen_ticket(
            order_number=job["order_number"],
            table_number=job["table_number"],
            server_name=job["server_name"],
            items=job["items"],
            notes=job.get("notes", "")
        )
    else:  # bar
        ticket_data = printer_service.create_bar_ticket(
            order_number=job["order_number"],
            table_number=job["table_number"],
            server_name=job["server_name"],
            items=job["items"],
            notes=job.get("notes", "")
        )
    
    # Print
    result = await printer_service.print_raw(printer["id"], ticket_data)
    
    # Update job status
    new_status = "printed" if result["success"] else "failed"
    await db.print_jobs.update_one(
        {"id": job_id},
        {"$set": {"status": new_status, "printed_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return result

@api_router.post("/orders/{order_id}/print-receipt")
async def print_order_receipt(order_id: str, printer_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Print a customer receipt for an order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get printer
    if printer_id:
        printer = await db.printers.find_one({"id": printer_id}, {"_id": 0})
    else:
        # Get any online printer (preferably cashier printer)
        printer = await db.printers.find_one({"status": "online"}, {"_id": 0})
    
    if not printer:
        return {"success": False, "error": "No printer available"}
    
    # Register printer
    config = PrinterConfig(
        name=printer["name"],
        ip_address=printer["ip_address"],
        port=printer.get("port", 9100),
        printer_type=PrinterType.NETWORK
    )
    printer_service.add_printer(printer["id"], config)
    
    # Get currency for formatting
    selling_currency = await db.currencies.find_one({"is_selling": True}, {"_id": 0})
    currency_symbol = selling_currency["symbol"] if selling_currency else "FC"
    
    # Create receipt
    receipt_data = printer_service.create_receipt(
        order_number=order["order_number"],
        table_number=order["table_number"],
        server_name=order["server_name"],
        items=order["items"],
        subtotal=order.get("total", 0),
        total=order.get("total", 0),
        currency_symbol=currency_symbol,
        restaurant_name="LUMIÈRE RESTAURANT"
    )
    
    # Print
    result = await printer_service.print_raw(printer["id"], receipt_data)
    return result

@api_router.post("/reports/daily-close/print")
async def print_daily_close_report(printer_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Print the daily close report"""
    if current_user["role"] not in [UserRole.ADMIN, UserRole.CASHIER]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    today = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Get daily stats
    payments = await db.payments.find(
        {"created_at": {"$gte": today.isoformat()}},
        {"_id": 0}
    ).to_list(10000)
    
    orders = await db.orders.find(
        {"created_at": {"$gte": today.isoformat()}, "status": {"$ne": "cancelled"}},
        {"_id": 0}
    ).to_list(10000)
    
    # Calculate totals
    total_revenue = sum(p["amount"] for p in payments)
    order_count = len(orders)
    
    # Payment breakdown
    payment_breakdown = {}
    for p in payments:
        method = p["method"]
        payment_breakdown[method] = payment_breakdown.get(method, 0) + p["amount"]
    
    # Department breakdown
    department_breakdown = {"kitchen": 0, "bar": 0}
    for order in orders:
        for item in order.get("items", []):
            dept = item.get("department", "kitchen")
            amount = item["quantity"] * item["unit_price"]
            department_breakdown[dept] = department_breakdown.get(dept, 0) + amount
    
    # Get printer
    if printer_id:
        printer = await db.printers.find_one({"id": printer_id}, {"_id": 0})
    else:
        printer = await db.printers.find_one({"status": "online"}, {"_id": 0})
    
    if not printer:
        return {"success": False, "error": "No printer available"}
    
    # Register printer
    config = PrinterConfig(
        name=printer["name"],
        ip_address=printer["ip_address"],
        port=printer.get("port", 9100),
        printer_type=PrinterType.NETWORK
    )
    printer_service.add_printer(printer["id"], config)
    
    # Get currency
    selling_currency = await db.currencies.find_one({"is_selling": True}, {"_id": 0})
    currency_symbol = selling_currency["symbol"] if selling_currency else "FC"
    
    # Create report
    report_data = printer_service.create_daily_close_report(
        date=today.strftime('%d/%m/%Y'),
        total_revenue=total_revenue,
        order_count=order_count,
        payment_breakdown=payment_breakdown,
        department_breakdown=department_breakdown,
        currency_symbol=currency_symbol
    )
    
    # Print
    result = await printer_service.print_raw(printer["id"], report_data)
    return result

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

# ============== RESTAURANT SETTINGS ROUTES ==============

@api_router.get("/settings/restaurant")
async def get_restaurant_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.restaurant_settings.find_one({"id": "restaurant_settings"}, {"_id": 0})
    if not settings:
        # Create default settings
        default = RestaurantSettings()
        await db.restaurant_settings.insert_one(default.model_dump())
        return default.model_dump()
    return settings

@api_router.put("/settings/restaurant")
async def update_restaurant_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings["id"] = "restaurant_settings"
    settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.restaurant_settings.update_one(
        {"id": "restaurant_settings"},
        {"$set": settings},
        upsert=True
    )
    return await db.restaurant_settings.find_one({"id": "restaurant_settings"}, {"_id": 0})

# ============== RESERVATION ROUTES ==============

@api_router.get("/reservations")
async def get_reservations(date: str = None, status: str = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if date:
        query["date"] = date
    if status:
        query["status"] = status
    
    reservations = await db.reservations.find(query, {"_id": 0}).sort("date", 1).sort("time", 1).to_list(1000)
    return reservations

@api_router.post("/reservations")
async def create_reservation(data: ReservationCreate, current_user: dict = Depends(get_current_user)):
    # Get table info
    table = await db.tables.find_one({"id": data.table_id}, {"_id": 0})
    if not table:
        raise HTTPException(status_code=404, detail="Table not found")
    
    # Check for conflicts
    existing = await db.reservations.find_one({
        "table_id": data.table_id,
        "date": data.date,
        "time": data.time,
        "status": {"$in": ["pending", "confirmed"]}
    })
    if existing:
        raise HTTPException(status_code=400, detail="Table already reserved for this time")
    
    reservation = Reservation(
        **data.model_dump(),
        table_number=table["number"]
    )
    await db.reservations.insert_one(reservation.model_dump())
    return reservation.model_dump()

@api_router.put("/reservations/{reservation_id}")
async def update_reservation(reservation_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    data.pop("id", None)
    data.pop("_id", None)
    
    result = await db.reservations.update_one({"id": reservation_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    return await db.reservations.find_one({"id": reservation_id}, {"_id": 0})

@api_router.delete("/reservations/{reservation_id}")
async def delete_reservation(reservation_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.reservations.delete_one({"id": reservation_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    return {"message": "Reservation deleted"}

@api_router.put("/reservations/{reservation_id}/status")
async def update_reservation_status(reservation_id: str, status: str, current_user: dict = Depends(get_current_user)):
    if status not in ["pending", "confirmed", "cancelled", "completed", "no_show"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.reservations.update_one({"id": reservation_id}, {"$set": {"status": status}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Reservation not found")
    
    return await db.reservations.find_one({"id": reservation_id}, {"_id": 0})

# ============== LOYALTY PROGRAM ROUTES ==============

@api_router.get("/loyalty/settings")
async def get_loyalty_settings(current_user: dict = Depends(get_current_user)):
    settings = await db.loyalty_settings.find_one({"id": "loyalty_settings"}, {"_id": 0})
    if not settings:
        default = LoyaltySettings()
        await db.loyalty_settings.insert_one(default.model_dump())
        return default.model_dump()
    return settings

@api_router.put("/loyalty/settings")
async def update_loyalty_settings(settings: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    settings["id"] = "loyalty_settings"
    settings["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.loyalty_settings.update_one({"id": "loyalty_settings"}, {"$set": settings}, upsert=True)
    return await db.loyalty_settings.find_one({"id": "loyalty_settings"}, {"_id": 0})

@api_router.get("/loyalty/customers")
async def get_loyalty_customers(search: str = None, current_user: dict = Depends(get_current_user)):
    query = {}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]
    customers = await db.loyalty_customers.find(query, {"_id": 0}).sort("points", -1).to_list(1000)
    return customers

@api_router.post("/loyalty/customers")
async def create_loyalty_customer(data: dict, current_user: dict = Depends(get_current_user)):
    # Check if phone already exists
    existing = await db.loyalty_customers.find_one({"phone": data["phone"]})
    if existing:
        raise HTTPException(status_code=400, detail="Customer with this phone already exists")
    
    # Get welcome bonus
    settings = await db.loyalty_settings.find_one({"id": "loyalty_settings"}, {"_id": 0})
    welcome_bonus = settings.get("welcome_bonus", 10) if settings else 10
    
    customer = LoyaltyCustomer(
        name=data["name"],
        phone=data["phone"],
        email=data.get("email", ""),
        points=welcome_bonus
    )
    await db.loyalty_customers.insert_one(customer.model_dump())
    
    # Record welcome bonus transaction
    if welcome_bonus > 0:
        transaction = LoyaltyTransaction(
            customer_id=customer.id,
            points_earned=welcome_bonus,
            description="Bonus de bienvenue"
        )
        await db.loyalty_transactions.insert_one(transaction.model_dump())
    
    return customer.model_dump()

@api_router.get("/loyalty/customers/{customer_id}")
async def get_loyalty_customer(customer_id: str, current_user: dict = Depends(get_current_user)):
    customer = await db.loyalty_customers.find_one({"id": customer_id}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@api_router.get("/loyalty/customers/phone/{phone}")
async def get_loyalty_customer_by_phone(phone: str, current_user: dict = Depends(get_current_user)):
    customer = await db.loyalty_customers.find_one({"phone": phone}, {"_id": 0})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    return customer

@api_router.post("/loyalty/customers/{customer_id}/add-points")
async def add_loyalty_points(customer_id: str, amount: float, order_id: str = "", current_user: dict = Depends(get_current_user)):
    customer = await db.loyalty_customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    # Get settings
    settings = await db.loyalty_settings.find_one({"id": "loyalty_settings"}, {"_id": 0})
    currency_per_point = settings.get("currency_per_point", 100) if settings else 100
    points_per_unit = settings.get("points_per_unit", 1) if settings else 1
    
    # Calculate points
    points_earned = int((amount / currency_per_point) * points_per_unit)
    
    if points_earned > 0:
        # Update customer
        await db.loyalty_customers.update_one(
            {"id": customer_id},
            {
                "$inc": {"points": points_earned, "total_spent": amount, "visit_count": 1},
                "$set": {"last_visit": datetime.now(timezone.utc).isoformat()}
            }
        )
        
        # Record transaction
        transaction = LoyaltyTransaction(
            customer_id=customer_id,
            order_id=order_id,
            points_earned=points_earned,
            amount=amount,
            description=f"Achat de {amount} FC"
        )
        await db.loyalty_transactions.insert_one(transaction.model_dump())
    
    return await db.loyalty_customers.find_one({"id": customer_id}, {"_id": 0})

@api_router.post("/loyalty/customers/{customer_id}/redeem")
async def redeem_loyalty_points(customer_id: str, points: int, reward_id: str = "", current_user: dict = Depends(get_current_user)):
    customer = await db.loyalty_customers.find_one({"id": customer_id})
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")
    
    if customer["points"] < points:
        raise HTTPException(status_code=400, detail="Insufficient points")
    
    # Update customer
    await db.loyalty_customers.update_one(
        {"id": customer_id},
        {"$inc": {"points": -points}}
    )
    
    # Record transaction
    transaction = LoyaltyTransaction(
        customer_id=customer_id,
        points_spent=points,
        description=f"Échange de {points} points"
    )
    await db.loyalty_transactions.insert_one(transaction.model_dump())
    
    return await db.loyalty_customers.find_one({"id": customer_id}, {"_id": 0})

@api_router.get("/loyalty/rewards")
async def get_loyalty_rewards(current_user: dict = Depends(get_current_user)):
    rewards = await db.loyalty_rewards.find({}, {"_id": 0}).to_list(100)
    return rewards

@api_router.post("/loyalty/rewards")
async def create_loyalty_reward(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    reward = LoyaltyReward(**data)
    await db.loyalty_rewards.insert_one(reward.model_dump())
    return reward.model_dump()

@api_router.delete("/loyalty/rewards/{reward_id}")
async def delete_loyalty_reward(reward_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.loyalty_rewards.delete_one({"id": reward_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Reward not found")
    return {"message": "Reward deleted"}

# ============== INGREDIENTS & RECIPES ROUTES ==============

@api_router.get("/ingredients")
async def get_ingredients(current_user: dict = Depends(get_current_user)):
    ingredients = await db.ingredients.find({}, {"_id": 0}).to_list(1000)
    return ingredients

@api_router.post("/ingredients")
async def create_ingredient(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    ingredient = Ingredient(**data)
    await db.ingredients.insert_one(ingredient.model_dump())
    return ingredient.model_dump()

@api_router.put("/ingredients/{ingredient_id}")
async def update_ingredient(ingredient_id: str, data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    data.pop("id", None)
    data.pop("_id", None)
    
    result = await db.ingredients.update_one({"id": ingredient_id}, {"$set": data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    return await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})

@api_router.delete("/ingredients/{ingredient_id}")
async def delete_ingredient(ingredient_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.ingredients.delete_one({"id": ingredient_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    return {"message": "Ingredient deleted"}

@api_router.post("/ingredients/{ingredient_id}/adjust-stock")
async def adjust_ingredient_stock(ingredient_id: str, quantity_change: float, reason: str = "", current_user: dict = Depends(get_current_user)):
    result = await db.ingredients.update_one(
        {"id": ingredient_id},
        {"$inc": {"quantity_in_stock": quantity_change}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Ingredient not found")
    
    return await db.ingredients.find_one({"id": ingredient_id}, {"_id": 0})

@api_router.get("/recipes")
async def get_recipes(current_user: dict = Depends(get_current_user)):
    recipes = await db.recipes.find({}, {"_id": 0}).to_list(1000)
    return recipes

@api_router.get("/recipes/menu-item/{menu_item_id}")
async def get_recipe_by_menu_item(menu_item_id: str, current_user: dict = Depends(get_current_user)):
    recipe = await db.recipes.find_one({"menu_item_id": menu_item_id}, {"_id": 0})
    return recipe

@api_router.post("/recipes")
async def create_recipe(data: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Check if recipe already exists for this menu item
    existing = await db.recipes.find_one({"menu_item_id": data["menu_item_id"]})
    if existing:
        # Update existing recipe
        await db.recipes.update_one({"menu_item_id": data["menu_item_id"]}, {"$set": data})
        return await db.recipes.find_one({"menu_item_id": data["menu_item_id"]}, {"_id": 0})
    
    # Get menu item name
    menu_item = await db.menu_items.find_one({"id": data["menu_item_id"]}, {"_id": 0})
    if menu_item:
        data["menu_item_name"] = menu_item["name"]
    
    recipe = Recipe(**data)
    await db.recipes.insert_one(recipe.model_dump())
    return recipe.model_dump()

@api_router.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin access required")
    
    result = await db.recipes.delete_one({"id": recipe_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return {"message": "Recipe deleted"}

# Function to deduct ingredients when order is completed
async def deduct_ingredients_for_order(order_id: str):
    """Deduct ingredients from stock based on order items"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        return
    
    for item in order.get("items", []):
        recipe = await db.recipes.find_one({"menu_item_id": item.get("menu_item_id"), "is_active": True})
        if recipe:
            quantity = item.get("quantity", 1)
            for ingredient in recipe.get("ingredients", []):
                # Deduct from stock
                await db.ingredients.update_one(
                    {"id": ingredient["ingredient_id"]},
                    {"$inc": {"quantity_in_stock": -ingredient["quantity"] * quantity}}
                )

# ============== ORDER FUSION/SPLIT ROUTES ==============

@api_router.post("/orders/merge")
async def merge_orders(req: MergeOrdersRequest, current_user: dict = Depends(get_current_user)):
    """Merge multiple orders into one"""
    order_ids = req.order_ids
    target_table_id = req.target_table_id
    if len(order_ids) < 2:
        raise HTTPException(status_code=400, detail="At least 2 orders required for merge")
    
    # Get all orders
    orders = await db.orders.find({"id": {"$in": order_ids}}, {"_id": 0}).to_list(100)
    if len(orders) != len(order_ids):
        raise HTTPException(status_code=404, detail="One or more orders not found")
    
    # Get target table
    target_table = await db.tables.find_one({"id": target_table_id}, {"_id": 0})
    if not target_table:
        raise HTTPException(status_code=404, detail="Target table not found")
    
    # Merge all items
    merged_items = []
    total = 0
    for order in orders:
        merged_items.extend(order.get("items", []))
        total += order.get("total", 0)
    
    # Create new merged order
    new_order_number = await get_next_order_number()
    merged_order = {
        "id": str(uuid.uuid4()),
        "order_number": new_order_number,
        "table_id": target_table_id,
        "table_number": target_table["number"],
        "server_id": current_user["id"],
        "server_name": current_user["full_name"],
        "items": merged_items,
        "total": total,
        "status": "pending",
        "notes": f"Fusion des commandes: {', '.join([str(o['order_number']) for o in orders])}",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "merged_from": order_ids
    }
    
    await db.orders.insert_one(merged_order)
    
    # Mark original orders as merged
    for order_id in order_ids:
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"status": "merged", "merged_into": merged_order["id"]}}
        )
    
    # Free up original tables except target
    for order in orders:
        if order["table_id"] != target_table_id:
            await db.tables.update_one({"id": order["table_id"]}, {"$set": {"status": "free"}})
    
    merged_order.pop("_id", None)
    return merged_order

@api_router.post("/orders/{order_id}/split")
async def split_order(order_id: str, req: SplitOrderRequest, current_user: dict = Depends(get_current_user)):
    """
    Split an order into multiple orders
    split_type: 'by_items' or 'equal'
    split_data for 'by_items': {"parts": [{"item_ids": [...], "table_id": "..."}, ...]}
    split_data for 'equal': {"num_parts": 2, "table_ids": ["...", "..."]}
    """
    split_type = req.split_type
    split_data = req.split_data
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    new_orders = []
    
    if split_type == "by_items":
        # Split by specific items
        parts = split_data.get("parts", [])
        for part in parts:
            item_ids = part.get("item_ids", [])
            table_id = part.get("table_id", order["table_id"])
            
            # Get table
            table = await db.tables.find_one({"id": table_id}, {"_id": 0})
            if not table:
                continue
            
            # Get items for this part
            part_items = [item for item in order["items"] if item["id"] in item_ids]
            if not part_items:
                continue
            
            # Calculate total
            part_total = sum(item["quantity"] * item["unit_price"] for item in part_items)
            
            # Create new order
            new_order_number = await get_next_order_number()
            new_order = {
                "id": str(uuid.uuid4()),
                "order_number": new_order_number,
                "table_id": table_id,
                "table_number": table["number"],
                "server_id": current_user["id"],
                "server_name": current_user["full_name"],
                "items": part_items,
                "total": part_total,
                "status": "pending",
                "notes": f"Division de la commande #{order['order_number']}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "split_from": order_id
            }
            await db.orders.insert_one(new_order)
            new_order.pop("_id", None)
            new_orders.append(new_order)
            
            # Update table status
            await db.tables.update_one({"id": table_id}, {"$set": {"status": "occupied"}})
    
    elif split_type == "equal":
        # Split equally
        num_parts = split_data.get("num_parts", 2)
        table_ids = split_data.get("table_ids", [order["table_id"]] * num_parts)
        
        # Calculate equal amount
        total = order.get("total", 0)
        amount_per_part = total / num_parts
        
        for i, table_id in enumerate(table_ids[:num_parts]):
            table = await db.tables.find_one({"id": table_id}, {"_id": 0})
            if not table:
                continue
            
            new_order_number = await get_next_order_number()
            new_order = {
                "id": str(uuid.uuid4()),
                "order_number": new_order_number,
                "table_id": table_id,
                "table_number": table["number"],
                "server_id": current_user["id"],
                "server_name": current_user["full_name"],
                "items": order["items"] if i == 0 else [],  # Items only on first split
                "total": amount_per_part,
                "status": "pending",
                "notes": f"Division égale #{i+1}/{num_parts} de la commande #{order['order_number']}",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "split_from": order_id,
                "is_equal_split": True
            }
            await db.orders.insert_one(new_order)
            new_order.pop("_id", None)
            new_orders.append(new_order)
            
            await db.tables.update_one({"id": table_id}, {"$set": {"status": "occupied"}})
    
    # Mark original order as split
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"status": "split", "split_into": [o["id"] for o in new_orders]}}
    )
    
    return {"original_order": order_id, "new_orders": new_orders}

# Helper to get next order number
async def get_next_order_number():
    counter = await db.counters.find_one_and_update(
        {"_id": "order_number"},
        {"$inc": {"seq": 1}},
        upsert=True,
        return_document=True
    )
    return counter["seq"]

# ============== INVOICE/RECEIPT GENERATION ==============

@api_router.post("/orders/{order_id}/close-table")
async def close_table_and_generate_invoice(order_id: str, payment_method: str = "cash", loyalty_customer_id: str = None, current_user: dict = Depends(get_current_user)):
    """Close a table and generate invoice"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Get restaurant settings
    settings = await db.restaurant_settings.find_one({"id": "restaurant_settings"}, {"_id": 0})
    if not settings:
        settings = RestaurantSettings().model_dump()
    
    # Get currency
    selling_currency = await db.currencies.find_one({"is_selling": True}, {"_id": 0})
    currency_symbol = selling_currency["symbol"] if selling_currency else "FC"
    
    # Create payment record
    payment = {
        "id": str(uuid.uuid4()),
        "order_id": order_id,
        "amount": order["total"],
        "method": payment_method,
        "cashier_id": current_user["id"],
        "cashier_name": current_user["full_name"],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.payments.insert_one(payment)
    
    # Update order status
    await db.orders.update_one({"id": order_id}, {"$set": {"status": "paid", "paid_at": datetime.now(timezone.utc).isoformat()}})
    
    # Free up the table
    await db.tables.update_one({"id": order["table_id"]}, {"$set": {"status": "cleaning"}})
    
    # Deduct ingredients if recipes exist
    await deduct_ingredients_for_order(order_id)
    
    # Add loyalty points if customer provided
    if loyalty_customer_id:
        await add_loyalty_points(loyalty_customer_id, order["total"], order_id, current_user)
    
    # Generate invoice number
    invoice_number = f"FAC-{datetime.now().strftime('%Y%m%d')}-{order['order_number']:04d}"
    
    # Create invoice record
    invoice = {
        "id": str(uuid.uuid4()),
        "invoice_number": invoice_number,
        "order_id": order_id,
        "order_number": order["order_number"],
        "table_number": order["table_number"],
        "items": order["items"],
        "subtotal": order["total"],
        "total": order["total"],
        "payment_method": payment_method,
        "currency_symbol": currency_symbol,
        "restaurant": settings,
        "server_name": order["server_name"],
        "cashier_name": current_user["full_name"],
        "loyalty_customer_id": loyalty_customer_id,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.invoices.insert_one(invoice)
    
    invoice.pop("_id", None)
    return invoice

@api_router.get("/invoices/{invoice_id}")
async def get_invoice(invoice_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"id": invoice_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@api_router.get("/invoices/order/{order_id}")
async def get_invoice_by_order(order_id: str, current_user: dict = Depends(get_current_user)):
    invoice = await db.invoices.find_one({"order_id": order_id}, {"_id": 0})
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

# ============== PDF REPORTS ROUTES ==============

from io import BytesIO
from fastapi.responses import StreamingResponse

@api_router.get("/reports/daily-sales")
async def get_daily_sales_report(date: str = None, current_user: dict = Depends(get_current_user)):
    """Get daily sales report data"""
    if not date:
        date = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    
    start = datetime.fromisoformat(f"{date}T00:00:00+00:00")
    end = datetime.fromisoformat(f"{date}T23:59:59+00:00")
    
    # Get orders
    orders = await db.orders.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "status": {"$nin": ["cancelled", "merged", "split"]}
    }, {"_id": 0}).to_list(10000)
    
    # Get payments
    payments = await db.payments.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Calculate totals
    total_revenue = sum(p["amount"] for p in payments)
    order_count = len(orders)
    
    # By payment method
    by_method = {}
    for p in payments:
        method = p["method"]
        by_method[method] = by_method.get(method, 0) + p["amount"]
    
    # By department
    by_department = {"kitchen": 0, "bar": 0}
    for order in orders:
        for item in order.get("items", []):
            dept = item.get("department", "kitchen")
            by_department[dept] = by_department.get(dept, 0) + item["quantity"] * item["unit_price"]
    
    # Top items
    item_sales = {}
    for order in orders:
        for item in order.get("items", []):
            name = item.get("menu_item_name", "Unknown")
            if name not in item_sales:
                item_sales[name] = {"quantity": 0, "revenue": 0}
            item_sales[name]["quantity"] += item["quantity"]
            item_sales[name]["revenue"] += item["quantity"] * item["unit_price"]
    
    top_items = sorted(
        [{"name": k, **v} for k, v in item_sales.items()],
        key=lambda x: x["revenue"],
        reverse=True
    )[:10]
    
    # Hourly breakdown
    hourly = {}
    for order in orders:
        hour = datetime.fromisoformat(order["created_at"].replace("Z", "+00:00")).hour
        hourly[hour] = hourly.get(hour, 0) + order.get("total", 0)
    
    return {
        "date": date,
        "total_revenue": total_revenue,
        "order_count": order_count,
        "average_order": total_revenue / order_count if order_count > 0 else 0,
        "by_payment_method": by_method,
        "by_department": by_department,
        "top_items": top_items,
        "hourly_sales": [{"hour": h, "amount": a} for h, a in sorted(hourly.items())]
    }

@api_router.get("/reports/period-sales")
async def get_period_sales_report(start_date: str, end_date: str, current_user: dict = Depends(get_current_user)):
    """Get sales report for a period"""
    start = datetime.fromisoformat(f"{start_date}T00:00:00+00:00")
    end = datetime.fromisoformat(f"{end_date}T23:59:59+00:00")
    
    # Get payments
    payments = await db.payments.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()}
    }, {"_id": 0}).to_list(10000)
    
    # Get orders
    orders = await db.orders.find({
        "created_at": {"$gte": start.isoformat(), "$lte": end.isoformat()},
        "status": {"$nin": ["cancelled", "merged", "split"]}
    }, {"_id": 0}).to_list(10000)
    
    # Daily breakdown
    daily = {}
    for p in payments:
        day = p["created_at"][:10]
        if day not in daily:
            daily[day] = {"revenue": 0, "orders": 0}
        daily[day]["revenue"] += p["amount"]
    
    for o in orders:
        day = o["created_at"][:10]
        if day in daily:
            daily[day]["orders"] += 1
    
    total_revenue = sum(p["amount"] for p in payments)
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "total_revenue": total_revenue,
        "total_orders": len(orders),
        "daily_breakdown": [{"date": k, **v} for k, v in sorted(daily.items())]
    }

@api_router.get("/reports/stock")
async def get_stock_report(current_user: dict = Depends(get_current_user)):
    """Get stock status report"""
    # Get all stock items
    stock_items = await db.stock_items.find({}, {"_id": 0}).to_list(1000)
    
    # Get ingredients
    ingredients = await db.ingredients.find({}, {"_id": 0}).to_list(1000)
    
    # Get bottles
    bottles = await db.bottles.find({}, {"_id": 0}).to_list(1000)
    
    # Calculate alerts
    stock_alerts = [s for s in stock_items if s.get("quantity", 0) <= s.get("alert_threshold", 10)]
    ingredient_alerts = [i for i in ingredients if i.get("quantity_in_stock", 0) <= i.get("alert_threshold", 10)]
    bottle_alerts = [b for b in bottles if b.get("quantity_in_stock", 0) <= b.get("alert_threshold", 2)]
    
    # Calculate total value
    stock_value = sum(s.get("quantity", 0) * s.get("unit_price", 0) for s in stock_items)
    ingredient_value = sum(i.get("quantity_in_stock", 0) * i.get("cost_per_unit", 0) for i in ingredients)
    
    return {
        "stock_items": stock_items,
        "ingredients": ingredients,
        "bottles": bottles,
        "stock_alerts": stock_alerts,
        "ingredient_alerts": ingredient_alerts,
        "bottle_alerts": bottle_alerts,
        "total_stock_value": stock_value,
        "total_ingredient_value": ingredient_value,
        "generated_at": datetime.now(timezone.utc).isoformat()
    }

# ============== SEED DATA ==============

@api_router.post("/seed", response_model=dict)
async def seed_database():
    """Seed database with initial data for testing"""
    
    # Clear existing data
    await db.users.delete_many({})
    await db.tables.delete_many({})
    await db.menu_items.delete_many({})
    await db.menu_families.delete_many({})
    await db.menu_categories.delete_many({})
    await db.currencies.delete_many({})
    await db.printers.delete_many({})
    await db.counters.delete_many({})
    
    # Create currencies - Aucune devise n'est définie par défaut comme référence ou vente
    # L'utilisateur doit choisir sa devise de référence et de vente
    currencies_data = [
        {"code": "USD", "name": "Dollar américain", "symbol": "$", "decimal_places": 2, "is_reference": False, "is_selling": False, "exchange_rate": 1.0},
        {"code": "EUR", "name": "Euro", "symbol": "€", "decimal_places": 2, "is_reference": False, "is_selling": False, "exchange_rate": 0.92},
        {"code": "XOF", "name": "Franc CFA (BCEAO)", "symbol": "FCFA", "decimal_places": 0, "is_reference": False, "is_selling": False, "exchange_rate": 605.0},
        {"code": "XAF", "name": "Franc CFA (BEAC)", "symbol": "FCFA", "decimal_places": 0, "is_reference": False, "is_selling": False, "exchange_rate": 605.0},
        {"code": "CDF", "name": "Franc congolais", "symbol": "FC", "decimal_places": 2, "is_reference": False, "is_selling": False, "exchange_rate": 2750.0},
        {"code": "GNF", "name": "Franc guinéen", "symbol": "GNF", "decimal_places": 0, "is_reference": False, "is_selling": False, "exchange_rate": 8600.0},
        {"code": "MAD", "name": "Dirham marocain", "symbol": "DH", "decimal_places": 2, "is_reference": False, "is_selling": False, "exchange_rate": 10.0},
        {"code": "TND", "name": "Dinar tunisien", "symbol": "DT", "decimal_places": 3, "is_reference": False, "is_selling": False, "exchange_rate": 3.1},
        {"code": "NGN", "name": "Naira nigérian", "symbol": "₦", "decimal_places": 2, "is_reference": False, "is_selling": False, "exchange_rate": 1550.0},
        {"code": "GBP", "name": "Livre sterling", "symbol": "£", "decimal_places": 2, "is_reference": False, "is_selling": False, "exchange_rate": 0.79},
    ]
    
    for c_data in currencies_data:
        currency = Currency(**c_data)
        currency_dict = currency.model_dump()
        currency_dict["created_at"] = currency_dict["created_at"].isoformat()
        await db.currencies.insert_one(currency_dict)
    
    # Create menu families
    families_data = [
        {"id": "fam-cuisine", "name": "Cuisine", "description": "Plats préparés en cuisine", "display_order": 1},
        {"id": "fam-bar", "name": "Bar", "description": "Boissons et cocktails", "display_order": 2},
    ]
    
    for f_data in families_data:
        family = MenuFamily(**f_data)
        family_dict = family.model_dump()
        family_dict["id"] = f_data["id"]
        family_dict["created_at"] = family_dict["created_at"].isoformat()
        await db.menu_families.insert_one(family_dict)
    
    # Create menu categories
    categories_data = [
        {"id": "cat-entrees", "name": "Entrées", "family_id": "fam-cuisine", "family_name": "Cuisine", "display_order": 1},
        {"id": "cat-plats", "name": "Plats", "family_id": "fam-cuisine", "family_name": "Cuisine", "display_order": 2},
        {"id": "cat-desserts", "name": "Desserts", "family_id": "fam-cuisine", "family_name": "Cuisine", "display_order": 3},
        {"id": "cat-boissons", "name": "Boissons", "family_id": "fam-bar", "family_name": "Bar", "display_order": 1},
        {"id": "cat-cocktails", "name": "Cocktails", "family_id": "fam-bar", "family_name": "Bar", "display_order": 2},
        {"id": "cat-vins", "name": "Vins", "family_id": "fam-bar", "family_name": "Bar", "display_order": 3},
        {"id": "cat-bieres", "name": "Bières", "family_id": "fam-bar", "family_name": "Bar", "display_order": 4},
        {"id": "cat-shots", "name": "Shots", "family_id": "fam-bar", "family_name": "Bar", "display_order": 5},
    ]
    
    for c_data in categories_data:
        category = MenuCategory(**c_data)
        category_dict = category.model_dump()
        category_dict["id"] = c_data["id"]
        category_dict["created_at"] = category_dict["created_at"].isoformat()
        await db.menu_categories.insert_one(category_dict)
    
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
    
    # Create menu items with family and category references
    menu_items_data = [
        # Entrées (Kitchen)
        {"name": "Salade César", "description": "Laitue romaine, parmesan, croûtons, sauce César maison", "price": 8500, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-entrees", "category": "Entrées", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1546793665-c74683f339c1?w=400"},
        {"name": "Soupe du jour", "description": "Préparée avec des légumes frais de saison", "price": 5000, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-entrees", "category": "Entrées", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400"},
        {"name": "Bruschetta", "description": "Pain grillé, tomates fraîches, basilic, huile d'olive", "price": 7000, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-entrees", "category": "Entrées", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1572695157366-5e585ab2b69f?w=400"},
        
        # Plats (Kitchen)
        {"name": "Steak Frites", "description": "Entrecôte 300g, frites maison, sauce au poivre", "price": 22000, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-plats", "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=400"},
        {"name": "Poulet Grillé", "description": "Poulet entier grillé aux herbes, légumes rôtis", "price": 18000, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-plats", "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400"},
        {"name": "Poisson du jour", "description": "Selon arrivage, accompagné de riz parfumé", "price": 20000, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-plats", "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400"},
        {"name": "Burger Gourmet", "description": "Bœuf 200g, cheddar, bacon, oignons caramélisés", "price": 15000, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-plats", "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400"},
        {"name": "Pâtes Carbonara", "description": "Spaghetti, guanciale, œuf, parmesan, poivre", "price": 14000, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-plats", "category": "Plats", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1612874742237-6526221588e3?w=400"},
        
        # Desserts (Kitchen)
        {"name": "Tiramisu", "description": "Recette traditionnelle au mascarpone et café", "price": 7500, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-desserts", "category": "Desserts", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400"},
        {"name": "Crème Brûlée", "description": "Vanille de Madagascar, sucre caramélisé", "price": 7000, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-desserts", "category": "Desserts", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1470324161839-ce2bb6fa6bc3?w=400"},
        {"name": "Fondant Chocolat", "description": "Cœur coulant, glace vanille", "price": 8000, "family_id": "fam-cuisine", "family_name": "Cuisine", "category_id": "cat-desserts", "category": "Desserts", "department": Department.KITCHEN, "image_url": "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=400"},
        
        # Boissons (Bar)
        {"name": "Coca-Cola", "description": "33cl", "price": 2000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-boissons", "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=400"},
        {"name": "Eau Minérale", "description": "50cl", "price": 1500, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-boissons", "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1548839140-29a749e1cf4d?w=400"},
        {"name": "Jus d'Orange", "description": "Pressé frais", "price": 3500, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-boissons", "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=400"},
        {"name": "Café Espresso", "description": "Simple ou double", "price": 2000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-boissons", "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1510591509098-f4fdc6d0ff04?w=400", "variants": ["Simple", "Double"]},
        {"name": "Thé", "description": "Vert, noir ou menthe", "price": 2500, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-boissons", "category": "Boissons", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1597318181409-cf64d0b5d8a2?w=400", "variants": ["Vert", "Noir", "Menthe"]},
        
        # Cocktails (Bar)
        {"name": "Mojito", "description": "Rhum, menthe fraîche, citron vert, sucre de canne", "price": 8000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-cocktails", "category": "Cocktails", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=400"},
        {"name": "Margarita", "description": "Tequila, triple sec, citron vert", "price": 9000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-cocktails", "category": "Cocktails", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1556855810-ac404aa91e85?w=400"},
        {"name": "Piña Colada", "description": "Rhum, lait de coco, ananas", "price": 8500, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-cocktails", "category": "Cocktails", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=400"},
        {"name": "Gin Tonic", "description": "Gin premium, tonic, citron", "price": 7500, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-cocktails", "category": "Cocktails", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1551751299-1b51cab2694c?w=400"},
        
        # Vins (Bar)
        {"name": "Vin Rouge Maison", "description": "Verre 15cl", "price": 5000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-vins", "category": "Vins", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=400"},
        {"name": "Vin Blanc Maison", "description": "Verre 15cl", "price": 5000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-vins", "category": "Vins", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1558001373-7b93ee48ffa0?w=400"},
        {"name": "Champagne", "description": "Coupe 12cl", "price": 12000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-vins", "category": "Vins", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1549918864-48ac978761a4?w=400"},
        
        # Bières (Bar)
        {"name": "Bière Blonde", "description": "33cl", "price": 3500, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-bieres", "category": "Bières", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1608270586620-248524c67de9?w=400"},
        {"name": "Bière Brune", "description": "33cl", "price": 4000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-bieres", "category": "Bières", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=400"},
        
        # Shots (Bar)
        {"name": "Tequila Shot", "description": "30ml", "price": 4000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-shots", "category": "Shots", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=400"},
        {"name": "Vodka Shot", "description": "30ml", "price": 3500, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-shots", "category": "Shots", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=400"},
        {"name": "Whisky Shot", "description": "30ml", "price": 5000, "family_id": "fam-bar", "family_name": "Bar", "category_id": "cat-shots", "category": "Shots", "department": Department.BAR, "image_url": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=400"},
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
    
    return {
        "message": "Database seeded successfully", 
        "admin_credentials": {"username": "admin", "password": "admin123"},
        "currencies": ["XOF (Reference/Selling)", "EUR", "USD", "XAF"],
        "families": ["Cuisine", "Bar"],
        "categories": ["Entrées", "Plats", "Desserts", "Boissons", "Cocktails", "Vins", "Bières", "Shots"]
    }

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
