# WCPOS Customer Integration Guide

This document outlines the integration between wcpos-com (Next.js) and wcpos-medusa (MedusaJS) for unified customer management.

## Architecture Overview

### **Single Source of Truth: MedusaJS**
- **Primary Customer Data**: MedusaJS handles all e-commerce customer data (addresses, orders, payments)
- **Session Management**: wcpos-com handles authentication sessions and WCPOS-specific features
- **License Management**: Keygen integration via MedusaJS order completion triggers

### **Data Flow**
```
Customer Registration/Login → MedusaJS Customer → wcpos-com User Record → Session
Order Completion → MedusaJS → Keygen License Creation → Customer Notification
```

## Implementation Components

### 1. **MedusaJS Configuration** (`/workspace/wcpos-medusa/medusa-config.ts`)

OAuth providers are configured in MedusaJS:
```typescript
// Google OAuth
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  authProviders.push({
    resolve: '@medusajs/medusa/auth-google',
    id: 'google',
    options: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: 'https://wcpos.com/auth/google/callback',
    },
  })
}
```

### 2. **Database Schema Updates** (`/workspace/wcpos-com/src/services/core/database/schema.ts`)

Added MedusaJS customer reference:
```typescript
export const users = pgTable('users', {
  // ... existing fields
  medusaCustomerId: text('medusa_customer_id').unique(), // Reference to MedusaJS customer
  // ... rest of schema
})
```

### 3. **Service Layer Architecture**

#### **MedusaJS Client** (`/workspace/wcpos-com/src/services/medusa/medusa-client.ts`)
- Configured MedusaJS SDK for frontend communication
- TypeScript interfaces for customer, address, and order data

#### **MedusaJS Customer Service** (`/workspace/wcpos-com/src/services/medusa/customer-service.ts`)
- `createCustomer()` - Create new MedusaJS customer
- `authenticateCustomer()` - Login with MedusaJS
- `getCustomer()` - Retrieve customer with expanded data
- `updateCustomer()` - Update customer profile
- `addCustomerAddress()` - Manage customer addresses
- `getCustomerOrders()` - Retrieve order history
- `handleOAuthCustomer()` - OAuth customer creation/linking

#### **Unified Customer Service** (`/workspace/wcpos-com/src/services/customer/unified-customer-service.ts`)
- **Single Interface**: Combines wcpos-com and MedusaJS operations
- `registerCustomer()` - Creates both MedusaJS customer and wcpos-com user
- `loginCustomer()` - Authenticates with MedusaJS, creates wcpos-com session
- `handleOAuthLogin()` - OAuth flow with both systems
- `getCurrentCustomer()` - Returns unified customer data
- `getCustomerLicenses()` - Extracts licenses from MedusaJS order metadata

### 4. **OAuth Integration** (`/workspace/wcpos-com/src/app/api/auth/google/callback/route.ts`)

OAuth callback handlers that:
1. Exchange OAuth code for user data
2. Create/link MedusaJS customer
3. Create/update wcpos-com user record
4. Establish session

### 5. **UI Components**

#### **License Status** (`/workspace/wcpos-com/src/components/account/license-status.tsx`)
- Displays licenses from MedusaJS order metadata
- Shows license keys with copy functionality
- Links to order details

#### **Recent Orders** (`/workspace/wcpos-com/src/components/account/recent-orders.tsx`)
- Displays MedusaJS orders with proper formatting
- Shows order status, items, and totals
- Links to detailed order views

#### **Account Page** (`/workspace/wcpos-com/src/app/account/page.tsx`)
- Uses unified customer service
- Displays combined wcpos-com and MedusaJS data

## Customer Lifecycle

### **Registration Flow**
1. User registers on wcpos.com
2. `UnifiedCustomerService.registerCustomer()` called
3. MedusaJS customer created first
4. wcpos-com user record created with `medusaCustomerId` reference
5. Session established

### **OAuth Flow**
1. User clicks "Login with Google"
2. OAuth provider redirects to callback
3. `UnifiedCustomerService.handleOAuthLogin()` called
4. MedusaJS customer found/created
5. wcpos-com user record linked
6. Session established

