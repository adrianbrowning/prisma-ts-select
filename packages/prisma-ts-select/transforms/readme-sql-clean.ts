import { defineTransform } from 'mdcode-ts';
/**
 * Transform for mdcode update — strips TS string/template-literal wrappers
 * from sql code blocks extracted from test region markers.
 *
 * Handles:
 *   "SQL;"       (inside assert.equal arg)
 *   "SQL;";      (const assignment)
 *   `SQL`;       (template literal, no interpolation, with escaped backticks)
 *   `SQL`;       (same with trailing statement semicolon)
 */
export default defineTransform (({ tag, code, meta }) => {
  if (tag !== 'sql') return code;

  if (!meta.file && !meta.region) return code;
  const t = code.trim();

  // Double-quoted string literal: "SQL" or "SQL";
  const dq = t.match(/^"([\s\S]*?)";\s*$/) ?? t.match(/^"([\s\S]*?)"\s*$/);
  if (dq) return sqlPretty(dq[1]);

  // Backtick template literal (static only — skip if contains ${): `SQL`; or `SQL`
  const bt = t.match(/^`([\s\S]*?)`;\s*$/) ?? t.match(/^`([\s\S]*?)`\s*$/);
  if (bt && !bt[1].includes('${')) {
    return sqlPretty(bt[1].replace(/\\`/g, '`'));
  }

  return sqlPretty(code);
});

function sqlPretty(code) {
  return code.replace(/\b(SELECT|WITH|FROM|RIGHT\sJOIN|LEFT\sJOIN|INNER\sJOIN|FULL\sJOIN|CROSS\sJOIN|JOIN|WHERE|GROUP\s+BY|ORDER\s+BY|LIMIT|OFFSET)\b/gi, '\n$1').trim();
}

