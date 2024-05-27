export const CodecPluginTemplate = `# codec plugin

/*
Codec Plugin supports custom encoding/decoding in Codec, custom Bypass, and string handling functions.

Function definitions are very simple.

func(i: string) string
*/

handle = func(origin /*string*/) {
    # handle your origin str
    return origin
}
`


export const CustomDnsLogPlatformTemplate = `
yakit.AutoInitYakit()

requireDomain = func() {
    packet = \`GET /xxx HTTP/1.1
Host: target

\`
        rsp,req = poc.HTTPEx(
            packet,
            poc.https(true),
            poc.timeout(10),
            // poc.proxy("http://127.0.0.1:9999")

        )~
        _, body = poc.Split(rsp.RawPacket)
        subdomain, token = "", ""
        // Processing logic
        return subdomain,token
}

getResults = func(token) {
    packet = f\`GET / HTTP/1.1
Host: target.com
\`
    rsp,req = poc.HTTPEx(
            packet,
            poc.https(true),
            poc.timeout(10),
            // poc.proxy("http://127.0.0.1:9999")
        )~
    _, body = poc.Split(rsp.RawPacket)
    events = []
    if len(body)> 0 {
        // Processing logic
        return events
    }

}
`
export const YakTemplate = `yakit.AutoInitYakit()\n\n# Input your code!\n\n`

export const NucleiYamlTemplate = `# Add your nuclei formatted PoC!`
