import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './lib/auth';
import { ThemeProvider } from './lib/theme';
import { ProtectedRoute } from './components/ProtectedRoute';
import AIChatbot from './components/AIChatbot';

// Website
import HomePage from './pages/website/HomePage';
import ServicesPage from './pages/website/ServicesPage';
import AboutPage from './pages/website/AboutPage';
import FAQsPage from './pages/website/FAQsPage';
import BlogPage from './pages/website/BlogPage';
import ContactPage from './pages/website/ContactPage';
import BookServicePage from './pages/website/BookServicePage';

// Auth
import AdminLoginPage from './pages/auth/AdminLoginPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import StaffLoginPage from './pages/auth/StaffLoginPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminBookingsPage from './pages/admin/AdminBookingsPage';
import AdminCustomersPage from './pages/admin/AdminCustomersPage';
import AdminServicesPage from './pages/admin/AdminServicesPage';
import AdminInvoicesPage from './pages/admin/AdminInvoicesPage';
import AdminMessagingPage from './pages/admin/AdminMessagingPage';
import AdminPartsPage from './pages/admin/AdminPartsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminCouponsPage from './pages/admin/AdminCouponsPage';
import AdminContentPage from './pages/admin/AdminContentPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminBranchesPage from './pages/admin/AdminBranchesPage';
import AdminTicketsPage from './pages/admin/AdminTicketsPage';
import AdminExpensesPage from './pages/admin/AdminExpensesPage';
import AdminPaymentsPage from './pages/admin/AdminPaymentsPage';
import AdminAuditPage from './pages/admin/AdminAuditPage';
import AdminCampaignsPage from './pages/admin/AdminCampaignsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminFeedbackPage from './pages/admin/AdminFeedbackPage';

// Customer
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerBookServicePage from './pages/customer/BookServicePage';
import CustomerBookingsPage from './pages/customer/BookingsPage';
import CustomerVehiclesPage from './pages/customer/VehiclesPage';
import CustomerInvoicesPage from './pages/customer/CustomerInvoicesPage';
import CustomerProfilePage from './pages/customer/CustomerProfilePage';
import CustomerNotificationsPage from './pages/customer/NotificationsPage';
import CustomerServiceHistoryPage from './pages/customer/ServiceHistoryPage';
import CustomerSupportPage from './pages/customer/SupportPage';
import CustomerLoyaltyPage from './pages/customer/LoyaltyPage';
import CustomerMembershipPage from './pages/customer/MembershipPage';
import CustomerReferPage from './pages/customer/ReferPage';
import CustomerRemindersPage from './pages/customer/RemindersPage';
import CustomerWarrantyPage from './pages/customer/WarrantyPage';
import CustomerFuelTrackerPage from './pages/customer/FuelTrackerPage';
import CustomerEmergencyPage from './pages/customer/EmergencyPage';

// Garage
import GarageDashboard from './pages/garage/GarageDashboard';
import GarageBookingsPage from './pages/garage/GarageBookingsPage';
import GarageCustomersPage from './pages/garage/GarageCustomersPage';
import GarageInvoicesPage from './pages/garage/GarageInvoicesPage';
import GarageJobCardsPage from './pages/garage/JobCardsPage';
import GarageSparePartsPage from './pages/garage/SparePartsPage';
import GarageSuppliersPage from './pages/garage/SuppliersPage';
import GaragePurchaseOrdersPage from './pages/garage/PurchaseOrdersPage';
import GarageInspectionPage from './pages/garage/InspectionPage';
import GarageQueuePage from './pages/garage/QueuePage';
import GaragePackagesPage from './pages/garage/PackagesPage';
import GarageAttendancePage from './pages/garage/AttendancePage';

// Payment
import PaymentPage from './pages/payment/PaymentPage';

