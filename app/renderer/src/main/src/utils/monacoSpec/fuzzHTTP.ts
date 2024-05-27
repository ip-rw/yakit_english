import { monaco } from "react-monaco-editor";
import { editor, languages, Position } from "monaco-editor";
import { CancellationToken } from "typescript";
import "./spaceengine";

// https://microsoft.github.io/monaco-editor/playground.html#extending-language-services-custom-languages
monaco.languages.register({ id: "http" })
// Register a completion item provider for the new language
monaco.languages.registerCompletionItemProvider('http', {
    triggerCharacters: ["{"],
    // @ts-ignore
    provideCompletionItems: (model, position) => {
        let suggestions = [
            {
                kind: languages.CompletionItemKind.Snippet,
                label: "Authorization: Basic ... Quick Basic Auth",
                insertText: "Authorization: Basic {{base64(${1:username}:${2:password})}}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Authorization",
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: "Authorization: Bearer ... Quick Add JWT",
                insertText: "Authorization: Bearer ${1:...}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Authorization",
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: "User-Agent",
                insertText: "User-Agent: ${1:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "User-Agent",
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: "X-Forwarded-For",
                insertText: "X-Forwarded-For: ${1:127.0.0.1}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "XFF Shortcut Set",
            } as languages.CompletionItem,
            {
                kind: languages.CompletionItemKind.Snippet,
                label: "Range Set Bytes Construct 206 Response",
                insertText: "Range: bytes=0-${1:1023}",
                insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                documentation: "Construct 206 Response: Range Set Bytes",
            } as languages.CompletionItem,
            ...[
                "Accept",
                "Accept-Charset",
                "Accept-Encoding",
                "Accept-Language",
                "Accept-Ranges",
                "Cache-Control",
                "Cc",
                "Connection",
                "Content-Id",
                "Content-Language",
                "Content-Length",
                "Content-Transfer-Encoding",
                "Content-Type",
                "Cookie",
                "Date",
                "Dkim-Signature",
                "Etag",
                "Expires",
                "From",
                "Host",
                "If-Modified-Since",
                "If-None-Match",
                "In-Reply-To",
                "Last-Modified",
                "Location",
                "Message-Id",
                "Mime-Version",
                "Pragma",
                "Received",
                "Return-Path",
                "Server",
                "Set-Cookie",
                "Subject",
                "To",
                // Own Schedule
                // "User-Agent",
                // "X-Forwarded-For",
                "Via",
                "X-Imforwards",
                "X-Powered-By",
            ].map(i => {
                return {
                    kind: languages.CompletionItemKind.Snippet,
                    label: i,
                    insertText: i + ": ${1}",
                    insertTextRules: languages.CompletionItemInsertTextRule.InsertAsSnippet,
                    documentation: "Common HTTP Header"
                } as languages.CompletionItem
            }),
        ];
        const line = model.getLineContent(position.lineNumber);
        if (position.column > 2) {
            const lastTwo = line.charAt(position.column - 3) + line.charAt(position.column - 2)
            if (lastTwo === "{{") {
                return {
                    suggestions: [
                        {
                            label: "date() Generate Date",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'date(YYYY-MM-dd)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "datetime() Generate Date with Time)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'datetime(YYYY-MM-dd HH:mm:ss)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "timestamp(s/ms/ns) Generate Timestamp (Seconds/Millisecond/Nanosecond）",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'timestamp(seconds)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "uuid(n) Generate n UUIDs",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'uuid(3)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "int(Integer Range)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'int(${1:0}${2:,100})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "int(Integer Range with Zero Padding)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'int(${1:0}${2:-100}${3:|3})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "network(Segment Network Target)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'network(${1:192.168.1.1/24,example.com})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "array(Usage'|'Split Array Elements Render)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'array(${1:abc|def|123})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "x(Use Data from Payload Management)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'array(${1:abc|def|123})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "randint(Generate Integer)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'randint(${1:1}${2:,10}${3:10})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "randstr(Generate String)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'randstr(${1:1}${2:,10}${3:10})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "file:line(Read File Line by Line)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'file:line(${1:/tmp/test.txt})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "file(Insert File Content Directly)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'file(${1:/tmp/test.txt})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "file:dir(Insert All Files in Directory-Fuzzy Upload)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'file:dir(${1:/tmp/test.txt})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "base64(Base64 Encode Content)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'base64(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "url(URL Encode)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'url(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "doubleurl(Double URL Encode)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'url(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "hexdec(Hex Decode)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'hexdec(${1:testname})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "repeat(Repeat Packets)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'repeat(${1:10})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "repeat:str(data|n) Repeat data n Times, a|3 as aaa",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'repeat:str(${1:abc}|10)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "repeat:range(data|n) a|3 as ['' a aa aaa] Repeat Multiple Times",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'repeat:range(${1:abc}|10)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        // YSo Generation Hint
                        {
                            label: "yso:urldns(domain)",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:urldns(domain)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:dnslog(domain|Random ID) // Second Parameter Optional",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:dnslog(domain|flag)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:find_gadget_by_dns(domain) // Detect gadget via dnslog ",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:find_gadget_by_dns(domain)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:find_gadget_by_bomb(all) // all Built-in or Specify Class ",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:find_gadget_by_bomb(all)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:headerecho(key|value) // Specify Successful Echo Response Header key:value",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:headerecho(testecho|echo_flag)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "yso:bodyexec(whoami) // Execute Command",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'yso:bodyexec(whoami)}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "headerauth // Add this Header in Echo Chain",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'headerauth}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "trim(...) Remove Spaces",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'trim(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: "nullbyte(n) Generate N-length nullbyte, Default 1",
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'nullbyte(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `padding:zero(data|n) Pad 0 for Insufficient data Length`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'padding:zero(${1}|${2:6})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `padding:null(data|n) Pad null(ascii 0x00) for Insufficient data Length`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'padding:null(${1}|${2:6})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `fuzz:pass(...|levelN) Generate Password by Material (levelN for Password Level 0-3）`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'fuzz:pass(${1:root,admin}|${2:0})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `fuzz:user(...|levelN) Generate Username by Material (levelN for Quantity, Level 0-3）`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'fuzz:pass(${1:root,admin}|${2:0})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `gzip:encode(...) Gzip Encode`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'gzip(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                        {
                            label: `gzip:decode(...) Gzip Decode`,
                            kind: monaco.languages.CompletionItemKind.Function,
                            insertText: 'gzip:decode(${1})}}',
                            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
                        },
                    ]
                }
            }
        }
        return { suggestions: suggestions, };
    }
} as any);


monaco.languages.setMonarchTokensProvider("http", {
    brackets: [],
    defaultToken: "",
    ignoreCase: true,
    includeLF: true,
    start: "",
    tokenPostfix: "",
    unicode: false,
    escapes: /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,
    tokenizer: {
        root: [
            // HTTP Request Method
            // Basic Fuzz Tag Parse
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(GET|POST|OPTIONS|DELETE|PUT)/g, "http.method"],
            [/\s/, "delimiter", "@http_path"],
            // [/(html|div|src|\<\/?title\>|<alert>)/i, "keyword"],
            // [/(\<script\>|<alert>|<prompt>|<svg )/i, "keyword"],
            // [/(secret)|(access)|(password)|(verify)|(login)/i, "bold-keyword"],
        ],
        fuzz_tag: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag_second"],
            [/}}/, "fuzz.tag.inner", "@pop"],
            [/[\w:]+}}/, "fuzz.tag.inner", "@pop"],
            [/[\w:]+\(/, "fuzz.tag.inner", "@fuzz_tag_param"],
        ],
        fuzz_tag_second: [
            [/{{/, "fuzz.tag.second", "@fuzz_tag"],
            [/}}/, "fuzz.tag.second", "@pop"],
            [/[\w:]+}}/, "fuzz.tag.second", "@pop"],
            [/[\w:]+\(/, "fuzz.tag.second", "@fuzz_tag_param_second"],
        ],
        fuzz_tag_param: [
            [/\(/, "fuzz.tag.inner", "@fuzz_tag_param"],
            [/\\\)/, "bold-keyword"],
            [/\)/, "fuzz.tag.inner", "@pop"],
            [/{{/, "fuzz.tag.second", "@fuzz_tag_second"],
            [/./, "bold-keyword"]
        ],
        fuzz_tag_param_second: [
            [/\\\)/, "bold-keyword"],
            [/\)/, "fuzz.tag.second", "@pop"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/./, "bold-keyword"]
        ],
        http_path: [
            [/\s/, "delimiter", "@http_protocol"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            ["/(((http)|(https):)?\/\/[^\s]+?)/", "http.url"],
            [/#/, "http.anchor", "@http_anchor"],
            // [/\/[^\s^?^\/]+/, "http.path"],
            [/\?/, "http.query", "@query"],
        ],
        http_anchor: [
            [/\s/, "delimiter", "@http_protocol"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/./, "http.anchor"],
        ],
        http_protocol: [
            [/\n/, "delimiter", "@http_header"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/HTTP\/[0-9.]+/, "http.protocol"],
        ],
        http_header: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/^\n$/, 'body.delimiter', '@body'],
            [/(Cookie)(:)/g, ["http.header.danger", { token: "delimiter", next: "@http_cookie" }]],
            [/(Content-Type)(:)/g, ["http.header.danger", { token: "delimiter", next: "@content_type" }]],
            [/(Content-Length|Host|Origin|Referer)(:)/g, ["http.header.danger", { token: "delimiter", next: "@http_header_value" }]],
            [/(Authorization|X-Forward|Real|User-Agent|Protection|CSP)(:)/g, ["http.header.danger", { token: "delimiter", next: "@http_header_value" }]],
            [/Sec/, "http.header.warning", "@sec_http_header"],
            [/:/, "delimiter", "@http_header_value"],
            [/\S/, "http.header.info"],
        ],
        sec_http_header: [
            [/\n/, 'body.delimiter', '@pop'],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/:/, "delimiter", "@http_header_value"],
            [/\S/, "http.header.warning"],
        ],
        content_type: [
            [/\s+$/, "delimiter", "@pop"],
            [/\s+/, "delimiter"],
            [/^\n$/, 'body.delimiter', '@pop'],
            [/multipart\/form-data[^\n]*/, "http.header.mime.form"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/application\/xml/, "http.header.mime.xml"],
            [/application\/json/, "http.header.mime.json"],
            [/application\/x-www-form-urlencoded/, "http.header.mime.urlencoded"],
            [/\S/, "http.header.mime.default"],
        ],
        query: [
            [/\s/, "delimiter", "@http_protocol"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/#/, "http.anchor", "@http_anchor"],
            [/[^=&?\[\]\s]/, "http.query.params", "@http_query_params"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_query_params: [
            [/\s/, { token: "delimiter", next: "@pop", goBack: 1 }],
            [/#/, "http.anchor", "@http_anchor"],
            [/&/, 'delimiter', "@pop"],
            [/(\[)(\w+)(\])/, ["http.query.index", "http.query.index.values", "http.query.index"]],
            [/\=/, "http.query.equal", "http_query_params_values"],
        ],
        http_query_params_values: [
            [/\s/, { token: "delimiter", next: "@pop", goBack: 1 }],
            [/#/, "http.anchor", "@http_anchor"],
            [/&/, { token: 'delimiter', next: "@pop", goBack: 1 }],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^=&?\s]/, "http.query.values"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_cookie: [
            [/\n/, "delimiter", "@pop"],
            [/\s/, "delimiter"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^=;\s]+/, "http.query.params", "@http_cookie_params"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_cookie_params: [
            [/\n/, { token: "delimiter", next: "@pop", goBack: 1 }],
            [/[\s|;]/, "delimiter", "@pop"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/\=/, "http.query.equal"],
            [/[^=;?\s]/, "http.query.values"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        http_header_value: [
            [/\n/,  { token: "delimiter", next: "@pop", goBack: 1 }],
            [/\s/, "delimiter"],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
        ],
        string_double: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/[^\\"]/, "string.value"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/"/, "string", "@body_json"],
        ],
        body: [
            [/(\d+)(:)/, [{ token: "number", next: "@body_json" }, "delimiter"]],
            [/(\d+\.\d*)(:)/, [{ token: "number", next: "@body_json" }, "delimiter"]],
            [/"/, 'string', '@string_double'],
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/-{2,}.*/, "body.boundary", "@body_form"],
            [/\w+/, "http.query.params", "@http_query_params"],
            [/%[0-9ABCDEFabcdef]{2}/, "http.urlencoded"],
        ],
        body_json: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(:\s*)/, "delimiter"],
            [/(\d+)/, "number"],
            [/(\d+\.\d*)/, "number"],
            [/"/, 'string', '@string_double'],
        ],
        body_form: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/^\n$/, "body.delimiter", "@body_data"],
            [/([^:]*?)(:)/g, ["http.header.info", { token: "delimiter", next: "@http_header_value" }]],
        ],
        body_data: [
            [/{{/, "fuzz.tag.inner", "@fuzz_tag"],
            [/(-{2,}[a-zA-z0-9]+--)/, [{ token: "body.boundary.end", next: "@end" }]],
            [/(-{2,}[a-zA-z0-9]+)/, [{ token: "body.boundary", next: "@pop" }]],
        ],
        end: [],
    }
})

