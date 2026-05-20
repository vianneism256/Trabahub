import React from 'react'
import { Link } from 'react-router-dom'

const LAST_UPDATED = 'May 20, 2026'

const Section = ({ number, title, children }) => (
  <section style={{ marginBottom: 40 }}>
    <h2 style={{
      fontSize: 18,
      fontWeight: 700,
      color: 'var(--gray-900)',
      marginBottom: 12,
      paddingBottom: 8,
      borderBottom: '2px solid var(--primary-light)',
      display: 'flex',
      alignItems: 'baseline',
      gap: 10,
    }}>
      <span style={{
        fontSize: 13,
        fontWeight: 700,
        color: 'var(--primary)',
        backgroundColor: 'var(--primary-light)',
        padding: '2px 8px',
        borderRadius: 4,
        flexShrink: 0,
      }}>
        {number}
      </span>
      {title}
    </h2>
    <div style={{ color: 'var(--gray-700)', fontSize: 14, lineHeight: 1.8 }}>
      {children}
    </div>
  </section>
)

const P = ({ children }) => (
  <p style={{ margin: '0 0 12px 0' }}>{children}</p>
)

const Ul = ({ items }) => (
  <ul style={{ margin: '8px 0 12px 0', paddingLeft: 24 }}>
    {items.map((item, i) => (
      <li key={i} style={{ marginBottom: 6 }}>{item}</li>
    ))}
  </ul>
)