const customer = (el: React.ReactNode) => <ProtectedRoute allowedRoles={['customer']} redirectTo="/login">{el}</ProtectedRoute>;
const garage = (el: React.ReactNode) => <ProtectedRoute allowedRoles={['staff', 'mechanic']} redirectTo="/garage/login">{el}</ProtectedRoute>;
const admin = (el: React.ReactNode) => <ProtectedRoute allowedRoles={['admin']} redirectTo="/admin/login">{el}</ProtectedRoute>;

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public Website */}
            <Route path="/" element={<HomePage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faqs" element={<FAQsPage />} />
            <Route path="/blog" element={<BlogPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/book" element={<BookServicePage />} />

            {/* Auth */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />
            <Route path="/garage/login" element={<StaffLoginPage />} />

            {/* Customer Portal */}
            <Route path="/customer/dashboard" element={customer(<CustomerDashboard />)} />
            <Route path="/customer/book" element={customer(<CustomerBookServicePage />)} />
            <Route path="/customer/bookings" element={customer(<CustomerBookingsPage />)} />
            <Route path="/customer/vehicles" element={customer(<CustomerVehiclesPage />)} />
            <Route path="/customer/invoices" element={customer(<CustomerInvoicesPage />)} />
            <Route path="/customer/profile" element={customer(<CustomerProfilePage />)} />
            <Route path="/customer/notifications" element={customer(<CustomerNotificationsPage />)} />
            <Route path="/customer/history" element={customer(<CustomerServiceHistoryPage />)} />
            <Route path="/customer/support" element={customer(<CustomerSupportPage />)} />
            <Route path="/customer/loyalty" element={customer(<CustomerLoyaltyPage />)} />
            <Route path="/customer/membership" element={customer(<CustomerMembershipPage />)} />
            <Route path="/customer/refer" element={customer(<CustomerReferPage />)} />
            <Route path="/customer/reminders" element={customer(<CustomerRemindersPage />)} />
            <Route path="/customer/warranty" element={customer(<CustomerWarrantyPage />)} />
            <Route path="/customer/fuel-tracker" element={customer(<CustomerFuelTrackerPage />)} />
            <Route path="/customer/emergency" element={customer(<CustomerEmergencyPage />)} />

            {/* Garage Portal */}
            <Route path="/garage/dashboard" element={garage(<GarageDashboard />)} />
            <Route path="/garage/bookings" element={garage(<GarageBookingsPage />)} />
            <Route path="/garage/customers" element={garage(<GarageCustomersPage />)} />
            <Route path="/garage/invoices" element={garage(<GarageInvoicesPage />)} />
            <Route path="/garage/job-cards" element={garage(<GarageJobCardsPage />)} />
            <Route path="/garage/parts" element={garage(<GarageSparePartsPage />)} />
            <Route path="/garage/suppliers" element={garage(<GarageSuppliersPage />)} />
            <Route path="/garage/purchase-orders" element={garage(<GaragePurchaseOrdersPage />)} />
            <Route path="/garage/inspection" element={garage(<GarageInspectionPage />)} />
            <Route path="/garage/queue" element={garage(<GarageQueuePage />)} />
            <Route path="/garage/packages" element={garage(<GaragePackagesPage />)} />
            <Route path="/garage/attendance" element={garage(<GarageAttendancePage />)} />

            {/* Payment */}
            <Route path="/payment" element={customer(<PaymentPage />)} />

            {/* Admin Dashboard */}
            <Route path="/admin/dashboard" element={admin(<AdminDashboard />)} />
            <Route path="/admin/bookings" element={admin(<AdminBookingsPage />)} />
            <Route path="/admin/customers" element={admin(<AdminCustomersPage />)} />
            <Route path="/admin/services" element={admin(<AdminServicesPage />)} />
            <Route path="/admin/invoices" element={admin(<AdminInvoicesPage />)} />
            <Route path="/admin/messaging" element={admin(<AdminMessagingPage />)} />
            <Route path="/admin/parts" element={admin(<AdminPartsPage />)} />
            <Route path="/admin/reports" element={admin(<AdminReportsPage />)} />
            <Route path="/admin/coupons" element={admin(<AdminCouponsPage />)} />
            <Route path="/admin/content" element={admin(<AdminContentPage />)} />
            <Route path="/admin/settings" element={admin(<AdminSettingsPage />)} />
            <Route path="/admin/branches" element={admin(<AdminBranchesPage />)} />
            <Route path="/admin/tickets" element={admin(<AdminTicketsPage />)} />
            <Route path="/admin/expenses" element={admin(<AdminExpensesPage />)} />
            <Route path="/admin/payments" element={admin(<AdminPaymentsPage />)} />
            <Route path="/admin/audit" element={admin(<AdminAuditPage />)} />
            <Route path="/admin/campaigns" element={admin(<AdminCampaignsPage />)} />
            <Route path="/admin/users" element={admin(<AdminUsersPage />)} />
            <Route path="/admin/feedback" element={admin(<AdminFeedbackPage />)} />

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <AIChatbot />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
}
