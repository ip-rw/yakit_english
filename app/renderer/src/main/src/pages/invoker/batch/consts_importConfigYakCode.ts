import { YakParamProps } from "@/pages/plugins/pluginsType"

export namespace ImportMenuConfig {
    export const Params: YakParamProps[] = [
        {
            Field: "config-file", FieldVerbose: "Config file(zip/json)",
            Required: true, TypeVerbose: "upload-path", DefaultValue: "",
            Help: "Import config file: Config menu bar",
        },
        {
            Field: "delete-old", FieldVerbose: "Delete old config？",
            TypeVerbose: "boolean", DefaultValue: "",
            Help: "Deleting old config",
        },
    ]
    export const Code = `# YakCode
yakit.AutoInitYakit()
tempDir = yakit.GetHomeTempDir()

targetDir = file.Join(tempDir, "temploaded-config")
defer func{
    os.RemoveAll(targetDir)
}

defer func{
    err := recover()
    if err != nil {
        yakit.Error("Load Yakit Plugin Config Failed: %s", err)
    }
}

yakit.Info("Fetching current config info...")
configFile = cli.String("config-file")
if configFile == "" {
    yakit.Error("config empty")
    return
}

yakit.Info("User config file:%v", configFile)
if !file.IsExisted(configFile) {
    yakit.Error("%v not found, config end", configFile)
    return
}

if str.HasSuffix(str.ToLower(configFile), ".json") {
    yakit.Info("User config is JSON: Import directly")
    jsonRaw, _ = file.ReadFile(configFile)
    return
}

yakit.Info("Unzip config ZIP:%v", configFile)
die(zip.Decompress(configFile, targetDir))

yakit.Info("Loading valid Schema in config")
files, err = file.ReadFileInfoInDirectory(targetDir)
die(err)
once := sync.NewOnce()
for _, f := range files {
    if f.IsDir {
        continue
    }
    if str.HasSuffix(f.Name, ".json") {
        yakit.Info("Loading config：%v", f.Name)
        jsonRaw, _ = file.ReadFile(f.Path)
        if len(jsonRaw) > 0 && cli.Bool("delete-old") {
            once.Do(func(){ db.DeleteYakitMenuItemAll() })
        }
        err = db.SaveYakitMenuItemByBatchExecuteConfig(jsonRaw)
        if err != nil {
            yakit.Error("Config load failed[%v] Reason:%v", f.Path, err)
        }
    }
}
`
}