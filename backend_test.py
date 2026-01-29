import requests
import sys
import json
from datetime import datetime, timedelta

class PurchaseOrderAPITester:
    def __init__(self, base_url="https://order-factory.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_data = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.test_vendor_id = None
        self.test_product_id = None
        self.test_po_id = None

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        
        if headers:
            test_headers.update(headers)

        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers)
            elif method == 'PATCH':
                response = requests.patch(url, json=data, headers=test_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers)

            success = response.status_code == expected_status
            
            if success:
                self.log_test(name, True)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                self.log_test(name, False, f"Expected {expected_status}, got {response.status_code}")
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Error: {str(e)}")
            return False, {}

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime('%H%M%S')
        test_user = {
            "username": f"testuser_{timestamp}",
            "password": "TestPass123!",
            "full_name": f"Test User {timestamp}"
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_data = response['user']
            return True
        return False

    def test_user_login(self):
        """Test user login with existing credentials"""
        if not self.user_data:
            return False
            
        login_data = {
            "username": self.user_data['username'],
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_get_current_user(self):
        """Test get current user endpoint"""
        success, response = self.run_test(
            "Get Current User",
            "GET",
            "auth/me",
            200
        )
        return success

    def test_create_vendor(self):
        """Test vendor creation"""
        vendor_data = {
            "name": "Test Vendor Corp",
            "contact_person": "John Doe",
            "email": "john@testvendor.com",
            "phone": "+1-555-0123",
            "address": "123 Test Street, Test City, TC 12345"
        }
        
        success, response = self.run_test(
            "Create Vendor",
            "POST",
            "vendors",
            200,
            data=vendor_data
        )
        
        if success and 'id' in response:
            self.test_vendor_id = response['id']
            return True
        return False

    def test_get_vendors(self):
        """Test get all vendors"""
        success, response = self.run_test(
            "Get Vendors",
            "GET",
            "vendors",
            200
        )
        return success

    def test_update_vendor(self):
        """Test vendor update"""
        if not self.test_vendor_id:
            return False
            
        updated_data = {
            "name": "Updated Test Vendor Corp",
            "contact_person": "Jane Doe",
            "email": "jane@testvendor.com",
            "phone": "+1-555-0124",
            "address": "456 Updated Street, Test City, TC 12345"
        }
        
        success, response = self.run_test(
            "Update Vendor",
            "PUT",
            f"vendors/{self.test_vendor_id}",
            200,
            data=updated_data
        )
        return success

    def test_create_product(self):
        """Test product creation"""
        product_data = {
            "name": "Test Product",
            "sku": "TEST-001",
            "description": "A test product for API testing",
            "unit_price": 99.99,
            "unit_of_measure": "pcs"
        }
        
        success, response = self.run_test(
            "Create Product",
            "POST",
            "products",
            200,
            data=product_data
        )
        
        if success and 'id' in response:
            self.test_product_id = response['id']
            return True
        return False

    def test_get_products(self):
        """Test get all products"""
        success, response = self.run_test(
            "Get Products",
            "GET",
            "products",
            200
        )
        return success

    def test_update_product(self):
        """Test product update"""
        if not self.test_product_id:
            return False
            
        updated_data = {
            "name": "Updated Test Product",
            "sku": "TEST-001-UPD",
            "description": "An updated test product",
            "unit_price": 149.99,
            "unit_of_measure": "kg"
        }
        
        success, response = self.run_test(
            "Update Product",
            "PUT",
            f"products/{self.test_product_id}",
            200,
            data=updated_data
        )
        return success

    def test_create_purchase_order(self):
        """Test purchase order creation"""
        if not self.test_vendor_id or not self.test_product_id:
            return False
            
        delivery_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        po_data = {
            "vendor_id": self.test_vendor_id,
            "vendor_name": "Updated Test Vendor Corp",
            "items": [
                {
                    "product_id": self.test_product_id,
                    "product_name": "Updated Test Product",
                    "quantity": 10,
                    "unit_price": 149.99,
                    "total": 1499.90
                }
            ],
            "delivery_date": delivery_date,
            "payment_terms": "Net 30",
            "shipping_address": "456 Updated Street, Test City, TC 12345",
            "notes": "Test purchase order for API testing",
            "subtotal": 1499.90,
            "tax": 149.99,
            "total": 1649.89
        }
        
        success, response = self.run_test(
            "Create Purchase Order",
            "POST",
            "purchase-orders",
            200,
            data=po_data
        )
        
        if success and 'id' in response:
            self.test_po_id = response['id']
            return True
        return False

    def test_get_purchase_orders(self):
        """Test get all purchase orders"""
        success, response = self.run_test(
            "Get Purchase Orders",
            "GET",
            "purchase-orders",
            200
        )
        return success

    def test_get_purchase_order_detail(self):
        """Test get single purchase order"""
        if not self.test_po_id:
            return False
            
        success, response = self.run_test(
            "Get Purchase Order Detail",
            "GET",
            f"purchase-orders/{self.test_po_id}",
            200
        )
        return success

    def test_update_po_status(self):
        """Test purchase order status update"""
        if not self.test_po_id:
            return False
            
        status_data = {"status": "sent"}
        
        success, response = self.run_test(
            "Update PO Status",
            "PATCH",
            f"purchase-orders/{self.test_po_id}/status",
            200,
            data=status_data
        )
        return success

    def test_generate_po_pdf(self):
        """Test PDF generation"""
        if not self.test_po_id:
            return False
            
        url = f"{self.api_url}/purchase-orders/{self.test_po_id}/pdf"
        headers = {'Authorization': f'Bearer {self.token}'}
        
        try:
            response = requests.get(url, headers=headers)
            success = response.status_code == 200 and response.headers.get('content-type') == 'application/pdf'
            
            if success:
                self.log_test("Generate PO PDF", True)
                return True
            else:
                self.log_test("Generate PO PDF", False, f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
                return False
                
        except Exception as e:
            self.log_test("Generate PO PDF", False, f"Error: {str(e)}")
            return False

    def test_update_purchase_order(self):
        """Test purchase order update"""
        if not self.test_po_id:
            return False
            
        delivery_date = (datetime.now() + timedelta(days=45)).strftime('%Y-%m-%d')
        
        updated_po_data = {
            "vendor_id": self.test_vendor_id,
            "vendor_name": "Updated Test Vendor Corp",
            "items": [
                {
                    "product_id": self.test_product_id,
                    "product_name": "Updated Test Product",
                    "quantity": 15,
                    "unit_price": 149.99,
                    "total": 2249.85
                }
            ],
            "delivery_date": delivery_date,
            "payment_terms": "Net 60",
            "shipping_address": "789 Final Street, Test City, TC 12345",
            "notes": "Updated test purchase order",
            "subtotal": 2249.85,
            "tax": 224.99,
            "total": 2474.84
        }
        
        success, response = self.run_test(
            "Update Purchase Order",
            "PUT",
            f"purchase-orders/{self.test_po_id}",
            200,
            data=updated_po_data
        )
        return success

    def cleanup_test_data(self):
        """Clean up test data"""
        print("\n🧹 Cleaning up test data...")
        
        # Delete purchase order
        if self.test_po_id:
            self.run_test("Delete Purchase Order", "DELETE", f"purchase-orders/{self.test_po_id}", 200)
        
        # Delete product
        if self.test_product_id:
            self.run_test("Delete Product", "DELETE", f"products/{self.test_product_id}", 200)
        
        # Delete vendor
        if self.test_vendor_id:
            self.run_test("Delete Vendor", "DELETE", f"vendors/{self.test_vendor_id}", 200)

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Purchase Order API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)

        # Authentication tests
        if not self.test_user_registration():
            print("❌ Registration failed, stopping tests")
            return False

        if not self.test_user_login():
            print("❌ Login failed, stopping tests")
            return False

        self.test_get_current_user()

        # Vendor tests
        if not self.test_create_vendor():
            print("❌ Vendor creation failed, stopping tests")
            return False

        self.test_get_vendors()
        self.test_update_vendor()

        # Product tests
        if not self.test_create_product():
            print("❌ Product creation failed, stopping tests")
            return False

        self.test_get_products()
        self.test_update_product()

        # Purchase Order tests
        if not self.test_create_purchase_order():
            print("❌ Purchase Order creation failed, stopping tests")
            return False

        self.test_get_purchase_orders()
        self.test_get_purchase_order_detail()
        self.test_update_po_status()
        self.test_generate_po_pdf()
        self.test_update_purchase_order()

        # Cleanup
        self.cleanup_test_data()

        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Tests completed: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return True
        else:
            print("⚠️  Some tests failed")
            return False

def main():
    tester = PurchaseOrderAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())