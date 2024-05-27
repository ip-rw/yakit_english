export const PortScanPluginTemplate = `# port scan plugin
yakit.AutoInitYakit()

/*
Functions defined by this plugin are mainly used for additional port scan extensions

Function definition as follows：
func(result *fp.MatchResult)

// Detailed struct definition and contents are at the end of the template
// The key point here is that if there are doubts about the scan results, you should modify MatchResult directly
// Directly modify variable.Field。

DEMO:

handle = func(result) {
    if result.Fingerprint != nil {
        if result.Port == 80 && result.GetServiceName() == "" {
            result.Fingerprint.ServiceName = "http"
        }
    }
}

*/

handle = func(result /* *fp.MatchResult */) {
    // handle match result
    
}

/*
// Specific definition as follows：
type palm/common/fp.(MatchResult) struct {
      Target: string  
      Port: int  
      State: fp.PortState  
      Reason: string  
      Fingerprint: *fp.FingerprintInfo  
  StructMethods(Struct Methods/Function): 
  PtrStructMethods(Pointer Struct Methods/Function): 
      func GetBanner() return(string) 
      func GetCPEs() return([]string) 
      func GetDomains() return([]string) 
      func GetHtmlTitle() return(string) 
      func GetProto() return(fp.TransportProto) 
      func GetServiceName() return(string) 
      func IsOpen() return(bool) 
      func String() return(string) 
}


type palm/common/fp.(FingerprintInfo) struct {
      IP: string  
      Port: int  
      Proto: fp.TransportProto  
      ServiceName: string  
      ProductVerbose: string  
      Info: string  
      Version: string  
      Hostname: string  
      OperationVerbose: string  
      DeviceType: string  
      CPEs: []string  
      Raw: string  
      Banner: string  
      CPEFromUrls: map[string][]*webfingerprint.CPE  
      HttpFlows: []*fp.HTTPFlow  
  StructMethods(Struct Methods/Function): 
  PtrStructMethods(Pointer Struct Methods/Function): 
      func FromRegexp2Match(v1: *regexp2.Match) 
}
*/

`