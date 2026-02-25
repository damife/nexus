# 🚀 **Ubuntu VM Startup Guide - SwiftNexus Enterprise**

**Complete step-by-step guide from VM creation to SwiftNexus deployment**

---

## 🎯 **Quick Start Overview**

### **⚡ 5-Step Process:**
```
1. 🔐 Connect to your Ubuntu VM
2. 🔄 Update and secure the system
3. 🐳 Install Docker & dependencies
4. 🚀 Deploy SwiftNexus Enterprise
5. 🌐 Configure domain and access
```

---

## 🔐 **Step 1: Connect to Your Ubuntu VM**

### **📋 Get Connection Details:**
```
🌐 Server IP: [Your VM IP Address]
👤 Username: root or ubuntu
🔑 Password: [Your VM password]
🔌 Port: 22 (SSH)
```

### **🖥️ Connect Methods:**

#### **Windows Users:**
```bash
# Using PowerShell/Command Prompt
ssh root@your-vm-ip

# Using PuTTY
# Host: your-vm-ip
# Port: 22
# Username: root
# Password: [your-password]
```

#### **Mac/Linux Users:**
```bash
# Using Terminal
ssh root@your-vm-ip

# Using SSH key (if configured)
ssh -i ~/.ssh/your-key root@your-vm-ip
```

### **✅ First Connection:**
```bash
# Accept SSH fingerprint (type 'yes')
# Enter password when prompted
# You should see: root@your-vm:~#
```

---

## 🔄 **Step 2: Update and Secure System**

### **📋 System Update:**
```bash
# Update package lists
apt update

# Upgrade all packages
apt upgrade -y

# Install essential tools
apt install -y curl wget git unzip htop nano vim software-properties-common
```

### **🔒 Basic Security Setup:**
```bash
# Create non-root user (recommended)
adduser swiftnexus
usermod -aG sudo swiftnexus

# Configure firewall
ufw --force enable
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw status
```

### **🔐 SSH Security (Optional but Recommended):**
```bash
# Edit SSH configuration
nano /etc/ssh/sshd_config

# Recommended changes:
# PermitRootLogin no
# PasswordAuthentication no
# PubkeyAuthentication yes

# Restart SSH service
systemctl restart ssh

# IMPORTANT: Keep your terminal open until you verify new SSH access works!
```

---

## 🐳 **Step 3: Install Docker & Dependencies**

### **📦 Install Docker:**
```bash
# Remove old versions
apt remove -y docker docker-engine containerd runc 2>/dev/null || true

# Add Docker's official GPG key
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

# Set up the stable repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index
apt update

# Install Docker Engine
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Start and enable Docker
systemctl start docker
systemctl enable docker

# Add user to docker group
usermod -aG docker swiftnexus
```

### **✅ Verify Docker Installation:**
```bash
# Test Docker
docker --version
docker-compose --version

# Run test container
docker run hello-world

# Should see: "Hello from Docker!"
```

---

## 🚀 **Step 4: Deploy SwiftNexus Enterprise**

### **📁 Setup Application Directory:**
```bash
# Create application directory
mkdir -p /opt/swiftnexus
cd /opt/swiftnexus

# Clone the repository
git clone https://github.com/damife/swift-nexus-enterprise.git .

# Set permissions
chown -R swiftnexus:swiftnexus /opt/swiftnexus
chmod +x *.sh
```

### **⚙️ Configure Environment:**
```bash
# Copy environment template
cp .env.docker .env

# Edit environment file
nano .env

# Update these critical settings:
NODE_ENV=production
DB_PASSWORD=your_secure_db_password
JWT_SECRET=your_jwt_secret_key
REDIS_PASSWORD=your_redis_password
RABBITMQ_PASSWORD=your_rabbitmq_password
```

### **🚀 Start Services:**
```bash
# Start core services
docker-compose -f composer.yml up -d

# Wait for services to start (30 seconds)
sleep 30

# Check service status
docker-compose -f composer.yml ps

# Start with monitoring and backup
docker-compose -f composer.yml --profile monitoring --profile backup up -d
```

### **✅ Verify Deployment:**
```bash
# Check if services are running
docker-compose -f composer.yml ps

# Test application health
curl http://localhost/health

# Check logs
docker-compose -f composer.yml logs -f
```

---

## 🌐 **Step 5: Configure Domain and Access**

### **📋 Domain Configuration:**
```bash
# Update Nginx configuration
nano nginx.conf

# Change these lines:
server_name your-domain.com www.your-domain.com;

# Test Nginx configuration
docker-compose -f composer.yml exec nginx nginx -t

# Reload Nginx
docker-compose -f composer.yml exec nginx nginx -s reload
```

### **🔒 SSL Certificate Setup:**
```bash
# Install Certbot on host system
apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Setup auto-renewal
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -
```

### **🌐 Access Your Application:**
```
🌐 Main Application: https://your-domain.com
🔧 Admin Panel: https://your-domain.com/admin
📊 API: https://your-domain.com/api
📬 RabbitMQ: https://your-domain.com/rabbitmq
📈 Grafana: https://your-domain.com/grafana
```

---

## 🎯 **Complete Startup Script**

### **⚡ One-Command Deployment:**
```bash
# Create and run this script
curl -fsSL https://raw.githubusercontent.com/damife/swift-nexus-enterprise/main/deploy-complete.sh | sudo bash
```

