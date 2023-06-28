import * as tf from '@tensorflow/tfjs-node';
import * as use from '@tensorflow-models/universal-sentence-encoder';
import descToEmojis from './desc-to-emojis.json' assert { type: "json" };
import * as fs from "fs";

const model = await use.load();

const embeddings = await model.embed(Object.keys(descToEmojis).sort());
const embeddingsArr = embeddings.arraySync()

fs.writeFile("embeddings.json", JSON.stringify(embeddingsArr), 'utf-8', (err) => {
  if (err) throw err;
  console.log('The file has been saved!');
});