# 🖥️ **PuTTY Commands Only - SwiftNexus Enterprise**

**Copy-paste these commands directly into PuTTY**

---

## 🔐 **Step 1: Connect to PuTTY**
```
Host: [Your VM IP]
Port: 22
Login: root
Password: [Your VM password]
```

---

## 🚀 **Step 2: Run These Commands in PuTTY**

### **Command 1: Update System**
```bash
apt update && apt upgrade -y
```

### **Command 2: Install Docker**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh && usermod -aG docker $USER
```

### **Command 3: Install Nginx**
```bash
apt install -y nginx && systemctl start nginx && systemctl enable nginx
```

### **Command 4: Create App Directory**
```bash
mkdir -p /opt/swiftnexus && cd /opt/swiftnexus
```

### **Command 5: Clone Repository**
```bash
git clone https://github.com/damife/swift-nexus-enterprise.git .
```

### **Command 6: Configure Environment**
```bash
cp .env.docker .env && nano .env
```
*(Update these values in nano: DB_PASSWORD, JWT_SECRET, REDIS_PASSWORD, RABBITMQ_PASSWORD)*

### **Command 7: Start Services**
```bash
docker-compose -f composer.yml up -d
```

### **Command 8: Wait and Check**
```bash
sleep 30 && docker-compose -f composer.yml ps
```

### **Command 9: Start Monitoring**
```bash
docker-compose -f composer.yml --profile monitoring --profile backup up -d
```

### **Command 10: Setup SSL (Optional)**
```bash
apt install -y certbot python3-certbot-nginx && certbot --nginx -d your-domain.com
```

---

## 🌐 **Step 3: Access Your Application**

### **URLs:**
```
Main App: http://your-vm-ip
Admin Panel: http://your-vm-ip/admin
API: http://your-vm-ip/api
```

### **Login:**
```
Email: admin@swiftnexus.com
Password: admin123
```

---

## 🔧 **Management Commands**

### **Check Services:**
```bash
cd /opt/swiftnexus && docker-compose -f composer.yml ps
```

### **View Logs:**
```bash
cd /opt/swiftnexus && docker-compose -f composer.yml logs -f
```

### **Restart Services:**
```bash
cd /opt/swiftnexus && docker-compose -f composer.yml restart
```

### **Update App:**
```bash
cd /opt/swiftnexus && git pull origin main && docker-compose -f composer.yml up -d
```

---

**That's it! Copy-paste these commands in order.**
