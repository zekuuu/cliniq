// /update-docs change markers in the Project Plan and SRS section files:
//   ~~$\textcolor{red}{\text{old}}$~~   removed words: dropped
//   **$\textcolor{green}{\text{new}}$** added words: kept as plain text
// A marked HTML cell is padded onto its own line (GitHub renders math only there); it goes back to one line.
export function stripMarkers(text) {
  return text
    .replace(/~~\$\\textcolor\{red\}\{\\text\{[^}]*\}\}\$~~ ?/g, '')
    .replace(/\*\*\$\\textcolor\{green\}\{\\text\{([^}]*)\}\}\$\*\*/g, '$1')
    .replace(/<td>\n\n([^<\n]+)\n\n<\/td>/g, (_, c) => `<td>${c.trim()}</td>`)
}
