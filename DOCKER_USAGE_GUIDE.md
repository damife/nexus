# 🐳 **SwiftNexus Enterprise - Comprehensive Docker Usage Guide**

**Complete guide for using Docker with SwiftNexus Enterprise deployment**

---

## 📋 **Table of Contents**

1. [Prerequisites](#-prerequisites)
2. [Quick Start](#-quick-start)
3. [Environment Configuration](#-environment-configuration)
4. [Service Management](#-service-management)
5. [Development Workflow](#-development-workflow)
6. [Production Deployment](#-production-deployment)
7. [Monitoring & Logging](#-monitoring--logging)
8. [Backup & Recovery](#-backup--recovery)
9. [Troubleshooting](#-troubleshooting)
10. [Advanced Configuration](#-advanced-configuration)

---

## 🔧 **Prerequisites**

### **📋 System Requirements:**
```bash
# Check Docker installation
docker --version
# Expected: Docker version 20.10+ or newer

# Check Docker Compose
docker compose version
# Expected: Docker Compose version v2.0+ or newer

# Check available disk space
df -h
# Recommended: 50GB+ free space

# Check available memory
free -h
# Recommended: 8GB+ RAM
```

### **🛠️ Installation (if needed):**

#### **Ubuntu/Debian:**
```bash
# Update package index
sudo apt update

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Reboot to apply group changes
sudo reboot
```

#### **CentOS/RHEL:**
```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
sudo systemctl start docker
sudo systemctl enable docker

# Add user to docker group
sudo usermod -aG docker $USER
```

#### **macOS:**
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Or using Homebrew
brew install --cask docker
```

#### **Windows:**
```bash
# Install Docker Desktop
# Download from: https://www.docker.com/products/docker-desktop

# Enable WSL2 backend for better performance
```

---

## 🚀 **Quick Start**

### **📥 1. Get the Code:**
```bash
# Clone the repository
git clone <repository-url>
cd swift-nexus-enterprise

# Verify files exist
ls -la composer.yml Dockerfile server/Dockerfile
```

### **⚙️ 2. Environment Setup:**
```bash
# Copy Docker environment file
cp .env.docker .env

# Edit environment variables (optional for testing)
nano .env

# Verify environment file
cat .env
```

### **🚀 3. Start Services:**
```bash
# Start core services only
docker compose -f composer.yml up -d

# Verify all services are running
docker compose -f composer.yml ps

# View startup logs
docker compose -f composer.yml logs -f
```

### **✅ 4. Verify Deployment:**
```bash
# Check application health
curl http://localhost/health

# Check individual services
curl http://localhost:3000  # Frontend
curl http://localhost:5000/api/health  # Backend

# Access management interfaces
# RabbitMQ: http://localhost:15672
# Username: swiftnexus
# Password: rabbitmq_secure_password_2024
```

---

## ⚙️ **Environment Configuration**

### **📁 Environment Files:**
```
.env.docker          # Docker-specific environment variables
.env.example         # Example configuration template
.env                 # Your actual environment (copy from .env.docker)
```

### **🔧 Key Environment Variables:**

#### **🗄️ Database Configuration:**
```bash
# PostgreSQL Database
DB_HOST=postgres                    # Docker service name
DB_PORT=5432                        # Database port
DB_NAME=swiftnexus_prod             # Database name
DB_USER=swiftnexus_user             # Database user
DB_PASSWORD=swiftnexus_secure_password_2024  # Database password
```

#### **🔐 Security Configuration:**
```bash
# JWT Configuration
JWT_SECRET=jwt_secret_key_2024_very_long_and_secure_for_production_use

# Redis Password
REDIS_PASSWORD=redis_secure_password_2024

# RabbitMQ Credentials
RABBITMQ_USER=swiftnexus
RABBITMQ_PASSWORD=rabbitmq_secure_password_2024
```

#### **🌐 Port Configuration:**
```bash
# Service Ports
POSTGRES_PORT=5432
REDIS_PORT=6379
RABBITMQ_PORT=5672
RABBITMQ_MGMT_PORT=15672
BACKEND_PORT=5000
FRONTEND_PORT=3000
HTTP_PORT=80
HTTPS_PORT=443
```

#### **📊 Monitoring Configuration:**
```bash
# Prometheus
PROMETHEUS_PORT=9090

# Grafana
GRAFANA_PORT=3001
GRAFANA_USER=admin
GRAFANA_PASSWORD=grafana_secure_password_2024
```

### **🔧 Custom Environment Setup:**
```bash
# Create custom environment file
cp .env.docker .env.custom

# Edit for your specific needs
nano .env.custom

# Use custom environment
docker compose -f composer.yml --env-file .env.custom up -d
```

---

## 🎮 **Service Management**

### **📋 Basic Commands:**

#### **🚀 Starting Services:**
```bash
# Start all services
docker compose -f composer.yml up -d

# Start specific services
docker compose -f composer.yml up -d postgres redis

# Start with profiles
docker compose -f composer.yml --profile monitoring up -d
docker compose -f composer.yml --profile backup up -d
docker compose -f composer.yml --profile monitoring --profile backup up -d

# Start in foreground (for debugging)
docker compose -f composer.yml up
```

#### **🛑 Stopping Services:**
```bash
# Stop all services
docker compose -f composer.yml down

# Stop and remove volumes (data loss!)
docker compose -f composer.yml down -v

# Stop and remove images
docker compose -f composer.yml down --rmi all

# Graceful stop with timeout
docker compose -f composer.yml down --timeout 60
```

#### **🔄 Restarting Services:**
```bash
# Restart all services
docker compose -f composer.yml restart

# Restart specific service
docker compose -f composer.yml restart backend

# Force restart (recreates containers)
docker compose -f composer.yml up -d --force-recreate
```

#### **📊 Service Status:**
```bash
# Check service status
docker compose -f composer.yml ps

# Detailed service information
docker compose -f composer.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"

# Check resource usage
docker stats

# Check specific container stats
docker stats swiftnexus-backend
```

### **🔧 Advanced Management:**

#### **📈 Scaling Services:**
```bash
# Scale backend services
docker compose -f composer.yml up -d --scale backend=3

# Scale multiple services
docker compose -f composer.yml up -d --scale backend=2 --scale frontend=2

# Check scaled services
docker compose -f composer.yml ps
```

#### **🔄 Updating Services:**
```bash
# Pull latest images
docker compose -f composer.yml pull

# Update specific service
docker compose -f composer.yml pull backend

# Rebuild and update
docker compose -f composer.yml build --no-cache
docker compose -f composer.yml up -d
```

#### **🗂️ Volume Management:**
```bash
# List volumes
docker volume ls

# Inspect volume
docker volume inspect swift-nexus-enterprise_postgres_data

# Backup volume
docker run --rm -v swift-nexus-enterprise_postgres_data:/data -v $(pwd):/backup ubuntu tar cvf /backup/postgres_backup.tar /data

# Restore volume
docker run --rm -v swift-nexus-enterprise_postgres_data:/data -v $(pwd):/backup ubuntu tar xvf /backup/postgres_backup.tar -C /
```

---

## 💻 **Development Workflow**

### **🔄 Development Mode:**
```bash
# Start development services
docker compose -f composer.yml --profile dev up -d

# Enable hot reload for backend
docker compose -f composer.yml exec backend npm run dev

# Enable hot reload for frontend
docker compose -f composer.yml exec frontend npm run dev
```

### **🔧 Debugging Containers:**
```bash
# Access container shell
docker compose -f composer.yml exec backend sh
docker compose -f composer.yml exec postgres psql -U swiftnexus_user -d swiftnexus_prod

# View container logs
docker compose -f composer.yml logs -f backend
docker compose -f composer.yml logs --tail=100 postgres

# Run commands in container
docker compose -f composer.yml exec backend npm run test
docker compose -f composer.yml exec redis redis-cli
```

### **🛠️ Development Tips:**

#### **📁 File Mounting for Development:**
```yaml
# Add to composer.yml for development
volumes:
  - ./server:/app
  - ./src:/app/src
  - ./package.json:/app/package.json
```

#### **🔧 Environment Overrides:**
```bash
# Development environment
export NODE_ENV=development
export LOG_LEVEL=debug

# Use override file
docker compose -f composer.yml -f composer.override.yml up -d
```

#### **📊 Live Reloading:**
```bash
# Watch for changes and rebuild
docker compose -f composer.yml up --build

# Use watchtower for automatic updates
docker run -d --name watchtower -v /var/run/docker.sock:/var/run/docker.sock containrrr/watchtower
```

---

## 🏢 **Production Deployment**

### **🚀 Production Setup:**

#### **1. Environment Preparation:**
```bash
# Create production environment file
cp .env.docker .env.production

# Edit production values
nano .env.production

# Set production values
export NODE_ENV=production
export LOG_LEVEL=info
```

#### **2. Security Configuration:**
```bash
# Generate secure passwords
openssl rand -base64 32  # For JWT_SECRET
openssl rand -base64 16  # For database passwords

# Update .env.production with secure values
```

#### **3. SSL Certificate Setup:**
```bash
# Create SSL directory
mkdir -p ssl

# Add your certificates
cp your-cert.pem ssl/cert.pem
cp your-key.pem ssl/key.pem
cp your-ca.pem ssl/ca.pem  # Optional

# Set correct permissions
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem
```

#### **4. Production Deployment:**
```bash
# Deploy with production environment
docker compose -f composer.yml --env-file .env.production up -d

# Deploy with monitoring and backup
docker compose -f composer.yml --env-file .env.production --profile monitoring --profile backup up -d

# Verify deployment
docker compose -f composer.yml ps
curl -k https://your-domain.com/health
```

### **🔒 Production Security:**

#### **🛡️ Network Security:**
```bash
# Configure firewall
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw enable

# Use internal networks for sensitive services
# Already configured in composer.yml
```

#### **🔐 Access Control:**
```bash
# Remove management interfaces from public access
# Comment out port mappings in composer.yml
# ports:
#   - "15672:15672"  # RabbitMQ Management
#   - "9090:9090"    # Prometheus
#   - "3001:3001"    # Grafana
```

#### **📊 Security Monitoring:**
```bash
# Enable security logging
export LOG_LEVEL=warn

# Monitor access logs
docker compose -f composer.yml logs -f nginx

# Set up log rotation
# Configure in your host system
```

---

## 📊 **Monitoring & Logging**

### **📈 Enable Monitoring Stack:**
```bash
# Start with monitoring profile
docker compose -f composer.yml --profile monitoring up -d

# Access monitoring interfaces
# Grafana: http://localhost:3001
# Prometheus: http://localhost:9090
```

### **📊 Grafana Dashboard Setup:**
```bash
# Access Grafana
URL: http://localhost:3001
Username: admin
Password: grafana_secure_password_2024

# Add Prometheus data source
# Configuration > Data Sources > Add data source
# URL: http://prometheus:9090

# Import dashboards
# Create or import pre-built dashboards
```

### **📝 Log Management:**

#### **🔍 Viewing Logs:**
```bash
# View all logs
docker compose -f composer.yml logs -f

# View specific service logs
docker compose -f composer.yml logs -f backend
docker compose -f composer.yml logs -f nginx

# View last N lines
docker compose -f composer.yml logs --tail=100 backend

# View logs with timestamps
docker compose -f composer.yml logs -t backend
```

#### **🗂️ Log Rotation:**
```bash
# Configure log rotation in composer.yml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"

# Clean up old logs
docker system prune -f
```

#### **📊 Log Analysis:**
```bash
# Export logs for analysis
docker compose -f composer.yml logs --no-color > application.log

# Filter logs
docker compose -f composer.yml logs backend | grep ERROR
docker compose -f composer.yml logs nginx | grep "404\|500"
```

### **🔍 Health Monitoring:**

#### **💓 Health Checks:**
```bash
# Check service health
docker compose -f composer.yml ps

# Detailed health status
docker inspect swiftnexus-backend | grep -A 10 Health

# Manual health check
curl http://localhost/health
curl http://localhost:5000/api/health
```

#### **📊 Resource Monitoring:**
```bash
# Real-time resource usage
docker stats

# Resource usage history
docker stats --no-stream

# System resource usage
docker system df
docker system events
```

---

## 💾 **Backup & Recovery**

### **📋 Enable Backup Service:**
```bash
# Start with backup profile
docker compose -f composer.yml --profile backup up -d

# Verify backup service
docker compose -f composer.yml ps backup
```

### **💾 Manual Backup Procedures:**

#### **🗄️ Database Backup:**
```bash
# Create manual database backup
docker compose -f composer.yml exec postgres pg_dump -U swiftnexus_user -d swiftnexus_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
docker compose -f composer.yml exec postgres pg_dump -U swiftnexus_user -d swiftnexus_prod | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Backup specific tables
docker compose -f composer.yml exec postgres pg_dump -U swiftnexus_user -d swiftnexus_prod -t users -t messages > selective_backup.sql
```

#### **📁 File System Backup:**
```bash
# Backup uploads directory
tar -czf uploads_backup_$(date +%Y%m%d).tar.gz uploads/

# Backup logs
tar -czf logs_backup_$(date +%Y%m%d).tar.gz logs/

# Backup configuration files
tar -czf config_backup_$(date +%Y%m%d).tar.gz composer.yml .env nginx.conf redis.conf rabbitmq.conf
```

#### **🐳 Container Backup:**
```bash
# Backup container images
docker save swiftnexus-backend:latest > backend_image.tar
docker save swiftnexus-frontend:latest > frontend_image.tar

# Backup volumes
docker run --rm -v swift-nexus-enterprise_postgres_data:/data -v $(pwd):/backup ubuntu tar cvf /backup/postgres_volume_$(date +%Y%m%d).tar /data
```

### **🔄 Recovery Procedures:**

#### **🗄️ Database Recovery:**
```bash
# Stop application services
docker compose -f composer.yml stop backend frontend nginx

# Restore database
docker compose -f composer.yml exec -T postgres psql -U swiftnexus_user -d swiftnexus_prod < backup_20240214_120000.sql

# Restart services
docker compose -f composer.yml start backend frontend nginx
```

#### **📁 File System Recovery:**
```bash
# Restore uploads
tar -xzf uploads_backup_20240214.tar.gz

# Restore logs
tar -xzf logs_backup_20240214.tar.gz

# Set correct permissions
chown -R 1001:1001 uploads/
chown -R 1001:1001 logs/
```

#### **🐳 Complete System Recovery:**
```bash
# Stop all services
docker compose -f composer.yml down

# Restore volumes
docker run --rm -v swift-nexus-enterprise_postgres_data:/data -v $(pwd):/backup ubuntu tar xvf /backup/postgres_volume_20240214.tar -C /

# Start services
docker compose -f composer.yml up -d

# Verify recovery
docker compose -f composer.yml ps
curl http://localhost/health
```

### **📅 Backup Automation:**

#### **⏰ Scheduled Backups:**
```bash
# Create backup script
cat > backup_script.sh << 'EOF'
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups"

# Database backup
docker compose -f composer.yml exec -T postgres pg_dump -U swiftnexus_user -d swiftnexus_prod > $BACKUP_DIR/db_backup_$DATE.sql

# Compress old backups
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +1 -exec gzip {} \;

# Remove old backups (7 days)
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
EOF

# Make executable
chmod +x backup_script.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /path/to/backup_script.sh
```

---

## 🔧 **Troubleshooting**

### **🚨 Common Issues & Solutions:**

#### **🔌 Port Conflicts:**
```bash
# Check port usage
netstat -tulpn | grep :80
lsof -i :80

# Solution: Change ports in .env
HTTP_PORT=8080
HTTPS_PORT=8443

# Restart services
docker compose -f composer.yml down
docker compose -f composer.yml up -d
```

#### **🧠 Memory Issues:**
```bash
# Check memory usage
docker stats
free -h

# Solution: Increase Docker memory limits
# In Docker Desktop settings or daemon.json

# Clean up unused resources
docker system prune -a
docker volume prune
```

#### **🗂️ Permission Issues:**
```bash
# Fix directory permissions
sudo chown -R $USER:$USER logs/ uploads/ backups/ ssl/

# Docker permission issues
sudo usermod -aG docker $USER
newgrp docker

# Reset permissions
sudo chmod -R 755 .
sudo chown -R $USER:$USER .
```

#### **🗄️ Database Connection Issues:**
```bash
# Check database logs
docker compose -f composer.yml logs postgres

# Test database connection
docker compose -f composer.yml exec postgres psql -U swiftnexus_user -d swiftnexus_prod -c "SELECT 1;"

# Reset database
docker compose -f composer.yml down
docker volume rm swift-nexus-enterprise_postgres_data
docker compose -f composer.yml up -d postgres
```

#### **🐳 Container Issues:**
```bash
# Check container status
docker compose -f composer.yml ps

# Inspect container
docker inspect swiftnexus-backend

# View container logs
docker compose -f composer.yml logs backend

# Restart container
docker compose -f composer.yml restart backend

# Rebuild container
docker compose -f composer.yml up -d --build backend
```

### **🔍 Debugging Commands:**

#### **📊 System Diagnostics:**
```bash
# Check Docker system
docker system info
docker system df

# Check network connectivity
docker network ls
docker network inspect swift-nexus-enterprise_swiftnexus-network

# Check volume mounts
docker volume ls
docker volume inspect swift-nexus-enterprise_postgres_data
```

#### **🔧 Service Diagnostics:**
```bash
# Check service health
docker compose -f composer.yml exec backend curl http://localhost:5000/api/health

# Check database connectivity
docker compose -f composer.yml exec backend node -e "console.log('Database connection test')"

# Check Redis connectivity
docker compose -f composer.yml exec redis redis-cli ping

# Check RabbitMQ connectivity
docker compose -f composer.yml exec rabbitmq rabbitmq-diagnostics ping
```

#### **📝 Log Analysis:**
```bash
# Error logs only
docker compose -f composer.yml logs backend | grep -i error

# Recent logs
docker compose -f composer.yml logs --since=1h backend

# Log patterns
docker compose -f composer.yml logs backend | grep "connection\|error\|failed"
```

### **🚨 Emergency Procedures:**

#### **🔄 Full Reset:**
```bash
# WARNING: This will delete all data!
docker compose -f composer.yml down -v
docker system prune -a
docker volume prune
docker compose -f composer.yml up -d
```

#### **📊 Emergency Backup:**
```bash
# Quick emergency backup
docker compose -f composer.yml exec postgres pg_dump -U swiftnexus_user -d swiftnexus_prod > emergency_backup.sql
tar -czf emergency_files_$(date +%Y%m%d_%H%M%S).tar.gz uploads/ logs/
```

#### **🔧 Service Recovery:**
```bash
# Recover individual service
docker compose -f composer.yml stop backend
docker compose -f composer.yml rm -f backend
docker compose -f composer.yml up -d backend
```

---

## 🎯 **Advanced Configuration**

### **🔧 Custom Networks:**
```yaml
# Add to composer.yml
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
  database:
    driver: bridge
    internal: true
```

### **📊 Resource Limits:**
```yaml
# Add to services in composer.yml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

### **🔄 Auto-scaling:**
```yaml
# Requires Docker Swarm
deploy:
  replicas: 3
  update_config:
    parallelism: 1
    delay: 10s
  restart_policy:
    condition: on-failure
```

### **🔐 Security Hardening:**
```yaml
# Add to services
security_opt:
  - no-new-privileges:true
read_only: true
tmpfs:
  - /tmp
user: "1001:1001"
```

### **📊 Custom Metrics:**
```yaml
# Add monitoring labels
labels:
  - "monitoring.prometheus.scrape=true"
  - "monitoring.prometheus.port=9090"
```

---

## 🎯 **Best Practices**

### **🔧 Development Best Practices:**
```
✅ Use .env files for configuration
✅ Mount volumes for development
✅ Use health checks
✅ Implement proper logging
✅ Test backup and recovery
✅ Monitor resource usage
```

### **🏢 Production Best Practices:**
```
✅ Use strong passwords
✅ Enable SSL/TLS
✅ Implement monitoring
✅ Regular backups
✅ Security updates
✅ Performance optimization
✅ Disaster recovery planning
```

### **📊 Operational Best Practices:**
```
✅ Document procedures
✅ Automate where possible
✅ Regular maintenance
✅ Security audits
✅ Performance tuning
✅ Capacity planning
```

---

## 📚 **Quick Reference**

### **🚀 Essential Commands:**
```bash
# Start services
docker compose -f composer.yml up -d

# Stop services
docker compose -f composer.yml down

# View logs
docker compose -f composer.yml logs -f

# Execute commands
docker compose -f composer.yml exec [service] [command]

# Build images
docker compose -f composer.yml build

# Pull updates
docker compose -f composer.yml pull
```

### **🔍 Useful URLs:**
```
🌐 Application: http://localhost:3000
🔧 API: http://localhost:5000
🗄️ RabbitMQ Management: http://localhost:15672
📈 Prometheus: http://localhost:9090
📊 Grafana: http://localhost:3001
```

### **🔐 Default Credentials:**
```
👤 Application: admin@swiftnexus.com / admin123
🗄️ Database: swiftnexus_user / swiftnexus_secure_password_2024
📬 RabbitMQ: swiftnexus / rabbitmq_secure_password_2024
📊 Grafana: admin / grafana_secure_password_2024
```

---

## **🏆 Conclusion**

This comprehensive Docker usage guide provides everything you need to successfully deploy, manage, and maintain the SwiftNexus Enterprise application using Docker containers.

### **✅ Key Takeaways:**
```
🐳 Complete containerized deployment
🔧 Flexible configuration options
📊 Comprehensive monitoring
💾 Automated backup solutions
🔒 Production-ready security
📚 Detailed troubleshooting guide
```

### **🎯 Next Steps:**
```
1. Customize environment variables
2. Set up SSL certificates
3. Configure monitoring alerts
4. Implement backup strategies
5. Deploy to production
6. Monitor and maintain
```

**Your SwiftNexus Enterprise application is now ready for professional Docker deployment!** 🎉🐳

---

*This guide covers all aspects of Docker usage for SwiftNexus Enterprise. For specific issues or advanced configurations, refer to the troubleshooting section or consult the official Docker documentation.*
