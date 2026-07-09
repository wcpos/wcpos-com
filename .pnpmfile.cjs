const TYPESCRIPT_ESLINT_PACKAGES = new Set([
  '@typescript-eslint/eslint-plugin',
  '@typescript-eslint/parser',
  '@typescript-eslint/project-service',
  '@typescript-eslint/tsconfig-utils',
  '@typescript-eslint/type-utils',
  '@typescript-eslint/typescript-estree',
  '@typescript-eslint/utils',
  'typescript-eslint',
]);

module.exports = {
  hooks: {
    readPackage(pkg) {
      if (pkg.version === '8.63.0' && TYPESCRIPT_ESLINT_PACKAGES.has(pkg.name)) {
        pkg.dependencies = {
          ...pkg.dependencies,
          typescript: '6.0.3',
        };
        if (pkg.peerDependencies) {
          delete pkg.peerDependencies.typescript;
        }
      }

      return pkg;
    },
  },
};
