from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
import re

# Twilio
from twilio.rest import Client as TwilioClient

# LLM Chat
from emergentintegrations.llm.chat import LlmChat, UserMessage

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_ALGORITHM = "HS256"

def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id, 
        "email": email, 
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id, 
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except:
        return None

# FastAPI App
app = FastAPI(title="Hyper-Gadgets E-Commerce API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# ===================== PYDANTIC MODELS =====================

class UserRegister(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str
    name: str

class UserLogin(BaseModel):
    identifier: str  # email or phone
    password: str

class UserResponse(BaseModel):
    id: str
    email: Optional[str]
    phone: Optional[str]
    name: str
    role: str
    addresses: List[dict] = []
    wishlist: List[str] = []
    created_at: str

class AddressCreate(BaseModel):
    label: str
    full_name: str
    phone: str
    address_line1: str
    address_line2: Optional[str] = ""
    city: str
    state: str
    postal_code: str
    country: str = "RDC"
    is_default: bool = False

class ProductCreate(BaseModel):
    name: str
    name_en: Optional[str] = None
    description: str
    description_en: Optional[str] = None
    price: float
    compare_price: Optional[float] = None
    category: str
    brand: str
    images: List[str]
    specifications: Dict[str, str] = {}
    stock: int = 0
    is_featured: bool = False
    is_new: bool = False

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    name_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    price: Optional[float] = None
    compare_price: Optional[float] = None
    category: Optional[str] = None
    brand: Optional[str] = None
    images: Optional[List[str]] = None
    specifications: Optional[Dict[str, str]] = None
    stock: Optional[int] = None
    is_featured: Optional[bool] = None
    is_new: Optional[bool] = None

class CartItem(BaseModel):
    product_id: str
    quantity: int

class CartUpdate(BaseModel):
    items: List[CartItem]

class OrderCreate(BaseModel):
    shipping_address: dict
    payment_method: str  # paypal, mobile_money, cod
    mobile_money_provider: Optional[str] = None  # airtel, mpesa, orange, africell
    promo_code: Optional[str] = None
    notes: Optional[str] = None

class ReviewCreate(BaseModel):
    product_id: str
    rating: int
    comment: str

class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str  # percentage, fixed
    discount_value: float
    min_order: float = 0
    max_uses: int = 100
    expires_at: Optional[str] = None

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class CategoryCreate(BaseModel):
    name: str
    name_en: Optional[str] = None
    slug: str
    image: Optional[str] = None
    description: Optional[str] = None

# ===================== AUTH ROUTES =====================

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    if not data.email and not data.phone:
        raise HTTPException(status_code=400, detail="Email or phone required")
    
    identifier = (data.email or "").lower() if data.email else data.phone
    
    # Check existing
    query = {"$or": []}
    if data.email:
        query["$or"].append({"email": data.email.lower()})
    if data.phone:
        query["$or"].append({"phone": data.phone})
    
    existing = await db.users.find_one(query)
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")
    
    user_doc = {
        "name": data.name,
        "password_hash": hash_password(data.password),
        "role": "customer",
        "addresses": [],
        "wishlist": [],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Only include email/phone if provided (sparse index requires absent field, not null)
    if data.email:
        user_doc["email"] = data.email.lower()
    if data.phone:
        user_doc["phone"] = data.phone
    
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)
    
    access_token = create_access_token(user_id, identifier)
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user_doc.get("email"),
        "phone": user_doc.get("phone"),
        "name": user_doc["name"],
        "role": user_doc["role"],
        "addresses": [],
        "wishlist": [],
        "created_at": user_doc["created_at"]
    }

@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response, request: Request):
    identifier = data.identifier.lower()
    client_ip = request.client.host if request.client else "unknown"
    lockout_key = f"{client_ip}:{identifier}"
    
    # Check brute force
    attempts = await db.login_attempts.find_one({"identifier": lockout_key})
    if attempts and attempts.get("count", 0) >= 5:
        lockout_until = attempts.get("lockout_until")
        if lockout_until and datetime.fromisoformat(lockout_until) > datetime.now(timezone.utc):
            raise HTTPException(status_code=429, detail="Too many attempts. Try again later.")
        else:
            await db.login_attempts.delete_one({"identifier": lockout_key})
    
    # Find user
    user = await db.users.find_one({
        "$or": [{"email": identifier}, {"phone": data.identifier}]
    })
    
    if not user or not verify_password(data.password, user["password_hash"]):
        # Increment failed attempts
        await db.login_attempts.update_one(
            {"identifier": lockout_key},
            {
                "$inc": {"count": 1},
                "$set": {"lockout_until": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat()}
            },
            upsert=True
        )
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Clear attempts on success
    await db.login_attempts.delete_one({"identifier": lockout_key})
    
    user_id = str(user["_id"])
    access_token = create_access_token(user_id, user.get("email") or user.get("phone", ""))
    refresh_token = create_refresh_token(user_id)
    
    response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=True, secure=False, samesite="lax", max_age=604800, path="/")
    
    return {
        "id": user_id,
        "email": user.get("email"),
        "phone": user.get("phone"),
        "name": user["name"],
        "role": user["role"],
        "addresses": user.get("addresses", []),
        "wishlist": [str(w) for w in user.get("wishlist", [])],
        "created_at": user["created_at"]
    }

