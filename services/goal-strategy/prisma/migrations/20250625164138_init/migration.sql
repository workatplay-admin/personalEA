-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MetricType" AS ENUM ('NUMERIC', 'PERCENTAGE', 'BOOLEAN', 'CURRENCY', 'COUNT');

-- CreateEnum
CREATE TYPE "ClarificationStatus" AS ENUM ('PENDING', 'ANSWERED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "DependencyType" AS ENUM ('FINISH_TO_START', 'START_TO_START', 'FINISH_TO_FINISH', 'START_TO_FINISH');

-- CreateEnum
CREATE TYPE "EstimationMethod" AS ENUM ('EXPERT_JUDGMENT', 'ANALOGY_BASED', 'THREE_POINT_PERT', 'HISTORICAL_DATA');

-- CreateEnum
CREATE TYPE "WeekendPreference" AS ENUM ('NO_WEEKENDS', 'LIGHT_WEEKENDS', 'FULL_WEEKENDS');

-- CreateTable
CREATE TABLE "goals" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "rawGoal" TEXT,
    "smartCriteria" JSONB NOT NULL,
    "status" "GoalStatus" NOT NULL DEFAULT 'DRAFT',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "category" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "targetDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_metrics" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MetricType" NOT NULL,
    "targetValue" DOUBLE PRECISION NOT NULL,
    "currentValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "baselineValue" DOUBLE PRECISION,
    "unit" TEXT,
    "measurementFrequency" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_clarifications" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "smartCriterion" TEXT NOT NULL,
    "status" "ClarificationStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_clarifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestones" (
    "id" TEXT NOT NULL,
    "goalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetDate" TIMESTAMP(3) NOT NULL,
    "completionCriteria" TEXT NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "orderIndex" INTEGER NOT NULL,
    "progressPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "milestones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_progress" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "progressPercentage" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recordedBy" TEXT NOT NULL,

    CONSTRAINT "milestone_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tasks" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "parentTaskId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "completionCriteria" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "actualHours" DOUBLE PRECISION,
    "status" "TaskStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "assignedTo" TEXT,
    "tags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_dependencies" (
    "id" TEXT NOT NULL,
    "predecessorTaskId" TEXT NOT NULL,
    "successorTaskId" TEXT NOT NULL,
    "dependencyType" "DependencyType" NOT NULL DEFAULT 'FINISH_TO_START',
    "lagTime" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_dependencies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_estimates" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "estimationMethod" "EstimationMethod" NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "optimisticHours" DOUBLE PRECISION,
    "pessimisticHours" DOUBLE PRECISION,
    "mostLikelyHours" DOUBLE PRECISION,
    "confidenceScore" DOUBLE PRECISION,
    "rationale" TEXT,
    "estimatedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "task_estimates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "similar_tasks" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "similarTaskId" TEXT NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "adjustmentFactors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "similar_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "estimation_history" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "estimationMethod" "EstimationMethod" NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "actualHours" DOUBLE PRECISION NOT NULL,
    "accuracyScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "estimation_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task_schedules" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "calendarEventId" TEXT,
    "isFocusTime" BOOLEAN NOT NULL DEFAULT false,
    "isBuffer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "team_capacity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "availableHoursPerWeek" DOUBLE PRECISION NOT NULL DEFAULT 40,
    "weekendPreference" "WeekendPreference" NOT NULL DEFAULT 'NO_WEEKENDS',
    "focusTimePreferences" JSONB NOT NULL,
    "skillTags" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "team_capacity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "capacity_allocations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "taskId" TEXT,
    "milestoneId" TEXT,
    "goalId" TEXT,
    "allocatedHours" DOUBLE PRECISION NOT NULL,
    "weekStartDate" TIMESTAMP(3) NOT NULL,
    "utilizationRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "capacity_allocations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goal_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "smartTemplate" JSONB NOT NULL,
    "milestoneTemplate" JSONB NOT NULL,
    "taskTemplate" JSONB NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "goal_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_patterns" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pattern" JSONB NOT NULL,
    "category" TEXT NOT NULL,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_dependencies_predecessorTaskId_successorTaskId_key" ON "task_dependencies"("predecessorTaskId", "successorTaskId");

-- CreateIndex
CREATE UNIQUE INDEX "team_capacity_userId_key" ON "team_capacity"("userId");

-- AddForeignKey
ALTER TABLE "goal_metrics" ADD CONSTRAINT "goal_metrics_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_clarifications" ADD CONSTRAINT "goal_clarifications_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_progress" ADD CONSTRAINT "milestone_progress_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_parentTaskId_fkey" FOREIGN KEY ("parentTaskId") REFERENCES "tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_predecessorTaskId_fkey" FOREIGN KEY ("predecessorTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_dependencies" ADD CONSTRAINT "task_dependencies_successorTaskId_fkey" FOREIGN KEY ("successorTaskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_estimates" ADD CONSTRAINT "task_estimates_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_schedules" ADD CONSTRAINT "task_schedules_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE ON UPDATE CASCADE;
