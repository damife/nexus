# 🖥️ **PuTTY Easy Setup Guide - SwiftNexus Enterprise**

**Complete step-by-step guide using PuTTY for VM connection and deployment**

---

## 🎯 **Easiest Method Overview**

### **⚡ 3-Step Process:**
```
1. 🔐 Connect with PuTTY
2. 🚀 Run one-command deployment
3. 🌐 Access your application
```

---

## 🔐 **Step 1: Connect with PuTTY**

### **📋 Get Your VM Details:**
```
🌐 Host Name/IP Address: [Your VM IP Address]
🔌 Port: 22
👤 Connection type: SSH
🔑 Saved Sessions: SwiftNexus-VM
```

### **🖥️ PuTTY Setup Instructions:**

#### **📥 Download PuTTY (if not installed):**
```
🌐 Download from: https://www.putty.org/
📥 Download: putty-64bit-0.78-installer.msi
💾 Install and run PuTTY
```

#### **⚙️ Configure PuTTY:**
```
1. 🖥️ Open PuTTY
2. 🌐 Enter your VM IP in "Host Name"
3. 🔌 Ensure Port is 22
4. 👤 Connection type: SSH
5. 💾 Enter "SwiftNexus-VM" in "Saved Sessions"
6. 💾 Click "Save"
7. 🚀 Click "Open"
```

#### **🔐 First Connection:**
```
🔔 Security Alert: Click "Yes" (accept server fingerprint)
👤 Login as: root
🔑 Password: [Your VM password]
✅ Success! You're connected to your VM
```

---

## 🚀 **Step 2: One-Command Deployment**

### **⚡ Copy and Paste This Command:**

#### **🎯 THE EASIEST WAY:**
```bash
curl -fsSL https://raw.githubusercontent.com/damife/swift-nexus-enterprise/main/deploy-complete.sh | sudo bash
```

#### **📋 How to Use in PuTTY:**
```
1. 📋 Copy the command above (Ctrl+C)
2. 🖥️ Right-click in PuTTY window (pastes automatically)
3. ⏱️ Wait 5-10 minutes
4. ✅ Deployment complete!
```

### **🔍 What This Command Does:**
```
🔄 Updates your Ubuntu system
🐳 Installs Docker and Docker Compose
🌐 Installs and configures Nginx
📁 Downloads SwiftNexus Enterprise
⚙️ Configures all services
🔒 Sets up SSL certificates
🚀 Starts all Docker containers
🗄️ Initializes PostgreSQL database
📊 Sets up monitoring
💾 Configures backups
```

---

## 🌐 **Step 3: Access Your Application**

### **📋 After Deployment Complete:**

#### **🎯 Your Application URLs:**
```
🌐 Main Application: http://your-vm-ip
🔧 Admin Panel: http://your-vm-ip/admin
📊 API: http://your-vm-ip/api
📬 RabbitMQ: http://your-vm-ip:15672
📈 Grafana: http://your-vm-ip:3001
```

#### **🔐 Default Login Credentials:**
```
👤 Application: admin@swiftnexus.com / admin123
📬 RabbitMQ: swiftnexus / [auto-generated password]
📈 Grafana: admin / [auto-generated password]
```

---

## 🎯 **Complete PuTTY Setup Guide**

### **📋 Detailed PuTTY Configuration:**

#### **🖥️ Session Configuration:**
```
📝 Host Name (or IP address): [Your VM IP]
🔌 Port: 22
👤 Connection type: SSH
💾 Saved Sessions: SwiftNexus-VM
```

#### **🔐 Window Configuration:**
```
🖥️ Window → Appearance:
  ✅ Change font size for better readability
  ✅ Set window size for comfort

🖥️ Window → Behaviour:
  ✅ Scrollback lines: 10,000
  ✅ Window close: Do nothing
```

#### **🔧 Connection Configuration:**
```
🔐 Connection → Data:
  ✅ Auto-login username: root

🔐 Connection → SSH → Auth:
  ✅ Allow agent forwarding
  ✅ Allow attempted changes of username
```

#### **💾 Save Configuration:**
```
1. 📝 Enter session name: "SwiftNexus-VM"
2. 💾 Click "Save"
3. 🚀 Double-click "SwiftNexus-VM" to connect
```

---

## 🔧 **PuTTY Usage Tips**

### **✅ Best Practices:**
```
📋 Copy text: Select text with mouse
📋 Paste text: Right-click (no Ctrl+V needed)
🖥️ Scroll: Use mouse wheel or scrollbar
📏 Resize: Drag window edges
🔍 Clear screen: Type "clear" and press Enter
```

### **🚨 Common Issues:**

#### **Connection Refused:**
```
🔍 Check VM IP address
🔍 Ensure VM is running
🔍 Check firewall settings
🔍 Try different port (if not 22)
```

#### **Authentication Failed:**
```
🔍 Check username (usually "root")
🔍 Check password carefully
🔍 Ensure caps lock is off
🔍 Try typing password slowly
```

