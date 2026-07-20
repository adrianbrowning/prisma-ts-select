export function generateM2MMapDeclaration(m2mMap: Record<string, Record<string, Set<string>>>): string {
  if (Object.keys(m2mMap).length === 0) return "type M2MMap = {};";
  const lines = [ "type M2MMap = {" ];
  for (const [ source, targets ] of Object.entries(m2mMap)) {
    lines.push(`  readonly "${source}": {`);
    for (const [ target, junctions ] of Object.entries(targets)) {
      const junctionLiterals = Array.from(junctions).map(j => `"${j}"`)
        .join(" | ");
      lines.push(`    readonly "${target}": ${junctionLiterals};`);
    }
    lines.push("  };");
  }
  lines.push("};");
  return lines.join("\n");
}