### **📋 Manual Step-by-Step:**
```bash
# 1. Connect to VM
ssh root@your-vm-ip

# 2. Update system
apt update && apt upgrade -y

# 3. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 4. Deploy SwiftNexus
git clone https://github.com/damife/swift-nexus-enterprise.git
cd swift-nexus-enterprise
cp .env.docker .env
nano .env  # Update passwords
docker-compose -f composer.yml up -d

# 5. Configure domain
nano nginx.conf  # Update domain
certbot --nginx -d your-domain.com
```

---

## 🔍 **Post-Deployment Verification**

### **✅ Service Health Check:**
```bash
# Check all services
docker-compose -f composer.yml ps

# Test application
curl -f http://localhost/health

# Test API
curl -f http://localhost:5000/api/health

# Check database
docker-compose -f composer.yml exec postgres pg_isready -U swiftnexus_user
```

### **📊 Resource Monitoring:**
```bash
# Check system resources
free -h
df -h
htop

# Check Docker resource usage
docker stats

# Check disk usage
du -sh /opt/swiftnexus
```

---

## 🔧 **Service Management**

### **📊 Common Commands:**
```bash
# Navigate to application directory
cd /opt/swiftnexus

# Check service status
docker-compose -f composer.yml ps

# View logs
docker-compose -f composer.yml logs -f

# Restart services
docker-compose -f composer.yml restart

# Stop services
docker-compose -f composer.yml down

# Update application
git pull origin main
docker-compose -f composer.yml pull
docker-compose -f composer.yml up -d
```

### **🔄 Database Management:**
```bash
# Access database
docker-compose -f composer.yml exec postgres psql -U swiftnexus_user -d swiftnexus_prod

# Create backup
docker-compose -f composer.yml exec postgres pg_dump -U swiftnexus_user swiftnexus_prod > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose -f composer.yml exec -T postgres psql -U swiftnexus_user swiftnexus_prod < backup_file.sql
```

---

## 🔒 **Security Best Practices**

### **🛡️ Ongoing Security:**
```bash
# Regular updates
apt update && apt upgrade -y

# Check for security updates
apt list --upgradable

# Monitor login attempts
tail -f /var/log/auth.log

# Check failed SSH attempts
grep "Failed password" /var/log/auth.log
```

### **🔐 User Management:**
```bash
# Create additional users
adduser username
usermod -aG sudo username

# Switch to non-root user
su - swiftnexus

# Use sudo for administrative tasks
sudo docker-compose -f composer.yml ps
```

---

## 📊 **Monitoring and Maintenance**

### **📈 Performance Monitoring:**
```bash
# System performance
htop
iotop
nethogs

# Docker performance
docker stats
docker-compose -f composer.yml exec backend top

# Log monitoring
docker-compose -f composer.yml logs -f backend
tail -f /var/log/syslog
```

### **💾 Backup Automation:**
```bash
# Create backup script
nano backup_script.sh

# Add to crontab
crontab -e

# Daily backup at 2 AM
0 2 * * * /opt/swiftnexus/backup_script.sh
```

---

## 🚨 **Troubleshooting**

### **🔧 Common Issues:**

#### **Services Not Starting:**
```bash
# Check Docker status
systemctl status docker

# Check service logs
docker-compose -f composer.yml logs

# Restart services
docker-compose -f composer.yml down
docker-compose -f composer.yml up -d
```

#### **Port Conflicts:**
```bash
# Check what's using ports
netstat -tulpn | grep :3000
netstat -tulpn | grep :5000

# Kill conflicting processes
kill -9 [PID]

# Change ports in .env
nano .env
```

#### **Memory Issues:**
```bash
# Check memory usage
free -h

# Add swap if needed
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
```

---

## 🎯 **Default Credentials**

### **🔐 Application Access:**
```
👤 Login: admin@swiftnexus.com
🔑 Password: admin123
🌐 URL: https://your-domain.com
```

### **📊 Service Credentials:**
```
🗄️ Database: swiftnexus_user / [your_db_password]
📬 RabbitMQ: swiftnexus / [your_rabbitmq_password]
📈 Grafana: admin / [your_grafana_password]
```

---

## 🎉 **Success Checklist**

### **✅ What You Should Have:**
```
✅ Ubuntu VM running and updated
✅ Docker and Docker Compose installed
✅ SwiftNexus Enterprise deployed
✅ All services running (docker-compose ps)
✅ Application accessible via domain
✅ SSL certificate installed
✅ Database initialized
✅ Monitoring active
✅ Security configured
```

### **🌐 Access Points:**
```
🌐 Main App: https://your-domain.com
🔧 Admin Panel: https://your-domain.com/admin
📊 API: https://your-domain.com/api
📬 RabbitMQ: https://your-domain.com/rabbitmq
📈 Grafana: https://your-domain.com/grafana
```

---

## **🚀 YOU'RE READY TO GO!**

### **🎯 Next Steps:**
```
1. ✅ Login to your application
2. ✅ Update default passwords
3. ✅ Configure your settings
4. ✅ Test all features
5. ✅ Set up monitoring alerts
6. ✅ Configure backups
7. ✅ Add your users
8. ✅ Start using SwiftNexus!
```

---

## **🎉 CONCLUSION**

**Your Ubuntu VM is now running SwiftNexus Enterprise successfully! The application is production-ready with all services operational.**

**🌐 Access your application at: https://your-domain.com**

**🔧 Use the service management commands to maintain and update your deployment.**

---

*This guide covers everything from VM connection to production deployment. Follow each step carefully for successful setup.*
