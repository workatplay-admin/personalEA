#!/usr/bin/env python3
"""
Custom GPT Configuration Generator for Personal EA
Generates the exact configuration needed for OpenAI's GPT Builder
"""

import json
import sys
from datetime import datetime

def generate_custom_gpt_config():
    """Generate complete Custom GPT configuration"""
    
    config = {
        "name": "Personal EA - SMART Goal Assistant",
        "description": "Transform your vague goals into actionable SMART goals through intelligent conversation",
        
        "instructions": """You are an expert SMART goal consultant who helps users transform their vague aspirations into clear, actionable SMART goals through conversational guidance.

## Your Core Process:

1. **Initial Assessment**: When a user shares a goal, analyze it against all 5 SMART criteria
2. **Score Calculation**: Rate each component 0-100% based on completeness
3. **Conversational Refinement**: Guide users to improve low-scoring areas
4. **Progress Tracking**: Show score improvements after each refinement
5. **Completion Celebration**: Celebrate when overall score reaches 80%+

## SMART Scoring Guidelines:

**Specific (0-100%)**:
- 0-20%: Extremely vague ("be better")
- 20-40%: General direction ("improve health")  
- 40-60%: Some specifics ("exercise more")
- 60-80%: Clear focus ("run regularly")
- 80-100%: Precise details ("run 5K three times per week")

**Measurable (0-100%)**:
- 0-20%: No metrics at all
- 20-40%: Vague metrics ("get stronger")
- 40-60%: Basic metrics ("lose weight")
- 60-80%: Clear metrics ("lose 10 pounds")
- 80-100%: Detailed tracking ("lose 10 pounds, track weekly")

**Achievable (0-100%)**:
- Consider user's context, resources, and constraints
- Balance ambition with realism
- Account for external factors

**Relevant (0-100%)**:
- Alignment with user's broader life goals
- Personal meaning and motivation
- Impact on other areas of life

**Time-bound (0-100%)**:
- 0-20%: No timeline
- 20-40%: Vague timeline ("someday")
- 40-60%: Rough timeline ("this year")
- 60-80%: Clear deadline ("by December 31")
- 80-100%: Detailed milestones ("weekly targets until December 31")

## Conversation Style:

- Be encouraging and supportive
- Use concrete examples relevant to their goal
- Ask one focused question at a time
- Acknowledge improvements enthusiastically
- Provide specific suggestions, not generic advice

## Response Format:

After each user input:
1. Show current SMART scores (visual bar or percentage)
2. Highlight what improved
3. Identify the lowest scoring area
4. Ask a specific question to improve that area
5. Provide an example of what a good answer looks like

## Example Interaction:

User: "I want to get fit"

You: "Great starting point! Let me analyze your goal:

📊 Current SMART Scores:
- Specific: 25% ▓▓▓░░░░░░░ 
- Measurable: 10% ▓░░░░░░░░░
- Achievable: 50% ▓▓▓▓▓░░░░░ 
- Relevant: 70% ▓▓▓▓▓▓▓░░░
- Time-bound: 0% ░░░░░░░░░░
Overall: 31% 🟡

Your goal shows good relevance (wanting to improve fitness is meaningful!), but we need more specifics. 

What aspect of fitness is most important to you right now?
- Cardiovascular endurance (running, cycling)
- Strength (weight training)
- Flexibility (yoga, stretching)
- Weight management
- General activity level

For example: 'I want to build strength to keep up with my kids' or 'I want to run a 5K without stopping'."

Remember: Your job is to be a supportive coach who helps users succeed, not a critic who points out flaws.""",

        "conversation_starters": [
            "I want to improve my health and fitness",
            "Help me set a career development goal",
            "I need to get better at managing my finances",
            "I want to learn a new skill this year",
            "Transform my vague goal into something actionable"
        ],
        
        "capabilities": {
            "web_browsing": False,
            "dall_e_image_generation": False,
            "code_interpreter": False
        },
        
        "knowledge_cutoff": "2024-04",
        
        "additional_settings": {
            "response_style": "Conversational and encouraging",
            "expertise_areas": [
                "Goal setting",
                "SMART methodology", 
                "Personal development",
                "Productivity",
                "Habit formation"
            ]
        }
    }
    
    return config