### **Purchase Flow**
1. Customer purchases WCPOS Pro via MedusaJS checkout
2. Order completion triggers MedusaJS subscriber
3. Keygen license created and stored in order metadata
4. Customer receives license via email
5. License appears in customer account dashboard

### **License Management**
1. Licenses stored in MedusaJS order metadata
2. `UnifiedCustomerService.getCustomerLicenses()` extracts from orders
3. Displayed in account dashboard with copy/management features

## Environment Variables

### **MedusaJS** (wcpos-medusa)
```env
# OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=https://wcpos.com/auth/google/callback

GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=https://wcpos.com/auth/github/callback

# Keygen
KEYGEN_HOST=license.wcpos.com
KEYGEN_API_TOKEN=your_keygen_token
KEYGEN_POLICY_YEARLY_ID=your_yearly_policy_id
KEYGEN_POLICY_LIFETIME_ID=your_lifetime_policy_id
```

### **Next.js** (wcpos-com)
```env
# MedusaJS Integration
MEDUSA_API_URL=https://store-api.wcpos.com

# OAuth (for callback handling)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=https://wcpos.com
```

## Migration Strategy

### **Phase 1: Schema Update**
- Add `medusaCustomerId` to existing users table
- Deploy database migration

### **Phase 2: Service Integration**
- Deploy MedusaJS OAuth configuration
- Deploy unified customer service
- Test with new registrations

### **Phase 3: Data Migration**
- Create MedusaJS customers for existing wcpos-com users
- Link accounts via email matching
- Migrate any existing customer data

### **Phase 4: UI Updates**
- Update account dashboard components
- Test license display and order history
- Update registration/login flows

### **Phase 5: Cleanup**
- Remove redundant wcpos-com customer fields
- Optimize database queries
- Monitor performance

## Benefits of This Architecture

✅ **Single Source of Truth**: MedusaJS handles all e-commerce data
✅ **OAuth Support**: Native OAuth integration with multiple providers
✅ **License Integration**: Seamless license creation and management
✅ **Order History**: Complete order tracking and history
✅ **Address Management**: Built-in address management system
✅ **Scalability**: MedusaJS built for e-commerce scale
✅ **Separation of Concerns**: Clear boundaries between systems
✅ **Backward Compatibility**: Existing wcpos-com features preserved

## API Endpoints

### **Customer Management**
- `POST /api/auth/register` - Register new customer
- `POST /api/auth/login` - Login customer
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/github/callback` - GitHub OAuth callback

### **MedusaJS Store API**
- `POST /store/customers` - Create customer
- `POST /store/auth/customer` - Authenticate customer
- `GET /store/customers/me` - Get current customer
- `PUT /store/customers/me` - Update customer
- `GET /store/customers/me/orders` - Get customer orders
- `POST /store/customers/me/addresses` - Add customer address

## Testing Checklist

- [ ] New customer registration creates both MedusaJS customer and wcpos-com user
- [ ] OAuth login works with Google and GitHub
- [ ] Existing customers can login and see unified data
- [ ] License purchases create Keygen licenses
- [ ] Licenses appear in customer dashboard
- [ ] Order history displays correctly
- [ ] Address management works
- [ ] Customer profile updates sync between systems
- [ ] Session management works correctly
- [ ] Error handling for API failures

## Troubleshooting

### **Common Issues**

1. **OAuth Callback Errors**
   - Check callback URLs match in OAuth provider settings
   - Verify environment variables are set correctly

2. **MedusaJS Connection Issues**
   - Verify `MEDUSA_API_URL` is correct
   - Check MedusaJS server is running and accessible

3. **License Not Appearing**
   - Check MedusaJS order completion subscriber is working
   - Verify Keygen integration is configured
   - Check order metadata contains license information

4. **Customer Data Sync Issues**
   - Verify `medusaCustomerId` is set correctly
   - Check unified customer service error logs
   - Ensure database schema is up to date

This architecture provides a robust, scalable foundation for customer management that leverages the strengths of both systems while maintaining clean separation of concerns.