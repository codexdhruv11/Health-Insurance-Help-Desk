# Health Insurance Help Desk

A comprehensive health insurance platform built with Next.js, Prisma, and modern web technologies. This platform enables users to compare insurance plans, get quotes, manage policies, and interact with support agents.

## 🚀 Features

### Core Features
- **Quote Engine**: Compare insurance plans and get instant quotes
  - Risk assessment based on medical history
  - Family member coverage
  - Premium calculation with discounts
  - Plan recommendations
- **User Management**: Customer and support agent roles with authentication
  - Multi-factor authentication (TOTP)
  - Role-based access control
  - Session management
- **Policy Management**: Create, manage, and track insurance policies
  - Policy document generation
  - Coverage details
  - Premium payment tracking
- **Hospital Network**: Search hospitals by location, specialty, and network coverage
  - Geospatial search
  - Network status verification
  - Hospital ratings and reviews
- **Document Management**: Upload and manage insurance documents with S3 integration
  - Secure file upload with virus scanning
  - Document versioning
  - Access control
- **Payment Processing**: Stripe integration for secure payments
  - Premium payments
  - Refund processing
  - Payment history
- **Support System**: Ticket system for customer support
  - Priority-based routing
  - Status tracking
  - Resolution time monitoring
- **Claims Processing**: Submit and track insurance claims
  - Document upload
  - Status updates
  - Settlement tracking

### Security Features
- **Authentication**:
  - TOTP-based MFA
  - Password hashing with bcrypt
  - Session management with JWT
- **Authorization**:
  - Role-based access control
  - Resource-level permissions
  - API route protection
- **Data Protection**:
  - Input validation with Zod
  - XSS protection
  - CSRF prevention
- **File Security**:
  - Virus scanning
  - File type validation
  - Size restrictions
  - Deduplication
- **API Security**:
  - Rate limiting
  - Request validation
  - Error handling
- **Infrastructure**:
  - Secure headers
  - CORS configuration
  - SSL/TLS enforcement

## 🛠 Technology Stack

### Frontend
- **Framework**: Next.js 14, React 18
- **Styling**: TailwindCSS, CSS Modules
- **Components**: Radix UI, shadcn/ui
- **Forms**: React Hook Form, Zod
- **State**: React Context, SWR
- **Testing**: Jest, React Testing Library

### Backend
- **API**: Next.js API Routes
- **Database**: PostgreSQL, Prisma ORM
- **Authentication**: NextAuth.js
- **File Storage**: AWS S3
- **Email**: Nodemailer, React Email
- **PDF**: @react-pdf/renderer
- **Search**: PostgreSQL Full-text Search

### Infrastructure
- **Hosting**: Vercel
- **Database**: Supabase
- **Storage**: AWS S3
- **CDN**: Vercel Edge Network
- **Monitoring**: Sentry
- **Analytics**: Vercel Analytics

## 📋 Prerequisites

- Node.js 18+ and npm/yarn
- PostgreSQL 14+ database
- AWS account with S3 access
- Stripe account
- SMTP server
- Redis (optional, for rate limiting)

## 🚀 Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/your-username/health-insurance-help-desk.git
cd health-insurance-help-desk
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env.local
```

Required environment variables:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/health_insurance_db"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-here"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# AWS S3
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="your-access-key"
AWS_SECRET_ACCESS_KEY="your-secret-key"
AWS_S3_BUCKET="your-bucket-name"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_SECURE="false"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourapp.com"

# Redis (optional)
REDIS_URL="redis://localhost:6379"

# Security
UPLOAD_MAX_SIZE="10485760" # 10MB
ALLOWED_FILE_TYPES="application/pdf,image/jpeg,image/png"
RATE_LIMIT_WINDOW="60000" # 1 minute
RATE_LIMIT_MAX="100" # requests per window

# Application
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
NODE_ENV="development"
```

### 3. Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev

# Seed database
npm run db:seed
```

### 4. Start Development

```bash
npm run dev
```

## 🚢 Deployment

### Vercel Deployment

1. Push your code to GitHub
2. Import project in Vercel
3. Configure environment variables
4. Deploy

### Docker Deployment

1. Build image:
```bash
docker build -t health-insurance-help-desk .
```

2. Run container:
```bash
docker-compose up -d
```

### Database Migration (Production)

```bash
# Deploy migrations
npx prisma migrate deploy

# Verify deployment
npx prisma migrate status
```

## 📚 API Documentation

### Authentication

#### Login
```http
POST /api/auth/signin
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "mfaCode": "123456" // Optional
}
```

#### Register
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Quotes

#### Get Quote
```http
POST /api/quote
Content-Type: application/json

{
  "age": 30,
  "gender": "Male",
  "medicalConditions": ["Diabetes"],
  "location": {
    "city": "New York",
    "state": "NY",
    "pincode": "10001"
  }
}
```

### Plans

#### List Plans
```http
GET /api/plans?sort=popularity&type=individual
```

#### Plan Details
```http
GET /api/plans/{planId}
```

### Documents

#### Get Upload URL
```http
POST /api/documents/upload-url
Content-Type: application/json

{
  "fileName": "policy.pdf",
  "fileType": "application/pdf"
}
```

## 🧪 Testing

### Run Tests

```bash
# All tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Test Categories

- **Unit Tests**: Business logic and utilities
- **Integration Tests**: API endpoints
- **Component Tests**: UI components
- **E2E Tests**: User flows

### Test Files

```
tests/
├── setup.ts                 # Test setup and mocks
├── lib/
│   ├── quote-engine.test.ts # Quote calculation tests
│   └── auth.test.ts        # Authentication tests
├── api/
│   ├── auth.test.ts        # Auth API tests
│   └── quote.test.ts       # Quote API tests
└── ui/
    ├── quote-form.test.ts  # Quote form tests
    └── checkout.test.ts    # Checkout flow tests
```

## 🔒 Security

### Headers
```typescript
// Security headers in middleware.ts
const securityHeaders = {
  'Content-Security-Policy': "...",
  'X-Frame-Options': 'SAMEORIGIN',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': '...',
}
```

### Rate Limiting
```typescript
// Rate limiting with Redis
const rateLimit = new RateLimit({
  window: 60000, // 1 minute
  max: 100 // requests per window
})
```

### File Upload
- Maximum size: 10MB
- Allowed types: PDF, JPEG, PNG
- Virus scanning
- Deduplication
- Server-side encryption

## 📈 Monitoring

### Error Tracking
- Sentry integration
- Error boundaries
- API error logging

### Performance
- Vercel Analytics
- Core Web Vitals
- API response times

### Alerts
- Error rate thresholds
- Performance degradation
- Security incidents

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📄 License

MIT License - see LICENSE file

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org)
- [Prisma](https://prisma.io)
- [TailwindCSS](https://tailwindcss.com)
- [shadcn/ui](https://ui.shadcn.com)
