/**
 * Process exit codes, fixed by ARCHITECTURE.md.
 *
 * The distinction that matters, and the one easiest to get backwards: a
 * document that was READ and is wrong exits 1. A document that could not be
 * read at all — missing path, unreadable file, bad flag — exits 2. "Your quest
 * is invalid" and "you asked for something that is not there" are different
 * facts, and a script branching on them needs them kept apart.
 */
export const EXIT_OK = 0;

/** The document was read and has validation errors. */
export const EXIT_INVALID_DOCUMENT = 1;

/** Usage error — bad flags, missing file, unreadable path. */
export const EXIT_USAGE = 2;

/**
 * An unexpected exception escaped. `core` treats its own exceptions as
 * programmer error rather than user error (ADR-0007), so reaching this means a
 * defect here or there — never a statement about the user's document.
 */
export const EXIT_INTERNAL = 70;
