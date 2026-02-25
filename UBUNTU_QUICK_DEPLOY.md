# 🚀 **SwiftNexus Enterprise - Ubuntu Quick Deployment**

**Fast-track deployment guide for Ubuntu servers**

---

## ⚡ **5-Minute Quick Deploy**

### **🎯 Prerequisites Check:**
```bash
# Verify Ubuntu version
lsb_release -a  # Should be 20.04+

# Verify Docker
docker --version    # Should be 20.10+

# Verify Git
git --version      # Should be 2.25+
```

### **🚀 One-Command Deployment:**
```bash
# Clone and deploy
curl -fsSL https://raw.githubusercontent.com/damife/swift-nexus-enterprise/main/deploy.sh | sudo bash

# Or manual steps below:
```

---

## 📋 **Manual Deployment Steps**

### **1️⃣ Server Setup (2 minutes):**
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
```

### **2️⃣ Deploy Application (1 minute):**
```bash
# Create app directory
sudo mkdir -p /opt/swiftnexus
sudo chown $USER:$USER /opt/swiftnexus
cd /opt/swiftnexus

# Clone project
git clone https://github.com/damife/swift-nexus-enterprise.git .

# Configure environment
cp .env.docker .env
nano .env  # Update passwords!
```

### **3️⃣ Start Services (1 minute):**
```bash
# Start core services
docker-compose -f composer.yml up -d

# Verify deployment
docker-compose -f composer.yml ps
curl http://localhost/health
```

### **4️⃣ Access Application (1 minute):**
```bash
# Application URLs
http://your-server-ip:3000  # Frontend
http://your-server-ip:5000  # Backend API
http://your-server-ip:15672 # RabbitMQ Management
```

---

## 🔧 **Production Configuration**

### **⚙️ Environment Setup:**
```bash
# Edit production environment
nano .env

# Critical settings to update:
NODE_ENV=production
DB_PASSWORD=your_secure_password
JWT_SECRET=your_jwt_secret_key
REDIS_PASSWORD=your_redis_password
RABBITMQ_PASSWORD=your_rabbitmq_password
```

### **🌐 Domain Setup:**
```bash
# Update nginx.conf
nano nginx.conf

# Change these lines:
server_name your-domain.com;
# SSL certificate paths (if using SSL)
```

### **🔒 SSL Setup (Optional):**
```bash
# Let's Encrypt (recommended)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Or manual SSL
mkdir -p ssl
# Upload your certificates to ssl/
```

---

## 📊 **Service Management**

### **🔄 Common Commands:**
```bash
# Check status
docker-compose -f composer.yml ps

# View logs
docker-compose -f composer.yml logs -f

# Restart services
docker-compose -f composer.yml restart

# Stop services
docker-compose -f composer.yml down

# Update services
git pull origin main
docker-compose -f composer.yml pull
docker-compose -f composer.yml up -d
```

### **📈 Scaling Options:**
```bash
# Scale backend
docker-compose -f composer.yml up -d --scale backend=3

# Scale with monitoring
docker-compose -f composer.yml --profile monitoring up -d

# Scale with backup
docker-compose -f composer.yml --profile backup up -d
```

---

## 🔍 **Health Verification**

### **✅ Service Health Checks:**
```bash
# Check all services
curl http://localhost/health

# Individual service checks
curl http://localhost:3000           # Frontend
curl http://localhost:5000/api/health    # Backend
curl http://localhost:15672            # RabbitMQ UI

# Database check
docker-compose -f composer.yml exec postgres pg_isready -U swiftnexus_user
```

### **📊 Performance Check:**
```bash
# Resource usage
docker stats

# System resources
free -h
df -h
htop
```

---

## 🚨 **Troubleshooting**

### **🔧 Common Issues:**

#### **Port Conflicts:**
```bash
# Check what's using ports
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :5000

# Kill conflicting processes
sudo kill -9 [PID]

# Change ports in .env
FRONTEND_PORT=3001
BACKEND_PORT=5001
```

#### **Permission Issues:**
```bash
# Fix Docker permissions
sudo usermod -aG docker $USER

# Fix file permissions
sudo chown -R $USER:$USER /opt/swiftnexus
```

#### **Memory Issues:**
```bash
# Add swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

---

## 🔒 **Security Quick Setup**

### **🛡️ Basic Security:**
```bash
# Configure firewall
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 3000
sudo ufw allow 5000

# Disable root login
sudo passwd -l root

# Create app user
sudo adduser swiftnexus
sudo usermod -aG sudo swiftnexus
```