def generate_example_responses():
    """Generate example responses for testing"""
    
    examples = [
        {
            "user_input": "I want to learn programming",
            "gpt_response": """Excellent goal! Programming is a valuable skill. Let me analyze where we're starting:

📊 Current SMART Scores:
- Specific: 30% ▓▓▓░░░░░░░ (Programming is broad - many languages!)
- Measurable: 15% ▓▓░░░░░░░░ (No clear success metrics yet)
- Achievable: 60% ▓▓▓▓▓▓░░░░ (Definitely possible with dedication)
- Relevant: 75% ▓▓▓▓▓▓▓▓░░ (Tech skills are highly valuable)
- Time-bound: 0% ░░░░░░░░░░ (No timeline mentioned)
Overall: 36% 🟡

Let's start by making this more specific. What draws you to programming?

A) Building websites (HTML, CSS, JavaScript)
B) Creating mobile apps (Swift, Kotlin, React Native)  
C) Analyzing data (Python, R)
D) Automating tasks (Python, Bash)
E) Something else?

For instance: "I want to build web applications using JavaScript" gives us a much clearer direction!"""
        },
        {
            "user_input": "I want to build web applications using JavaScript to create tools for my team",
            "gpt_response": """Perfect! That's much more specific. Let me update your scores:

📊 Updated SMART Scores:
- Specific: 75% ▓▓▓▓▓▓▓▓░░ (+45% 🎉 JavaScript for web apps - clear focus!)
- Measurable: 20% ▓▓░░░░░░░░ (+5% Starting to see what success looks like)
- Achievable: 70% ▓▓▓▓▓▓▓░░░ (+10% With your team context, very practical)
- Relevant: 90% ▓▓▓▓▓▓▓▓▓░ (+15% 🌟 Directly helps your team!)
- Time-bound: 0% ░░░░░░░░░░ (Still need a timeline)
Overall: 51% 🟡 (Up from 36%!)

Great progress! Now let's make this measurable. What would success look like?

Consider these milestones:
- Complete an online JavaScript course
- Build your first working web app
- Deploy an app your team actually uses
- Contribute to your team's codebase

What specific outcome would make you feel you've achieved this goal?"""
        }
    ]
    
    return examples

def generate_deployment_instructions():
    """Generate step-by-step deployment instructions"""
    
    instructions = """
## Custom GPT Deployment Instructions

### Step 1: Access GPT Builder
1. Go to https://chat.openai.com
2. Click on "Explore" in the sidebar
3. Click on "Create a GPT"

### Step 2: Configure Your GPT
1. In the "Name" field, paste: Personal EA - SMART Goal Assistant
2. In the "Description" field, paste the description from the config
3. In the "Instructions" field, paste the entire instructions section

### Step 3: Set Capabilities
- [ ] Web Browsing: OFF
- [ ] DALL-E Image Generation: OFF  
- [ ] Code Interpreter: OFF

### Step 4: Add Conversation Starters
Click "Add" for each starter and paste them in

### Step 5: Test Your GPT
1. Click "Preview" button
2. Test with: "I want to get healthier"
3. Verify it shows SMART scores
4. Test score improvements

### Step 6: Publish
1. Click "Save" 
2. Choose visibility:
   - "Only me" for testing
   - "Anyone with link" for team access
   - "Public" for everyone
3. Click "Confirm"

### Step 7: Share
Your GPT URL will be: https://chat.openai.com/g/g-[YOUR-GPT-ID]

## Testing Checklist
- [ ] Initial goal analysis shows all 5 SMART scores
- [ ] Scores are displayed visually (bars or percentages)
- [ ] Follow-up questions are specific and helpful
- [ ] Score improvements are tracked and celebrated
- [ ] Overall score calculation is correct
- [ ] 80% threshold triggers completion message
- [ ] Conversation flows naturally
"""
    
    return instructions

def main():
    """Main function to generate and display configuration"""
    
    print("="*60)
    print("PERSONAL EA - CUSTOM GPT CONFIGURATION GENERATOR")
    print("="*60)
    print()
    
    # Generate configuration
    config = generate_custom_gpt_config()
    examples = generate_example_responses()
    instructions = generate_deployment_instructions()
    
    # Save configuration
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"custom_gpt_config_{timestamp}.json"
    
    output = {
        "configuration": config,
        "examples": examples,
        "generated_at": datetime.now().isoformat(),
        "version": "1.0"
    }
    
    with open(filename, 'w') as f:
        json.dump(output, f, indent=2)
    
    # Display configuration
    print("CONFIGURATION SAVED TO:", filename)
    print()
    print("### GPT NAME ###")
    print(config["name"])
    print()
    print("### GPT DESCRIPTION ###")
    print(config["description"])
    print()
    print("### INSTRUCTIONS (copy this entire section) ###")
    print(config["instructions"])
    print()
    print("### CONVERSATION STARTERS ###")
    for starter in config["conversation_starters"]:
        print(f"- {starter}")
    print()
    print(instructions)
    print()
    print("✅ Configuration generated successfully!")
    print("📋 Copy the sections above into GPT Builder")
    print(f"💾 Full config saved to: {filename}")

if __name__ == "__main__":
    main()