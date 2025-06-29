# PersonalEA - Personal AI Assistant System

**Your personal AI assistant that helps you manage emails, goals, and calendar more efficiently.**

Built with API-first design principles and designed for both end users and developers.

## 🚀 Quick Start

### For Users
```bash
# One-command installation
curl -sL https://raw.githubusercontent.com/workatplay-admin/personalEA/v1.0.0/scripts/bootstrap.sh | bash
```

### For Developers
```bash
# Clone and setup development environment
git clone https://github.com/workatplay-admin/personalEA.git
cd personalEA
./claude-flow init --sparc
```

## 📚 Documentation

**[📖 Complete Documentation Index](DOCUMENTATION_INDEX.md)** - Your starting point for all documentation

### Quick Links
- **👤 Users**: [Installation Guide](docs/user-installation-guide.md) | [Quick Start Tutorial](docs/guides/quick-start.md)
- **👨‍💻 Developers**: [Developer Onboarding](docs/guides/developer-onboarding.md) | [API Documentation](services/goal-strategy/API_DOCUMENTATION.md)
- **🏗️ Architecture**: [System Overview](docs/reference/architecture/system-overview.md) | [Service Design](services/goal-strategy/README.md)
- **🧪 Testing**: [Testing Strategy](docs/guides/testing-strategy.md) | [Browser Tests](testing/goal-strategy-test/README.md)

## 🎯 Core Features

### Goal & Strategy Service
Transform vague ideas into actionable SMART goals with AI assistance
- **Interactive Goal Refinement**: Conversational AI guides you through SMART criteria
- **Milestone Generation**: Automatic breakdown into achievable milestones  
- **Task Planning**: Work breakdown structure with time estimation
- **Dependency Mapping**: Critical path analysis and optimization

🔗 *[Goal Strategy Documentation](services/goal-strategy/README.md) | [API Reference](services/goal-strategy/API_DOCUMENTATION.md)*

### Email Processing Service
Intelligent email management and automation
- **Smart Categorization**: AI-powered email classification
- **Response Drafting**: Context-aware email composition
- **Calendar Integration**: Meeting scheduling and coordination

🔗 *[Email Service Documentation](services/email-processing/README.md)*

### Frontend Interface
Modern React-based user interface
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: Live chat interface for goal refinement
- **Dark Mode**: Comfortable viewing in any environment

🔗 *[Frontend Documentation](testing/goal-strategy-test/README.md)*

## 🛠️ Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Backend** | TypeScript, Express, Prisma | RESTful API services |
| **Database** | PostgreSQL | Data persistence |
| **Frontend** | React, TypeScript, Vite | User interface |
| **AI Integration** | OpenAI GPT-4 | Natural language processing |
| **Testing** | Jest, Playwright | Unit and E2E testing |
| **Deployment** | Docker, Railway/Render | Container orchestration |

🔗 *[Complete Architecture Guide](docs/reference/architecture/system-overview.md)*

## ⚡ Quick Commands

```bash
# Start development environment
./claude-flow start --ui

# Run tests
npm run test:all

# Build for production  
npm run build

# Deploy to staging
npm run deploy:staging
```

🔗 *[Development Workflows](docs/guides/development-workflows.md) | [Claude-Flow Reference](CLAUDE.md)*

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details on:
- Development setup and workflow
- Code standards and review process  
- Testing requirements
- Documentation standards

🔗 *[Developer Onboarding Guide](docs/guides/developer-onboarding.md)*

## 📋 Project Status

- **Version**: 1.0.0
- **Status**: Production Ready
- **Last Updated**: December 2024
- **Active Services**: Goal Strategy, Email Processing
- **Test Coverage**: 90%+ (Unit), 85%+ (E2E)

🔗 *[Development Plan](docs/development-plan.md) | [Testing Status](docs/guides/testing-strategy.md)*

## 🔒 Security & Privacy

PersonalEA takes security seriously:
- **JWT Authentication**: Secure API access
- **Scope-based Authorization**: Granular permission control
- **Encrypted Storage**: Sensitive data protection
- **No Data Mining**: Your data stays private

🔗 *[Security Guidelines](docs/security/README.md) | [Privacy Policy](docs/privacy-policy.md)*

## 📞 Support & Community

- **📖 Documentation**: [Complete Guide](DOCUMENTATION_INDEX.md)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/workatplay-admin/personalEA/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/workatplay-admin/personalEA/discussions)
- **📧 Email**: support@personalea.ai

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**[📚 Browse Complete Documentation](DOCUMENTATION_INDEX.md)** | **[🚀 Get Started Now](docs/user-installation-guide.md)** | **[👨‍💻 Developer Setup](docs/guides/developer-onboarding.md)**