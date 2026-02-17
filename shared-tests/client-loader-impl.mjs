// Implementation of custom loader
/**
 *
 * @param {string} specifier
 * @param context
 * @param nextResolve
 * @return {Promise<*|{url: string, shortCircuit: boolean}|{url: string, shortCircuit: boolean}>}
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === '#client') {

    // Resolve to the package's client.ts
    const clientPath = `file://${process.cwd()}/src/client.ts`;
    return {
      url: clientPath,
      shortCircuit: true
    };
  }

  if (specifier === '#dialect') {

    // Resolve to the package's generated dialect index
    const dialectPath = `file://${process.cwd()}/generated/prisma-ts-select/dialects/index.js`;
    return {
      url: dialectPath,
      shortCircuit: true
    };
  }
  if (specifier === '#extend') {

    // Resolve to the package's generated dialect index
    const dialectPath = `file://${process.cwd()}/generated/prisma-ts-select/extend.js`;
    return {
      url: dialectPath,
      shortCircuit: true
    };
  }

  return nextResolve(specifier, context);
}
