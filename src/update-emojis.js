import * as fs from "fs";
import emojiToDescs from "../emoji-en-US.json" assert {type: "json"};

const descToEmojis = {};
for (const [emoji, descs] of Object.entries(emojiToDescs)) {
  for (const desc of descs) {
    if (!(desc in descToEmojis)) {
      descToEmojis[desc.split('_').join(' ')] = [];
    }
    descToEmojis[desc.split('_').join(' ')].push(emoji);
  }
}

fs.promises.writeFile("../desc-to-emojis.json", JSON.stringify(descToEmojis))