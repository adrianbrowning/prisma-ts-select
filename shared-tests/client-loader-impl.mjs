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

  if (specifier === '#dialect') {
    const clientPackage = process.env.CLIENT_PACKAGE;
    if (!clientPackage) {
      throw new Error('CLIENT_PACKAGE environment variable must be set to use #dialect imports');
    }

    // Resolve to the package's generated dialect index
    const dialectPath = `file://${process.cwd()}/generated/prisma-ts-select/dialects/index.js`;
    return {
      url: dialectPath,
      shortCircuit: true
    };
  }

  return nextResolve(specifier, context);
}