#### **Connection Timed Out:**
```
🔍 Check internet connection
🔍 Verify VM is accessible
🔍 Try again after 30 seconds
🔍 Check VM status in hosting panel
```

---

## 🎯 **Post-Deployment Management**

### **📊 Common Commands (use in PuTTY):**

#### **🔍 Check Services:**
```bash
cd /opt/swiftnexus
docker-compose -f composer.yml ps
```

#### **📝 View Logs:**
```bash
cd /opt/swiftnexus
docker-compose -f composer.yml logs -f
```

#### **🔄 Restart Services:**
```bash
cd /opt/swiftnexus
docker-compose -f composer.yml restart
```

#### **🔧 Update Application:**
```bash
cd /opt/swiftnexus
git pull origin main
docker-compose -f composer.yml up -d --build
```

---

## 🌐 **Domain Setup (Optional)**

### **📋 Add Custom Domain:**

#### **🔧 Update Nginx Configuration:**
```bash
cd /opt/swiftnexus
nano nginx.conf

# Find and change:
server_name your-domain.com www.your-domain.com;

# Save: Ctrl+X, Y, Enter
# Reload: docker-compose -f composer.yml exec nginx nginx -s reload
```

#### **🔒 Setup SSL Certificate:**
```bash
# Install Certbot
apt install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Access via: https://your-domain.com
```

---

## 🔒 **Security Best Practices**

### **🛡️ Secure Your VM:**
```bash
# Create non-root user
adduser swiftnexus
usermod -aG sudo swiftnexus

# Configure firewall
ufw --force enable
ufw allow ssh
ufw allow 80
ufw allow 443

# Disable root login (optional)
nano /etc/ssh/sshd_config
# Change: PermitRootLogin no
systemctl restart ssh
```

### **🔐 SSH Key Setup (Advanced):**
```bash
# Generate SSH key on your computer
ssh-keygen -t ed25519 -C "your-email@example.com"

# Copy public key to VM
ssh-copy-id root@your-vm-ip

# Connect with key (no password needed)
ssh -i ~/.ssh/id_ed25519 root@your-vm-ip
```

---

## 🎉 **Success Checklist**

### **✅ What You Should Have:**
```
✅ PuTTY connected to VM
✅ SwiftNexus deployed
✅ All services running
✅ Application accessible
✅ Default login working
✅ Docker containers active
✅ Database initialized
✅ Monitoring ready
```

### **🌐 Access Verification:**
```
🌐 Open browser: http://your-vm-ip
👤 Login: admin@swiftnexus.com / admin123
✅ Should see SwiftNexus dashboard
🔧 Test admin panel: /admin
📊 Test API: /api/health
```

---

## 🚨 **Troubleshooting Quick Fixes**

### **🔧 Common Problems:**

#### **Deployment Fails:**
```bash
# Check internet connection
ping google.com

# Update system manually
apt update && apt upgrade -y

# Retry deployment
curl -fsSL https://raw.githubusercontent.com/damife/swift-nexus-enterprise/main/deploy-complete.sh | sudo bash
```

#### **Services Not Starting:**
```bash
# Check Docker status
systemctl status docker

# Restart Docker
systemctl restart docker

# Check services
cd /opt/swiftnexus
docker-compose -f composer.yml ps
```

#### **Can't Access Application:**
```bash
# Check if services are running
docker-compose -f composer.yml ps

# Check ports
netstat -tulpn | grep :3000

# Restart Nginx
docker-compose -f composer.yml restart nginx
```

---

## 🎯 **Quick Reference Commands**

### **📋 Essential Commands:**
```bash
# Navigate to app directory
cd /opt/swiftnexus

# Check all services
docker-compose -f composer.yml ps

# View application logs
docker-compose -f composer.yml logs -f

# Restart all services
docker-compose -f composer.yml restart

# Check system resources
free -h && df -h

# Update application
git pull origin main && docker-compose -f composer.yml up -d
```

---

## 🎉 **YOU'RE DONE!**

### **🏆 Easiest Setup Complete:**
```
✅ Connected with PuTTY
✅ Deployed with one command
✅ Application running
✅ Ready to use!
```

### **🌐 Access Your SwiftNexus:**
```
🌐 Main App: http://your-vm-ip
🔧 Admin Panel: http://your-vm-ip/admin
📊 API: http://your-vm-ip/api
```

---

## **🎯 FINAL ANSWER: EASIEST SETUP METHOD**

### **🚀 3 SIMPLE STEPS:**
```
1. 🔐 Connect with PuTTY to your VM IP
2. 🚀 Run: curl -fsSL https://raw.githubusercontent.com/damife/swift-nexus-enterprise/main/deploy-complete.sh | sudo bash
3. 🌐 Access: http://your-vm-ip
```

**That's it! Your SwiftNexus Enterprise is fully deployed and running!** 🎉🚀

---

*This guide provides the absolute easiest way to set up your complete SwiftNexus Enterprise system using PuTTY.*
