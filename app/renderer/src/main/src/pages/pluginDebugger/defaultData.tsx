import React from "react";

export const PortScanPluginTemplate: string = `/*
runOnPortScan Executes on each port scan

port-scan plugin is working on anytime a port scanned.
*/
handle = result => {
    // result is obj from servicescan
}

/*
// checkPortOpen Checks if the port is open
if result.IsOpen() {
    // do sth
}

// checkHtmlTitle For port(if website exists)
if result.GetHtmlTitle().Contains("login") {
    // do sth
}

// getPacketInfo For port(if website exists)
isHttps, request := result.GetRequestRaw()
response := result.GetResponseRaw()
result.Get


type *MatchResult struct {
  Fields(Available Fields): 
      Target: string  
      Port: int  
      State: fp.PortState  
      Reason: string  
      Fingerprint: *fp.FingerprintInfo  
  Methods(Available Methods): 
      func GetBanner() return(string) 
      func GetCPEs() return([]string) 
      func GetDomains() return([]string) 
      func GetHtmlTitle() return(string) 
      func GetProto() return(fp.TransportProto) 
      func GetServiceName() return(string) 
      func IsOpen() return(bool) 
      func GetRequestRaw() return(bool, []uint8) 
      func GetResponseRaw() return([]uint8)
      func GetFuzzRequest() return(*mutate.FuzzRequest)
}
*/

`

export const MITMPluginTemplate: string = `

# mirrorHTTPFlow Mirrors all traffic here, including .js,  / .css / .jpg Requests typically filtered by hijacking programs
mirrorHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorFilteredHTTPFlow Traffic hijacked and filtered by MITM as potentially related "Business" filterJsTraffic Automatically filters out js traffic / css traffic
mirrorFilteredHTTPFlow = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsite Invokes the first request for a newly surfaced website！
mirrorNewWebsite = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePath Callback for the first request of a newly surfaced website path
mirrorNewWebsitePath = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}

# mirrorNewWebsitePathParams Invokes the first HTTPFlow for newly surfaced website paths with parameters, deduped by common locations and names
mirrorNewWebsitePathParams = func(isHttps /*bool*/, url /*string*/, req /*[]byte*/, rsp /*[]byte*/, body /*[]byte*/) {
    
}


`

export const NucleiPluginTemplate: string = `id: plugin-short-name
info:
  name: YourPluginName

requests:
  - raw:
    - |
      GET / HTTP/1.1
      Host: {{Hostname}}
      
      abc
    matchers:
    - type: word
      words:
        - "abc"
`