var decrypt_key = "6bdb2e585882fbd48826ef9cffd4c511"
const crypto = require("crypto")
const fs = require("fs")
const input_path = "js/plugins/LiveSplit.js";
const output_path = "js/plugins/LiveSplit.OMORI";

main = () => {
    var plugin = fs.readFileSync(input_path);
    var iv = plugin.slice(0, 16);
    var plugin_encrypted = encryptData(plugin, iv);
    fs.writeFileSync(output_path, plugin_encrypted);
}

encryptData = (data, iv) => {
    var e = crypto.createCipheriv("aes-256-ctr", decrypt_key, iv)
    return Buffer.concat([iv, e.update(data), e.final()])
}

main();