@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(request: Request):
    user = await get_current_user(request)
    return user

@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        
        access_token = create_access_token(str(user["_id"]), user.get("email") or user.get("phone", ""))
        response.set_cookie(key="access_token", value=access_token, httponly=True, secure=False, samesite="lax", max_age=3600, path="/")
        return {"message": "Token refreshed"}
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

# ===================== USER ROUTES =====================

@api_router.post("/user/addresses")
async def add_address(address: AddressCreate, request: Request):
    user = await get_current_user(request)
    address_doc = address.model_dump()
    address_doc["id"] = str(uuid.uuid4())
    
    if address.is_default:
        await db.users.update_one(
            {"_id": ObjectId(user["_id"])},
            {"$set": {"addresses.$[].is_default": False}}
        )
    
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$push": {"addresses": address_doc}}
    )
    return address_doc

@api_router.delete("/user/addresses/{address_id}")
async def delete_address(address_id: str, request: Request):
    user = await get_current_user(request)
    await db.users.update_one(
        {"_id": ObjectId(user["_id"])},
        {"$pull": {"addresses": {"id": address_id}}}
    )
    return {"message": "Address deleted"}

@api_router.post("/user/wishlist/{product_id}")
async def toggle_wishlist(product_id: str, request: Request):
    user = await get_current_user(request)
    current_wishlist = user.get("wishlist", [])
    
    if product_id in current_wishlist:
        await db.users.update_one(
            {"_id": ObjectId(user["_id"])},
            {"$pull": {"wishlist": product_id}}
        )
        return {"action": "removed", "product_id": product_id}
    else:
        await db.users.update_one(
            {"_id": ObjectId(user["_id"])},
            {"$push": {"wishlist": product_id}}
        )
        return {"action": "added", "product_id": product_id}

@api_router.get("/user/wishlist")
async def get_wishlist(request: Request):
    user = await get_current_user(request)
    wishlist_ids = user.get("wishlist", [])
    
    products = []
    for pid in wishlist_ids:
        try:
            product = await db.products.find_one({"_id": ObjectId(pid)}, {"_id": 0})
            if product:
                product["id"] = pid
                products.append(product)
        except:
            pass
    
    return products

# ===================== CATEGORIES ROUTES =====================

@api_router.get("/categories")
async def get_categories():
    categories = await db.categories.find({}, {"_id": 0}).to_list(100)
    return categories

@api_router.post("/admin/categories")
async def create_category(category: CategoryCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    cat_doc = category.model_dump()
    cat_doc["id"] = str(uuid.uuid4())
    cat_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.categories.insert_one(cat_doc)
    return cat_doc

# ===================== PRODUCTS ROUTES =====================

@api_router.get("/products")
async def get_products(
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_rating: Optional[float] = None,
    search: Optional[str] = None,
    sort: Optional[str] = "newest",
    featured: Optional[bool] = None,
    is_new: Optional[bool] = None,
    page: int = 1,
    limit: int = 12
):
    query = {}
    
    if category:
        query["category"] = category
    if brand:
        query["brand"] = brand
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price
    if min_rating is not None:
        query["avg_rating"] = {"$gte": min_rating}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"name_en": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"brand": {"$regex": search, "$options": "i"}}
        ]
    if featured:
        query["is_featured"] = True
    if is_new:
        query["is_new"] = True
    
    sort_field = {"newest": ("created_at", -1), "price_asc": ("price", 1), "price_desc": ("price", -1), "popular": ("sold_count", -1), "rating": ("avg_rating", -1)}
    sort_key, sort_dir = sort_field.get(sort, ("created_at", -1))
    
    skip = (page - 1) * limit
    total = await db.products.count_documents(query)
    
    products = await db.products.find(query, {"_id": 0}).sort(sort_key, sort_dir).skip(skip).limit(limit).to_list(limit)
    
    return {
        "products": products,
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@api_router.get("/products/search")
async def search_products(q: str = Query(..., min_length=1)):
    products = await db.products.find(
        {"$or": [
            {"name": {"$regex": q, "$options": "i"}},
            {"name_en": {"$regex": q, "$options": "i"}},
            {"brand": {"$regex": q, "$options": "i"}}
        ]},
        {"_id": 0, "id": 1, "name": 1, "name_en": 1, "price": 1, "images": {"$slice": 1}}
    ).limit(10).to_list(10)
    return products

@api_router.get("/products/{product_id}")
async def get_product(product_id: str):
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Get reviews
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).limit(10).to_list(10)
    product["reviews"] = reviews
    
    # Get similar products
    similar = await db.products.find(
        {"category": product["category"], "id": {"$ne": product_id}},
        {"_id": 0}
    ).limit(4).to_list(4)
    product["similar_products"] = similar
    
    return product

@api_router.get("/products/brands/list")
async def get_brands():
    brands = await db.products.distinct("brand")
    return brands

