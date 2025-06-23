import { UserPersona } from './persona-test-runner';

export const testPersonas: UserPersona[] = [
  {
    name: "Eager Entrepreneur",
    description: "A motivated business owner ready to grow their company with clear objectives",
    responsePatterns: ["collaborative", "detailed", "ambitious"],
    successCriteria: [
      "specific business metrics",
      "timeline clarity",
      "measurable growth targets",
      "clear action steps"
    ],
    initialGoalStyle: "ambitious",
    engagementLevel: "high",
    clarificationNeeds: ["market specifics", "resource allocation", "competitive advantages"]
  },
  {
    name: "Resistant Learner",
    description: "Someone who needs guidance but is initially vague and uncertain about their goals",
    responsePatterns: ["vague", "pushback", "needs-guidance"],
    successCriteria: [
      "engagement improvement",
      "clarity breakthrough",
      "specific learning objectives",
      "commitment to timeline"
    ],
    initialGoalStyle: "vague",
    engagementLevel: "low",
    clarificationNeeds: ["motivation", "specific interests", "available time", "learning style"]
  },
  {
    name: "Busy Professional",
    description: "Time-constrained individual seeking work-life balance improvements",
    responsePatterns: ["brief", "practical", "time-conscious"],
    successCriteria: [
      "realistic time commitments",
      "work-life balance metrics",
      "efficiency improvements",
      "sustainable changes"
    ],
    initialGoalStyle: "specific",
    engagementLevel: "medium",
    clarificationNeeds: ["current schedule", "priorities", "constraints", "support system"]
  },
  {
    name: "Health-Conscious Student",
    description: "College student wanting to improve health while managing studies",
    responsePatterns: ["enthusiastic", "budget-aware", "schedule-focused"],
    successCriteria: [
      "study-life balance",
      "affordable solutions",
      "specific health metrics",
      "academic performance maintained"
    ],
    initialGoalStyle: "modest",
    engagementLevel: "high",
    clarificationNeeds: ["class schedule", "budget limits", "campus resources", "current habits"]
  },
  {
    name: "Career Changer",
    description: "Mid-career professional exploring transition to new field",
    responsePatterns: ["thoughtful", "risk-aware", "research-oriented"],
    successCriteria: [
      "clear transition timeline",
      "skill gap identification",
      "financial planning included",
      "networking objectives"
    ],
    initialGoalStyle: "ambitious",
    engagementLevel: "medium",
    clarificationNeeds: ["current skills", "target industry", "financial runway", "family considerations"]
  },
  {
    name: "Retirement Planner",
    description: "Near-retirement individual planning next life phase",
    responsePatterns: ["cautious", "detail-oriented", "legacy-focused"],
    successCriteria: [
      "financial security metrics",
      "meaningful activities planned",
      "health considerations addressed",
      "social connections maintained"
    ],
    initialGoalStyle: "specific",
    engagementLevel: "high",
    clarificationNeeds: ["retirement timeline", "financial status", "health status", "interests"]
  },
  {
    name: "Creative Artist",
    description: "Aspiring artist seeking to monetize their passion",
    responsePatterns: ["passionate", "idealistic", "unconventional"],
    successCriteria: [
      "creative output metrics",
      "income targets defined",
      "audience building plan",
      "artistic integrity maintained"
    ],
    initialGoalStyle: "vague",
    engagementLevel: "medium",
    clarificationNeeds: ["art medium", "current skill level", "market understanding", "time availability"]
  },
  {
    name: "Remote Worker",
    description: "New remote employee struggling with productivity and isolation",
    responsePatterns: ["isolated", "productivity-focused", "seeking-structure"],
    successCriteria: [
      "productivity metrics established",
      "social connection goals",
      "work environment optimized",
      "routine established"
    ],
    initialGoalStyle: "modest",
    engagementLevel: "medium",
    clarificationNeeds: ["work setup", "team dynamics", "time zones", "home situation"]
  },
  {
    name: "Fitness Beginner",
    description: "Complete novice to exercise wanting to get in shape",
    responsePatterns: ["nervous", "motivated", "inexperienced"],
    successCriteria: [
      "beginner-friendly goals",
      "injury prevention focus",
      "progressive milestones",
      "habit formation emphasized"
    ],
    initialGoalStyle: "vague",
    engagementLevel: "low",
    clarificationNeeds: ["current fitness level", "health limitations", "available equipment", "time slots"]
  },
  {
    name: "Tech Innovator",
    description: "Startup founder with big ideas but unclear execution path",
    responsePatterns: ["visionary", "technical", "impatient"],
    successCriteria: [
      "MVP defined clearly",
      "technical milestones set",
      "market validation included",
      "funding timeline established"
    ],
    initialGoalStyle: "ambitious",
    engagementLevel: "high",
    clarificationNeeds: ["technical expertise", "market research", "funding status", "team composition"]
  }
];

export const personaCategories = {
  highEngagement: testPersonas.filter(p => p.engagementLevel === 'high'),
  lowEngagement: testPersonas.filter(p => p.engagementLevel === 'low'),
  mediumEngagement: testPersonas.filter(p => p.engagementLevel === 'medium'),
  vagueGoals: testPersonas.filter(p => p.initialGoalStyle === 'vague'),
  specificGoals: testPersonas.filter(p => p.initialGoalStyle === 'specific'),
  ambitiousGoals: testPersonas.filter(p => p.initialGoalStyle === 'ambitious')
};

export function getPersonaByName(name: string): UserPersona | undefined {
  return testPersonas.find(p => p.name === name);
}

export function getRandomPersona(): UserPersona {
  return testPersonas[Math.floor(Math.random() * testPersonas.length)];
}

export function getPersonasByEngagementLevel(level: 'high' | 'medium' | 'low'): UserPersona[] {
  return testPersonas.filter(p => p.engagementLevel === level);
}