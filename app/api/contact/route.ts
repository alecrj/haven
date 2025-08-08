import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    
    // Validate required fields
    const { firstName, lastName, phone, email, sobrietyDate, employmentStatus, housingNeeded, message } = body
    
    if (!firstName || !lastName || !phone) {
      return NextResponse.json(
        { error: 'First name, last name, and phone are required' },
        { status: 400 }
      )
    }

    // Validate phone number format (basic validation)
    const phoneRegex = /^[\+]?[1-9]?[\d\s\-\(\)]{10,15}$/
    if (!phoneRegex.test(phone)) {
      return NextResponse.json(
        { error: 'Please provide a valid phone number' },
        { status: 400 }
      )
    }

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        return NextResponse.json(
          { error: 'Please provide a valid email address' },
          { status: 400 }
        )
      }
    }

    // Check if application already exists for this phone number
    const { data: existingApplication } = await supabase
      .from('applications')
      .select('id')
      .eq('phone', phone)
      .single()

    if (existingApplication) {
      return NextResponse.json(
        { error: 'An application with this phone number already exists. Please contact us if you need to update your information.' },
        { status: 409 }
      )
    }

    // Create new application
    const { data, error } = await supabase
      .from('applications')
      .insert({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        sobriety_date: sobrietyDate || null,
        employment_status: employmentStatus?.trim() || null,
        housing_needed: housingNeeded?.trim() || null,
        message: message?.trim() || null,
        status: 'pending'
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json(
        { error: 'Failed to submit application. Please try again later.' },
        { status: 500 }
      )
    }

    // Send email notification (if you have email service configured)
    // This is where you'd integrate with SendGrid, Resend, or other email service
    try {
      await sendNotificationEmail({
        firstName,
        lastName,
        phone,
        email,
        applicationId: data.id
      })
    } catch (emailError) {
      console.error('Email notification error:', emailError)
      // Don't fail the request if email fails
    }

    return NextResponse.json(
      { 
        success: true,
        message: 'Application submitted successfully! We will contact you within 24 hours.',
        applicationId: data.id
      },
      { status: 201 }
    )

  } catch (error) {
    console.error('Application submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error. Please try again later.' },
      { status: 500 }
    )
  }
}

// Handle GET requests to prevent method not allowed
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  )
}

// Email notification function (placeholder)
async function sendNotificationEmail(data: {
  firstName: string
  lastName: string
  phone: string
  email?: string
  applicationId: string
}) {
  // TODO: Implement email notification
  // Example with SendGrid, Resend, or Nodemailer
  
  console.log('New application received:', {
    name: `${data.firstName} ${data.lastName}`,
    phone: data.phone,
    email: data.email,
    id: data.applicationId
  })

  // Example email service integration:
  /*
  const emailService = new EmailService() // Your chosen email service
  
  await emailService.send({
    to: 'admin@havenhouse.com', // Your admin email
    subject: `New Application: ${data.firstName} ${data.lastName}`,
    html: `
      <h2>New Housing Application</h2>
      <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
      <p><strong>Phone:</strong> ${data.phone}</p>
      <p><strong>Email:</strong> ${data.email || 'Not provided'}</p>
      <p><strong>Application ID:</strong> ${data.applicationId}</p>
      <p><a href="https://yoursite.com/dashboard/applications">View Application</a></p>
    `
  })

  // Also send confirmation email to applicant if email provided
  if (data.email) {
    await emailService.send({
      to: data.email,
      subject: 'Application Received - Haven House',
      html: `
        <h2>Thank you for your application!</h2>
        <p>Dear ${data.firstName},</p>
        <p>We've received your housing application and will review it within 24 hours.</p>
        <p>If you have any questions, please call us at (555) 123-4567.</p>
        <p>Best regards,<br>Haven House Team</p>
      `
    })
  }
  */
}