export default function Terms() {
  return (
    <div style={{ backgroundColor: 'var(--gray-50)', minHeight: '100vh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Header card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '40px 48px',
          boxShadow: 'var(--shadow-sm)',
          marginBottom: 8,
          backgroundImage: 'linear-gradient(135deg, var(--primary) 0%, #003d99 100%)',
          color: 'white',
        }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', opacity: 0.8, margin: '0 0 8px 0' }}>
            Legal
          </p>
          <h1 style={{ fontSize: 32, fontWeight: 800, margin: '0 0 8px 0', color: 'white' }}>
            Terms and Conditions
          </h1>
          <p style={{ opacity: 0.85, margin: 0, fontSize: 14 }}>
            Last updated: {LAST_UPDATED} &nbsp;·&nbsp; Trabahub Platform Agreement
          </p>
        </div>

        {/* Notice banner */}
        <div style={{
          backgroundColor: '#fffbeb',
          border: '1px solid #fcd34d',
          borderRadius: 8,
          padding: '14px 20px',
          marginBottom: 8,
          fontSize: 13,
          color: '#92400e',
          fontWeight: 500,
        }}>
          Please read these Terms and Conditions carefully before creating an account. By registering on Trabahub, you confirm that you have read, understood, and agree to be bound by these terms.
        </div>

        {/* Main content card */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: 12,
          padding: '40px 48px',
          boxShadow: 'var(--shadow-sm)',
        }}>

          <Section number="1" title="Acceptance of Terms">
            <P>
              These Terms and Conditions ("Terms") govern your access to and use of the Trabahub platform ("Platform"), operated by Trabahub ("we," "our," or "us"). By creating an account, accessing, or using the Platform in any way, you ("User") agree to be legally bound by these Terms.
            </P>
            <P>
              If you are registering on behalf of a company or organization, you represent and warrant that you have the authority to bind that entity to these Terms.
            </P>
            <P>
              If you do not agree to any part of these Terms, you must not use the Platform.
            </P>
          </Section>

          <Section number="2" title="Description of the Platform">
            <P>
              Trabahub is an online marketplace that connects customers ("Customers") who need home and trade services with independent service providers ("Freelancers") who offer skilled labor in categories including but not limited to: Plumbing, Electrical work, Carpentry, Cleaning, Painting, HVAC, Roofing, and Landscaping.
            </P>
            <P>
              Trabahub acts solely as an intermediary platform. We do not employ Freelancers, and we do not directly provide any trade or home services. The contractual relationship for any service is solely between the Customer and the Freelancer.
            </P>
          </Section>

          <Section number="3" title="User Accounts and Registration">
            <P>To use the Platform, you must:</P>
            <Ul items={[
              'Be at least 18 years of age',
              'Provide accurate, current, and complete information during registration including your legal first and last name',
              'Maintain and promptly update your account information to keep it accurate',
              'Keep your account credentials confidential and not share them with any third party',
              'Notify us immediately at support@trabahub.com if you suspect any unauthorized use of your account',
            ]} />
            <P>
              You are solely responsible for all activity that occurs under your account. Trabahub reserves the right to suspend or terminate accounts that contain false, inaccurate, or misleading information.
            </P>
            <P>
              Each person may only maintain one account. Creating multiple accounts to circumvent suspensions, bans, or platform rules is strictly prohibited.
            </P>
          </Section>

          <Section number="4" title="Freelancer Terms">
            <P>If you register as a Freelancer, you additionally agree to the following:</P>

            <p style={{ fontWeight: 700, color: 'var(--gray-900)', margin: '16px 0 6px 0', fontSize: 14 }}>4.1 Certification and Verification</p>
            <P>
              To access job listings in a specific service category, you must submit proof of competency or certification for that category and receive verification from a Trabahub administrator. Uploading a certification does not guarantee approval. Trabahub reserves the right to reject any certification submission at its discretion.
            </P>
            <P>
              Submitting fraudulent, altered, or misrepresenting certification documents is a serious violation that will result in immediate and permanent account termination and may be referred to appropriate authorities.
            </P>

            <p style={{ fontWeight: 700, color: 'var(--gray-900)', margin: '16px 0 6px 0', fontSize: 14 }}>4.2 Independent Contractor Status</p>
            <P>
              Freelancers are independent contractors, not employees, agents, or partners of Trabahub. You are responsible for your own taxes, insurance, tools, equipment, and compliance with all applicable laws and regulations in the Republic of the Philippines.
            </P>

            <p style={{ fontWeight: 700, color: 'var(--gray-900)', margin: '16px 0 6px 0', fontSize: 14 }}>4.3 Professional Standards</p>
            <P>You agree to perform all services in a professional, competent, and safe manner consistent with industry standards. You agree to:</P>
            <Ul items={[
              'Accurately represent your skills, experience, and qualifications',
              'Complete accepted jobs in the agreed timeframe and to an acceptable standard',
              'Treat all Customers with professionalism and respect',
              'Comply with all applicable safety standards and local building codes',
              'Hold any required licenses or permits mandated by Philippine law for your trade',
            ]} />
          </Section>

          <Section number="5" title="Customer Terms">
            <P>If you register as a Customer, you additionally agree to the following:</P>

            <p style={{ fontWeight: 700, color: 'var(--gray-900)', margin: '16px 0 6px 0', fontSize: 14 }}>5.1 Accurate Job Postings</p>
            <P>
              You agree to provide accurate, honest, and complete descriptions of the services you require when posting a job. Misleading job postings that misrepresent the scope, location, or nature of work are prohibited.
            </P>

            <p style={{ fontWeight: 700, color: 'var(--gray-900)', margin: '16px 0 6px 0', fontSize: 14 }}>5.2 Respectful Conduct</p>
            <P>
              You agree to treat all Freelancers with dignity and respect. Harassment, discrimination, or abusive behavior toward any platform user is strictly prohibited and may result in immediate account termination.
            </P>

            <p style={{ fontWeight: 700, color: 'var(--gray-900)', margin: '16px 0 6px 0', fontSize: 14 }}>5.3 Payment Responsibility</p>
            <P>
              Once a Freelancer's application is accepted and work is agreed upon, you are responsible for honoring the agreed payment terms with the Freelancer. Trabahub is not a payment processor and is not liable for payment disputes between Customers and Freelancers.
            </P>
          </Section>

          <Section number="6" title="Prohibited Conduct">
            <P>All users of the Platform are strictly prohibited from:</P>
            <Ul items={[
              'Posting false, misleading, defamatory, or fraudulent content',
              'Circumventing the Platform to solicit or conduct transactions outside of Trabahub in order to avoid obligations under these Terms',
              'Collecting or harvesting personal data of other users without their consent',
              'Using the Platform to transmit spam, malware, or any harmful content',
              'Impersonating any other person or entity',
              'Using automated bots, scrapers, or scripts to access or interact with the Platform',
              'Engaging in any activity that could damage, disable, or overburden the Platform\'s infrastructure',
              'Posting or sharing content that is sexually explicit, violent, hateful, or otherwise offensive',
              'Attempting to gain unauthorized access to any part of the Platform or its systems',
              'Using the Platform for any illegal purpose or in violation of any applicable Philippine law',
            ]} />
          </Section>

          <Section number="7" title="Reviews and Ratings">
            <P>
              Customers may leave reviews and ratings for Freelancers after a job is completed. By submitting a review, you represent that it is based on your genuine first-hand experience and is truthful and accurate to the best of your knowledge.
            </P>
            <P>
              Trabahub reserves the right to remove reviews that violate these Terms, contain profanity, are clearly fraudulent, or were submitted in bad faith. Attempting to manipulate ratings — either by submitting fake positive reviews for yourself or fake negative reviews for competitors — is prohibited and will result in account termination.
            </P>
          </Section>

          <Section number="8" title="Intellectual Property">
            <P>
              All content on the Platform — including the Trabahub name, logo, design, software, and original text — is the intellectual property of Trabahub and is protected under applicable Philippine and international intellectual property laws.
            </P>
            <P>
              You retain ownership of any content you submit to the Platform (such as profile descriptions, certification images, and job postings). However, by submitting content, you grant Trabahub a non-exclusive, royalty-free, worldwide license to use, display, and reproduce that content solely for the purpose of operating and promoting the Platform.
            </P>
            <P>
              You may not copy, reproduce, distribute, or create derivative works from any Platform content without our express written permission.
            </P>
          </Section>

          <Section number="9" title="Privacy">
            <P>
              Your privacy is important to us. By using the Platform, you consent to the collection and use of your personal information in accordance with our Privacy Policy. Key points include:
            </P>
            <Ul items={[
              'We collect your name, email address, phone number, and profile information to operate the Platform',
              'Certification images you upload are stored securely and accessed only by Trabahub administrators for verification purposes',
              'We do not sell your personal information to third parties',
              'We use Firebase (Google) for authentication and Supabase for data storage, both of which maintain industry-standard security practices',
              'You may request deletion of your account and associated data by contacting support@trabahub.com',
            ]} />
          </Section>

          <Section number="10" title="Disclaimers and Limitation of Liability">
            <P>
              Trabahub provides the Platform on an "as is" and "as available" basis without warranties of any kind, either express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.
            </P>
            <P>
              Trabahub does not verify the qualifications, licenses, or background of Freelancers beyond the certification verification process described herein. We strongly encourage Customers to exercise due diligence before engaging any Freelancer for sensitive or high-value work.
            </P>
            <P>
              To the maximum extent permitted by applicable law, Trabahub shall not be liable for:
            </P>
            <Ul items={[
              'Any injury, property damage, or loss arising from services performed by a Freelancer',
              'Any disputes between Customers and Freelancers regarding payment, quality of work, or contract terms',
              'Any indirect, incidental, special, or consequential damages arising from your use of the Platform',
              'Unauthorized access to your account resulting from your failure to maintain password security',
              'Any downtime, data loss, or technical failure of the Platform',
            ]} />
            <P>
              In no event shall Trabahub's total liability to you exceed the amount you have paid to Trabahub (if any) in the twelve months preceding the event giving rise to the claim.
            </P>
          </Section>

          <Section number="11" title="Termination">
            <P>
              Trabahub reserves the right to suspend or permanently terminate your account at any time, with or without notice, for conduct that we believe violates these Terms, is harmful to other users, or is otherwise objectionable.
            </P>
            <P>
              You may terminate your account at any time by contacting us at support@trabahub.com. Upon termination, your right to use the Platform ceases immediately. Provisions that by their nature should survive termination — including intellectual property, disclaimers, and dispute resolution — shall survive.
            </P>
          </Section>

          <Section number="12" title="Dispute Resolution">
            <P>
              In the event of any dispute, claim, or controversy arising out of or relating to these Terms or your use of the Platform, the parties agree to first attempt to resolve the matter informally by contacting Trabahub at support@trabahub.com.
            </P>
            <P>
              If informal resolution fails, any dispute shall be subject to the exclusive jurisdiction of the appropriate courts in the Republic of the Philippines.
            </P>
          </Section>

          <Section number="13" title="Governing Law">
            <P>
              These Terms shall be governed by and construed in accordance with the laws of the Republic of the Philippines, without regard to its conflict of law provisions. Specifically, these Terms are subject to applicable provisions of the Civil Code of the Philippines, the Electronic Commerce Act (Republic Act No. 8792), the Data Privacy Act of 2012 (Republic Act No. 10173), and other relevant Philippine legislation.
            </P>
          </Section>

          <Section number="14" title="Changes to These Terms">
            <P>
              Trabahub reserves the right to modify these Terms at any time. When we make material changes, we will update the "Last Updated" date at the top of this page and, where appropriate, notify users via email or a prominent notice on the Platform.
            </P>
            <P>
              Your continued use of the Platform after changes are posted constitutes your acceptance of the revised Terms. If you do not agree to the updated Terms, you must stop using the Platform and may request account deletion.
            </P>
          </Section>

          <Section number="15" title="Contact Us">
            <P>If you have any questions, concerns, or requests regarding these Terms, please contact us:</P>
            <div style={{
              backgroundColor: 'var(--gray-50)',
              borderRadius: 8,
              padding: '16px 20px',
              border: '1px solid var(--gray-200)',
              fontSize: 14,
            }}>
              <p style={{ margin: '0 0 4px 0', fontWeight: 700, color: 'var(--gray-900)' }}>Trabahub Support</p>
              <p style={{ margin: '0 0 4px 0', color: 'var(--gray-600)' }}>Email: support@trabahub.com</p>
              <p style={{ margin: 0, color: 'var(--gray-600)' }}>Republic of the Philippines</p>
            </div>
          </Section>

          {/* Footer */}
          <div style={{
            marginTop: 40,
            paddingTop: 24,
            borderTop: '1px solid var(--gray-200)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--gray-500)' }}>
              © 2026 Trabahub. All rights reserved.
            </p>
            <Link
              to="/signup"
              style={{
                padding: '10px 24px',
                backgroundColor: 'var(--primary)',
                color: 'white',
                textDecoration: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Back to Sign Up
            </Link>
          </div>

        </div>
      </div>
    </div>
  )
}
