# 🚀 **SwiftNexus Enterprise - Complete Ubuntu Deployment Guide**

**Production-ready deployment on Ubuntu server with Docker**

---

## 📋 **Table of Contents**

1. [Prerequisites](#-prerequisites)
2. [Server Setup](#-server-setup)
3. [Docker Installation](#-docker-installation)
4. [Project Deployment](#-project-deployment)
5. [Service Configuration](#-service-configuration)
6. [SSL Setup](#-ssl-setup)
7. [Domain Configuration](#-domain-configuration)
8. [Service Management](#-service-management)
9. [Monitoring & Maintenance](#-monitoring--maintenance)
10. [Troubleshooting](#-troubleshooting)

---

## 🔧 **Prerequisites**

### **📋 Server Requirements:**
```bash
# Minimum System Requirements
CPU: 4+ cores
RAM: 8GB+ (16GB+ recommended)
Storage: 50GB+ SSD
Network: Stable internet connection
OS: Ubuntu 20.04+ LTS

# Check system specs
lscpu | grep "Model name"
free -h
df -h
```

### **🔧 Required Software:**
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Install basic tools
sudo apt install -y curl wget git unzip htop
```

---

## 🖥️ **Server Setup**

### **🔐 Security Configuration:**
```bash
# Create dedicated user
sudo adduser swiftnexus
sudo usermod -aG sudo swiftnexus

# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 5000/tcp
sudo ufw allow 3000/tcp
```

### **📁 Directory Structure:**
```bash
# Create application directory
sudo mkdir -p /opt/swiftnexus
sudo chown swiftnexus:swiftnexus /opt/swiftnexus
cd /opt/swiftnexus

# Create necessary directories
mkdir -p logs uploads backups ssl
```

---

## 🐳 **Docker Installation**

### **📦 Install Docker:**
```bash
# Remove old versions
sudo apt remove docker docker-engine containerd runc

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker swiftnexus

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verify installation
docker --version
docker-compose --version
```

### **🔄 Docker Service Setup:**
```bash
# Start Docker service
sudo systemctl start docker
sudo systemctl enable docker

# Verify Docker is running
sudo systemctl status docker
```

---

## 🚀 **Project Deployment**

### **📥 Clone Repository:**
```bash
# Clone the project
cd /opt/swiftnexus
git clone https://github.com/damife/swift-nexus-enterprise.git .

# Set proper permissions
chown -R swiftnexus:swiftnexus .
chmod +x *.sh
```

### **⚙️ Environment Configuration:**
```bash
# Copy environment template
cp .env.docker .env

# Edit environment variables
nano .env

# Set production values
NODE_ENV=production
DB_PASSWORD=your_secure_db_password
REDIS_PASSWORD=your_secure_redis_password
RABBITMQ_PASSWORD=your_secure_rabbitmq_password
JWT_SECRET=your_jwt_secret_key
```

### **🐳 Start Services:**
```bash
# Start core services
docker-compose -f composer.yml up -d

# Start with monitoring
docker-compose -f composer.yml --profile monitoring up -d

# Start with backup
docker-compose -f composer.yml --profile backup up -d

# Start everything
docker-compose -f composer.yml --profile monitoring --profile backup up -d
```

### **✅ Verify Deployment:**
```bash
# Check service status
docker-compose -f composer.yml ps

# Check logs
docker-compose -f composer.yml logs -f

# Health checks
curl http://localhost/health
curl http://localhost:5000/api/health
```

---

## ⚙️ **Service Configuration**

### **🗄️ Database Setup:**
```bash
# Access PostgreSQL
docker-compose -f composer.yml exec postgres psql -U swiftnexus_user -d swiftnexus_prod

# Create admin user
INSERT INTO users (email, password_hash, first_name, last_name, role, is_active) 
VALUES ('admin@swiftnexus.com', '$2b$10$rQZ8kHWKtGYIuA5tJ5Kz9eYjF5X5X5X5X', 'System', 'Administrator', 'admin', true);

# Exit database
\q
```

### **📬 Message Queue Setup:**
```bash
# Access RabbitMQ Management
# URL: http://your-server:15672
# Username: swiftnexus
# Password: [your_rabbitmq_password]

# Create queues and exchanges
docker-compose -f composer.yml exec rabbitmq rabbitmqctl list_queues
```

### **⚡ Redis Setup:**
```bash
# Test Redis connection
docker-compose -f composer.yml exec redis redis-cli ping

# Check Redis info
docker-compose -f composer.yml exec redis redis-cli info
```

---

## 🔒 **SSL Setup**

### **📋 Let's Encrypt (Recommended):**
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d your-domain.com -m admin@your-domain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **🔧 Manual SSL Setup:**
```bash
# Create SSL directory
mkdir -p ssl

# Add your certificates
cp your-cert.pem ssl/
cp your-key.pem ssl/
cp your-ca.pem ssl/

# Set permissions
chmod 600 ssl/key.pem
chmod 644 ssl/cert.pem
```

### **🌐 Nginx SSL Configuration:**
```bash
# Update nginx.conf for SSL
# Uncomment SSL server block
# Update server_name directive
# Add SSL certificate paths

# Restart Nginx
docker-compose -f composer.yml restart nginx
```

---

## 🌐 **Domain Configuration**

### **🔧 DNS Settings:**
```bash
# A Record
@ -> your-server-ip

# WWW Record
www -> your-server-ip

# MX Record (for email)
@ -> mail.your-domain.com

# Optional: Subdomains
api -> your-server-ip
admin -> your-server-ip
```

### **🌐 Nginx Domain Setup:**
```bash
# Update nginx.conf
server_name your-domain.com www.your-domain.com;

# Test configuration
docker-compose -f composer.yml exec nginx nginx -t

# Reload Nginx
docker-compose -f composer.yml exec nginx nginx -s reload
```

---

## 🔧 **Service Management**

### **📊 Service Status:**
```bash
# Check all services
docker-compose -f composer.yml ps

# Check individual service
docker-compose -f composer.yml ps postgres
docker-compose -f composer.yml ps redis
docker-compose -f composer.yml ps rabbitmq
docker-compose -f composer.yml ps backend
docker-compose -f composer.yml ps frontend
docker-compose -f composer.yml ps nginx
```

### **🔄 Service Operations:**
```bash
# Restart services
docker-compose -f composer.yml restart [service-name]

# Stop services
docker-compose -f composer.yml stop [service-name]

# Update services
docker-compose -f composer.yml pull [service-name]
docker-compose -f composer.yml up -d [service-name]

# Scale services
docker-compose -f composer.yml up -d --scale backend=2
```

### **📝 Log Management:**
```bash
# View logs
docker-compose -f composer.yml logs -f [service-name]

# Log rotation
docker-compose -f composer.yml exec backend logrotate /etc/logrotate.conf

# Clear logs
docker-compose -f composer.yml exec backend find /app/logs -name "*.log" -mtime +7 -delete
```

---

## 📊 **Monitoring & Maintenance**

### **📈 Monitoring Setup:**
```bash
# Start monitoring stack
docker-compose -f composer.yml --profile monitoring up -d

# Access Grafana
# URL: http://your-domain:3001
# Username: admin
# Password: [your_grafana_password]

# Access Prometheus
# URL: http://your-domain:9090
```

### **💾 Backup Configuration:**
```bash
# Start backup service
docker-compose -f composer.yml --profile backup up -d

# Manual backup
docker-compose -f composer.yml exec postgres pg_dump -U swiftnexus_user swiftnexus_prod > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore backup
docker-compose -f composer.yml exec -T postgres psql -U swiftnexus_user swiftnexus_prod < backup_file.sql
```

### **🔧 Maintenance Tasks:**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose -f composer.yml pull

# Clean up unused resources
docker system prune -f

# Monitor disk space
df -h
du -sh /opt/swiftnexus
```

---

## 🔍 **Troubleshooting**

### **🚨 Common Issues:**

#### **🔌 Port Conflicts:**
```bash
# Check port usage
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :443

# Kill conflicting processes
sudo kill -9 [PID]

# Change ports in .env
HTTP_PORT=8080
HTTPS_PORT=8443
```

#### **🧠 Memory Issues:**
```bash
# Check memory usage
free -h
docker stats

# Increase swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

#### **🗄️ Database Issues:**
```bash
# Check database logs
docker-compose -f composer.yml logs postgres

# Test database connection
docker-compose -f composer.yml exec postgres pg_isready -U swiftnexus_user

# Reset database
docker-compose -f composer.yml down
docker volume rm swift-nexus-enterprise_postgres_data
docker-compose -f composer.yml up -d postgres
```

#### **🐳 Docker Issues:**
```bash
# Check Docker status
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker

# Check disk space
df -h
docker system df
```

### **🔍 Debug Commands:**
```bash
# System diagnostics
docker-compose -f composer.yml exec backend uname -a
docker-compose -f composer.yml exec backend cat /etc/os-release

# Network diagnostics
docker-compose -f composer.yml exec backend ping -c 3 google.com
docker-compose -f composer.yml exec backend nslookup google.com

# Service diagnostics
docker-compose -f composer.yml exec backend curl -I http://localhost:5000/api/health
```

---

## 🎯 **Production Best Practices**

### **🔒 Security:**
```bash
# Regular updates
sudo apt update && sudo apt upgrade -y

# Security scanning
sudo apt install -y chkrootkit rkhunter

# Firewall rules
sudo ufw status
sudo ufw deny 5432/tcp  # Database from external
```

### **📊 Performance:**
```bash
# Resource monitoring
htop
iotop
nethogs

# Log monitoring
tail -f /var/log/syslog
docker-compose -f composer.yml logs -f
```

### **💾 Backup Strategy:**
```bash
# Automated backups
0 2 * * * /opt/swiftnexus/backup_script.sh

# Off-site backups
rsync -avz /opt/swiftnexus/backups/ backup-server:/backups/

# Recovery testing
docker-compose -f composer.yml exec postgres pg_dump swiftnexus_prod > test_restore.sql
```

---

## 🚀 **Quick Deployment Commands**

### **⚡ One-Command Deployment:**
```bash
# Complete deployment script
#!/bin/bash
set -e

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Clone project
git clone https://github.com/damife/swift-nexus-enterprise.git
cd swift-nexus-enterprise

# Configure environment
cp .env.docker .env
nano .env

# Start services
docker-compose -f composer.yml --profile monitoring --profile backup up -d

echo "Deployment complete! Access your application at http://your-domain.com"
```

### **🔄 Update Commands:**
```bash
# Update application
git pull origin main
docker-compose -f composer.yml pull
docker-compose -f composer.yml up -d --build

# Update specific service
docker-compose -f composer.yml pull backend
docker-compose -f composer.yml up -d backend
```

---

## 📋 **Access URLs**

### **🌐 Application URLs:**
```
🌐 Main Application: http://your-domain.com
🔧 Admin Panel: http://your-domain.com/admin
📊 API: http://your-domain.com/api
🗄️ Database: localhost:5432 (internal)
⚡ Redis: localhost:6379 (internal)
📬 RabbitMQ: http://your-domain.com:15672
📈 Grafana: http://your-domain.com:3001
📊 Prometheus: http://your-domain.com:9090
```

### **🔐 Default Credentials:**
```
👤 Admin Login: admin@swiftnexus.com / admin123
🗄️ Database: swiftnexus_user / [your_password]
📬 RabbitMQ: swiftnexus / [your_rabbitmq_password]
📊 Grafana: admin / [your_grafana_password]
```

---

## **🏆 Deployment Complete!**

### **✅ What You Have:**
```
🐳 Complete Docker deployment
🔧 Production-ready configuration
🔒 SSL-secured communication
📊 Comprehensive monitoring
💾 Automated backups
🌐 Domain-configured access
🔧 Service management
📚 Complete documentation
```

### **🎯 Next Steps:**
```
1. ✅ Configure your domain DNS
2. ✅ Set up SSL certificates
3. ✅ Update environment variables
4. ✅ Configure monitoring alerts
5. ✅ Set up backup procedures
6. ✅ Test all functionalities
7. ✅ Document your setup
```

---

## **📞 Support & Maintenance**

### **🔧 Regular Maintenance:**
```bash
# Weekly tasks
- Check service status
- Review logs
- Update system packages
- Test backups
- Monitor resource usage

# Monthly tasks
- Update Docker images
- Security audit
- Performance review
- Backup verification
```

### **📊 Performance Monitoring:**
```bash
# Key metrics to monitor
- CPU usage < 80%
- Memory usage < 80%
- Disk space < 85%
- Response time < 200ms
- Error rate < 1%
```

---

**Your SwiftNexus Enterprise is now fully deployed on Ubuntu and ready for production use!** 🎉🚀

---

*This guide provides complete deployment instructions for Ubuntu servers. For specific issues or advanced configurations, refer to the troubleshooting section or consult the official documentation.*
