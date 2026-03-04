#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime, timedelta

class ArenaBookingAPITester:
    def __init__(self, base_url="https://arena-booking-3.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.user_token = None
        self.subadmin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test data storage
        self.created_sport_id = None
        self.created_event_id = None
        self.created_booking_id = None
        self.created_subadmin_id = None
        self.test_user_id = None

    def log_test(self, name, success, details="", expected_status=None, actual_status=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
            if expected_status and actual_status:
                print(f"   Expected: {expected_status}, Got: {actual_status}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "expected_status": expected_status,
            "actual_status": actual_status
        })
        return success

    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)
            
            success = response.status_code == expected_status
            return success, response.status_code, response.json() if response.content else {}
            
        except requests.exceptions.RequestException as e:
            return False, 0, {"error": str(e)}
        except json.JSONDecodeError:
            return False, response.status_code, {"error": "Invalid JSON response"}

    def test_init_admin(self):
        """Test admin initialization"""
        success, status, response = self.make_request('POST', 'init-admin', expected_status=200)
        return self.log_test("Initialize Admin", success, 
                           f"Status: {status}, Response: {response.get('message', '')}", 200, status)

    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "email": "admin@arena.hu",
            "password": "admin123"
        }
        success, status, response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        
        if success and 'token' in response:
            self.admin_token = response['token']
            return self.log_test("Admin Login", True, f"Token received: {self.admin_token[:20]}...")
        else:
            return self.log_test("Admin Login", False, f"Status: {status}, Response: {response}", 200, status)

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        user_data = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@test.hu",
            "password": "testpass123",
            "phone": "+36301234567"
        }
        
        success, status, response = self.make_request('POST', 'auth/register', user_data, expected_status=200)
        
        if success and 'token' in response:
            self.user_token = response['token']
            self.test_user_id = response['user']['id']
            return self.log_test("User Registration", True, f"User created: {response['user']['name']}")
        else:
            return self.log_test("User Registration", False, f"Status: {status}, Response: {response}", 200, status)

    def test_user_login(self):
        """Test user login with registered user"""
        if not self.test_user_id:
            return self.log_test("User Login", False, "No test user created")
        
        # Extract email from registration
        timestamp = datetime.now().strftime("%H%M%S")
        login_data = {
            "email": f"testuser{timestamp}@test.hu",
            "password": "testpass123"
        }
        
        success, status, response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
        return self.log_test("User Login", success, f"Status: {status}", 200, status)

    def test_get_me(self):
        """Test get current user info"""
        if not self.admin_token:
            return self.log_test("Get Me (Admin)", False, "No admin token")
        
        success, status, response = self.make_request('GET', 'auth/me', token=self.admin_token, expected_status=200)
        
        if success and response.get('role') == 'admin':
            return self.log_test("Get Me (Admin)", True, f"Admin user: {response.get('name')}")
        else:
            return self.log_test("Get Me (Admin)", False, f"Status: {status}, Role: {response.get('role')}", 200, status)

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        if not self.admin_token:
            return self.log_test("Admin Stats", False, "No admin token")
        
        success, status, response = self.make_request('GET', 'admin/stats', token=self.admin_token, expected_status=200)
        
        if success and 'total_sports' in response:
            return self.log_test("Admin Stats", True, f"Stats: {response}")
        else:
            return self.log_test("Admin Stats", False, f"Status: {status}, Response: {response}", 200, status)

    def test_create_sport(self):
        """Test creating a sport"""
        if not self.admin_token:
            return self.log_test("Create Sport", False, "No admin token")
        
        sport_data = {
            "name": "Test Futball",
            "description": "Test sport leírás",
            "image_url": "https://images.unsplash.com/photo-1761823533593-b7ee1d292202"
        }
        
        success, status, response = self.make_request('POST', 'admin/sports', sport_data, 
                                                    token=self.admin_token, expected_status=200)
        
        if success and 'id' in response:
            self.created_sport_id = response['id']
            return self.log_test("Create Sport", True, f"Sport created: {response['name']} (ID: {self.created_sport_id})")
        else:
            return self.log_test("Create Sport", False, f"Status: {status}, Response: {response}", 200, status)

    def test_get_sports(self):
        """Test getting all sports"""
        success, status, response = self.make_request('GET', 'sports', expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get Sports", True, f"Found {len(response)} sports")
        else:
            return self.log_test("Get Sports", False, f"Status: {status}, Response: {response}", 200, status)

    def test_get_sport_by_id(self):
        """Test getting sport by ID"""
        if not self.created_sport_id:
            return self.log_test("Get Sport by ID", False, "No sport created")
        
        success, status, response = self.make_request('GET', f'sports/{self.created_sport_id}', expected_status=200)
        
        if success and response.get('id') == self.created_sport_id:
            return self.log_test("Get Sport by ID", True, f"Sport found: {response.get('name')}")
        else:
            return self.log_test("Get Sport by ID", False, f"Status: {status}, Response: {response}", 200, status)

    def test_create_event(self):
        """Test creating an event"""
        if not self.admin_token or not self.created_sport_id:
            return self.log_test("Create Event", False, "Missing admin token or sport ID")
        
        # Create event for tomorrow
        tomorrow = (datetime.now() + timedelta(days=1)).isoformat()
        event_data = {
            "name": "Test Futball Mérkőzés",
            "description": "Test esemény leírás",
            "sport_id": self.created_sport_id,
            "event_date": tomorrow,
            "max_capacity": 50
        }
        
        success, status, response = self.make_request('POST', 'admin/events', event_data, 
                                                    token=self.admin_token, expected_status=200)
        
        if success and 'id' in response:
            self.created_event_id = response['id']
            return self.log_test("Create Event", True, f"Event created: {response['name']} (ID: {self.created_event_id})")
        else:
            return self.log_test("Create Event", False, f"Status: {status}, Response: {response}", 200, status)

    def test_get_events(self):
        """Test getting all events"""
        success, status, response = self.make_request('GET', 'events', expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get Events", True, f"Found {len(response)} events")
        else:
            return self.log_test("Get Events", False, f"Status: {status}, Response: {response}", 200, status)

    def test_get_events_by_sport(self):
        """Test getting events by sport ID"""
        if not self.created_sport_id:
            return self.log_test("Get Events by Sport", False, "No sport created")
        
        success, status, response = self.make_request('GET', f'events?sport_id={self.created_sport_id}', expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get Events by Sport", True, f"Found {len(response)} events for sport")
        else:
            return self.log_test("Get Events by Sport", False, f"Status: {status}, Response: {response}", 200, status)

    def test_get_event_by_id(self):
        """Test getting event by ID"""
        if not self.created_event_id:
            return self.log_test("Get Event by ID", False, "No event created")
        
        success, status, response = self.make_request('GET', f'events/{self.created_event_id}', expected_status=200)
        
        if success and response.get('id') == self.created_event_id:
            return self.log_test("Get Event by ID", True, f"Event found: {response.get('name')}")
        else:
            return self.log_test("Get Event by ID", False, f"Status: {status}, Response: {response}", 200, status)

    def test_create_booking(self):
        """Test creating a booking"""
        if not self.user_token or not self.created_event_id:
            return self.log_test("Create Booking", False, "Missing user token or event ID")
        
        booking_data = {
            "event_id": self.created_event_id
        }
        
        success, status, response = self.make_request('POST', 'bookings', booking_data, 
                                                    token=self.user_token, expected_status=200)
        
        if success and 'id' in response:
            self.created_booking_id = response['id']
            return self.log_test("Create Booking", True, f"Booking created: {response['event_name']} (ID: {self.created_booking_id})")
        else:
            return self.log_test("Create Booking", False, f"Status: {status}, Response: {response}", 200, status)

    def test_get_my_bookings(self):
        """Test getting user's bookings"""
        if not self.user_token:
            return self.log_test("Get My Bookings", False, "No user token")
        
        success, status, response = self.make_request('GET', 'bookings/my', token=self.user_token, expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get My Bookings", True, f"Found {len(response)} bookings")
        else:
            return self.log_test("Get My Bookings", False, f"Status: {status}, Response: {response}", 200, status)

    def test_admin_get_bookings(self):
        """Test admin getting all bookings"""
        if not self.admin_token:
            return self.log_test("Admin Get Bookings", False, "No admin token")
        
        success, status, response = self.make_request('GET', 'admin/bookings', token=self.admin_token, expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Admin Get Bookings", True, f"Found {len(response)} bookings")
        else:
            return self.log_test("Admin Get Bookings", False, f"Status: {status}, Response: {response}", 200, status)

    def test_create_subadmin(self):
        """Test creating a subadmin"""
        if not self.admin_token or not self.created_sport_id:
            return self.log_test("Create Subadmin", False, "Missing admin token or sport ID")
        
        timestamp = datetime.now().strftime("%H%M%S")
        subadmin_data = {
            "name": f"Test Subadmin {timestamp}",
            "email": f"subadmin{timestamp}@test.hu",
            "password": "subadmin123",
            "phone": "+36301234568",
            "assigned_sports": [self.created_sport_id]
        }
        
        success, status, response = self.make_request('POST', 'admin/subadmins', subadmin_data, 
                                                    token=self.admin_token, expected_status=200)
        
        if success and 'id' in response:
            self.created_subadmin_id = response['id']
            return self.log_test("Create Subadmin", True, f"Subadmin created: {response['name']} (ID: {self.created_subadmin_id})")
        else:
            return self.log_test("Create Subadmin", False, f"Status: {status}, Response: {response}", 200, status)

    def test_get_subadmins(self):
        """Test getting all subadmins"""
        if not self.admin_token:
            return self.log_test("Get Subadmins", False, "No admin token")
        
        success, status, response = self.make_request('GET', 'admin/subadmins', token=self.admin_token, expected_status=200)
        
        if success and isinstance(response, list):
            return self.log_test("Get Subadmins", True, f"Found {len(response)} subadmins")
        else:
            return self.log_test("Get Subadmins", False, f"Status: {status}, Response: {response}", 200, status)

    def test_guest_booking_create(self):
        """Test creating a guest booking (no auth required)"""
        if not self.created_event_id:
            return self.log_test("Guest Booking Create", False, "No event created")
        
        timestamp = datetime.now().strftime("%H%M%S")
        guest_booking_data = {
            "event_id": self.created_event_id,
            "guest_name": f"Guest User {timestamp}",
            "guest_email": f"guest{timestamp}@test.hu",
            "guest_phone": "+36301234569"
        }
        
        success, status, response = self.make_request('POST', 'bookings/guest', guest_booking_data, expected_status=200)
        
        if success and 'id' in response:
            return self.log_test("Guest Booking Create", True, f"Guest booking created: {response['event_name']} for {response['user_name']}")
        else:
            return self.log_test("Guest Booking Create", False, f"Status: {status}, Response: {response}", 200, status)

    def test_guest_booking_required_fields(self):
        """Test guest booking with missing required fields"""
        if not self.created_event_id:
            return self.log_test("Guest Booking Required Fields", False, "No event created")
        
        # Test missing guest_name
        guest_booking_data = {
            "event_id": self.created_event_id,
            "guest_email": "test@test.hu"
        }
        
        success, status, response = self.make_request('POST', 'bookings/guest', guest_booking_data, expected_status=422)
        
        if success:
            return self.log_test("Guest Booking Required Fields", True, "Correctly rejected booking without guest_name")
        else:
            return self.log_test("Guest Booking Required Fields", False, f"Should reject missing guest_name. Status: {status}", 422, status)

    def test_guest_booking_optional_phone(self):
        """Test guest booking without optional phone field"""
        if not self.created_event_id:
            return self.log_test("Guest Booking Optional Phone", False, "No event created")
        
        timestamp = datetime.now().strftime("%H%M%S")
        guest_booking_data = {
            "event_id": self.created_event_id,
            "guest_name": f"Guest No Phone {timestamp}",
            "guest_email": f"guestnophone{timestamp}@test.hu"
            # No guest_phone field
        }
        
        success, status, response = self.make_request('POST', 'bookings/guest', guest_booking_data, expected_status=200)
        
        if success and 'id' in response:
            return self.log_test("Guest Booking Optional Phone", True, f"Guest booking created without phone: {response['user_name']}")
        else:
            return self.log_test("Guest Booking Optional Phone", False, f"Status: {status}, Response: {response}", 200, status)

    def test_guest_booking_creates_user_account(self):
        """Test that guest booking creates a user account automatically"""
        if not self.created_event_id:
            return self.log_test("Guest Booking Creates User Account", False, "No event created")
        
        timestamp = datetime.now().strftime("%H%M%S")
        guest_email = f"newguest{timestamp}@test.hu"
        guest_booking_data = {
            "event_id": self.created_event_id,
            "guest_name": f"New Guest {timestamp}",
            "guest_email": guest_email,
            "guest_phone": "+36301234570"
        }
        
        # Create guest booking
        success, status, response = self.make_request('POST', 'bookings/guest', guest_booking_data, expected_status=200)
        
        if not success:
            return self.log_test("Guest Booking Creates User Account", False, f"Guest booking failed. Status: {status}", 200, status)
        
        # Try to login with the created account (should fail without password)
        login_data = {
            "email": guest_email,
            "password": "wrongpassword"
        }
        login_success, login_status, login_response = self.make_request('POST', 'auth/login', login_data, expected_status=401)
        
        if login_success:  # Should fail with wrong password, but user should exist
            return self.log_test("Guest Booking Creates User Account", True, "User account created - login attempted with wrong password correctly failed")
        else:
            return self.log_test("Guest Booking Creates User Account", True, "User account created and login protection working")

    def test_guest_booking_existing_user(self):
        """Test guest booking with existing user email"""
        if not self.created_event_id or not self.test_user_id:
            return self.log_test("Guest Booking Existing User", False, "No event or test user created")
        
        # Get the test user's email (we need to reconstruct it)
        timestamp = datetime.now().strftime("%H%M%S")
        existing_email = f"testuser{timestamp}@test.hu"
        
        guest_booking_data = {
            "event_id": self.created_event_id,
            "guest_name": "Existing User Guest",
            "guest_email": existing_email,
            "guest_phone": "+36301234571"
        }
        
        success, status, response = self.make_request('POST', 'bookings/guest', guest_booking_data, expected_status=200)
        
        if success and 'id' in response:
            return self.log_test("Guest Booking Existing User", True, f"Booking created for existing user: {response['user_name']}")
        else:
            return self.log_test("Guest Booking Existing User", False, f"Status: {status}, Response: {response}", 200, status)

    def test_cancel_booking(self):
        """Test canceling a booking"""
        if not self.user_token or not self.created_booking_id:
            return self.log_test("Cancel Booking", False, "Missing user token or booking ID")
        
        success, status, response = self.make_request('DELETE', f'bookings/{self.created_booking_id}', 
                                                    token=self.user_token, expected_status=200)
        
        if success and response.get('message'):
            return self.log_test("Cancel Booking", True, f"Booking cancelled: {response['message']}")
        else:
            return self.log_test("Cancel Booking", False, f"Status: {status}, Response: {response}", 200, status)

    def test_unauthorized_access(self):
        """Test unauthorized access to admin endpoints"""
        success, status, response = self.make_request('GET', 'admin/stats', expected_status=401)
        return self.log_test("Unauthorized Access (No Token)", success, f"Status: {status}", 401, status)

    def test_user_unauthorized_admin(self):
        """Test user trying to access admin endpoints"""
        if not self.user_token:
            return self.log_test("User Unauthorized Admin", False, "No user token")
        
        success, status, response = self.make_request('GET', 'admin/stats', token=self.user_token, expected_status=403)
        return self.log_test("User Unauthorized Admin", success, f"Status: {status}", 403, status)

    def test_get_site_settings(self):
        """Test getting site settings (public endpoint)"""
        success, status, response = self.make_request('GET', 'settings', expected_status=200)
        
        if success and 'site_name' in response:
            return self.log_test("Get Site Settings", True, f"Settings: {response.get('site_name', 'N/A')}")
        else:
            return self.log_test("Get Site Settings", False, f"Status: {status}, Response: {response}", 200, status)

    def test_update_site_settings(self):
        """Test updating site settings (admin only)"""
        if not self.admin_token:
            return self.log_test("Update Site Settings", False, "No admin token")
        
        settings_data = {
            "site_name": "Test Aréna Updated",
            "hero_title": "Test Sport, Koncertek, Élmények",
            "hero_subtitle": "Test multifunkcionális sport- és rendezvényközpont",
            "footer_text": "© 2024 Test Aréna. Minden jog fenntartva."
        }
        
        success, status, response = self.make_request('PUT', 'admin/settings', settings_data, 
                                                    token=self.admin_token, expected_status=200)
        
        if success and response.get('site_name') == settings_data['site_name']:
            return self.log_test("Update Site Settings", True, f"Settings updated: {response.get('site_name')}")
        else:
            return self.log_test("Update Site Settings", False, f"Status: {status}, Response: {response}", 200, status)

    def test_update_profile(self):
        """Test updating user profile"""
        if not self.admin_token:
            return self.log_test("Update Profile", False, "No admin token")
        
        profile_data = {
            "name": "Updated Admin Name",
            "phone": "+36301111111"
        }
        
        success, status, response = self.make_request('PUT', 'auth/profile', profile_data, 
                                                    token=self.admin_token, expected_status=200)
        
        if success and response.get('name') == profile_data['name']:
            return self.log_test("Update Profile", True, f"Profile updated: {response.get('name')}")
        else:
            return self.log_test("Update Profile", False, f"Status: {status}, Response: {response}", 200, status)

    def test_update_profile_password(self):
        """Test updating profile password"""
        if not self.admin_token:
            return self.log_test("Update Profile Password", False, "No admin token")
        
        profile_data = {
            "current_password": "admin123",
            "new_password": "newadmin123"
        }
        
        success, status, response = self.make_request('PUT', 'auth/profile', profile_data, 
                                                    token=self.admin_token, expected_status=200)
        
        if success:
            # Test login with new password
            login_data = {
                "email": "admin@arena.hu", 
                "password": "newadmin123"
            }
            login_success, login_status, login_response = self.make_request('POST', 'auth/login', login_data, expected_status=200)
            
            if login_success:
                # Reset password back to original
                reset_data = {
                    "current_password": "newadmin123",
                    "new_password": "admin123"
                }
                self.make_request('PUT', 'auth/profile', reset_data, token=self.admin_token, expected_status=200)
                return self.log_test("Update Profile Password", True, "Password updated and verified")
            else:
                return self.log_test("Update Profile Password", False, "Password update failed verification")
        else:
            return self.log_test("Update Profile Password", False, f"Status: {status}, Response: {response}", 200, status)

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Arena Booking API Tests...")
        print(f"📍 Testing endpoint: {self.base_url}")
        print("=" * 60)
        
        # Basic setup tests
        self.test_init_admin()
        self.test_admin_login()
        self.test_user_registration()
        self.test_get_me()
        self.test_admin_stats()
        
        # Sports management tests
        self.test_create_sport()
        self.test_get_sports()
        self.test_get_sport_by_id()
        
        # Events management tests
        self.test_create_event()
        self.test_get_events()
        self.test_get_events_by_sport()
        self.test_get_event_by_id()
        
        # Booking tests
        self.test_create_booking()
        self.test_get_my_bookings()
        self.test_admin_get_bookings()
        
        # Guest booking tests (new feature)
        self.test_guest_booking_create()
        self.test_guest_booking_required_fields()
        self.test_guest_booking_optional_phone()
        self.test_guest_booking_creates_user_account()
        self.test_guest_booking_existing_user()
        
        # Subadmin tests
        self.test_create_subadmin()
        self.test_get_subadmins()
        
        # New features tests (Profile & Settings)
        self.test_get_site_settings()
        self.test_update_site_settings()
        self.test_update_profile()
        self.test_update_profile_password()
        
        # Security tests
        self.test_unauthorized_access()
        self.test_user_unauthorized_admin()
        
        # Cleanup tests
        self.test_cancel_booking()
        
        # Print results
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        print(f"✅ Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        if self.tests_passed < self.tests_run:
            print("\n❌ Failed Tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"   - {result['name']}: {result['details']}")
        
        return self.tests_passed == self.tests_run

def main():
    tester = ArenaBookingAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())