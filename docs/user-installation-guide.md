# PersonalEA User Installation Guide

## 🚀 TL;DR - The One Command

**Want PersonalEA running in 5 minutes? Copy and paste this:**

```bash
curl -sL https://raw.githubusercontent.com/workatplay-admin/personalEA/[1;33m⚠️ No Git tags found, using default version: v1.0.0[0mv1.0.0/scripts/bootstrap.sh | bash
```

That's it! The script will:
- ✅ Download PersonalEA
- ✅ Install prerequisites automatically
- ✅ Set up everything with Docker
- ✅ Start your personal AI assistant
- ✅ Open http://localhost:3000 when ready

**Prefer other options?** Continue reading for cloud deployment, manual setup, and detailed configuration.

---

Welcome to PersonalEA! This guide will help you install and configure your personal AI assistant system without needing technical expertise.

## 🎯 What is PersonalEA?

PersonalEA is your personal AI assistant that helps you:
- **Manage Emails**: Automatically summarize emails and extract action items
- **Track Goals**: Organize and prioritize your personal and professional goals
- **Schedule Smart**: Intelligently manage your calendar and suggest optimal meeting times

## 🚀 Quick Installation Options

Choose the installation method that works best for you:

### Option 1: One-Click Cloud Deployment (Recommended)

