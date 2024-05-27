const { ipcMain } = require("electron");

module.exports = (win, getClient) => {
  // Store Token and Data for Multiple Comparison Pages
  const dataMap = new Map();
  // Current Token Value
  var token = "";
  /**
   * Add Page Entry
   * @type {boolean}
   * true: Add Request from Other Pages
   * false: Add to Homepage
   */
  var type = false;

  // Receive Data Comparison Requests from http-history Page, Generate Correspondence Code and Notify Homepage to Add data-compare Page
  ipcMain.handle("add-data-compare", (e, params) => {
    type = true;
    const infoType = ["", "left", "right"][+params.type];

    if (token) {
      const info = dataMap.get(token);
      info.type = +params.type;
      info[infoType] = params.info;
      dataMap.set(token, info);

      win.webContents.send(`${token}-data`, {
        token: token,
        info: info,
      });
      token = "";
      type = false;
    } else {
      token = `compare-${new Date().getTime()}-${Math.floor(
        Math.random() * 50
      )}`;
      const info = {};
      info.type = +params.type;
      info[infoType] = params.info;
      dataMap.set(token, info);
      win.webContents.send("main-container-add-compare");
    }
  });

  ipcMain.handle("created-data-compare", (e) => {
    type = true;
  });

  // Forward Data
  const sendDataCompare = () => {
    return new Promise((resolve, reject) => {
      if (type) return resolve({ token: token, info: dataMap.get(token) });
      else {
        return resolve({
          token: `compare-${new Date().getTime()}-${Math.floor(
            Math.random() * 50
          )}`,
        });
      }
    });
  };
  // Receive Comparison Data Received by Homepage, and Input into Data Comparison Page
  ipcMain.handle("create-compare-token", async (e) => {
    return await sendDataCompare();
  });
};
