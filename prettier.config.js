/** @type {import('prettier').Config} */
export default {
  singleQuote: true,
  printWidth: 120,
  plugins: ['prettier-plugin-tailwindcss'],
  tailwindStylesheet: './src/index.css',
};
