// Email templates for Smart Agent notifications
// Each template has a subject and body function that accepts variables

export interface EmailTemplate {
  subject: (vars: Record<string, string>) => string;
  html: (vars: Record<string, string>) => string;
  text: (vars: Record<string, string>) => string;
}

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.6;
  color: #333;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const headerGradient = `
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px;
  border-radius: 12px 12px 0 0;
  text-align: center;
`;

const bodySection = `
  background: #f9fafb;
  padding: 30px;
  border-radius: 0 0 12px 12px;
`;

const buttonStyle = `
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 14px 32px;
  text-decoration: none;
  border-radius: 8px;
  font-weight: 600;
  font-size: 16px;
  display: inline-block;
`;

const footer = `
  <p style="text-align: center; font-size: 12px; color: #999; margin-top: 20px;">
    © ${new Date().getFullYear()} Smart Agent. All rights reserved.
  </p>
`;

export const emailTemplates: Record<string, EmailTemplate> = {
  milestone_reminder: {
    subject: (vars) => `Reminder: ${vars.milestone_title} is due ${vars.due_text}`,
    html: (vars) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="${baseStyles}">
        <div style="${headerGradient}">
          <h1 style="color: white; margin: 0; font-size: 24px;">Milestone Reminder</h1>
        </div>
        <div style="${bodySection}">
          <p style="font-size: 16px;">Hi ${vars.recipient_name},</p>
          <p style="font-size: 16px;">This is a reminder that the following milestone is due <strong>${vars.due_text}</strong>:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h3 style="margin: 0 0 10px 0; color: #333;">${vars.milestone_title}</h3>
            ${vars.deal_name ? `<p style="margin: 0; color: #666;">Deal: ${vars.deal_name}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.action_url}" style="${buttonStyle}">View Milestone</a>
          </div>
        </div>
        ${footer}
      </body>
      </html>
    `,
    text: (vars) => `
Milestone Reminder

Hi ${vars.recipient_name},

This is a reminder that the following milestone is due ${vars.due_text}:

${vars.milestone_title}
${vars.deal_name ? `Deal: ${vars.deal_name}` : ''}