### **🔐 SSL Security:**
```bash
# Strong SSL configuration
# Use TLS 1.2+
# Disable weak ciphers
# Enable HSTS
# Use secure headers
```

---

## 📈 **Monitoring Setup**

### **📊 Enable Monitoring:**
```bash
# Start monitoring stack
docker-compose -f composer.yml --profile monitoring up -d

# Access Grafana
http://your-server-ip:3001
# Username: admin
# Password: [your_grafana_password]
```

### **📝 Log Monitoring:**
```bash
# View application logs
docker-compose -f composer.yml logs -f backend

# View all service logs
docker-compose -f composer.yml logs -f

# Log rotation (optional)
docker-compose -f composer.yml exec backend find /app/logs -name "*.log" -mtime +7 -delete
```

---

## 💾 **Backup Setup**

### **📋 Enable Backups:**
```bash
# Start backup service
docker-compose -f composer.yml --profile backup up -d

# Manual backup
docker-compose -f composer.yml exec postgres pg_dump -U swiftnexus_user swiftnexus_prod > backup_$(date +%Y%m%d).sql

# Backup directory
ls -la /opt/swiftnexus/backups/
```

### **🔄 Backup Automation:**
```bash
# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/swiftnexus/backup_script.sh

# Weekly backup cleanup
0 3 * * 0 find /opt/swiftnexus/backups -name "backup_*.sql" -mtime +30 -delete
```

---

## 🎯 **Production URLs**

### **🌐 Access Points:**
```
🌐 Main Application: http://your-domain.com
🔧 Admin Panel: http://your-domain.com/admin
📊 API: http://your-domain.com/api
🗄️ Database: localhost:5432 (internal only)
📬 RabbitMQ: http://your-domain.com:15672
📈 Grafana: http://your-domain.com:3001
📊 Prometheus: http://your-domain.com:9090
```

### **🔐 Default Credentials:**
```
👤 Application: admin@swiftnexus.com / admin123
🗄️ Database: swiftnexus_user / [your_db_password]
📬 RabbitMQ: swiftnexus / [your_rabbitmq_password]
📈 Grafana: admin / [your_grafana_password]
```

---

## 🚀 **Deploy Success Verification**

### **✅ Deployment Checklist:**
```
□ All services running: docker-compose ps
□ Frontend accessible: curl http://localhost:3000
□ Backend API working: curl http://localhost:5000/api/health
□ Database connected: docker exec postgres psql
□ Message queue active: http://localhost:15672
□ Logs error-free: docker-compose logs
□ SSL configured (optional): https://your-domain.com
□ Monitoring active (optional): http://localhost:3001
```

### **🎉 Success Indicators:**
```
✅ Application loads without errors
✅ All services communicate properly
✅ Database operations working
✅ User authentication functional
✅ SWIFT messaging operational
✅ File uploads working
✅ Responsive design working
✅ Security measures active
```

---

## 🏆 **Deployment Complete!**

### **✅ What You Have:**
```
🐳 Full Docker deployment
🗄️ Production database
🔒 Secure configuration
📊 Monitoring capabilities
💾 Automated backups
🌐 Domain-ready application
📱 Responsive frontend
🔧 Complete API backend
🔐 Authentication system
📬 Message processing
```

### **🎯 Next Steps:**
```
1. Configure your domain DNS
2. Set up SSL certificates
3. Update production passwords
4. Configure monitoring alerts
5. Set up backup procedures
6. Test all functionalities
7. Document your setup
```

---

## 📞 **Support & Resources**

### **🔧 Helpful Commands:**
```bash
# Service status
docker-compose -f composer.yml ps

# Resource usage
docker stats

# System info
docker-compose -f composer.yml exec backend uname -a

# Network test
docker-compose -f composer.yml exec backend ping -c 3 google.com
```

### **📚 Documentation Links:**
```
📖 Full Guide: UBUNTU_DEPLOYMENT_COMPLETE_GUIDE.md
🐳 Docker Guide: DOCKER_DEPLOYMENT_GUIDE.md
🔧 Usage Guide: DOCKER_USAGE_GUIDE.md
📊 Health Report: PROJECT_HEALTH_CHECK_REPORT.md
```

---

**🚀 Your SwiftNexus Enterprise is now deployed and ready for production use!**

**Deployment Time: ~5 minutes**
**Configuration Time: ~10 minutes**
**Total Time: ~15 minutes**

---

*This quick deployment guide gets your SwiftNexus Enterprise running on Ubuntu in minutes. For detailed configuration and advanced features, refer to the complete documentation.*
