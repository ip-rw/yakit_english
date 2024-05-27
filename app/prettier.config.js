// prettier.config.js or .prettierrc.js
module.exports = {
    // Max 100 chars per line
    printWidth: 120,
    // Indent with 4 spaces
    tabWidth: 4,
    // Use spaces, not tabs
    useTabs: false,
    // End lines with semicolon
    semi: false,
    // Use single quotes
    singleQuote: false,
    // Quotes for keys only if needed
    quoteProps: 'as-needed',
    // Double quotes for jsx
    jsxSingleQuote: true,
    // No trailing commas
    trailingComma: 'none',
    // Spaces inside braces
    bracketSpacing: false,
    // Wrap jsx tags' `>` to new line
    jsxBracketSameLine: false,
    // Parentheses for single arg in arrow funcs
    arrowParens: 'always',
    // Full file format scope
    rangeStart: 0,
    rangeEnd: Infinity,
    // No `@prettier` at file start
    requirePragma: false,
    // No auto `@prettier` at start
    insertPragma: false,
    // Use default wrap
    proseWrap: 'preserve',
    // Wrap HTML based on display
    htmlWhitespaceSensitivity: 'css',
    // Use lf for newlines
    endOfLine: 'lf'
};