View milestone: ${vars.action_url}
    `.trim(),
  },

  deal_stage_change: {
    subject: (vars) => `Deal "${vars.deal_name}" moved to ${vars.new_stage}`,
    html: (vars) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="${baseStyles}">
        <div style="${headerGradient}">
          <h1 style="color: white; margin: 0; font-size: 24px;">Deal Update</h1>
        </div>
        <div style="${bodySection}">
          <p style="font-size: 16px;">Hi ${vars.recipient_name},</p>
          <p style="font-size: 16px;">The deal <strong>${vars.deal_name}</strong> has progressed to a new stage:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="color: #999; margin: 0 0 5px 0; font-size: 14px;">Previous Stage</p>
            <p style="margin: 0 0 15px 0; font-size: 16px;">${vars.old_stage}</p>
            <div style="font-size: 24px; color: #667eea;">↓</div>
            <p style="color: #667eea; margin: 15px 0 5px 0; font-size: 14px; font-weight: 600;">New Stage</p>
            <p style="margin: 0; font-size: 18px; font-weight: 600;">${vars.new_stage}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.action_url}" style="${buttonStyle}">View Deal</a>
          </div>
        </div>
        ${footer}
      </body>
      </html>
    `,
    text: (vars) => `
Deal Update

Hi ${vars.recipient_name},

The deal "${vars.deal_name}" has moved from "${vars.old_stage}" to "${vars.new_stage}".

View deal: ${vars.action_url}
    `.trim(),
  },

  document_shared: {
    subject: (vars) => `${vars.sender_name} shared a document with you`,
    html: (vars) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="${baseStyles}">
        <div style="${headerGradient}">
          <h1 style="color: white; margin: 0; font-size: 24px;">Document Shared</h1>
        </div>
        <div style="${bodySection}">
          <p style="font-size: 16px;">Hi ${vars.recipient_name},</p>
          <p style="font-size: 16px;"><strong>${vars.sender_name}</strong> has shared a document with you:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; font-weight: 600; font-size: 16px;">${vars.document_name}</p>
            ${vars.message ? `<p style="margin: 10px 0 0 0; color: #666; font-size: 14px;">"${vars.message}"</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.action_url}" style="${buttonStyle}">View Document</a>
          </div>
        </div>
        ${footer}
      </body>
      </html>
    `,
    text: (vars) => `
Document Shared

Hi ${vars.recipient_name},

${vars.sender_name} has shared a document with you:

${vars.document_name}
${vars.message ? `Message: "${vars.message}"` : ''}

View document: ${vars.action_url}
    `.trim(),
  },

  message_received: {
    subject: (vars) => `New message from ${vars.sender_name}`,
    html: (vars) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="${baseStyles}">
        <div style="${headerGradient}">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Message</h1>
        </div>
        <div style="${bodySection}">
          <p style="font-size: 16px;">Hi ${vars.recipient_name},</p>
          <p style="font-size: 16px;">You have a new message from <strong>${vars.sender_name}</strong>:</p>
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <p style="margin: 0; color: #333; font-size: 16px;">${vars.message_preview}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.action_url}" style="${buttonStyle}">View Conversation</a>
          </div>
        </div>
        ${footer}
      </body>
      </html>
    `,
    text: (vars) => `
New Message

Hi ${vars.recipient_name},

You have a new message from ${vars.sender_name}:

"${vars.message_preview}"

View conversation: ${vars.action_url}
    `.trim(),
  },

  milestone_completed: {
    subject: (vars) => `Milestone completed: ${vars.notification_title}`,
    html: (vars) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="${baseStyles}">
        <div style="${headerGradient}">
          <h1 style="color: white; margin: 0; font-size: 24px;">Milestone Completed</h1>
        </div>
        <div style="${bodySection}">
          <p style="font-size: 16px;">Hi ${vars.recipient_name || 'there'},</p>
          <p style="font-size: 16px;">Great news! A milestone has been marked complete:</p>
          <div style="background: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981; text-align: center;">
            <div style="font-size: 24px; color: #10b981; margin-bottom: 10px;">&#10003;</div>
            <h3 style="margin: 0 0 10px 0; color: #064e3b;">${vars.notification_title}</h3>
            ${vars.notification_body ? `<p style="margin: 0; color: #047857;">${vars.notification_body}</p>` : ''}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.action_url}" style="${buttonStyle}">View Deal</a>
          </div>
        </div>
        ${footer}
      </body>
      </html>
    `,
    text: (vars) => `
Milestone Completed

Hi ${vars.recipient_name || 'there'},

Great news! A milestone has been marked complete:

${vars.notification_title}
${vars.notification_body || ''}

View deal: ${vars.action_url}
    `.trim(),
  },

  weekly_digest: {
    subject: (vars) => `Your Weekly Summary - Smart Agent`,
    html: (vars) => `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
      <body style="${baseStyles}">
        <div style="${headerGradient}">
          <h1 style="color: white; margin: 0; font-size: 24px;">Weekly Summary</h1>
          <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0 0;">Week of ${vars.week_start}</p>
        </div>
        <div style="${bodySection}">
          <p style="font-size: 16px;">Hi ${vars.recipient_name},</p>
          <p style="font-size: 16px;">Here's your activity summary for the past week:</p>

          <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin: 20px 0;">
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #667eea;">${vars.deals_count}</div>
              <div style="font-size: 14px; color: #666;">Active Deals</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #667eea;">${vars.messages_count}</div>
              <div style="font-size: 14px; color: #666;">Messages</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #667eea;">${vars.documents_count}</div>
              <div style="font-size: 14px; color: #666;">Documents</div>
            </div>
            <div style="background: white; padding: 20px; border-radius: 8px; text-align: center;">
              <div style="font-size: 32px; font-weight: bold; color: #667eea;">${vars.ai_queries_count}</div>
              <div style="font-size: 14px; color: #666;">AI Queries</div>
            </div>
          </div>

          ${vars.upcoming_milestones ? `
          <div style="margin-top: 30px;">
            <h3 style="margin: 0 0 15px 0;">Upcoming Milestones</h3>
            ${vars.upcoming_milestones}
          </div>
          ` : ''}

          <div style="text-align: center; margin: 30px 0;">
            <a href="${vars.action_url}" style="${buttonStyle}">Go to Dashboard</a>
          </div>
        </div>
        ${footer}
      </body>
      </html>
    `,
    text: (vars) => `
Weekly Summary - Week of ${vars.week_start}

Hi ${vars.recipient_name},

Here's your activity summary for the past week:

- Active Deals: ${vars.deals_count}
- Messages: ${vars.messages_count}
- Documents: ${vars.documents_count}
- AI Queries: ${vars.ai_queries_count}

Go to dashboard: ${vars.action_url}
    `.trim(),
  },
};

export function getEmailTemplate(
  templateName: string,
  variables: Record<string, string>
): { subject: string; html: string; text: string } | null {
  const template = emailTemplates[templateName];
  if (!template) {
    return null;
  }

  return {
    subject: template.subject(variables),
    html: template.html(variables),
    text: template.text(variables),
  };
}