# Admin product routes
@api_router.post("/admin/products")
async def create_product(product: ProductCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    product_doc = product.model_dump()
    product_doc["id"] = str(uuid.uuid4())
    product_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    product_doc["avg_rating"] = 0
    product_doc["review_count"] = 0
    product_doc["sold_count"] = 0
    
    await db.products.insert_one(product_doc)
    del product_doc["_id"]
    return product_doc

@api_router.put("/admin/products/{product_id}")
async def update_product(product_id: str, product: ProductUpdate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    update_data = {k: v for k, v in product.model_dump().items() if v is not None}
    if update_data:
        await db.products.update_one({"id": product_id}, {"$set": update_data})
    
    updated = await db.products.find_one({"id": product_id}, {"_id": 0})
    return updated

@api_router.delete("/admin/products/{product_id}")
async def delete_product(product_id: str, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    await db.products.delete_one({"id": product_id})
    return {"message": "Product deleted"}

# ===================== CART ROUTES =====================

@api_router.get("/cart")
async def get_cart(request: Request):
    user = await get_optional_user(request)
    user_id = user["_id"] if user else request.cookies.get("cart_session", str(uuid.uuid4()))
    
    cart = await db.carts.find_one({"user_id": user_id}, {"_id": 0})
    if not cart:
        return {"items": [], "subtotal": 0, "total": 0}
    
    # Populate product details
    items_with_details = []
    subtotal = 0
    for item in cart.get("items", []):
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if product:
            item_total = product["price"] * item["quantity"]
            items_with_details.append({
                **item,
                "product": product,
                "item_total": item_total
            })
            subtotal += item_total
    
    return {
        "items": items_with_details,
        "subtotal": subtotal,
        "shipping": 10.0 if subtotal < 100 else 0,
        "total": subtotal + (10.0 if subtotal < 100 else 0)
    }

@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, request: Request, response: Response):
    user = await get_optional_user(request)
    user_id = user["_id"] if user else request.cookies.get("cart_session")
    
    if not user_id:
        user_id = str(uuid.uuid4())
        response.set_cookie(key="cart_session", value=user_id, httponly=True, max_age=604800, path="/")
    
    # Check product exists and has stock
    product = await db.products.find_one({"id": item.product_id})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product["stock"] < item.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
    
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart:
        await db.carts.insert_one({
            "user_id": user_id,
            "items": [{"product_id": item.product_id, "quantity": item.quantity}],
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
    else:
        # Check if item exists
        existing = next((i for i in cart["items"] if i["product_id"] == item.product_id), None)
        if existing:
            await db.carts.update_one(
                {"user_id": user_id, "items.product_id": item.product_id},
                {"$inc": {"items.$.quantity": item.quantity}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
        else:
            await db.carts.update_one(
                {"user_id": user_id},
                {"$push": {"items": {"product_id": item.product_id, "quantity": item.quantity}}, "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}}
            )
    
    return {"message": "Added to cart"}

@api_router.put("/cart/update")
async def update_cart(item: CartItem, request: Request):
    user = await get_optional_user(request)
    user_id = user["_id"] if user else request.cookies.get("cart_session")
    
    if not user_id:
        raise HTTPException(status_code=400, detail="No cart found")
    
    if item.quantity <= 0:
        await db.carts.update_one(
            {"user_id": user_id},
            {"$pull": {"items": {"product_id": item.product_id}}}
        )
    else:
        await db.carts.update_one(
            {"user_id": user_id, "items.product_id": item.product_id},
            {"$set": {"items.$.quantity": item.quantity, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
    
    return {"message": "Cart updated"}

@api_router.delete("/cart/remove/{product_id}")
async def remove_from_cart(product_id: str, request: Request):
    user = await get_optional_user(request)
    user_id = user["_id"] if user else request.cookies.get("cart_session")
    
    if user_id:
        await db.carts.update_one(
            {"user_id": user_id},
            {"$pull": {"items": {"product_id": product_id}}}
        )
    
    return {"message": "Item removed"}

@api_router.delete("/cart/clear")
async def clear_cart(request: Request):
    user = await get_optional_user(request)
    user_id = user["_id"] if user else request.cookies.get("cart_session")
    
    if user_id:
        await db.carts.delete_one({"user_id": user_id})
    
    return {"message": "Cart cleared"}

# ===================== PROMO CODES =====================

@api_router.post("/cart/promo")
async def apply_promo(code: str = Query(...), request: Request = None):
    promo = await db.promo_codes.find_one({"code": code.upper(), "is_active": True}, {"_id": 0})
    if not promo:
        raise HTTPException(status_code=404, detail="Invalid promo code")
    
    if promo.get("expires_at") and datetime.fromisoformat(promo["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Promo code expired")
    
    if promo.get("uses", 0) >= promo.get("max_uses", 100):
        raise HTTPException(status_code=400, detail="Promo code usage limit reached")
    
    return promo

@api_router.post("/admin/promo-codes")
async def create_promo_code(promo: PromoCodeCreate, request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    promo_doc = promo.model_dump()
    promo_doc["code"] = promo_doc["code"].upper()
    promo_doc["id"] = str(uuid.uuid4())
    promo_doc["is_active"] = True
    promo_doc["uses"] = 0
    promo_doc["created_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.promo_codes.insert_one(promo_doc)
    del promo_doc["_id"]
    return promo_doc

@api_router.get("/admin/promo-codes")
async def get_promo_codes(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    promos = await db.promo_codes.find({}, {"_id": 0}).to_list(100)
    return promos

# ===================== ORDERS =====================

def generate_order_number():
    return f"TG-{datetime.now().strftime('%Y%m%d')}-{secrets.token_hex(4).upper()}"

@api_router.post("/orders")
async def create_order(order_data: OrderCreate, request: Request):
    user = await get_current_user(request)
    user_id = user["_id"]
    
    # Get cart
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Cart is empty")
    
    # Calculate totals
    items = []
    subtotal = 0
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]}, {"_id": 0})
        if not product:
            continue
        if product["stock"] < item["quantity"]:
            raise HTTPException(status_code=400, detail=f"Insufficient stock for {product['name']}")
        
        item_total = product["price"] * item["quantity"]
        items.append({
            "product_id": item["product_id"],
            "product_name": product["name"],
            "product_image": product["images"][0] if product["images"] else None,
            "price": product["price"],
            "quantity": item["quantity"],
            "item_total": item_total
        })
        subtotal += item_total
    
    # Apply promo
    discount = 0
    if order_data.promo_code:
        promo = await db.promo_codes.find_one({"code": order_data.promo_code.upper(), "is_active": True})
        if promo:
            if promo["discount_type"] == "percentage":
                discount = subtotal * (promo["discount_value"] / 100)
            else:
                discount = promo["discount_value"]
            await db.promo_codes.update_one({"code": promo["code"]}, {"$inc": {"uses": 1}})
    
    shipping = 10.0 if subtotal < 100 else 0
    total = subtotal - discount + shipping
    
    order_doc = {
        "id": str(uuid.uuid4()),
        "order_number": generate_order_number(),
        "user_id": user_id,
        "user_email": user.get("email"),
        "user_phone": user.get("phone"),
        "items": items,
        "subtotal": subtotal,
        "discount": discount,
        "shipping": shipping,
        "total": total,
        "shipping_address": order_data.shipping_address,
        "payment_method": order_data.payment_method,
        "mobile_money_provider": order_data.mobile_money_provider,
        "payment_status": "pending",
        "order_status": "pending",
        "notes": order_data.notes,
        "status_history": [{"status": "pending", "timestamp": datetime.now(timezone.utc).isoformat(), "note": "Order created"}],
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.insert_one(order_doc)
    
    # Update stock
    for item in cart["items"]:
        await db.products.update_one(
            {"id": item["product_id"]},
            {"$inc": {"stock": -item["quantity"], "sold_count": item["quantity"]}}
        )
    
    # Clear cart
    await db.carts.delete_one({"user_id": user_id})
    
    del order_doc["_id"]
    return order_doc

@api_router.get("/orders")
async def get_user_orders(request: Request):
    user = await get_current_user(request)
    orders = await db.orders.find({"user_id": user["_id"]}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return orders

@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, request: Request):
    user = await get_current_user(request)
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    if order["user_id"] != user["_id"] and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return order

@api_router.get("/orders/track/{order_number}")
async def track_order(order_number: str):
    order = await db.orders.find_one({"order_number": order_number}, {"_id": 0, "user_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return order

# Admin order routes
@api_router.get("/admin/orders")
async def get_all_orders(
    status: Optional[str] = None,
    page: int = 1,
    limit: int = 20,
    request: Request = None
):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    query = {}
    if status:
        query["order_status"] = status
    
    skip = (page - 1) * limit
    total = await db.orders.count_documents(query)
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    
    return {"orders": orders, "total": total, "page": page, "pages": (total + limit - 1) // limit}

@api_router.put("/admin/orders/{order_id}/status")
async def update_order_status(order_id: str, status: str = Query(...), note: str = "", request: Request = None):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    valid_statuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    status_entry = {"status": status, "timestamp": datetime.now(timezone.utc).isoformat(), "note": note}
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {"order_status": status}, "$push": {"status_history": status_entry}}
    )
    
    # Send SMS notification if user has phone
    order = await db.orders.find_one({"id": order_id})
    if order and order.get("user_phone"):
        try:
            twilio_client = TwilioClient(os.environ.get("TWILIO_ACCOUNT_SID"), os.environ.get("TWILIO_AUTH_TOKEN"))
            twilio_client.messages.create(
                body=f"Hyper-Gadgets: Votre commande {order['order_number']} est maintenant: {status}",
                from_=os.environ.get("TWILIO_PHONE_NUMBER"),
                to=order["user_phone"]
            )
        except Exception as e:
            logging.error(f"SMS send failed: {e}")
    
    return {"message": "Status updated"}

# ===================== REVIEWS =====================

@api_router.post("/reviews")
async def create_review(review: ReviewCreate, request: Request):
    user = await get_current_user(request)
    
    # Check if user bought the product
    order = await db.orders.find_one({
        "user_id": user["_id"],
        "items.product_id": review.product_id,
        "order_status": "delivered"
    })
    
    # Check existing review
    existing = await db.reviews.find_one({
        "user_id": user["_id"],
        "product_id": review.product_id
    })
    if existing:
        raise HTTPException(status_code=400, detail="You already reviewed this product")
    
    review_doc = {
        "id": str(uuid.uuid4()),
        "product_id": review.product_id,
        "user_id": user["_id"],
        "user_name": user["name"],
        "rating": max(1, min(5, review.rating)),
        "comment": review.comment,
        "verified_purchase": order is not None,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.reviews.insert_one(review_doc)
    
    # Update product rating
    all_reviews = await db.reviews.find({"product_id": review.product_id}).to_list(1000)
    avg_rating = sum(r["rating"] for r in all_reviews) / len(all_reviews)
    await db.products.update_one(
        {"id": review.product_id},
        {"$set": {"avg_rating": round(avg_rating, 1), "review_count": len(all_reviews)}}
    )
    
    del review_doc["_id"]
    return review_doc

@api_router.get("/products/{product_id}/reviews")
async def get_product_reviews(product_id: str, page: int = 1, limit: int = 10):
    skip = (page - 1) * limit
    reviews = await db.reviews.find({"product_id": product_id}, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    total = await db.reviews.count_documents({"product_id": product_id})
    return {"reviews": reviews, "total": total}

# ===================== PAYMENTS =====================

# Mobile Money (RDC providers with OTP via Twilio)
@api_router.post("/payments/mobile-money/initiate")
async def initiate_mobile_money(
    provider: str = Query(...),
    phone_number: str = Query(...),
    request: Request = None
):
    user = await get_current_user(request)
    user_id = user["_id"]
    
    valid_providers = ["airtel", "mpesa", "orange", "africell"]
    if provider not in valid_providers:
        raise HTTPException(status_code=400, detail="Opérateur invalide")
    
    # Validate RDC phone number format
    cleaned_phone = re.sub(r'[\s\-]', '', phone_number)
    if not re.match(r'^\+?243\d{9}$', cleaned_phone):
        raise HTTPException(status_code=400, detail="Numéro invalide. Format: +243XXXXXXXXX")
    
    if not cleaned_phone.startswith('+'):
        cleaned_phone = '+' + cleaned_phone
    
    # Get cart total
    cart = await db.carts.find_one({"user_id": user_id})
    if not cart or not cart.get("items"):
        raise HTTPException(status_code=400, detail="Le panier est vide")
    
    subtotal = 0
    for item in cart["items"]:
        product = await db.products.find_one({"id": item["product_id"]})
        if product:
            subtotal += product["price"] * item["quantity"]
    
    shipping = 10.0 if subtotal < 100 else 0
    total = subtotal + shipping
    
    # Check cooldown (prevent OTP spam, 60s between requests)
    recent = await db.payment_transactions.find_one({
        "user_id": user_id,
        "payment_method": "mobile_money",
        "payment_status": "pending",
        "created_at": {"$gte": (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()}
    })
    if recent:
        raise HTTPException(status_code=429, detail="Veuillez patienter 60 secondes avant de redemander un code")
    
    # Generate OTP
    otp = secrets.randbelow(900000) + 100000
    transaction_id = str(uuid.uuid4())
    
    # Store pending transaction
    await db.payment_transactions.insert_one({
        "id": transaction_id,
        "user_id": user_id,
        "amount": total,
        "currency": "USD",
        "payment_method": "mobile_money",
        "provider": provider,
        "phone_number": cleaned_phone,
        "otp": str(otp),
        "otp_attempts": 0,
        "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat()
    })
    
    # Send OTP via SMS
    provider_names = {"airtel": "Airtel Money", "mpesa": "M-Pesa", "orange": "Orange Money", "africell": "Africell Money"}
    try:
        twilio_client = TwilioClient(os.environ.get("TWILIO_ACCOUNT_SID"), os.environ.get("TWILIO_AUTH_TOKEN"))
        twilio_client.messages.create(
            body=f"Hyper-Gadgets: Votre code de paiement {provider_names.get(provider, provider)} est {otp}. Montant: ${total:.2f}. Valable 10 minutes.",
            from_=os.environ.get("TWILIO_PHONE_NUMBER"),
            to=cleaned_phone
        )
    except Exception as e:
        logging.error(f"SMS send failed: {e}")
    
    return {
        "transaction_id": transaction_id,
        "amount": total,
        "provider": provider,
        "phone_number": cleaned_phone[-4:].rjust(len(cleaned_phone), '*'),
        "message": f"Code OTP envoyé au {cleaned_phone[-4:].rjust(len(cleaned_phone), '*')}",
        "expires_in": 600
    }

@api_router.post("/payments/mobile-money/resend-otp")
async def resend_mobile_money_otp(
    transaction_id: str = Query(...),
    request: Request = None
):
    user = await get_current_user(request)
    
    transaction = await db.payment_transactions.find_one({
        "id": transaction_id,
        "user_id": user["_id"],
        "payment_status": "pending"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    
    if datetime.fromisoformat(transaction["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Transaction expirée. Veuillez recommencer.")
    
    # Generate new OTP
    new_otp = secrets.randbelow(900000) + 100000
    await db.payment_transactions.update_one(
        {"id": transaction_id},
        {"$set": {"otp": str(new_otp), "otp_attempts": 0}}
    )
    
    # Send new OTP via SMS
    try:
        twilio_client = TwilioClient(os.environ.get("TWILIO_ACCOUNT_SID"), os.environ.get("TWILIO_AUTH_TOKEN"))
        twilio_client.messages.create(
            body=f"Hyper-Gadgets: Nouveau code OTP: {new_otp}. Valable 10 minutes.",
            from_=os.environ.get("TWILIO_PHONE_NUMBER"),
            to=transaction["phone_number"]
        )
    except Exception as e:
        logging.error(f"SMS resend failed: {e}")
    
    return {"message": "Nouveau code OTP envoyé", "transaction_id": transaction_id}

@api_router.post("/payments/mobile-money/verify")
async def verify_mobile_money(
    transaction_id: str = Query(...),
    otp: str = Query(...),
    request: Request = None
):
    user = await get_current_user(request)
    
    transaction = await db.payment_transactions.find_one({
        "id": transaction_id,
        "user_id": user["_id"],
        "payment_status": "pending"
    })
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    
    if datetime.fromisoformat(transaction["expires_at"]) < datetime.now(timezone.utc):
        await db.payment_transactions.update_one(
            {"id": transaction_id},
            {"$set": {"payment_status": "expired"}}
        )
        raise HTTPException(status_code=400, detail="Code OTP expiré. Veuillez recommencer.")
    
    # Check max attempts (5)
    if transaction.get("otp_attempts", 0) >= 5:
        await db.payment_transactions.update_one(
            {"id": transaction_id},
            {"$set": {"payment_status": "failed"}}
        )
        raise HTTPException(status_code=400, detail="Trop de tentatives. Transaction annulée.")
    
    if transaction["otp"] != otp:
        await db.payment_transactions.update_one(
            {"id": transaction_id},
            {"$inc": {"otp_attempts": 1}}
        )
        remaining = 5 - transaction.get("otp_attempts", 0) - 1
        raise HTTPException(status_code=400, detail=f"Code invalide. {remaining} tentative(s) restante(s).")
    
    # Mark as completed
    await db.payment_transactions.update_one(
        {"id": transaction_id},
        {"$set": {"payment_status": "completed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {"status": "completed", "transaction_id": transaction_id}

# ===================== AI CHATBOT =====================

@api_router.post("/chat")
async def chat_with_ai(message: ChatMessage, request: Request):
    session_id = message.session_id or str(uuid.uuid4())
    
    # Get product context
    products = await db.products.find({}, {"_id": 0, "name": 1, "price": 1, "category": 1}).limit(20).to_list(20)
    products_context = "\n".join([f"- {p['name']} ({p['category']}): ${p['price']}" for p in products])
    
    system_message = f"""Tu es un assistant virtuel pour Hyper-Gadgets, une boutique en ligne de gadgets technologiques en RDC.
Tu aides les clients à trouver des produits, répondre aux questions sur les commandes, et fournir des informations sur la livraison.

Produits disponibles:
{products_context}

Méthodes de paiement: PayPal, Mobile Money (Airtel, M-Pesa, Orange, Africell), Paiement à la livraison.
Livraison: Gratuite pour les commandes > $100.

Réponds de manière concise et utile en français."""

    chat = LlmChat(
        api_key=os.environ.get("EMERGENT_LLM_KEY"),
        session_id=session_id,
        system_message=system_message
    )
    chat.with_model("openai", "gpt-5.2")
    
    user_message = UserMessage(text=message.message)
    response = await chat.send_message(user_message)
    
    # Store chat history
    await db.chat_history.insert_one({
        "session_id": session_id,
        "user_message": message.message,
        "bot_response": response,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    
    return {"response": response, "session_id": session_id}

# ===================== ADMIN DASHBOARD =====================

@api_router.get("/admin/stats")
async def get_admin_stats(request: Request):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    # Calculate stats
    total_orders = await db.orders.count_documents({})
    total_revenue = 0
    orders = await db.orders.find({"payment_status": "completed"}).to_list(10000)
    for order in orders:
        total_revenue += order.get("total", 0)
    
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    pending_orders = await db.orders.count_documents({"order_status": "pending"})
    
    # Recent orders
    recent_orders = await db.orders.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
    
    # Top products
    top_products = await db.products.find({}, {"_id": 0, "name": 1, "sold_count": 1, "price": 1}).sort("sold_count", -1).limit(5).to_list(5)
    
    # Orders by status
    status_counts = {}
    for status in ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]:
        status_counts[status] = await db.orders.count_documents({"order_status": status})
    
    return {
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_products": total_products,
        "total_users": total_users,
        "pending_orders": pending_orders,
        "recent_orders": recent_orders,
        "top_products": top_products,
        "orders_by_status": status_counts
    }

@api_router.get("/admin/users")
async def get_all_users(page: int = 1, limit: int = 20, request: Request = None):
    user = await get_current_user(request)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    skip = (page - 1) * limit
    total = await db.users.count_documents({})
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).skip(skip).limit(limit).to_list(limit)
    
    # Add user ID from document
    for u in users:
        if "id" not in u:
            u["id"] = str(u.get("_id", ""))
    
    return {"users": users, "total": total, "page": page, "pages": (total + limit - 1) // limit}

# ===================== STARTUP =====================

@app.on_event("startup")
async def startup_event():
    # Drop and recreate indexes to fix unique constraint issues
    try:
        await db.users.drop_index("email_1")
    except:
        pass
    try:
        await db.users.drop_index("phone_1")
    except:
        pass
    
    # Create indexes with sparse=True to allow multiple null values
    await db.users.create_index("email", unique=True, sparse=True)
    await db.users.create_index("phone", unique=True, sparse=True)
    await db.products.create_index("id", unique=True)
    await db.products.create_index([("name", "text"), ("description", "text")])
    await db.orders.create_index("order_number", unique=True)
    await db.login_attempts.create_index("identifier")
    
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@techgadgets.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Admin@123")
    
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        admin_doc = {
            "email": admin_email,
            "name": "Admin",
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "addresses": [],
            "wishlist": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        result = await db.users.insert_one(admin_doc)
        logging.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logging.info("Admin password updated")
    
    # Seed categories
    categories_data = [
        {"id": "smartphones", "name": "Smartphones", "name_en": "Smartphones", "slug": "smartphones", "image": "https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?w=400"},
        {"id": "laptops", "name": "Ordinateurs Portables", "name_en": "Laptops", "slug": "laptops", "image": "https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400"},
        {"id": "audio", "name": "Audio & Casques", "name_en": "Audio & Headphones", "slug": "audio", "image": "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400"},
        {"id": "wearables", "name": "Montres & Wearables", "name_en": "Watches & Wearables", "slug": "wearables", "image": "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400"},
        {"id": "gaming", "name": "Gaming", "name_en": "Gaming", "slug": "gaming", "image": "https://images.unsplash.com/photo-1612287230202-1ff1d85d1bdf?w=400"},
        {"id": "accessories", "name": "Accessoires", "name_en": "Accessories", "slug": "accessories", "image": "https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400"}
    ]
    
    for cat in categories_data:
        existing_cat = await db.categories.find_one({"id": cat["id"]})
        if not existing_cat:
            cat["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.categories.insert_one(cat)
    
    # Seed sample products
    products_data = [
        {
            "id": "prod-001",
            "name": "iPhone 15 Pro Max",
            "name_en": "iPhone 15 Pro Max",
            "description": "Le dernier iPhone avec puce A17 Pro, caméra 48MP et design en titane.",
            "description_en": "The latest iPhone with A17 Pro chip, 48MP camera and titanium design.",
            "price": 1199.00,
            "compare_price": 1299.00,
            "category": "smartphones",
            "brand": "Apple",
            "images": [
                "https://images.unsplash.com/photo-1695048133142-1a20484d2569?w=600",
                "https://images.unsplash.com/photo-1510557880182-3d4d3cba35a5?w=600"
            ],
            "specifications": {"Écran": "6.7 pouces OLED", "Processeur": "A17 Pro", "RAM": "8GB", "Stockage": "256GB"},
            "stock": 50,
            "is_featured": True,
            "is_new": True
        },
        {
            "id": "prod-002",
            "name": "Samsung Galaxy S24 Ultra",
            "name_en": "Samsung Galaxy S24 Ultra",
            "description": "Smartphone premium avec S Pen intégré et caméra 200MP.",
            "description_en": "Premium smartphone with built-in S Pen and 200MP camera.",
            "price": 1099.00,
            "compare_price": 1199.00,
            "category": "smartphones",
            "brand": "Samsung",
            "images": [
                "https://images.unsplash.com/photo-1610945415295-d9bbf067e59c?w=600"
            ],
            "specifications": {"Écran": "6.8 pouces Dynamic AMOLED", "Processeur": "Snapdragon 8 Gen 3", "RAM": "12GB", "Stockage": "512GB"},
            "stock": 35,
            "is_featured": True,
            "is_new": True
        },
        {
            "id": "prod-003",
            "name": "MacBook Pro 14 M3 Pro",
            "name_en": "MacBook Pro 14 M3 Pro",
            "description": "Ordinateur portable professionnel avec puce M3 Pro et écran Liquid Retina XDR.",
            "description_en": "Professional laptop with M3 Pro chip and Liquid Retina XDR display.",
            "price": 1999.00,
            "compare_price": 2199.00,
            "category": "laptops",
            "brand": "Apple",
            "images": [
                "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=600"
            ],
            "specifications": {"Écran": "14.2 pouces Liquid Retina XDR", "Processeur": "M3 Pro", "RAM": "18GB", "Stockage": "512GB SSD"},
            "stock": 20,
            "is_featured": True,
            "is_new": False
        },
        {
            "id": "prod-004",
            "name": "Sony WH-1000XM5",
            "name_en": "Sony WH-1000XM5",
            "description": "Casque sans fil avec réduction de bruit leader du marché.",
            "description_en": "Wireless headphones with industry-leading noise cancellation.",
            "price": 349.00,
            "compare_price": 399.00,
            "category": "audio",
            "brand": "Sony",
            "images": [
                "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=600"
            ],
            "specifications": {"Type": "Over-ear", "Autonomie": "30 heures", "ANC": "Oui", "Bluetooth": "5.2"},
            "stock": 100,
            "is_featured": True,
            "is_new": False
        },
        {
            "id": "prod-005",
            "name": "Apple Watch Ultra 2",
            "name_en": "Apple Watch Ultra 2",
            "description": "La montre connectée la plus robuste d'Apple pour les aventuriers.",
            "description_en": "Apple's most rugged smartwatch for adventurers.",
            "price": 799.00,
            "compare_price": 849.00,
            "category": "wearables",
            "brand": "Apple",
            "images": [
                "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?w=600"
            ],
            "specifications": {"Écran": "49mm", "Autonomie": "36 heures", "Étanchéité": "100m", "GPS": "Double fréquence"},
            "stock": 40,
            "is_featured": True,
            "is_new": True
        },
        {
            "id": "prod-006",
            "name": "PlayStation 5 Slim",
            "name_en": "PlayStation 5 Slim",
            "description": "Console de jeu nouvelle génération avec lecteur de disque.",
            "description_en": "Next-gen gaming console with disc drive.",
            "price": 499.00,
            "compare_price": None,
            "category": "gaming",
            "brand": "Sony",
            "images": [
                "https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=600"
            ],
            "specifications": {"Stockage": "1TB SSD", "Résolution": "4K 120Hz", "Ray Tracing": "Oui"},
            "stock": 25,
            "is_featured": True,
            "is_new": False
        },
        {
            "id": "prod-007",
            "name": "AirPods Pro 2",
            "name_en": "AirPods Pro 2",
            "description": "Écouteurs sans fil avec réduction de bruit active et audio spatial.",
            "description_en": "Wireless earbuds with active noise cancellation and spatial audio.",
            "price": 249.00,
            "compare_price": 279.00,
            "category": "audio",
            "brand": "Apple",
            "images": [
                "https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=600"
            ],
            "specifications": {"Type": "In-ear", "ANC": "Oui", "Autonomie": "6 heures", "Étanchéité": "IPX4"},
            "stock": 150,
            "is_featured": False,
            "is_new": False
        },
        {
            "id": "prod-008",
            "name": "Dell XPS 15",
            "name_en": "Dell XPS 15",
            "description": "Ordinateur portable premium avec écran OLED 3.5K.",
            "description_en": "Premium laptop with 3.5K OLED display.",
            "price": 1799.00,
            "compare_price": 1999.00,
            "category": "laptops",
            "brand": "Dell",
            "images": [
                "https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=600"
            ],
            "specifications": {"Écran": "15.6 pouces OLED 3.5K", "Processeur": "Intel Core i7-13700H", "RAM": "32GB", "Stockage": "1TB SSD"},
            "stock": 15,
            "is_featured": False,
            "is_new": True
        }
    ]
    
    for product in products_data:
        existing_prod = await db.products.find_one({"id": product["id"]})
        if not existing_prod:
            product["created_at"] = datetime.now(timezone.utc).isoformat()
            product["avg_rating"] = 4.5
            product["review_count"] = 0
            product["sold_count"] = 0
            await db.products.insert_one(product)
    
    # Seed promo codes
    promo_data = [
        {"id": "promo-001", "code": "WELCOME10", "discount_type": "percentage", "discount_value": 10, "min_order": 50, "max_uses": 1000, "is_active": True, "uses": 0},
        {"id": "promo-002", "code": "TECH20", "discount_type": "percentage", "discount_value": 20, "min_order": 200, "max_uses": 100, "is_active": True, "uses": 0}
    ]
    
    for promo in promo_data:
        existing_promo = await db.promo_codes.find_one({"code": promo["code"]})
        if not existing_promo:
            promo["created_at"] = datetime.now(timezone.utc).isoformat()
            await db.promo_codes.insert_one(promo)
    
    # Write test credentials
    import os as os_module
    os_module.makedirs("/app/memory", exist_ok=True)
    with open("/app/memory/test_credentials.md", "w") as f:
        f.write(f"""# Test Credentials

## Admin Account
- Email: {admin_email}
- Password: {admin_password}
- Role: admin

## Test User (create via registration)
- Register with email or phone
- Password: any

## API Endpoints
- Auth: /api/auth/login, /api/auth/register, /api/auth/me
- Products: /api/products, /api/products/{{id}}
- Cart: /api/cart, /api/cart/add, /api/cart/update
- Orders: /api/orders, /api/orders/{{id}}
- Admin: /api/admin/stats, /api/admin/orders, /api/admin/products

## Promo Codes
- WELCOME10: 10% off (min $50)
- TECH20: 20% off (min $200)
""")
    
    logging.info("Startup complete - data seeded")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()

# Include router
app.include_router(api_router)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
