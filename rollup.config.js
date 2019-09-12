import babel from 'rollup-plugin-babel';

export default {
  input: 'index.js',
  output: {
    file: 'bundle.js',
    format: 'umd',
    name: 'FontReader',
  },
  plugins: [
    babel({
      exclude: 'node_modules/**',
    }),
  ],
};
