# Smart QR-Based Pre-Order System for College Canteens

## 1. Abstract
In a fast-paced college environment, canteen operations during peak break hours are difficult to manage due to long queues, limited time, and inefficient manual ordering processes. Traditional ordering methods cause overcrowding and delayed service.

This project proposes a **Smart QR-Based Pre-Order System for College Canteens**, a mobile-friendly web platform that allows students to browse a digital menu, place pre-orders, select pickup slots, and choose a payment method (online payment, student wallet, or pay at pickup).

After order placement, the system generates a unique QR code for secure and quick verification at pickup. Canteen staff scan the QR code to validate the order and confirm payment before marking it as **Collected**. The platform includes live order tracking, estimated preparation time, budget filters, QR-based self-cancellation before preparation, and post-pickup ratings.

An admin dashboard supports order management, pickup-slot monitoring, status updates, and basic sales/rating analytics. By integrating QR technology with digital pre-ordering, the system reduces rush-hour congestion, improves efficiency, and enhances the student experience.

## 2. Scope
The system includes:
- Student-facing mobile-responsive web app
- Admin dashboard for canteen staff/administrators
- QR-based order validation at pickup
- Multi-mode payment support
- Order lifecycle tracking and feedback capture

## 3. Actors and Roles
- **Student**: Browses menu, places orders, tracks status, cancels within allowed window, submits rating.
- **Admin/Staff**: Manages menu/orders, updates statuses, verifies pickup/payment, views analytics.

Role-based access control applies for Student and Admin.

## 4. Functional Requirements
Note: `FR2` and `FR3` are intentionally excluded as requested.

### 4.1 User Authentication (Mobile Number Login)
- **FR1**: The system shall allow students to log in using their mobile number.
- **FR4**: The system shall allow users to log out securely.
- **FR5**: The system shall maintain role-based access (Student/Admin).

### 4.2 Pre-Order Website
- **FR6**: The system shall provide a mobile-responsive website.
- **FR7**: The system shall allow students to browse the digital menu.
- **FR8**: The system shall allow item selection and quantity updates.
- **FR9**: The system shall allow scheduled pickup time selection.
- **FR10**: The system shall display estimated preparation time before confirmation.
- **FR11**: The system shall provide budget filters:
  - Under ₹50
  - Under ₹100
  - Best Combo Under ₹80

### 4.3 Payment System
- **FR12**: The system shall support online payments (PhonePe, Google Pay, PayU).
- **FR13**: The system shall support a student wallet system.
- **FR14**: The system shall allow “Pay at Pickup” as a payment option.
- **FR15**: If “Pay at Pickup” is selected, staff shall confirm payment before marking the order as **Collected**.

### 4.4 QR Code Integration
- **FR16**: The system shall generate a unique QR code after order placement.
- **FR17**: Staff shall scan the QR code at the pickup counter.
- **FR18**: The system shall update order status to **Collected** after successful verification and payment confirmation.
- **FR19**: Quick Access QR codes shall open the website instantly when scanned.

### 4.5 Order Tracking and Cancellation
- **FR20**: The system shall provide live order status tracking: **Received -> Preparing -> Ready -> Collected**.
- **FR21**: The system shall notify students when the order is ready via SMS/Email.
- **FR22**: The system shall notify students before preparation begins and allow cancellation within a defined window (2-3 minutes). If no cancellation is made within this period, the order status shall automatically update to **Preparing**.

### 4.6 Feedback and Rating
- **FR23**: The system shall allow students to submit quick ratings (1-5 stars) after pickup.

### 4.7 Admin Dashboard
- **FR24**: The system shall allow administrators to manage orders.
- **FR25**: The system shall allow administrators to update order statuses.
- **FR26**: The system shall display scheduled pickup slots.
- **FR27**: The system shall provide basic sales and rating analytics.

## 5. Core Process Flows

### 5.1 Student Order Flow
1. Student logs in using mobile number.
2. Student browses menu and selects items/quantities.
3. Student selects pickup time slot.
4. System displays estimated preparation time and total amount.
5. Student chooses payment method and confirms order.
6. System generates unique order ID and QR code.
7. Student tracks status in real time.
8. Student picks up food by showing QR code.
9. Staff verify QR and payment, then mark order as **Collected**.
10. Student submits post-pickup rating.

### 5.2 Cancellation Flow
1. After order placement, system starts cancellation window timer (2-3 minutes).
2. Student may cancel within the allowed window.
3. If not canceled, status auto-updates from **Received** to **Preparing**.
4. Cancellation is blocked once preparation starts.

### 5.3 Pickup Verification Flow
1. Staff scans student QR code.
2. System fetches order and payment state.
3. For pay-at-pickup orders, staff confirms payment received.
4. System updates order status to **Collected**.

## 6. Business Rules
- Each order shall have a unique order ID and unique QR token.
- QR token validity shall be tied to the order and expire after collection/cancellation.
- Orders in **Preparing** or **Ready** state are non-cancellable.
- An order can only transition to **Collected** after payment validation.
- Rating is enabled only for collected orders.

## 7. Recommended Non-Functional Requirements
- **Performance**: Menu pages should load within 3 seconds on average mobile networks.
- **Availability**: System should support peak lunch-hour concurrency.
- **Security**: Role-based authorization and secure session handling are required.
- **Usability**: Mobile-first design with minimal taps for checkout.
- **Reliability**: Status updates should reflect near real-time processing.

## 8. Suggested Data Entities
- **User**: user_id, name, mobile_no, role, wallet_balance
- **MenuItem**: item_id, name, category, price, prep_time, active
- **Order**: order_id, user_id, total_amount, payment_method, payment_status, order_status, pickup_slot, created_at
- **OrderItem**: order_item_id, order_id, item_id, qty, item_price
- **QRCode**: qr_id, order_id, qr_token, generated_at, expires_at, scan_count
- **Notification**: notif_id, user_id, order_id, channel (SMS/Email), message, sent_at
- **Rating**: rating_id, order_id, user_id, stars, comment, created_at

## 9. Acceptance Criteria Summary
- Students can place pre-orders and receive QR codes for pickup.
- Staff can verify orders via QR scan and payment check.
- Order states follow the defined lifecycle without invalid transitions.
- Cancellation works only within pre-preparation window.
- Admin can monitor orders, slots, and analytics.
- Rating is possible only after successful collection.

## 10. Out of Scope (Current Version)
- Advanced recommendation engine
- Dynamic surge pricing
- Multi-canteen federation
- Inventory forecasting with ML
