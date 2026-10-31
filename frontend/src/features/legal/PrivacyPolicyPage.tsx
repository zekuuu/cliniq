import { getMockSessionUser, type SessionUser } from '../../lib/mock-db'
import { paths } from '../../routes/paths'
import { BackButton, Card } from '../../components'

const sectionHeadingClass = 'text-lg font-semibold leading-7 text-text-primary'
const paragraphClass = 'mt-3 leading-7'
const listClass = 'mt-3 list-disc space-y-2 pl-6 leading-7'

/**
 * Static legal copy for Screen #36. Keep this content synchronized with the reference draft.
 * `viewer={null}` is the signed-out copy linked from Login: no shell, and Back returns to Sign In.
 */
export function PrivacyPolicyPage({ viewer = getMockSessionUser() }: { viewer?: SessionUser | null }) {
  return (
    <div className="mx-auto flex max-w-page-narrow flex-col gap-4 px-4 pt-6 pb-6 sm:px-8">
      {/* Every role opens this page; signed out, Back returns to Sign In. */}
      {viewer ? (
        <BackButton fallback={paths.dashboard} />
      ) : (
        <BackButton to={paths.login} label="Back to Sign In" variant="prominent" />
      )}
      <Card className="p-5 sm:p-8">
        <article
          aria-labelledby="privacy-policy-title"
          className="text-base leading-7 text-text-primary"
        >
          <hr className="border-border" />

          <h1
            id="privacy-policy-title"
            className="mt-6 text-2xl font-bold leading-9 tracking-tight text-text-primary"
          >
            <span className="font-brand tracking-wide">CLINIQ</span> Privacy Policy — Draft
          </h1>

          <p className="mt-5">
            <strong>Status: draft, not yet reviewed or approved.</strong> This is written from
            decisions already made elsewhere in this project (the access-control model, the
            retention policy, the audit trail), not invented for this document. It is not legal
            advice, and it should not be treated as final or binding until reviewed by someone
            qualified to confirm it against the Data Privacy Act of 2012 (Republic Act No. 10173)
            and any policy Mendez Christian Academy already has.{' '}
            <strong>
              The contact section below is not final: MCA has not yet designated who handles
              privacy inquiries, and this document should not go live with that section unresolved.
            </strong>
          </p>

          <p className="mt-5">
            <strong>Effective date:</strong> not yet in effect — draft only.
          </p>

          <hr className="my-8 border-border" />

          <section aria-labelledby="privacy-section-1">
            <h2 id="privacy-section-1" className={sectionHeadingClass}>
              1. Who this applies to
            </h2>
            <p className={paragraphClass}>
              This policy covers CLINIQ, the clinic tracking and monitoring system used by Mendez
              Christian Academy&apos;s clinic. It applies to the information CLINIQ holds about
              students, and about the staff and administrators who use the system.
            </p>
          </section>

          <section aria-labelledby="privacy-section-2" className="mt-8">
            <h2 id="privacy-section-2" className={sectionHeadingClass}>
              2. What information CLINIQ collects
            </h2>
            <ul className={listClass}>
              <li>
                <strong>Student information:</strong> name, LRN (Learner Reference Number), grade level, section,
                date of birth (when the school provides it), gender, emergency contact details, allergies,
                and medical conditions.
              </li>
              <li>
                <strong>Clinic records:</strong> visit records (date, complaint, treatment,
                outcome), incident/emergency records (including hospital referral and
                parent-notification details where applicable), and follow-up records.
              </li>
              <li>
                <strong>Inventory records:</strong> medicine and supply stock levels and usage
                history. This does not identify students except where a specific dispensing is
                linked to a visit record.
              </li>
              <li>
                <strong>Account information:</strong> name, username, and role, for every Staff and
                Admin/Principal account.
              </li>
              <li>
                <strong>Audit records:</strong> who accessed or acted on a record, what action was
                taken, and when — logged automatically for every login, scan, submission, approval,
                and create/update/delete/archive action.
              </li>
            </ul>
          </section>

          <section aria-labelledby="privacy-section-3" className="mt-8">
            <h2 id="privacy-section-3" className={sectionHeadingClass}>
              3. Why CLINIQ collects this information
            </h2>
            <ul className={listClass}>
              <li>
                To provide clinic care: logging visits and incidents, tracking treatment, and
                coordinating follow-up care.
              </li>
              <li>
                To respond to emergencies, including sharing relevant medical information (such as
                allergies) with the staff member treating a student.
              </li>
              <li>
                To maintain accountability for who accessed or changed a record, consistent with the
                Data Privacy Act of 2012 (Republic Act No. 10173).
              </li>
              <li>
                To manage clinic operations: medicine and supply inventory, and reporting to school
                administration.
              </li>
            </ul>
          </section>

          <section aria-labelledby="privacy-section-4" className="mt-8">
            <h2 id="privacy-section-4" className={sectionHeadingClass}>
              4. Who can access this information
            </h2>
            <p className={paragraphClass}>
              Access is role-based and limited to what each role needs:
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full table-fixed border-collapse text-sm leading-6">
                <caption className="sr-only">Role-based access to CLINIQ information</caption>
                <thead>
                  <tr className="border-b border-border bg-surface text-left">
                    <th scope="col" className="w-1/3 px-3 py-2 font-semibold text-text-primary">
                      Role
                    </th>
                    <th scope="col" className="px-3 py-2 font-semibold text-text-primary">
                      Access
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border align-top">
                    <th scope="row" className="px-3 py-3 text-left font-normal">
                      <strong>Staff</strong> (School Clinician)
                    </th>
                    <td className="px-3 py-3">
                      Full access to student records, visits, incidents, inventory, reports, and the
                      audit log.
                    </td>
                  </tr>
                  <tr className="border-b border-border align-top">
                    <th scope="row" className="px-3 py-3 text-left font-normal">
                      <strong>Admin/Principal</strong>
                    </th>
                    <td className="px-3 py-3">
                      View-only access to reports, the Clinic Overview Dashboard, and the audit log.
                      No access to individual student records.
                    </td>
                  </tr>
                  <tr className="align-top">
                    <th scope="row" className="px-3 py-3 text-left font-normal">
                      <strong>PE/Sports Instructor</strong>
                    </th>
                    <td className="px-3 py-3">
                      No account and no access to CLINIQ. An instructor asks the clinic, and the
                      school clinician decides what health information to share.
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className={paragraphClass}>
              No role can view information for a student they have not specifically looked up or
              that isn&apos;t relevant to their role. Multi-student list views (such as the visit
              log) show only the last digits of the LRN rather than a name, so that information isn&apos;t
              identifiable to someone glancing at a shared screen.
            </p>
          </section>

          <section aria-labelledby="privacy-section-5" className="mt-8">
            <h2 id="privacy-section-5" className={sectionHeadingClass}>
              5. How long CLINIQ keeps this information
            </h2>
            <ul className={listClass}>
              <li>
                Active student, visit, and incident records are kept for as long as the student is
                enrolled.
              </li>
              <li>
                When a student leaves the school (graduates, transfers, or withdraws), their record
                is archived — hidden from active lists but not immediately deleted.
              </li>
              <li>
                Archived records are kept for up to 5 years after archiving, then deleted. This
                period exists in case a transferred student re-enrolls, and reflects the Data
                Privacy Act&apos;s principle of not keeping personal information longer than
                necessary.
              </li>
              <li>
                Audit log records are kept for a shorter period than clinic records, since their
                purpose is near-term accountability rather than long-term care history.
              </li>
            </ul>
          </section>

          <section aria-labelledby="privacy-section-6" className="mt-8">
            <h2 id="privacy-section-6" className={sectionHeadingClass}>
              6. How CLINIQ protects this information
            </h2>
            <ul className={listClass}>
              <li>
                Accounts are protected by individual logins; sessions last one week before requiring
                the user to sign in again.
              </li>
              <li>Repeated failed login attempts lock the account for 30 minutes.</li>
              <li>
                Every access and change to a record is logged, with who performed it and when.
              </li>
              <li>
                The system runs on the school&apos;s local network; it is not exposed to the public
                internet.
              </li>
              <li>Daily backups are kept and periodically verified.</li>
            </ul>
          </section>

          <section aria-labelledby="privacy-section-7" className="mt-8">
            <h2 id="privacy-section-7" className={sectionHeadingClass}>
              7. Minors&apos; information
            </h2>
            <p className={paragraphClass}>
              Most of the information CLINIQ holds is about students who are minors. It is collected
              and used only for the clinic-care and safety purposes described above, is restricted
              to the roles described in Section 4, and is not shared outside the school except as
              described in this policy.
            </p>
            {/* ADR-043 (D18): wording pending the school's privacy officer (open DECIDE in Issues-and-TODOs). */}
            <p className={paragraphClass}>
              <strong>Teachers and school staff (PROVISIONAL).</strong> The clinic may also record visits,
              incidents and medicines given for teachers, non-teaching staff and utility workers, with their
              allergies and medical conditions if they choose to give them. This health information is kept
              only with the staff member&apos;s knowledge and consent, is seen only by the School Clinician,
              and is protected in the same way as students&apos; records. This wording is provisional until
              the school&apos;s privacy officer approves it.
            </p>
          </section>

          <section aria-labelledby="privacy-section-8" className="mt-8">
            <h2 id="privacy-section-8" className={sectionHeadingClass}>
              8. Information sharing
            </h2>
            <p className={paragraphClass}>
              CLINIQ does not share student information with any party outside Mendez Christian
              Academy, except:
            </p>
            <ul className={listClass}>
              <li>
                With a parent or guardian, when the clinic contacts them directly (by phone) about
                their own child, as part of normal clinic care.
              </li>
              <li>
                With the school&apos;s outsourced IT provider, to the extent needed for backup
                storage and recovery, and hardware support.
              </li>
            </ul>
            <p className={paragraphClass}>
              CLINIQ does not sell or use student information for advertising, and does not share it
              with any other third party.
            </p>
          </section>

          <section aria-labelledby="privacy-section-9" className="mt-8">
            <h2 id="privacy-section-9" className={sectionHeadingClass}>
              9. Your rights
            </h2>
            <p className={paragraphClass}>
              Under the Data Privacy Act of 2012 (Republic Act No. 10173), parents and guardians
              generally have the right to know what information the school holds about their child
              and to request correction of inaccurate information. To exercise this right, contact
              the school through the contact details in Section 10.
            </p>
            <p className="mt-5 italic leading-7">
              (This section states the general principle; it is not a complete or verified statement
              of rights under the Act. It should be reviewed by someone qualified before this policy
              is treated as final.)
            </p>
          </section>

          <section aria-labelledby="privacy-section-10" className="mt-8">
            <h2 id="privacy-section-10" className={sectionHeadingClass}>
              10. Contact
            </h2>
            <p className="mt-3 leading-7">
              <strong>
                [TBD — Mendez Christian Academy has not yet designated a contact for privacy
                inquiries or complaints. Do not publish this policy with this section unresolved.]
              </strong>
            </p>
          </section>

          <section aria-labelledby="privacy-section-11" className="mt-8">
            <h2 id="privacy-section-11" className={sectionHeadingClass}>
              11. Changes to this policy
            </h2>
            <p className={paragraphClass}>
              If this policy changes, the effective date above will be updated. Significant changes
              will be communicated to the school.
            </p>
          </section>

          <hr className="my-8 border-border" />

          <p className="italic leading-7">
            This document was drafted from decisions already recorded in this project&apos;s own
            documentation: the access-control model (Modules &amp; Features, &quot;Access
            Summary&quot;), the data retention policy (Project Plan, Section 5.3), the audit trail
            requirement (Modules &amp; Features, &quot;Audit Trail — Cross-Cutting&quot;), and the
            Security &amp; Privacy requirement (Project Plan, Section 5.1). It should still be
            reviewed against the actual text of RA 10173 and MCA&apos;s own policies before being
            adopted.
          </p>

          <hr className="mt-8 border-border" />
        </article>
      </Card>
    </div>
  )
}
