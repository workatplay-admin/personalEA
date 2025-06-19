import { EmailClient } from '../clients/email-client';

async function demonstrateEmailService() {
  console.log('🚀 PersonalEA Email Service Client Demo\n');

  // Initialize the email client
  const emailClient = new EmailClient();

  try {
    // 1. Health Check
    console.log('1. Checking service health...');
    const health = await emailClient.healthCheck();
    console.log('✅ Service is healthy:', health);
    console.log();

    // 2. Get all emails
    console.log('2. Fetching emails...');
    const emailsResponse = await emailClient.getEmails({ limit: 5 });
    console.log(`📧 Found ${emailsResponse.data.length} emails (${emailsResponse.pagination.total} total)`);
    
    emailsResponse.data.forEach((email, index) => {
      console.log(`   ${index + 1}. ${email.subject} - from ${email.from.name}`);
      console.log(`      📅 ${new Date(email.receivedAt).toLocaleString()}`);
      console.log(`      🏷️  Labels: ${email.labels.join(', ')}`);
      if (email.aiAnalysis?.actionItems.length) {
        console.log(`      ⚡ ${email.aiAnalysis.actionItems.length} action items`);
      }
    });
    console.log();

    // 3. Get unread emails only
    console.log('3. Fetching unread emails...');
    const unreadEmails = await emailClient.getEmails({ isRead: false, limit: 3 });
    console.log(`📬 Found ${unreadEmails.data.length} unread emails`);
    console.log();

    // 4. Get important emails
    console.log('4. Fetching important emails...');
    const importantEmails = await emailClient.getEmails({ isImportant: true, limit: 3 });
    console.log(`⭐ Found ${importantEmails.data.length} important emails`);
    console.log();

    // 5. Get email digest
    console.log('5. Generating email digest...');
    const digest = await emailClient.getDigest();
    console.log('📊 Email Digest Summary:');
    console.log(`   Total emails: ${digest.summary.totalEmails}`);
    console.log(`   Unread: ${digest.summary.unreadEmails}`);
    console.log(`   Important: ${digest.summary.importantEmails}`);
    console.log(`   Action items: ${digest.summary.actionItemsCount}`);
    console.log('   Categories:');
    Object.entries(digest.summary.categories).forEach(([category, count]) => {
      console.log(`     - ${category}: ${count}`);
    });
    console.log();

    // 6. Show highlights
    console.log('6. Email highlights:');
    digest.highlights.forEach((highlight, index) => {
      console.log(`   ${index + 1}. ${highlight.title} (${highlight.priority})`);
      console.log(`      ${highlight.description}`);
    });
    console.log();

    // 7. Show action items from digest
    console.log('7. Action items from digest:');
    digest.actionItems.forEach((item, index) => {
      console.log(`   ${index + 1}. ${item.description} (${item.priority})`);
      if (item.dueDate) {
        console.log(`      📅 Due: ${new Date(item.dueDate).toLocaleString()}`);
      }
    });
    console.log();

    // 8. Get specific email details
    if (emailsResponse.data.length > 0) {
      const firstEmail = emailsResponse.data[0];
      console.log('8. Getting detailed email information...');
      const emailDetails = await emailClient.getEmail(firstEmail.id);
      console.log(`📧 Email: "${emailDetails.subject}"`);
      console.log(`   From: ${emailDetails.from.name} <${emailDetails.from.email}>`);
      console.log(`   Received: ${new Date(emailDetails.receivedAt).toLocaleString()}`);
      console.log(`   Body preview: ${emailDetails.body.text.substring(0, 100)}...`);
      
      if (emailDetails.aiAnalysis) {
        console.log(`   AI Analysis:`);
        console.log(`     Sentiment: ${emailDetails.aiAnalysis.sentiment}`);
        console.log(`     Urgency: ${emailDetails.aiAnalysis.urgency}`);
        console.log(`     Category: ${emailDetails.aiAnalysis.category}`);
        console.log(`     Key topics: ${emailDetails.aiAnalysis.keyTopics.join(', ')}`);
      }
      console.log();

      // 9. Generate summary for the email
      console.log('9. Generating email summary...');
      try {
        const summary = await emailClient.generateSummary(firstEmail.id);
        console.log('📝 Email Summary:');
        console.log(`   ${summary.summary}`);
        console.log('   Key Points:');
        summary.keyPoints.forEach((point, index) => {
          console.log(`     ${index + 1}. ${point}`);
        });
      } catch (error) {
        console.log('   ⚠️  Summary generation not available in mock mode');
      }
      console.log();

      // 10. Extract action items
      console.log('10. Extracting action items...');
      try {
        const actionItems = await emailClient.extractActionItems(firstEmail.id);
        console.log(`⚡ Found ${actionItems.actionItems.length} action items:`);
        actionItems.actionItems.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.description} (${item.priority})`);
        });
      } catch (error) {
        console.log('    ⚠️  Action item extraction not available in mock mode');
      }
      console.log();
    }

    // 11. Search emails
    console.log('11. Searching emails...');
    try {
      const searchResults = await emailClient.searchEmails('budget', { limit: 3 });
      console.log(`🔍 Found ${searchResults.data.length} emails matching "budget"`);
      searchResults.data.forEach((email, index) => {
        console.log(`   ${index + 1}. ${email.subject}`);
      });
    } catch (error) {
      console.log('    ⚠️  Search not available in mock mode');
    }
    console.log();

    // 12. Sync emails
    console.log('12. Triggering email sync...');
    try {
      const syncJob = await emailClient.syncEmails();
      console.log(`🔄 Sync job started: ${syncJob.id} (${syncJob.status})`);
      
      // Check sync status
      setTimeout(async () => {
        try {
          const status = await emailClient.getSyncStatus(syncJob.id);
          console.log(`   Sync status: ${status.status}`);
          if (status.progress) {
            console.log(`   Progress: ${status.progress}%`);
          }
        } catch (error) {
          console.log('   ⚠️  Sync status check failed');
        }
      }, 1000);
    } catch (error) {
      console.log('    ⚠️  Email sync not available in mock mode');
    }

    console.log('\n✅ Email Service demo completed successfully!');

  } catch (error: any) {
    console.error('❌ Error during demo:', error.message);
    if (error.code) {
      console.error(`   Error code: ${error.code}`);
    }
    if (error.correlationId) {
      console.error(`   Correlation ID: ${error.correlationId}`);
    }
  }
}

// Run the demo if this file is executed directly
if (require.main === module) {
  demonstrateEmailService().catch(console.error);
}

export { demonstrateEmailService };