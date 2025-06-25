import type { RawGoalInput } from '../../src/services/smart-goal-processor';

export const validGoalInputs: RawGoalInput[] = [
  {
    goal: "I want to increase my website traffic",
    context: {
      timeframe: "6 months",
      resources: ["SEO tools", "Content team", "$5000 budget"],
      constraints: ["Limited technical expertise", "Competitive market"],
      priority: "HIGH"
    }
  },
  {
    goal: "Learn to play guitar",
    context: {
      timeframe: "1 year",
      resources: ["Guitar", "Online tutorials", "Practice time"],
      constraints: ["Limited practice time", "No prior musical experience"],
      priority: "MEDIUM"
    }
  },
  {
    goal: "Lose weight and get fit",
    context: {
      timeframe: "3 months",
      resources: ["Gym membership", "Personal trainer budget", "Meal planning apps"],
      constraints: ["Busy work schedule", "Travel requirements"],
      priority: "HIGH"
    }
  },
  {
    goal: "Start a profitable online business",
    context: {
      timeframe: "12 months",
      resources: ["$10k capital", "Business knowledge", "Network connections"],
      constraints: ["Market uncertainty", "Competition", "Time limitations"],
      priority: "CRITICAL"
    }
  }
];

export const vagueGoalInputs: RawGoalInput[] = [
  {
    goal: "Be successful",
    context: {
      priority: "HIGH"
    }
  },
  {
    goal: "Make money",
    context: {}
  },
  {
    goal: "Get better at stuff"
  },
  {
    goal: "Help people"
  }
];

export const complexGoalInputs: RawGoalInput[] = [
  {
    goal: "Build a comprehensive AI-powered personal assistant application with natural language processing, calendar integration, email management, and goal tracking capabilities",
    context: {
      timeframe: "18 months",
      resources: [
        "Development team of 5",
        "AI/ML expertise",
        "$500k budget",
        "Cloud infrastructure",
        "Third-party API access"
      ],
      constraints: [
        "Data privacy regulations",
        "API rate limits",
        "Performance requirements",
        "Cross-platform compatibility",
        "Scalability requirements"
      ],
      priority: "CRITICAL"
    }
  },
  {
    goal: "Transition career from marketing to data science while maintaining current income and completing relevant certifications",
    context: {
      timeframe: "24 months",
      resources: [
        "Current marketing experience",
        "Evening study time",
        "Online course budget",
        "Professional network"
      ],
      constraints: [
        "Full-time job commitments",
        "Family responsibilities",
        "Limited technical background",
        "Need to maintain income"
      ],
      priority: "HIGH"
    }
  }
];

export const edgeCaseInputs: RawGoalInput[] = [
  {
    goal: "",
    context: {}
  },
  {
    goal: "a".repeat(5000), // Very long goal
    context: {}
  },
  {
    goal: "Goal with special characters: !@#$%^&*()_+-=[]{}|;':\",./<>?",
    context: {}
  },
  {
    goal: "Goal with unicode: 🎯 达成目标 🚀 नेटवर्क",
    context: {}
  }
];

export const incompleteGoalInputs: RawGoalInput[] = [
  {
    goal: "Increase sales",
    context: {
      priority: "HIGH"
      // Missing timeframe, resources, constraints
    }
  },
  {
    goal: "Learn programming",
    context: {
      timeframe: "someday",
      resources: []
      // Vague timeframe, empty resources
    }
  }
];

export const wellDefinedGoalInputs: RawGoalInput[] = [
  {
    goal: "Increase monthly recurring revenue from $10,000 to $15,000 through customer acquisition and retention strategies by Q4 2024",
    context: {
      timeframe: "9 months",
      resources: [
        "Sales team of 3",
        "Marketing budget of $2000/month",
        "CRM system",
        "Customer success tools"
      ],
      constraints: [
        "Seasonal business fluctuations",
        "Competitive market",
        "Limited development resources"
      ],
      priority: "CRITICAL"
    }
  },
  {
    goal: "Complete AWS Solutions Architect Professional certification by achieving a passing score on the exam before December 15, 2024",
    context: {
      timeframe: "6 months",
      resources: [
        "AWS training budget",
        "Study materials and labs",
        "Practice exam access",
        "2 hours daily study time"
      ],
      constraints: [
        "Current workload commitments",
        "Need hands-on AWS experience",
        "Exam scheduling availability"
      ],
      priority: "HIGH"
    }
  }
];