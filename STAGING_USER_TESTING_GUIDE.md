# PersonalEA Staging Environment - User Testing Guide

## ⚠️ **SETUP VERIFICATION REQUIRED**

**Before user testing, ALWAYS verify the configuration:**

```bash
# Run this FIRST to ensure everything works:
node verify-setup.js
```

**📋 Complete Setup Documentation:**
- **Reliable Setup Guide:** `RELIABLE_TESTING_SETUP.md`
- **Quick Reference:** `QUICK_SETUP_REFERENCE.md`
- **Troubleshooting:** See setup guides for CORS and port configuration

## 🚀 **Quick Start** 

### **Prerequisites**
- GitHub Codespaces (recommended) OR Docker Desktop
- OpenAI API key (required for AI features)
- Web browser (Chrome, Firefox, Safari, Edge)

### **Start Testing in 3 Steps**

```bash
# 1. Set your OpenAI API key
export OPENAI_API_KEY='sk-your-api-key-here'

# 2. Start the staging environment
./start-staging.sh

# 3. Open the testing interface
# Browser will automatically open: http://localhost:5173
```

## ⚠️ **CRITICAL TESTING LIMITATIONS**

**This staging environment provides PARTIAL testing only due to critical missing components:**

### **🔒 Data Sovereignty Framework Missing**
- **What's Missing**: User-controlled encryption, consent management, data export/deletion
- **Impact**: All data processing violates the "You-First" privacy principle
- **Testing Impact**: Cannot test privacy controls, user data ownership, or consent flows

### **📅 Calendar Service Completely Missing**
- **What's Missing**: Entire calendar integration service
- **Impact**: Blocks task scheduling, calendar integration, and complete Goal Strategy workflow
- **Testing Impact**: Cannot test Phases 4-6 of Goal Strategy Service or end-to-end workflows

## 📊 **Service Status Dashboard**

| Service | Status | Port | What You Can Test |
|---------|--------|------|-------------------|
| **Goal Strategy** | ✅ Available | 3000 | SMART goals, task breakdown, estimation |
| **Email Processing** | ✅ Available | 3001 | Limited (privacy concerns) |
| **Testing Interface** | ✅ Available | 5173 | Goal management UI |
| **Health Dashboard** | ✅ Available | 8080 | Service monitoring |
| **Calendar Service** | ❌ **Missing** | 3003 | Nothing - service doesn't exist |
| **Data Privacy** | ❌ **Missing** | N/A | No privacy controls available |

## 🧪 **What You Can Test**

### **✅ Goal Strategy Service (Phases 1-3)**

#### **1. SMART Goal Translation**
- **Test**: Convert vague goals into specific, measurable objectives
- **Examples**: 
  - Input: "I want to get better at programming"
  - Expected: Specific learning goals with timelines and metrics

#### **2. Work Breakdown Structure (WBS)**
- **Test**: Generate detailed task hierarchies from goals
- **Examples**:
  - Large goal broken into manageable sub-tasks
  - Recursive decomposition to actionable items

#### **3. Task Estimation**
- **Test**: AI-powered time estimation for tasks
- **Methods**: Expert judgment, analogy-based, three-point PERT

#### **4. Dependency Mapping**
- **Test**: Identify task dependencies and critical paths
- **Features**: Dependency graphs, critical path calculation

#### **5. Milestone Generation**
- **Test**: Create meaningful project milestones
- **Features**: Timeline distribution, progress tracking

### **✅ User Interface Testing**

#### **React Testing Interface**
- **URL**: http://localhost:5173
- **Features**: 
  - Goal input and translation
  - SMART criteria editing
  - Task breakdown visualization
  - Estimation results display
  - Dependency mapping interface

## ❌ **What You CANNOT Test**

### **Calendar Integration (Service Missing)**
- Task scheduling in calendar
- Availability analysis
- Conflict detection and resolution
- Focus time blocking
- Calendar provider integration (Google, Outlook)

### **Complete Workflows (Blocked by Missing Components)**
- Email → Goals → Calendar flow
- Automated task scheduling
- Schedule optimization
- Capacity management
- Intelligence & optimization (Phases 4-6)

### **Data Privacy Controls (Framework Missing)**
- User-controlled encryption
- Explicit consent for AI processing
- Data export in portable formats
- Complete data deletion
- Audit trail of data processing
- Local processing alternatives

### **User-Controlled External Services**
- User-provided API keys
- Personal Gmail/calendar account integration
- Granular data sharing permissions

## 📋 **User Testing Scenarios**

### **Scenario 1: Personal Goal Planning**
1. **Input**: "I want to learn Python programming this year"
2. **Test Steps**:
   - Enter goal in testing interface
   - Review SMART goal translation
   - Examine generated task breakdown
   - Check time estimations
   - Validate dependency relationships
