// prettier.config.js or .prettierrc.js
module.exports = {
    // Max 100 characters per line
    printWidth: 120,
    // Indent with 4 spaces
    tabWidth: 4,
    // Use spaces, not tabs
    useTabs: false,
    // End lines with semicolon
    semi: false,
    // Use single quotes
    singleQuote: false,
    // Quote keys only when necessary
    quoteProps: 'as-needed',
    // Use double, not single quotes in jsx
    jsxSingleQuote: true,
    // No trailing commas
    trailingComma: 'none',
    // Spaces inside braces
    bracketSpacing: false,
    // Wrap jsx tag brackets
    jsxBracketSameLine: false,
    // Parentheses around single arrow func param
    arrowParens: 'always',
    // Format entire file
    rangeStart: 0,
    rangeEnd: Infinity,
    // No @prettier at file start
    requirePragma: false,
    // No @prettier at start
    insertPragma: false,
    // Default line wrapping
    proseWrap: 'preserve',
    // Wrap html based on display
    htmlWhitespaceSensitivity: 'css',
    // Use lf for newline
    endOfLine: 'lf'
};
