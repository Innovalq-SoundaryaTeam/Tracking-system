# Production & Logistics Tracking System

A comprehensive system for tracking production, assignments, and deliveries with role-based access control.

## 🚀 Features

- **Production Tracking**: Monitor stock levels and production output
- **Job Management**: Create, assign, and track delivery jobs
- **Role-Based Access**: Separate dashboards for Admin, Seller, and Driver roles
- **Real-Time Tracking**: GPS location tracking for deliveries
- **Delivery Proof**: Mandatory photo upload with location verification
- **Driver Ratings**: Performance tracking and feedback system
- **Activity Logs**: Complete audit trail of all system activities

## 🏗️ System Architecture

### Backend (FastAPI + Python)
- **Framework**: FastAPI with SQLAlchemy ORM
- **Authentication**: JWT with Bcrypt password hashing
- **Database**: MySQL with proper relationships
- **File Storage**: Local storage for delivery proofs
- **API Documentation**: Auto-generated Swagger docs at `/docs`

### Frontend (React + Vite)
- **Framework**: React 18 with Vite
- **Routing**: React Router with protected routes
- **Maps**: Leaflet integration for location services
- **Styling**: Plain CSS with dark theme
- **State Management**: React hooks and context

### Database Schema
- **Users**: Admin, Seller, Driver roles
- **Jobs**: Complete job lifecycle tracking
- **Delivery Proofs**: Image uploads with GPS coordinates
- **Driver Ratings**: 1-5 star rating system
- **Activity Logs**: Comprehensive audit trail
- **Production Stock**: Inventory management

## 📋 Business Flow

### Seller Flow
1. Login to dashboard
2. Create new job with shop details and GPS location
3. Monitor job status in real-time
4. Rate driver after successful delivery

### Driver Flow
1. View available jobs on map
2. Accept job assignments
3. Update status: Pick up → In Transit
4. Upload delivery proof with photo and GPS
5. Mark job as completed

### Admin Flow
1. Monitor all system activities
2. Manage stock levels
3. Reassign jobs if needed
4. View performance analytics
5. Access complete audit logs

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.8+
- Node.js 16+
- MySQL 8.0+
- Git

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

4. **Create MySQL database**
   ```sql
   CREATE DATABASE tracking_system;
   ```

5. **Run database migrations**
   ```bash
   python -c "from models import Base, engine; Base.metadata.create_all(bind=engine)"
   ```

6. **Start the backend server**
   ```bash
   python main.py
   ```

   Backend will be available at `http://localhost:8000`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install Node.js dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

   Frontend will be available at `http://localhost:5173`

## 🔐 Default Users

After starting the system, you can create users via the API or use these endpoints:

### Create Admin User
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Admin User",
    "email": "admin@example.com",
    "phone": "1234567890",
    "password": "admin123",
    "role": "ADMIN"
  }'
```

### Create Seller User
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Seller User",
    "email": "seller@example.com",
    "phone": "1234567891",
    "password": "seller123",
    "role": "SELLER"
  }'
```

### Create Driver User
```bash
curl -X POST "http://localhost:8000/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "full_name": "Driver User",
    "email": "driver@example.com",
    "phone": "1234567892",
    "password": "driver123",
    "role": "DRIVER"
  }'
```

## 📚 API Documentation

Once the backend is running, visit `http://localhost:8000/docs` for interactive API documentation.

### Key Endpoints

#### Authentication
- `POST /auth/login` - User login
- `POST /auth/register` - User registration

#### Jobs
- `POST /jobs/` - Create new job (Seller)
- `GET /jobs/my` - Get user's jobs
- `GET /jobs/available` - Get available jobs (Driver)
- `PUT /jobs/{id}/assign` - Assign job to driver
- `PUT /jobs/{id}/pickup` - Mark job as picked up
- `PUT /jobs/{id}/transit` - Start transit
- `PUT /jobs/{id}/complete` - Complete job

#### Delivery Proofs
- `POST /delivery-proofs/upload/{job_id}` - Upload delivery proof
- `GET /delivery-proofs/job/{job_id}` - Get job delivery proof

#### Driver Ratings
- `POST /driver-ratings/` - Rate driver (Seller)
- `GET /driver-ratings/my-performance` - Get driver performance

## 🎯 Usage Instructions

### 1. Initial Setup
1. Start both backend and frontend servers
2. Create users for each role using the API endpoints above
3. Initialize stock levels via admin dashboard

### 2. Seller Operations
1. Login as seller
2. Create jobs with shop details and GPS location
3. Monitor job progress in dashboard
4. Rate drivers after successful delivery

### 3. Driver Operations
1. Login as driver
2. View available jobs on map
3. Accept assignments and update status
4. Upload delivery proof with photo and GPS
5. Complete delivery workflow

### 4. Admin Operations
1. Login as admin
2. Monitor all system activities
3. Manage stock levels
4. Reassign jobs if necessary
5. View performance analytics

## 🔧 Configuration

### Backend Environment Variables
- `DATABASE_URL`: MySQL connection string
- `SECRET_KEY`: JWT secret key (change in production)
- `UPLOAD_DIR`: File upload directory
- `MAX_FILE_SIZE`: Maximum file size for uploads

### Frontend Configuration
- API base URL configured in `src/services/api.js`
- Map center coordinates in `src/components/Map.jsx`

## 🚨 Security Notes

1. **Change Default Secrets**: Update JWT secret key in production
2. **Database Security**: Use strong database passwords
3. **File Uploads**: Validate all uploaded files
4. **CORS**: Configure proper CORS settings
5. **HTTPS**: Use HTTPS in production

## 📱 Mobile Compatibility

The system is responsive and works on:
- Desktop browsers (Chrome, Firefox, Safari)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Tablets (iPad, Android tablets)

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Check MySQL service is running
   - Verify database credentials in .env
   - Ensure database exists

2. **CORS Issues**
   - Check frontend URL in CORS middleware
   - Verify both servers are running

3. **File Upload Issues**
   - Check upload directory permissions
   - Verify file size limits
   - Ensure disk space is available

4. **Map Not Loading**
   - Check internet connection
   - Verify Leaflet CSS is loaded
   - Check browser console for errors

## 📄 License

This project is for demonstration purposes. Please modify as needed for your specific use case.

## 🤝 Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation at `/docs`
3. Check browser console for errors
4. Verify all configuration files

---

**Built with ❤️ using FastAPI, React, and MySQL**
