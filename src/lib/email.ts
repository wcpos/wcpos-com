import 'server-only'

import { Resend } from 'resend'
import { env } from '@/utils/env'
import { infraLogger } from '@/lib/logger'

// Initialize Resend client
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null

/**
 * Send a transactional email
 */
export async function sendEmail({
  to,
  subject,
  html,
  text,
  from = 'WCPOS <noreply@wcpos.com>',
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  from?: string
}) {
  if (!resend) {
    infraLogger.warn`Resend not configured, skipping email send`
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { data, error } = await resend.emails.send({
      from,
      to,
      subject,
      html,
      text,
    })

    if (error) {
      infraLogger.error`Failed to send email: ${error}`
      return { success: false, error: error.message }
    }

    infraLogger.info`Email sent successfully to ${to}`
    return { success: true, id: data?.id }
  } catch (error) {
    infraLogger.error`Email send exception: ${error}`
    return { success: false, error: String(error) }
  }
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail({
  to,
  resetLink,
}: {
  to: string
  resetLink: string
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password</title>
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #6366f1, #8b5cf6); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px;">We received a request to reset your password for your WCPOS account.</p>
          <p style="margin: 0 0 20px;">Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Reset Password</a>
          </div>
          <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280;">If you didn't request this, you can safely ignore this email.</p>
          <p style="margin: 10px 0 0; font-size: 14px; color: #6b7280;">This link will expire in 1 hour.</p>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          <p>© ${new Date().getFullYear()} WCPOS. All rights reserved.</p>
        </div>
      </body>
    </html>
  `

  const text = `
Reset Your Password

We received a request to reset your password for your WCPOS account.

Click the link below to reset your password:
${resetLink}

If you didn't request this, you can safely ignore this email.
This link will expire in 1 hour.

© ${new Date().getFullYear()} WCPOS. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject: 'Reset Your WCPOS Password',
    html,
    text,
  })
}

/**
 * Send order confirmation email
 */
export async function sendOrderConfirmationEmail({
  to,
  orderId,
  licenseKey,
  productName,
  amount,
  currency,
}: {
  to: string
  orderId: string
  licenseKey: string
  productName: string
  amount: number
  currency: string
}) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount)

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Order Confirmation</title>
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #14b8a6); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Thank You for Your Purchase!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px;">Your order has been confirmed. Here are your details:</p>

          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h2 style="margin: 0 0 15px; font-size: 18px; color: #111;">Order Details</h2>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Order ID:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500;">${orderId}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Product:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500;">${productName}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Amount:</td>
                <td style="padding: 8px 0; text-align: right; font-weight: 500;">${formattedAmount}</td>
              </tr>
            </table>
          </div>

          <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h2 style="margin: 0 0 10px; font-size: 16px; color: #92400e;">Your License Key</h2>
            <code style="background: white; padding: 12px; display: block; border-radius: 4px; font-family: monospace; font-size: 14px; word-break: break-all;">${licenseKey}</code>
          </div>

          <p style="margin: 20px 0 0; font-size: 14px; color: #6b7280;">Save this license key in a safe place. You'll need it to activate WCPOS Pro.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="https://docs.wcpos.com/getting-started" style="background: #6366f1; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">Get Started</a>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          <p>Need help? Contact us at <a href="mailto:support@wcpos.com" style="color: #6366f1;">support@wcpos.com</a></p>
          <p>© ${new Date().getFullYear()} WCPOS. All rights reserved.</p>
        </div>
      </body>
    </html>
  `

  const text = `
Thank You for Your Purchase!

Your order has been confirmed. Here are your details:

Order ID: ${orderId}
Product: ${productName}
Amount: ${formattedAmount}

YOUR LICENSE KEY:
${licenseKey}

Save this license key in a safe place. You'll need it to activate WCPOS Pro.

Get started: https://docs.wcpos.com/getting-started

Need help? Contact us at support@wcpos.com

© ${new Date().getFullYear()} WCPOS. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject: `Your WCPOS Pro License - Order #${orderId}`,
    html,
    text,
  })
}

/**
 * Send welcome email
 */
export async function sendWelcomeEmail({
  to,
  name,
}: {
  to: string
  name?: string
}) {
  const greeting = name ? `Hi ${name}` : 'Welcome'

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to WCPOS</title>
      </head>
      <body style="font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #6366f1, #8b5cf6); padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to WCPOS!</h1>
        </div>
        <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 20px;">${greeting},</p>
          <p style="margin: 0 0 20px;">Thanks for joining WCPOS! We're excited to have you on board.</p>
          <p style="margin: 0 0 20px;">Here are some helpful resources to get you started:</p>

          <div style="background: white; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <ul style="list-style: none; padding: 0; margin: 0;">
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <a href="https://docs.wcpos.com" style="color: #6366f1; text-decoration: none; font-weight: 500;">📚 Documentation</a>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <a href="https://wcpos.com/pro" style="color: #6366f1; text-decoration: none; font-weight: 500;">✨ WCPOS Pro</a>
              </li>
              <li style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
                <a href="https://discord.gg/wcpos" style="color: #6366f1; text-decoration: none; font-weight: 500;">💬 Community</a>
              </li>
              <li style="padding: 10px 0;">
                <a href="mailto:support@wcpos.com" style="color: #6366f1; text-decoration: none; font-weight: 500;">💌 Support</a>
              </li>
            </ul>
          </div>
        </div>
        <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">
          <p>© ${new Date().getFullYear()} WCPOS. All rights reserved.</p>
        </div>
      </body>
    </html>
  `

  const text = `
Welcome to WCPOS!

${greeting},

Thanks for joining WCPOS! We're excited to have you on board.

Here are some helpful resources to get you started:

📚 Documentation: https://docs.wcpos.com
✨ WCPOS Pro: https://wcpos.com/pro
💬 Community: https://discord.gg/wcpos
💌 Support: support@wcpos.com

© ${new Date().getFullYear()} WCPOS. All rights reserved.
  `.trim()

  return sendEmail({
    to,
    subject: 'Welcome to WCPOS!',
    html,
    text,
  })
}