**Deploy to Railway** (Easiest - No setup required)
1. Click this button: [![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/template/personalea)
2. Connect your GitHub account
3. Follow the setup wizard
4. Your PersonalEA will be ready in 5 minutes!

**Deploy to Render**
1. Click: [![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/your-repo/personalEA)
2. Connect your GitHub account
3. Configure your settings
4. Deploy automatically

### Option 2: Docker Desktop (Mac/Windows)

**Prerequisites:**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed

**Installation Steps:**
1. **Download PersonalEA**
   ```bash
   # Open Terminal (Mac) or Command Prompt (Windows)
   git clone https://github.com/workatplay-admin/personalEA.git
   cd personalEA
   git checkout [1;33m⚠️ No Git tags found, using default version: v1.0.0[0mv1.0.0
   ```

2. **Start PersonalEA**
   ```bash
   # This will download and start everything automatically
   docker-compose up -d
   ```

3. **Access Your Assistant**
   - Open your browser to: http://localhost:3000
   - Follow the setup wizard

### Option 3: Local Installation (Advanced Users)

**Prerequisites:**
- Node.js 18+ ([Download here](https://nodejs.org/))
- Git ([Download here](https://git-scm.com/))

**Installation Steps:**
1. **Download and Setup**
   ```bash
   git clone https://github.com/workatplay-admin/personalEA.git
   cd personalEA
   git checkout [1;33m⚠️ No Git tags found, using default version: v1.0.0[0mv1.0.0
   ./scripts/setup-user.sh
   ```

2. **Start PersonalEA**
   ```bash
   npm run start:user
   ```

3. **Access Your Assistant**
   - Open your browser to: http://localhost:3000

## 🔒 Post-Install Security Hardening

**IMPORTANT:** PersonalEA ships with secure defaults, but you must rotate these secrets for production use:

### Automated Security Setup (Recommended)

Run our automated security hardening script:

```bash
# Run the security hardening script
./scripts/security-hardening.sh

# Follow the prompts to complete setup
```

This script will automatically:
- Generate new JWT signing keys
- Rotate database passwords
- Create new encryption keys
- Set secure production defaults
- Backup your existing configuration

### Manual Security Checklist (Alternative)

If you prefer manual setup, complete within 24 hours:

**1. Change Default Admin Password**
```bash
# Access the admin panel at http://localhost:3000/admin
# Default login: admin / personalea-admin-2024
# IMMEDIATELY change this to a strong, unique password
```

**2. Generate New JWT Signing Key**
```bash
# Generate a new 64-character random key
openssl rand -hex 32

# Update your .env file:
JWT_SECRET=your-new-64-character-random-key-here
```

**3. Rotate Database Passwords**
```bash
# Edit your .env file and change:
DB_PASSWORD=your-strong-database-password
REDIS_PASSWORD=your-strong-redis-password
```

**4. Generate New Encryption Key**
```bash
# Generate a new 32-character encryption key
openssl rand -hex 16

# Update your .env file:
EMAIL_ENCRYPTION_KEY=your-new-32-character-encryption-key
```

**5. Enable Two-Factor Authentication**
- Log into PersonalEA admin panel
- Navigate to Security Settings
- Enable 2FA using your phone's authenticator app
- Save backup codes in a secure location

**6. Restart Services with New Secrets**
```bash
# Apply the new security configuration
docker compose down
docker compose up -d
```

### Security Verification
After completing the checklist, verify your security:
- [ ] Default admin password changed
- [ ] JWT signing key rotated
- [ ] Database passwords updated
- [ ] Email encryption key rotated
- [ ] 2FA enabled and tested
- [ ] Services restarted successfully

## ⚙️ Initial Configuration

After installation and security hardening, you'll be guided through a setup wizard to configure:

### 1. Email Integration
- **Gmail**: Connect your Gmail account (most popular)
- **Outlook**: Connect your Microsoft account
- **IMAP**: Connect any email provider

### 2. Calendar Integration
- **Google Calendar**: Sync with your Google calendar
- **Outlook Calendar**: Sync with Microsoft calendar
- **Apple Calendar**: Connect your iCloud calendar

### 3. AI Services (Optional)
- **OpenAI**: For advanced email summarization (requires API key)
- **Local AI**: Use built-in AI (no external service needed)

### 4. Security Settings
- Set your master password
- Configure two-factor authentication (recommended)
- Set data retention preferences

## 🔧 Configuration Options

### Email Settings
- **Sync Frequency**: How often to check for new emails (5 min - 1 hour)
- **Summary Level**: Brief, detailed, or custom
- **Action Item Detection**: Automatic or manual review
- **Folder Organization**: Auto-categorize emails

### Goal Management
- **Goal Categories**: Work, personal, health, learning
- **Priority System**: High/medium/low or custom scoring
- **Progress Tracking**: Daily, weekly, or milestone-based
- **AI Suggestions**: Enable smart goal recommendations

### Calendar Integration
- **Sync Direction**: One-way or two-way sync
- **Meeting Preferences**: Buffer times, preferred hours
- **Conflict Resolution**: Automatic or manual
- **Smart Scheduling**: AI-powered meeting suggestions

### Privacy & Security
- **Data Storage**: Local only or encrypted cloud backup
- **AI Processing**: Local or cloud-based
- **Access Control**: Single user or family sharing
- **Data Export**: Regular backups and export options

## 🌐 Accessing PersonalEA

### Web Interface
- **URL**: http://localhost:3000 (local) or your cloud URL
- **Mobile**: Responsive design works on phones and tablets
- **Offline**: Basic features work without internet

### API Access (Advanced)
- **REST API**: Full programmatic access
- **Webhooks**: Real-time notifications
- **Integrations**: Connect with other tools

## 🔒 Security & Privacy

### Data Protection
- **Encryption**: All data encrypted at rest and in transit
- **Local Processing**: AI analysis can run locally
- **No Tracking**: No analytics or user tracking
- **Open Source**: Full transparency of code

### Access Control
- **Authentication**: Secure login with 2FA support
- **Session Management**: Automatic logout and session security
- **API Keys**: Secure token-based access
- **Audit Logs**: Track all system access

## 🆘 Troubleshooting

### Common Issues

**Installation Problems**
- **Docker not starting**: Ensure Docker Desktop is running
- **Port conflicts**: Change ports in configuration
- **Permission errors**: Run with administrator privileges

**Email Connection Issues**
- **Gmail not connecting**: Enable "Less secure app access" or use App Passwords
- **Outlook authentication**: Ensure modern authentication is enabled
- **IMAP errors**: Check server settings and credentials

**Performance Issues**
- **Slow email sync**: Reduce sync frequency or limit email count
- **High memory usage**: Adjust AI processing settings
- **Database errors**: Check disk space and permissions

### Getting Help

**Self-Help Resources**
- **FAQ**: Check docs/faq.md for common questions
- **Video Tutorials**: Step-by-step setup videos
- **Configuration Examples**: Sample setups for different use cases

**Community Support**
- **GitHub Discussions**: Ask questions and share tips
- **Discord Community**: Real-time chat support
- **User Forum**: Browse solutions and best practices

**Professional Support**
- **Email Support**: support@personalea.com
- **Priority Support**: Available for business users
- **Custom Setup**: Professional installation services

## 🔄 Updates & Maintenance

### Safe Deployment Updates

**Upgrading to Latest Version (Roll Forward):**
```bash
# Pull latest images and restart - your data stays safe
docker compose pull && docker compose up -d
```

**Rolling Back to Previous Version:**
```bash
# If something goes wrong, roll back to a specific version
docker compose down && docker compose -f docker-compose.user.yml up -d v1.2.3
```

This approach ensures home users can confidently update their live setup without fear of breaking their PersonalEA installation. Your data and configuration remain intact during both upgrades and rollbacks.

### Automatic Updates
- **Security Updates**: Applied automatically
- **Feature Updates**: Optional with user approval
- **Backup Before Updates**: Automatic data backup

### Manual Maintenance
- **Database Cleanup**: Monthly optimization recommended
- **Log Rotation**: Automatic cleanup of old logs
- **Performance Monitoring**: Built-in health checks

### Backup & Recovery
- **Automatic Backups**: Daily encrypted backups
- **Export Data**: Full data export anytime
- **Restore Process**: One-click restore from backup
- **Migration**: Easy transfer to new installation

## 📱 Mobile Access

### Progressive Web App
- **Install**: Add to home screen from browser
- **Offline Mode**: Core features work offline
- **Push Notifications**: Real-time alerts
- **Sync**: Automatic sync when online

### Mobile Optimization
- **Responsive Design**: Works on all screen sizes
- **Touch Interface**: Optimized for mobile interaction
- **Fast Loading**: Optimized for mobile networks
- **Battery Efficient**: Minimal background processing

## 🎓 Getting Started Tips

### First Week
1. **Connect one email account** to start
2. **Set up 3-5 initial goals** to track
3. **Connect your primary calendar**
4. **Review daily summaries** to understand the system
5. **Adjust settings** based on your preferences

### Best Practices
- **Start Simple**: Begin with basic features, add complexity gradually
- **Regular Review**: Check summaries and goals weekly
- **Customize**: Adjust settings to match your workflow
- **Backup**: Set up regular backups from day one
- **Security**: Use strong passwords and enable 2FA

### Advanced Features
- **Custom Rules**: Create email filtering and categorization rules
- **Integrations**: Connect with other productivity tools
- **API Usage**: Automate tasks with custom scripts
- **Team Sharing**: Share goals and calendars with family/team

---

**Need Help?** 
- 📧 Email: support@personalea.com
- 💬 Chat: [Discord Community](https://discord.gg/personalea)
- 📖 Docs: [Full Documentation](docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/workatplay-admin/personalEA/issues)

**Welcome to your new AI assistant! 🎉**