# Health Insurance Help Desk

A modern health insurance platform built with Next.js, Prisma, and TypeScript.

## Features

- **Optional Authentication**: Access public features without requiring an account
  - Browse insurance plans
  - Get instant quotes
  - Compare plans
  - Find network hospitals
  - Create an account to save quotes and manage policies
- **Multi-Factor Authentication**: Enhanced security with TOTP-based MFA
- **Quote Engine**: Sophisticated premium calculation based on multiple factors
  - Age-based risk assessment
  - Medical history evaluation
  - City tier pricing
  - Family size discounts
- **Plan Management**: Comprehensive insurance plan features
  - Multiple plan types (Individual, Family, Senior Citizen, Group)
  - Detailed benefits and coverage information
  - Network hospital integration
- **Hospital Network**: Extensive hospital database with search capabilities
- **Document Management**: Secure storage and handling of policy documents
- **Customer Portal**: Self-service features for policy holders
- **Agent Dashboard**: Tools for insurance agents
- **Admin Interface**: Complete platform management

## Getting Started

### Prerequisites

- Node.js 18.x or later
- PostgreSQL 14.x or later
- Redis (optional, for distributed rate limiting)

### Environment Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/health-insurance-help-desk.git
   cd health-insurance-help-desk
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/health_insurance"

   # Authentication
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-secret-key"

   # Stripe (for payments)
   STRIPE_SECRET_KEY="sk_test_..."
   STRIPE_WEBHOOK_SECRET="whsec_..."
   ```

4. Set up the database:
   ```bash
   # Run migrations
   npm run db:migrate

   # Seed the database
   npm run db:seed
   ```

### Development

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Testing

The project includes comprehensive test coverage:

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### Database Management

```bash
# Reset database (caution: deletes all data)
npm run db:reset

# Open Prisma Studio
npm run db:studio
```

## Architecture

### Authentication Flow

The platform implements a flexible authentication system:

1. **Public Access**:
   - Dashboard, plans, quotes, and hospitals are accessible without authentication
   - Anonymous users can generate quotes and compare plans
   - Rate limiting is based on IP address for anonymous users

2. **User Authentication**:
   - Email/password authentication
   - Optional MFA using TOTP (Google Authenticator compatible)
   - JWT-based session management
   - Role-based access control (Customer, Agent, Admin, Manager)

3. **Protected Features**:
   - Policy management requires authentication
   - Quote storage and retrieval
   - Document access and management
   - Customer support tickets

### Quote Engine

The quote calculation engine considers multiple factors:

1. **Risk Assessment**:
   - Age-based risk factors
   - Medical history evaluation
   - City tier categorization

2. **Pricing Factors**:
   - Base premium calculation
   - Risk multipliers
   - Location-based adjustments
   - Family size discounts

3. **Plan Recommendations**:
   - Coverage amount matching
   - Risk profile alignment
   - Budget considerations

## API Routes

### Public APIs

- `GET /api/plans` - List available insurance plans
- `GET /api/hospitals` - Search network hospitals
- `POST /api/quote` - Generate insurance quote
- `POST /api/compare` - Compare multiple plans

### Protected APIs

- `GET /api/customer/policies` - List user's policies
- `GET /api/customer/claims` - List user's claims
- `POST /api/customer/tickets` - Create support ticket
- `GET /api/documents/generate` - Generate policy documents

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
