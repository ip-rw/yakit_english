export const PacketHackPluginTemplate = `# packet hack plugin
yakit.AutoInitYakit()

/*
Parameters for functions (Hooks) defined by this plugin derive from the following content 
1. HTTP History
2. Repeater

Function definition as follows：
func(requestRaw: []byte|string|url, responseBody: []byte, isHttps: bool)


*/

handle = func(requestRaw, responseRaw, isHttps) {
    freq, err := fuzz.HTTPRequest(requestRaw, fuzz.https(isHttps))
    if err != nil {
        yakit.Info("Build Fuzz HTTPRequest failed")
        return
    }
}


__test__ = func() {
    # run your testcase!
}

if YAK_MAIN {
    __test__()
}
`