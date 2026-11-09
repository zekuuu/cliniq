/** Fired after the signed-in user edits their own profile (ADR-066), so App reads the session user again. */
export const ACCOUNT_CHANGED_EVENT = 'cliniq:account-changed'

/** Fired after a school year ends or starts, or its dates change, so the sidebar's Archive warning updates. */
export const SCHOOL_YEAR_CHANGED_EVENT = 'cliniq:school-year-changed'
