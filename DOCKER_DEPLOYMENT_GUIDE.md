# 🐳 **SwiftNexus Enterprise - Complete Docker Deployment Guide**

**Production-ready containerized deployment with Composer (Docker Compose)**

---

## 🎯 **Overview**

This guide provides complete instructions for deploying SwiftNexus Enterprise using Docker containers with the new `composer.yml` configuration.

---

## 📋 **Prerequisites**

### **🔧 Required Software:**
```bash
# Docker Engine (v20.10+)
docker --version

# Docker Compose (v2.0+)
docker compose version

# Git (for cloning)
git --version
```

### **💻 System Requirements:**
```
🖥️ CPU: 4+ cores recommended
🧠 RAM: 8GB+ minimum, 16GB+ recommended
💾 Storage: 50GB+ available space
🌐 Network: Stable internet connection
```

---

## 🚀 **Quick Start**

### **1. Clone the Repository:**
```bash
git clone <repository-url>
cd swift-nexus-enterprise
```

### **2. Environment Configuration:**
```bash
# Copy Docker environment file
cp .env.docker .env

# Edit environment variables
nano .env
```

### **3. Start All Services:**
```bash
# Start core services
docker compose -f composer.yml up -d

# Or with monitoring
docker compose -f composer.yml --profile monitoring up -d

# Or with backup
docker compose -f composer.yml --profile backup up -d

# Or everything
docker compose -f composer.yml --profile monitoring --profile backup up -d
```

### **4. Verify Deployment:**
```bash
# Check service status
docker compose -f composer.yml ps

# View logs
docker compose -f composer.yml logs -f

# Health check
curl http://localhost/health
```

---

## 🏗️ **Architecture Overview**

### **🐳 Services Included:**

#### **🗄️ Core Services:**
```
📊 PostgreSQL Database (Port 5432)
⚡ Redis Cache (Port 6379)
📬 RabbitMQ Message Queue (Ports 5672, 15672)
🔧 Backend API (Port 5000)
🎨 Frontend Web App (Port 3000)
🌐 Nginx Reverse Proxy (Ports 80, 443)
```

#### **📊 Optional Services:**
```
📈 Prometheus Monitoring (Port 9090)
📊 Grafana Dashboard (Port 3001)
💾 Backup Service (Automated)
```

---

## 🔧 **Configuration Files**

### **📁 File Structure:**
```
swift-nexus-enterprise/
├── composer.yml              # Main orchestration file
├── .env.docker              # Docker environment variables
├── Dockerfile               # Frontend container build
├── server/
│   ├── Dockerfile          # Backend container build
│   ├── healthcheck.js      # Backend health check
│   └── scripts/
│       └── init.sql        # Database initialization
├── nginx.conf              # Nginx configuration
├── redis.conf              # Redis configuration
├── rabbitmq.conf           # RabbitMQ configuration
├── ssl/                    # SSL certificates (create)
├── logs/                   # Application logs
├── uploads/                # File uploads
└── backups/                # Database backups
```

---

## 🔐 **Security Configuration**

### **🔑 Default Credentials:**
```bash
# Database
DB_USER: swiftnexus_user
DB_PASSWORD: swiftnexus_secure_password_2024

# Redis
REDIS_PASSWORD: redis_secure_password_2024

# RabbitMQ
RABBITMQ_USER: swiftnexus
RABBITMQ_PASSWORD: rabbitmq_secure_password_2024

# Grafana (if enabled)
GRAFANA_USER: admin
GRAFANA_PASSWORD: grafana_secure_password_2024
```

### **🔒 Security Features:**
```
🛡️ Network isolation with custom bridge network
🔐 Strong passwords for all services
🚀 Non-root user execution
📝 Comprehensive logging
🔍 Health checks for all services
⏰ Automatic restart policies
```

---

## 📊 **Service Details**

### **🗄️ PostgreSQL Database:**
```yaml
- Version: PostgreSQL 15 Alpine
- Database: swiftnexus_prod
- User: swiftnexus_user
- Health Check: pg_isready
- Backup: Automated daily backups
- Persistence: Named volume
```

### **⚡ Redis Cache:**
```yaml
- Version: Redis 7 Alpine
- Memory Limit: 256MB
- Persistence: AOF + RDB
- Security: Password protected
- Health Check: Redis ping
- Config: Custom redis.conf
```

### **📬 RabbitMQ Message Queue:**
```yaml
- Version: RabbitMQ 3 Management Alpine
- Management UI: http://localhost:15672
- VHost: swiftnexus
- Health Check: RabbitMQ diagnostics
- Config: Custom rabbitmq.conf
```

### **🔧 Backend API:**
```yaml
- Runtime: Node.js 18 Alpine
- Build: Multi-stage Docker build
- Health Check: Custom healthcheck.js
- Environment: Production mode
- Persistence: Logs and uploads
```

### **🎨 Frontend Web App:**
```yaml
- Runtime: Nginx Alpine
- Build: Multi-stage Docker build
- Health Check: HTTP endpoint check
- Static Files: Optimized build
- Compression: Gzip enabled
```

### **🌐 Nginx Reverse Proxy:**
```yaml
- Version: Nginx Alpine
- Config: Custom nginx.conf
- SSL: Ready for certificates
- Rate Limiting: Configured
- Health Check: HTTP endpoint
- Logging: Access and error logs
```

---

## 🚀 **Deployment Commands**

### **📋 Basic Operations:**
```bash
# Start all services
docker compose -f composer.yml up -d

# Stop all services
docker compose -f composer.yml down

# Restart services
docker compose -f composer.yml restart

# View logs
docker compose -f composer.yml logs -f [service-name]

# Execute commands in container
docker compose -f composer.yml exec [service-name] [command]

# Scale services
docker compose -f composer.yml up -d --scale backend=2
```

