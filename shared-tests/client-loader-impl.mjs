// Implementation of custom loader
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '#client') {
    const clientPackage = process.env.CLIENT_PACKAGE;
    if (!clientPackage) {
      throw new Error('CLIENT_PACKAGE environment variable must be set to use #client imports');
    }

    // Resolve to the package's client.ts
    const clientPath = `file://${process.cwd()}/src/client.ts`;
    return {
      url: clientPath,
      shortCircuit: true
    };
  }

  return nextResolve(specifier, context);
}