# Government Service Feedback System - Backend

This is the backend implementation for the Government Service Feedback System, a platform that allows citizens to provide feedback on government services and offices.

## Features

- User authentication with JWT and role-based access control
- Office management with hierarchical structure
- Review submission and management
- Sentiment analysis for reviews
- Service guides for government procedures
- Voting system for reviews
- Multi-language support (English and Amharic)

## Database Schema

The system uses PostgreSQL with the following tables:

1. **Users** - User accounts with role-based permissions
2. **Offices** - Government offices with hierarchical structure
3. **Reviews** - User feedback on government offices
4. **SentimentLogs** - Sentiment analysis results for reviews
5. **ServiceGuides** - Step-by-step guides for government services
6. **Votes** - User votes on reviews (helpful, not helpful, flag)

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get current user profile

### Users
- `GET /api/users` - Get all users (admin only)
- `GET /api/users/:userId` - Get user by ID
- `PUT /api/users/:userId` - Update user
- `PATCH /api/users/:userId/role` - Update user role (admin only)
- `DELETE /api/users/:userId` - Delete user

### Offices
- `GET /api/offices` - Get all offices
- `GET /api/offices/:officeId` - Get office by ID
- `POST /api/offices` - Create a new office (admin/official only)
- `PUT /api/offices/:officeId` - Update office (admin/official only)
- `DELETE /api/offices/:officeId` - Delete office (admin only)

### Reviews
- `GET /api/reviews` - Get all reviews (admin/official only)
- `GET /api/reviews/office/:officeId` - Get reviews by office
- `GET /api/reviews/user/:userId` - Get reviews by user
- `GET /api/reviews/:reviewId` - Get review by ID
- `POST /api/reviews` - Create a new review
- `PUT /api/reviews/:reviewId` - Update review
- `PATCH /api/reviews/:reviewId/status` - Update review status (admin/official only)
- `DELETE /api/reviews/:reviewId` - Delete review

### Service Guides
- `GET /api/service-guides` - Get all service guides
- `GET /api/service-guides/search` - Search service guides
- `GET /api/service-guides/office/:officeId` - Get service guides by office
- `GET /api/service-guides/:guideId` - Get service guide by ID
- `POST /api/service-guides` - Create a new service guide (admin/official only)
- `PUT /api/service-guides/:guideId` - Update service guide (admin/official only)
- `DELETE /api/service-guides/:guideId` - Delete service guide (admin/official only)

### Sentiment Analysis
- `POST /api/sentiment/analyze` - Analyze text sentiment
- `GET /api/sentiment/stats` - Get sentiment statistics (admin/official only)
- `GET /api/sentiment/sentiment/:sentiment` - Get sentiment logs by sentiment type (admin/official only)
- `GET /api/sentiment/category/:category` - Get sentiment logs by category (admin/official only)
- `GET /api/sentiment/language/:language` - Get sentiment logs by language (admin/official only)

### Votes
- `POST /api/votes/review/:reviewId` - Vote on a review (authenticated users only)
- `DELETE /api/votes/review/:reviewId` - Remove vote from a review (authenticated users only)
- `GET /api/votes/review/:reviewId` - Get votes for a review
- `GET /api/votes/flagged` - Get flagged reviews (admin/official only)

## Setup and Installation

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- PostGIS extension for PostgreSQL

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd Backend
   npm install
   ```
3. Create a `.env` file based on `.env.example`
4. Set up the PostgreSQL database:
   ```
   createdb government_feedback
   ```
5. Run database migrations:
   ```
   npm run migrate up
   ```
6. Start the server:
   ```
   npm run dev
   ```

## Development

### Building the project
```
npm run build
```

### Running tests
```
npm test
```

## License

This project is licensed under the MIT License.