### **🔧 Maintenance Commands:**
```bash
# Update images
docker compose -f composer.yml pull

# Rebuild containers
docker compose -f composer.yml build --no-cache

# Clean up unused resources
docker system prune -f

# View resource usage
docker stats

# Backup database manually
docker compose -f composer.yml exec postgres pg_dump -U swiftnexus_user swiftnexus_prod > backup.sql
```

---

## 📊 **Monitoring Setup**

### **📈 Enable Monitoring:**
```bash
# Start with monitoring profile
docker compose -f composer.yml --profile monitoring up -d

# Access Grafana
URL: http://localhost:3001
Username: admin
Password: grafana_secure_password_2024

# Access Prometheus
URL: http://localhost:9090
```

### **📊 Monitoring Features:**
```
📈 Prometheus metrics collection
📊 Grafana dashboards
🔍 Service health monitoring
📝 Log aggregation
⚡ Performance metrics
🚨 Alerting capabilities
```

---

## 🔒 **SSL Configuration**

### **📋 SSL Setup:**
```bash
# Create SSL directory
mkdir -p ssl

# Add your SSL certificates
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem

# Update nginx.conf for SSL
# Uncomment SSL server block
# Update server_name directive
```

### **🔐 SSL Features:**
```
🔒 HTTPS termination
🔗 HTTP to HTTPS redirect
🛡️ Security headers
🔑 Modern TLS protocols
📊 SSL monitoring
```

---

## 💾 **Backup Configuration**

### **📋 Enable Backups:**
```bash
# Start with backup profile
docker compose -f composer.yml --profile backup up -d

# Backup location
./backups/backup_YYYYMMDD_HHMMSS.sql

# Retention policy
# Keep backups for 7 days
```

### **💾 Backup Features:**
```
⏰ Automated daily backups
🗂️ Timestamped backup files
🗑️ Automatic cleanup
📁 Local storage
🔒 Secure backup process
```

---

## 🔧 **Troubleshooting**

### **🚨 Common Issues:**

#### **Port Conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :80

# Change ports in .env
HTTP_PORT=8080
HTTPS_PORT=8443
```

#### **Permission Issues:**
```bash
# Fix directory permissions
sudo chown -R $USER:$USER logs/ uploads/ backups/ ssl/

# Docker permission issues
sudo usermod -aG docker $USER
```

#### **Memory Issues:**
```bash
# Check memory usage
docker stats

# Increase Docker memory limits
# In Docker Desktop settings
```

#### **Database Connection:**
```bash
# Check database logs
docker compose -f composer.yml logs postgres

# Test database connection
docker compose -f composer.yml exec postgres psql -U swiftnexus_user -d swiftnexus_prod -c "SELECT 1;"
```

### **🔍 Debug Commands:**
```bash
# Check service health
docker compose -f composer.yml ps

# View detailed logs
docker compose -f composer.yml logs --tail=100 [service-name]

# Inspect container
docker inspect [container-name]

# Execute shell in container
docker compose -f composer.yml exec [service-name] sh
```

---

## 🚀 **Production Deployment**

### **🏢 Production Checklist:**
```
✅ Update all passwords in .env
✅ Configure SSL certificates
✅ Set up domain names
✅ Configure firewall rules
✅ Set up monitoring
✅ Configure backups
✅ Test disaster recovery
✅ Document procedures
```

### **🌐 Production Commands:**
```bash
# Production deployment
export NODE_ENV=production
docker compose -f composer.yml --profile monitoring --profile backup up -d

# Verify production setup
curl -k https://your-domain.com/health
```

---

## 📊 **Performance Optimization**

### **⚡ Optimization Tips:**
```
🧠 Use SSD storage for databases
💾 Allocate sufficient memory
🌐 Use CDN for static assets
🔧 Enable compression
📊 Monitor resource usage
🔄 Regular maintenance
```

### **📈 Scaling Options:**
```bash
# Scale backend services
docker compose -f composer.yml up -d --scale backend=3

# Add load balancer
# Configure multiple database replicas
# Implement caching strategies
```

---

## 🎯 **Access URLs**

### **🌐 Default Ports:**
```
🌐 Frontend: http://localhost:3000
🔧 Backend API: http://localhost:5000
🗄️ PostgreSQL: localhost:5432
⚡ Redis: localhost:6379
📬 RabbitMQ Management: http://localhost:15672
🌐 Nginx Proxy: http://localhost:80
📈 Prometheus: http://localhost:9090 (optional)
📊 Grafana: http://localhost:3001 (optional)
```

### **🔐 Default Credentials:**
```
👤 Admin Login: admin@swiftnexus.com / admin123
🗄️ Database: swiftnexus_user / swiftnexus_secure_password_2024
📬 RabbitMQ: swiftnexus / rabbitmq_secure_password_2024
📊 Grafana: admin / grafana_secure_password_2024
```

---

## **🏆 Complete Docker Deployment Ready!**

### **✅ What You Now Have:**
```
🐳 Complete containerized deployment
🔧 Production-ready configuration
📊 Full monitoring stack
💾 Automated backups
🔒 Security best practices
📚 Comprehensive documentation
🚀 One-command deployment
🔧 Easy maintenance
```

### **🎯 Next Steps:**
```
1. Update passwords in .env
2. Add SSL certificates
3. Configure domain names
4. Set up monitoring alerts
5. Test disaster recovery
6. Deploy to production
```

**Your SwiftNexus Enterprise application is now fully containerized and production-ready!** 🎉🐳
