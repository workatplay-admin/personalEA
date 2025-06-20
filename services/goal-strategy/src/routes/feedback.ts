import { Router, Request, Response } from 'express'
import { logger } from '../utils/logger'

const router = Router()

interface FeedbackData {
  sessionId: string
  originalGoal: string
  smartGoalRating: number
  smartGoalFeedback: string
  milestonesRating: number
  milestonesFeedback: string
  wbsRating: number
  wbsFeedback: string
  estimationRating: number
  estimationFeedback: string
  overallRating: number
  overallFeedback: string
  wouldUseAgain: boolean
  improvements: string
  timestamp: string
}

/**
 * @route POST /feedback
 * @desc Submit user feedback for the goal breakdown workflow
 * @access Public (for testing purposes)
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const feedbackData: Partial<FeedbackData> = req.body

    // Validate required fields
    if (!feedbackData.sessionId || !feedbackData.originalGoal || !feedbackData.overallRating) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: sessionId, originalGoal, and overallRating are required'
      })
    }

    // Validate rating ranges (1-5)
    const ratings = [
      feedbackData.smartGoalRating,
      feedbackData.milestonesRating,
      feedbackData.wbsRating,
      feedbackData.estimationRating,
      feedbackData.overallRating
    ].filter(rating => rating !== undefined)

    for (const rating of ratings) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          error: 'Ratings must be between 1 and 5'
        })
      }
    }

    // Log feedback for analysis (in production, this would be stored in a database)
    logger.info('User feedback received', {
      sessionId: feedbackData.sessionId,
      originalGoal: feedbackData.originalGoal,
      ratings: {
        smartGoal: feedbackData.smartGoalRating,
        milestones: feedbackData.milestonesRating,
        wbs: feedbackData.wbsRating,
        estimation: feedbackData.estimationRating,
        overall: feedbackData.overallRating
      },
      wouldUseAgain: feedbackData.wouldUseAgain,
      timestamp: feedbackData.timestamp
    })

    // Log detailed feedback text separately for analysis
    if (feedbackData.smartGoalFeedback || feedbackData.milestonesFeedback || 
        feedbackData.wbsFeedback || feedbackData.estimationFeedback || 
        feedbackData.overallFeedback || feedbackData.improvements) {
      logger.info('User feedback text', {
        sessionId: feedbackData.sessionId,
        feedback: {
          smartGoal: feedbackData.smartGoalFeedback,
          milestones: feedbackData.milestonesFeedback,
          wbs: feedbackData.wbsFeedback,
          estimation: feedbackData.estimationFeedback,
          overall: feedbackData.overallFeedback,
          improvements: feedbackData.improvements
        }
      })
    }

    // Calculate some basic metrics for immediate analysis
    const completedRatings = ratings.length
    const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    const hasTextFeedback = !!(
      feedbackData.smartGoalFeedback || 
      feedbackData.milestonesFeedback || 
      feedbackData.wbsFeedback || 
      feedbackData.estimationFeedback || 
      feedbackData.overallFeedback || 
      feedbackData.improvements
    )

    logger.info('Feedback metrics', {
      sessionId: feedbackData.sessionId,
      metrics: {
        completedRatings,
        averageRating: Math.round(averageRating * 100) / 100,
        hasTextFeedback,
        wouldUseAgain: feedbackData.wouldUseAgain
      }
    })

    res.json({
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        sessionId: feedbackData.sessionId,
        submittedAt: new Date().toISOString(),
        metrics: {
          averageRating: Math.round(averageRating * 100) / 100,
          completedRatings
        }
      }
    })

  } catch (error) {
    logger.error('Error submitting feedback:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to submit feedback'
    })
  }
})

/**
 * @route GET /feedback/stats
 * @desc Get basic feedback statistics (for testing/monitoring)
 * @access Public (for testing purposes)
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // In a real implementation, this would query a database
    // For now, return a placeholder response
    res.json({
      success: true,
      data: {
        message: 'Feedback statistics would be available here in production',
        note: 'Currently logging feedback to console for testing purposes'
      }
    })
  } catch (error) {
    logger.error('Error getting feedback stats:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get feedback statistics'
    })
  }
})

export default router