3. **Expected Results**: Comprehensive learning plan with realistic timeline

### **Scenario 2: Professional Project**
1. **Input**: "Launch a new product feature by Q2"
2. **Test Steps**:
   - Create business goal
   - Review milestone breakdown
   - Analyze critical path
   - Test estimation accuracy
3. **Expected Results**: Project plan with clear milestones and dependencies

### **Scenario 3: Fitness Goal**
1. **Input**: "Run a marathon in 6 months"
2. **Test Steps**:
   - Enter fitness objective
   - Review training plan generation
   - Check progressive milestone structure
   - Validate time allocations
3. **Expected Results**: Structured training program with measurable progress

## 🔧 **Troubleshooting**

### **Services Won't Start**
```bash
# Check Docker is running
docker info

# Check service logs
docker-compose -f docker-compose.staging.yml logs goal-strategy-service
docker-compose -f docker-compose.staging.yml logs email-processing-service

# Restart services
docker-compose -f docker-compose.staging.yml restart
```

### **Testing Interface Not Loading**
```bash
# Check if port 5173 is available
curl http://localhost:5173/health

# Rebuild testing interface
docker-compose -f docker-compose.staging.yml up --build goal-testing-ui
```

### **API Key Issues**
```bash
# Verify API key is set
echo $OPENAI_API_KEY

# Check service logs for authentication errors
docker-compose -f docker-compose.staging.yml logs goal-strategy-service | grep -i openai
```

### **Database Connection Issues**
```bash
# Check database health
docker-compose -f docker-compose.staging.yml exec postgres pg_isready -U staging_user -d personalea_staging

# Reset database
docker-compose -f docker-compose.staging.yml down -v
docker-compose -f docker-compose.staging.yml up -d
```

## 📝 **Providing Feedback**

### **What to Test and Report**

#### **User Experience**
- Interface intuitiveness and clarity
- Response times for AI processing
- Quality and accuracy of AI-generated content
- Overall workflow usability

#### **Functional Testing**
- Goal translation accuracy
- Task breakdown completeness
- Estimation reasonableness
- Dependency logic correctness

#### **Technical Issues**
- Performance problems or slow responses
- UI bugs or display issues
- Error messages or failed operations
- Browser compatibility issues

### **Feedback Collection**
- **Issues**: Document specific problems with steps to reproduce
- **Suggestions**: Improvement ideas for UI, workflow, or features
- **Use Cases**: Share real goals you tested and results quality
- **Missing Features**: Note what you expected but couldn't test

## 🛑 **Important Disclaimers**

### **Privacy Warning**
This staging environment **VIOLATES** the core PersonalEA privacy principle:
- Your data is processed with shared API keys
- No user-controlled encryption is implemented
- No consent management for external API calls
- Data is not stored with user-controlled keys

**Do not enter sensitive personal information during testing.**

### **Incomplete Functionality**
This environment provides **30-40%** of planned PersonalEA functionality:
- Calendar integration completely missing
- No task scheduling capabilities
- Incomplete goal-to-action workflows
- Missing data sovereignty controls

### **Development Environment**
This is a development/testing environment:
- Data may be lost between sessions
- Performance is not optimized
- Security is not production-ready
- Features may have bugs or limitations

## 🔄 **Next Steps After Testing**

### **For Complete PersonalEA Experience**
1. **Data Sovereignty Framework** (2-3 weeks) - CRITICAL
2. **Calendar Service Implementation** (4-6 weeks)
3. **Goal Strategy Phases 4-6** (6 weeks)
4. **Full Integration Testing** (2 weeks)

### **Timeline to Production**
- **Estimated**: 10-12 weeks for complete PersonalEA
- **Priority 1**: Data sovereignty (user data control)
- **Priority 2**: Calendar service (workflow completion)
- **Priority 3**: Advanced features (optimization, analytics)

---

## 🎯 **Quick Commands Reference**

```bash
# Start staging environment
./start-staging.sh

# Stop staging environment
docker-compose -f docker-compose.staging.yml down

# View service logs
docker-compose -f docker-compose.staging.yml logs -f [service-name]

# Restart specific service
docker-compose -f docker-compose.staging.yml restart [service-name]

# Clean restart (removes all data)
docker-compose -f docker-compose.staging.yml down -v
./start-staging.sh
```

## 🔗 **Quick Links**

- **Testing Interface**: http://localhost:5173
- **Health Dashboard**: http://localhost:8080  
- **Goal Service Health**: http://localhost:3000/health
- **Email Service Health**: http://localhost:3001/health
- **Full Documentation**: [sparc/plans/SPARC_IMPLEMENTATION_SUMMARY.md](sparc/plans/SPARC_IMPLEMENTATION_SUMMARY.md)

---

**Remember**: This is partial testing for development feedback. Full PersonalEA requires Data Sovereignty Framework and Calendar Service implementation.