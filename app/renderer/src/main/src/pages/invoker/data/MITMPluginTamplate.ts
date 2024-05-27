export const MITMPluginTemplate = `# mitm plugin template

yakit_output(MITM_PARAMS)

#-----------------------MITM Hooks I/O-------------------------
/*
#How to use plugin parameters？

## For instance, if you set a parameter named url_keyword, use it via MITM_PARAMS！
urlKeyword = MITM_PARAMS["url_keyword"]

# How to output to Yakit for user inspection？

yakit_output(i: any) // Output to only "Console Interface"
yakit_save(i: any)   // Output and save to the database, view in "Plugin Output" Traffic like css
*/
#----------------MITM Hooks Test And Quick Debug-----------------
/*
# 1. forward(hijacked): Confirm forwarding】

In this function, you can use yakit.GenerateYakitMITMHooksParams(method: string, url: string, opts ...http.Option) to easily generate parameters for hooks calling, refer to the code template～

*/


#--------------------------WORKSPACE-----------------------------
__test__ = func() {
    results, err := yakit.GenerateYakitMITMHooksParams("GET", "https://example.com")
    if err != nil {
        return
    }
    isHttps, url, reqRaw, rspRaw, body = results

    mirrorHTTPFlow(results...)
    mirrorFilteredHTTPFlow(results...)
    mirrorNewWebsite(results...)
    mirrorNewWebsitePath(results...)
    mirrorNewWebsitePathParams(results...)
}


# mirrorHTTPFlow mirrors all traffic here, including .js / .css / .Requests like jpg typically filtered by hijack programs
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorFilteredHTTPFlow Traffic hijacked is automatically filtered by MITM and likely related to "Business" Traffic related will automatically filter out js / 3. If neither forward nor drop is called, use default data flow
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsite For each new website, the first request for this website will be called here！
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePath For each new website path, the first request about this path will be passed here for callback
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePathParams For each new website path with parameters, deduplicate by common locations and parameter names, the first HTTPFlow here is invoked
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}


# hijackHTTPRequest Each new HTTPRequest will be hijacked by this HOOK, after hijacking use forward(modified) to overwrite with the modified request, to block the packet use drop()
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. hijackSaveHTTPFlow also uses the JS Promise callback approach, users can modify within this method body, save with modify(flow) after modifications
#       2. drop() Discard packet
#       Request after hiajck
#       4. If both drop and forward are called in a hijack, drop prevails
/*
# Demo2 Best In Practice
hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    if str.Contains(string(req), "/products/plugins/plugin_11") {
        modified = str.ReplaceAll(string(req), "/products/plugins/plugin_11", "/products/plugins/plugin_create")
        forward(poc.FixHTTPResponse(modified))
    } 

    if str.Contains(string(req), "/products/plugins/plugin_12") {
        drop()
    } 
}
*/
hijackHTTPRequest = func(isHttps, url, req, forward /*func(modifiedRequest []byte)*/, drop /*func()*/) {

}


# hijackHTTPResponse Each new HTTPResponse will be hijacked by this HOOK, after hijacking use forward(modified) to overwrite with the modified request, to block the packet use drop()
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. hijackSaveHTTPFlow also uses the JS Promise callback approach, users can modify within this method body, save with modify(flow) after modifications
#       2. drop() Discard packet
#       Request after hiajck
#       4. If both drop and forward are called in a hijack, drop prevails
/*
# Demo2 Best In Practice
hijackHTTPResponse = func(isHttps, url, rsp, forward, drop) {
    if str.Contains(string(rsp), "Harnessing the vast power of Chinese literature") {
        modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "Harnessing the vast power of Chinese literature", "AAAAAAAAAAAAAAAA"))
        forward(modified)
    }
}
*/
hijackHTTPResponse = func(isHttps, url, rsp, forward, drop) {
    // if str.Contains(string(rsp), "Harnessing the vast power of Chinese literature") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "Harnessing the vast power of Chinese literature", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

hijackHTTPResponseEx = func(isHttps, url, req, rsp, forward, drop) {
    // if str.Contains(string(rsp), "Harnessing the vast power of Chinese literature") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "Harnessing the vast power of Chinese literature", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

# hijackSaveHTTPFlow Yakit's MITM storage procedure Hook function
# This function allows users to filter or modify HTTP packets before saving them to the database, including adding fields, coloring, etc.
# Similar to hijackHTTPRequest
#    1. hijackSaveHTTPFlow 也采用了 JS Promise 的回调处理方案，用户可以在这个方法体内进行修改，修改完通过 modify(flow) 来进行保存
#    2. To not save a packet, use drop()
# 
/**
Case Study:

hijackSaveHTTPFlow = func(flow, modify, drop) {
    if str.Contains(flow.Url, "/admin/") {
        flow.Red()   # Set Color
        modify(flow) # Save
    }
}
*/

hijackSaveHTTPFlow = func(flow /* *yakit.HTTPFlow */, modify /* func(modified *yakit.HTTPFlow) */, drop/* func() */) {
    // responseBytes, _ = codec.StrconvUnquote(flow.Response)
    // if str.MatchAnyOfRegexp(responseBytes, "/admin/", "accessKey") { flow.Red(); modify(flow) }
}

/* Quick Reference

*__test__ is a function for debugging in yakit mitm plugin 【Note: This function is not imported in MITM hooks environment：
type palm/common/yakgrpc/yakit.(HTTPFlow) struct {
  Fields(Available Fields)):
      Model: gorm.Model
      Hash: string
      IsHTTPS: bool
      Url: string
      Path: string
      Method: string
      BodyLength: int64
      ContentType: string
      StatusCode: int64
      SourceType: string
      Request: string                   # Decode via codec.StrconvUnquote
      Response: string                  # Decode via codec.StrconvUnquote
      GetParamsTotal: int
      PostParamsTotal: int
      CookieParamsTotal: int
      IPAddress: string
      RemoteAddr: string
      IPInteger: int
      Tags: string
  StructMethods(Structure Methods)/Function):
  PtrStructMethods(Pointer Structure Methods)/Function):
      func AddTag(v1: string)
      func BeforeSave() return(error)
      func Blue()                                           # Blue
      func CalcHash() return(string)                         
      func ColorSharp(v1: string)
      func Cyan()                                           # Cyan
      func Green()                                          # Green
      func Grey()                                           # Grey
      func Orange()                                         # Orange
      func Purple()                                         # Purple
      func Red()                                            # Red
      func RemoteColor()
      func ToGRPCModel() return(*ypb.HTTPFlow, error)
      func ToGRPCModelFull() return(*ypb.HTTPFlow, error)
      func Yellow()                                         # Yellow
}
*/
`

