from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT, TA_CENTER
from io import BytesIO

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = 'HS256'

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# Models
class UserCreate(BaseModel):
    username: str
    password: str
    full_name: str
    role: str = "user"
    department: str

class UserLogin(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    username: str
    full_name: str
    role: str
    department: str
    created_at: datetime

class VendorCreate(BaseModel):
    name: str
    contact_person: str
    email: str
    phone: str
    address: str

class Vendor(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    contact_person: str
    email: str
    phone: str
    address: str
    department: str
    created_at: datetime

class ProductCreate(BaseModel):
    name: str
    sku: str
    description: str
    unit_price: float
    unit_of_measure: str
    tax_rate: float = 18.0

class Product(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    name: str
    sku: str
    description: str
    unit_price: float
    unit_of_measure: str
    tax_rate: float
    department: str
    created_at: datetime

class DeliveryRecord(BaseModel):
    delivery_date: str
    quantity_received: float
    received_by: str
    notes: Optional[str] = ""

class POItemCreate(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    unit_price: float
    tax_rate: float
    tax_amount: float
    total: float

class POItem(BaseModel):
    product_id: str
    product_name: str
    quantity: float
    quantity_received: float = 0.0
    unit_price: float
    tax_rate: float = 0.0
    tax_amount: float = 0.0
    total: float
    delivery_history: List[DeliveryRecord] = []

class PurchaseOrderCreate(BaseModel):
    vendor_id: str
    vendor_name: str
    items: List[POItemCreate]
    delivery_date: str
    payment_terms: str
    shipping_address: str
    notes: Optional[str] = ""
    authorized_signatory: Optional[str] = ""
    subtotal: float
    tax: float
    total: float

class PurchaseOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    po_number: str
    vendor_id: str
    vendor_name: str
    items: List[POItem]
    delivery_date: str
    payment_terms: str
    shipping_address: str
    notes: str
    authorized_signatory: str = ""
    subtotal: float
    tax: float
    total: float
    status: str
    department: str
    created_by: str
    created_at: datetime

class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    po_id: str
    po_number: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime

# Auth functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        user = await db.users.find_one({'id': user_id}, {'_id': 0, 'password': 0})
        if not user:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

# Auth endpoints
@api_router.post("/auth/register")
async def register(user_data: UserCreate):
    existing = await db.users.find_one({'username': user_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate department
    valid_departments = ['admin', 'accounts', 'ppc', 'maintenance', 'dyeing', 'accessories']
    if user_data.department.lower() not in valid_departments:
        raise HTTPException(status_code=400, detail="Invalid department")
    
    # Validate role
    valid_roles = ['admin', 'user']
    if user_data.role.lower() not in valid_roles:
        raise HTTPException(status_code=400, detail="Invalid role")
    
    user_id = str(uuid.uuid4())
    user_doc = {
        'id': user_id,
        'username': user_data.username,
        'password': hash_password(user_data.password),
        'full_name': user_data.full_name,
        'role': user_data.role.lower(),
        'department': user_data.department.lower(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    token = create_token(user_id)
    return {
        'token': token, 
        'user': {
            'id': user_id, 
            'username': user_data.username, 
            'full_name': user_data.full_name,
            'role': user_data.role.lower(),
            'department': user_data.department.lower()
        }
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({'username': credentials.username})
    if not user or not verify_password(credentials.password, user['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_token(user['id'])
    return {
        'token': token, 
        'user': {
            'id': user['id'], 
            'username': user['username'], 
            'full_name': user['full_name'],
            'role': user.get('role', 'user'),
            'department': user.get('department', 'general')
        }
    }

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return current_user

# Vendor endpoints
@api_router.get("/vendors", response_model=List[Vendor])
async def get_vendors(current_user: dict = Depends(get_current_user)):
    # Admin can see all vendors, others see only their department
    query = {} if current_user.get('role') == 'admin' else {'department': current_user.get('department', 'general')}
    vendors = await db.vendors.find(query, {'_id': 0}).to_list(1000)
    for vendor in vendors:
        if isinstance(vendor.get('created_at'), str):
            vendor['created_at'] = datetime.fromisoformat(vendor['created_at'])
        if 'department' not in vendor:
            vendor['department'] = 'general'
    return vendors

@api_router.post("/vendors", response_model=Vendor)
async def create_vendor(vendor_data: VendorCreate, current_user: dict = Depends(get_current_user)):
    vendor_id = str(uuid.uuid4())
    vendor_doc = {
        'id': vendor_id,
        **vendor_data.model_dump(),
        'department': current_user.get('department', 'general'),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.vendors.insert_one(vendor_doc)
    vendor_doc['created_at'] = datetime.fromisoformat(vendor_doc['created_at'])
    return vendor_doc

@api_router.put("/vendors/{vendor_id}", response_model=Vendor)
async def update_vendor(vendor_id: str, vendor_data: VendorCreate, current_user: dict = Depends(get_current_user)):
    # Check access
    existing = await db.vendors.find_one({'id': vendor_id}, {'_id': 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    if current_user.get('role') != 'admin' and existing.get('department') != current_user.get('department'):
        raise HTTPException(status_code=403, detail="Access denied to this vendor")
    
    result = await db.vendors.update_one(
        {'id': vendor_id},
        {'$set': vendor_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    vendor = await db.vendors.find_one({'id': vendor_id}, {'_id': 0})
    if isinstance(vendor['created_at'], str):
        vendor['created_at'] = datetime.fromisoformat(vendor['created_at'])
    if 'department' not in vendor:
        vendor['department'] = 'general'
    return vendor

@api_router.delete("/vendors/{vendor_id}")
async def delete_vendor(vendor_id: str, current_user: dict = Depends(get_current_user)):
    # Check access
    existing = await db.vendors.find_one({'id': vendor_id}, {'_id': 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Vendor not found")
    
    if current_user.get('role') != 'admin' and existing.get('department') != current_user.get('department'):
        raise HTTPException(status_code=403, detail="Access denied to this vendor")
    
    result = await db.vendors.delete_one({'id': vendor_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return {'message': 'Vendor deleted'}

# Product endpoints
@api_router.get("/products", response_model=List[Product])
async def get_products(current_user: dict = Depends(get_current_user)):
    products = await db.products.find({}, {'_id': 0}).to_list(1000)
    for product in products:
        if isinstance(product.get('created_at'), str):
            product['created_at'] = datetime.fromisoformat(product['created_at'])
    return products

@api_router.post("/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    product_id = str(uuid.uuid4())
    product_doc = {
        'id': product_id,
        **product_data.model_dump(),
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.products.insert_one(product_doc)
    product_doc['created_at'] = datetime.fromisoformat(product_doc['created_at'])
    return product_doc

@api_router.put("/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    result = await db.products.update_one(
        {'id': product_id},
        {'$set': product_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    
    product = await db.products.find_one({'id': product_id}, {'_id': 0})
    if isinstance(product['created_at'], str):
        product['created_at'] = datetime.fromisoformat(product['created_at'])
    return product

@api_router.delete("/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.products.delete_one({'id': product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {'message': 'Product deleted'}

# Purchase Order endpoints
async def generate_po_number():
    count = await db.purchase_orders.count_documents({})
    return f"PO-{datetime.now(timezone.utc).strftime('%Y%m')}-{count + 1:04d}"

@api_router.get("/purchase-orders", response_model=List[PurchaseOrder])
async def get_purchase_orders(current_user: dict = Depends(get_current_user)):
    pos = await db.purchase_orders.find({}, {'_id': 0}).to_list(1000)
    for po in pos:
        if isinstance(po.get('created_at'), str):
            po['created_at'] = datetime.fromisoformat(po['created_at'])
    return pos

@api_router.get("/purchase-orders/{po_id}", response_model=PurchaseOrder)
async def get_purchase_order(po_id: str, current_user: dict = Depends(get_current_user)):
    po = await db.purchase_orders.find_one({'id': po_id}, {'_id': 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if isinstance(po.get('created_at'), str):
        po['created_at'] = datetime.fromisoformat(po['created_at'])
    return po

@api_router.post("/purchase-orders", response_model=PurchaseOrder)
async def create_purchase_order(po_data: PurchaseOrderCreate, current_user: dict = Depends(get_current_user)):
    po_id = str(uuid.uuid4())
    po_number = await generate_po_number()
    
    po_doc = {
        'id': po_id,
        'po_number': po_number,
        **po_data.model_dump(),
        'status': 'draft',
        'created_by': current_user['username'],
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.purchase_orders.insert_one(po_doc)
    po_doc['created_at'] = datetime.fromisoformat(po_doc['created_at'])
    return po_doc

@api_router.put("/purchase-orders/{po_id}", response_model=PurchaseOrder)
async def update_purchase_order(po_id: str, po_data: PurchaseOrderCreate, current_user: dict = Depends(get_current_user)):
    result = await db.purchase_orders.update_one(
        {'id': po_id},
        {'$set': po_data.model_dump()}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    po = await db.purchase_orders.find_one({'id': po_id}, {'_id': 0})
    if isinstance(po['created_at'], str):
        po['created_at'] = datetime.fromisoformat(po['created_at'])
    return po

@api_router.patch("/purchase-orders/{po_id}/status")
async def update_po_status(po_id: str, status: dict, current_user: dict = Depends(get_current_user)):
    result = await db.purchase_orders.update_one(
        {'id': po_id},
        {'$set': {'status': status['status']}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {'message': 'Status updated'}

@api_router.delete("/purchase-orders/{po_id}")
async def delete_purchase_order(po_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.purchase_orders.delete_one({'id': po_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return {'message': 'Purchase order deleted'}

# Material Receipt Confirmation (Per Item)
class ItemReceiptConfirm(BaseModel):
    item_index: int
    quantity_received: float
    received_by: str
    notes: Optional[str] = ""

@api_router.post("/purchase-orders/{po_id}/confirm-item-receipt")
async def confirm_item_receipt(po_id: str, receipt_data: ItemReceiptConfirm, current_user: dict = Depends(get_current_user)):
    po = await db.purchase_orders.find_one({'id': po_id}, {'_id': 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    items = po['items']
    if receipt_data.item_index >= len(items):
        raise HTTPException(status_code=400, detail="Invalid item index")
    
    item = items[receipt_data.item_index]
    
    # Check if trying to receive more than ordered
    new_total_received = item.get('quantity_received', 0) + receipt_data.quantity_received
    if new_total_received > item['quantity']:
        raise HTTPException(status_code=400, detail=f"Cannot receive more than ordered quantity. Ordered: {item['quantity']}, Already received: {item.get('quantity_received', 0)}")
    
    # Add delivery record
    delivery_record = {
        'delivery_date': datetime.now(timezone.utc).isoformat(),
        'quantity_received': receipt_data.quantity_received,
        'received_by': receipt_data.received_by,
        'notes': receipt_data.notes
    }
    
    if 'delivery_history' not in item:
        item['delivery_history'] = []
    item['delivery_history'].append(delivery_record)
    
    # Update quantity received
    item['quantity_received'] = new_total_received
    items[receipt_data.item_index] = item
    
    # Update the PO
    result = await db.purchase_orders.update_one(
        {'id': po_id},
        {'$set': {'items': items}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    # Check if all items are fully received
    all_received = all(item.get('quantity_received', 0) >= item['quantity'] for item in items)
    
    return {
        'message': 'Item receipt confirmed',
        'item_fully_received': new_total_received >= item['quantity'],
        'po_fully_received': all_received,
        'quantity_received': receipt_data.quantity_received,
        'total_received': new_total_received,
        'pending': item['quantity'] - new_total_received
    }

# Notification endpoints
@api_router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    notifications = await db.notifications.find({}, {'_id': 0}).sort('created_at', -1).to_list(100)
    for notification in notifications:
        if isinstance(notification.get('created_at'), str):
            notification['created_at'] = datetime.fromisoformat(notification['created_at'])
    return notifications

@api_router.patch("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    result = await db.notifications.update_one(
        {'id': notification_id},
        {'$set': {'is_read': True}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {'message': 'Notification marked as read'}

@api_router.post("/notifications/check-pending-pos")
async def check_pending_pos(current_user: dict = Depends(get_current_user)):
    """Check for POs older than 10 days and create notifications for pending items"""
    ten_days_ago = datetime.now(timezone.utc) - timedelta(days=10)
    
    # Find all POs created more than 10 days ago
    pos = await db.purchase_orders.find({}, {'_id': 0}).to_list(1000)
    
    notifications_created = 0
    for po in pos:
        created_at = datetime.fromisoformat(po['created_at']) if isinstance(po['created_at'], str) else po['created_at']
        
        if created_at <= ten_days_ago:
            # Check which items have pending quantities
            pending_items = []
            for idx, item in enumerate(po['items']):
                quantity_received = item.get('quantity_received', 0)
                pending_qty = item['quantity'] - quantity_received
                
                if pending_qty > 0:
                    pending_items.append({
                        'index': idx,
                        'product_name': item['product_name'],
                        'ordered': item['quantity'],
                        'received': quantity_received,
                        'pending': pending_qty
                    })
            
            # Create notification if there are pending items
            if pending_items:
                # Check if notification already exists for this PO
                existing = await db.notifications.find_one({
                    'po_id': po['id'],
                    'notification_type': 'material_pending',
                    'is_read': False
                })
                
                if not existing:
                    days_old = (datetime.now(timezone.utc) - created_at).days
                    pending_items_summary = ', '.join([f"{item['product_name']} ({item['pending']} pending)" for item in pending_items[:3]])
                    if len(pending_items) > 3:
                        pending_items_summary += f" and {len(pending_items) - 3} more"
                    
                    notification_doc = {
                        'id': str(uuid.uuid4()),
                        'po_id': po['id'],
                        'po_number': po['po_number'],
                        'message': f"Material receipt pending for {po['po_number']} ({days_old} days old). Pending items: {pending_items_summary}",
                        'notification_type': 'material_pending',
                        'pending_items': pending_items,
                        'is_read': False,
                        'created_at': datetime.now(timezone.utc).isoformat()
                    }
                    await db.notifications.insert_one(notification_doc)
                    notifications_created += 1
    
    return {
        'message': f'{notifications_created} new notifications created',
        'notifications_created': notifications_created
    }

@api_router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    count = await db.notifications.count_documents({'is_read': False})
    return {'unread_count': count}

# PDF Generation
@api_router.get("/purchase-orders/{po_id}/pdf")
async def generate_po_pdf(po_id: str, current_user: dict = Depends(get_current_user)):
    po = await db.purchase_orders.find_one({'id': po_id}, {'_id': 0})
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=0.75*inch, leftMargin=0.75*inch, topMargin=0.75*inch, bottomMargin=0.75*inch)
    
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle('Title', parent=styles['Heading1'], fontSize=24, textColor=colors.HexColor('#0047AB'), alignment=TA_CENTER)
    heading_style = ParagraphStyle('Heading', parent=styles['Heading2'], fontSize=14, textColor=colors.HexColor('#0047AB'))
    normal_style = styles['Normal']
    
    story = []
    
    # Title
    story.append(Paragraph("PURCHASE ORDER", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # PO Info
    created_at = datetime.fromisoformat(po['created_at']) if isinstance(po['created_at'], str) else po['created_at']
    info_data = [
        ['PO Number:', po['po_number'], 'Date:', created_at.strftime('%Y-%m-%d')],
        ['Status:', po['status'].upper(), 'Created By:', po['created_by']]
    ]
    info_table = Table(info_data, colWidths=[1.5*inch, 2*inch, 1*inch, 2*inch])
    info_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(info_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Vendor Info
    story.append(Paragraph("Vendor Information", heading_style))
    story.append(Spacer(1, 0.1*inch))
    vendor_data = [
        ['Vendor:', po['vendor_name']],
        ['Shipping Address:', po['shipping_address']],
        ['Delivery Date:', po['delivery_date']],
        ['Payment Terms:', po['payment_terms']]
    ]
    vendor_table = Table(vendor_data, colWidths=[1.5*inch, 5*inch])
    vendor_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(vendor_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Items
    story.append(Paragraph("Line Items", heading_style))
    story.append(Spacer(1, 0.1*inch))
    
    items_data = [['#', 'Product', 'Qty', 'Unit Price', 'Tax Rate', 'Tax Amt', 'Total']]
    for idx, item in enumerate(po['items'], 1):
        items_data.append([
            str(idx),
            item['product_name'],
            str(item['quantity']),
            f"₹{item['unit_price']:.2f}",
            f"{item['tax_rate']}%",
            f"₹{item['tax_amount']:.2f}",
            f"₹{item['total']:.2f}"
        ])
    
    items_table = Table(items_data, colWidths=[0.4*inch, 2.2*inch, 0.6*inch, 1*inch, 0.8*inch, 0.9*inch, 1*inch])
    items_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0047AB')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(items_table)
    story.append(Spacer(1, 0.2*inch))
    
    # Totals
    totals_data = [
        ['Subtotal:', f"₹{po['subtotal']:.2f}"],
        ['Tax:', f"₹{po['tax']:.2f}"],
        ['Total:', f"₹{po['total']:.2f}"]
    ]
    totals_table = Table(totals_data, colWidths=[5.5*inch, 1*inch])
    totals_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTNAME', (0, 2), (-1, 2), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 12),
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('LINEABOVE', (0, 2), (-1, 2), 2, colors.HexColor('#0047AB')),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(totals_table)
    
    # Notes
    if po.get('notes'):
        story.append(Spacer(1, 0.3*inch))
        story.append(Paragraph("Notes", heading_style))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(po['notes'], normal_style))
    
    # Authorized Signatory
    if po.get('authorized_signatory'):
        story.append(Spacer(1, 0.4*inch))
        story.append(Paragraph("Authorized Signatory", heading_style))
        story.append(Spacer(1, 0.1*inch))
        story.append(Paragraph(po['authorized_signatory'], normal_style))
        story.append(Spacer(1, 0.5*inch))
        story.append(Paragraph("_________________________", normal_style))
        story.append(Paragraph("Signature", ParagraphStyle('Small', parent=styles['Normal'], fontSize=8, textColor=colors.grey)))
    
    doc.build(story)
    buffer.seek(0)
    
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={po['po_number']}.pdf"}
    )

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