export const MITMPluginTemplateShort = `# mirrorHTTPFlow mirrors all traffic here, including .js / .css / .Requests like jpg typically filtered by hijack programs
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorFilteredHTTPFlow Traffic hijacked is automatically filtered by MITM and likely related to "Business" Traffic related will automatically filter out js / 3. If neither forward nor drop is called, use default data flow
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsite For each new website, the first request for this website will be called here！
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePath For each new website path, the first request about this path will be passed here for callback
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePathParams For each new website path with parameters, deduplicate by common locations and parameter names, the first HTTPFlow here is invoked
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}


# hijackHTTPRequest Each new HTTPRequest will be hijacked by this HOOK, after hijacking use forward(modified) to overwrite with the modified request, to block the packet use drop()
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. hijackSaveHTTPFlow also uses the JS Promise callback approach, users can modify within this method body, save with modify(flow) after modifications
#       2. drop() Discard packet
#       Request after hiajck
#       4. If both drop and forward are called in a hijack, drop prevails
/*
# Demo2 Best In Practice
hijackHTTPRequest = func(isHttps, url, req, forward, drop) {
    if str.Contains(string(req), "/products/plugins/plugin_11") {
        modified = str.ReplaceAll(string(req), "/products/plugins/plugin_11", "/products/plugins/plugin_create")
        forward(poc.FixHTTPResponse(modified))
    } 

    if str.Contains(string(req), "/products/plugins/plugin_12") {
        drop()
    } 
}
*/
hijackHTTPRequest = func(isHttps, url, req, forward /*func(modifiedRequest []byte)*/, drop /*func()*/) {

}


# hijackHTTPResponse Each new HTTPResponse will be hijacked by this HOOK, after hijacking use forward(modified) to overwrite with the modified request, to block the packet use drop()
# ATTENTION-DEMO:
#   hijacked = str.ReplaceAll(string(req), "abc", "bcd")
#       1. hijackSaveHTTPFlow also uses the JS Promise callback approach, users can modify within this method body, save with modify(flow) after modifications
#       2. drop() Discard packet
#       Request after hiajck
#       4. If both drop and forward are called in a hijack, drop prevails
/*
# Demo2 Best In Practice
hijackHTTPResponse = func(isHttps, url, rsp, forward, drop) {
    if str.Contains(string(rsp), "Harnessing the vast power of Chinese literature") {
        modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "Harnessing the vast power of Chinese literature", "AAAAAAAAAAAAAAAA"))
        forward(modified)
    }
}
*/
hijackHTTPResponse = func(isHttps, url, rsp, forward, drop) {
    // if str.Contains(string(rsp), "Harnessing the vast power of Chinese literature") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "Harnessing the vast power of Chinese literature", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

hijackHTTPResponseEx = func(isHttps, url, req, rsp, forward, drop) {
    // if str.Contains(string(rsp), "Harnessing the vast power of Chinese literature") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "Harnessing the vast power of Chinese literature", "AAAAAAAAAAAAAAAA"))
    //     forward(modified)
    // }
}

// Hook before sending to the server
beforeRequest = func(ishttps, oreq/*Original Request*/, req/*Request after hijack*/){
	// if str.Contains(string(req), "Harnessing the vast power of Chinese literature") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(req, "Harnessing the vast power of Chinese literature", "AAAAAAAAAAAAAAAA"))
    //     return []byte(modified)
    // }
}

// Hook before replying to the browser
afterRequest = func(ishttps, oreq/*Original Request*/ ,req/*yakit.HTTPFlow definition*/ ,orsp/*Original Response*/ ,rsp/*Response after hijack*/){
	// if str.Contains(string(rsp), "Harnessing the vast power of Chinese literature") {
    //     modified = poc.FixHTTPResponse(str.ReplaceAll(rsp, "Harnessing the vast power of Chinese literature", "AAAAAAAAAAAAAAAA"))
    //     return []byte(modified)
    // }
}

# hijackSaveHTTPFlow Yakit's MITM storage procedure Hook function
# This function allows users to filter or modify HTTP packets before saving them to the database, including adding fields, coloring, etc.
# Similar to hijackHTTPRequest
#    1. hijackSaveHTTPFlow 也采用了 JS Promise 的回调处理方案，用户可以在这个方法体内进行修改，修改完通过 modify(flow) 来进行保存
#    2. To not save a packet, use drop()
# 
/**
Case Study:

hijackSaveHTTPFlow = func(flow, modify, drop) {
    if str.Contains(flow.Url, "/admin/") {
        flow.Red()   # Set Color
        modify(flow) # Save
    }
}
*/

hijackSaveHTTPFlow = func(flow /* *yakit.HTTPFlow */, modify /* func(modified *yakit.HTTPFlow) */, drop/* func() */) {
    // responseBytes, _ = codec.StrconvUnquote(flow.Response)
    // if str.MatchAnyOfRegexp(responseBytes, "/admin/", "accessKey") { flow.Red(); modify(flow) }
}

/* Quick Reference

*__test__ is a function for debugging in yakit mitm plugin 【Note: This function is not imported in MITM hooks environment：
type palm/common/yakgrpc/yakit.(HTTPFlow) struct {
  Fields(Available Fields)):
      Model: gorm.Model
      Hash: string
      IsHTTPS: bool
      Url: string
      Path: string
      Method: string
      BodyLength: int64
      ContentType: string
      StatusCode: int64
      SourceType: string
      Request: string                   # Decode via codec.StrconvUnquote
      Response: string                  # Decode via codec.StrconvUnquote
      GetParamsTotal: int
      PostParamsTotal: int
      CookieParamsTotal: int
      IPAddress: string
      RemoteAddr: string
      IPInteger: int
      Tags: string
  StructMethods(Structure Methods)/Function):
  PtrStructMethods(Pointer Structure Methods)/Function):
      func AddTag(v1: string)
      func BeforeSave() return(error)
      func Blue()                                           # Blue
      func CalcHash() return(string)                         
      func ColorSharp(v1: string)
      func Cyan()                                           # Cyan
      func Green()                                          # Green
      func Grey()                                           # Grey
      func Orange()                                         # Orange
      func Purple()                                         # Purple
      func Red()                                            # Red
      func RemoteColor()
      func ToGRPCModel() return(*ypb.HTTPFlow, error)
      func ToGRPCModelFull() return(*ypb.HTTPFlow, error)
      func Yellow()                                         # Yellow
}
*/
`
