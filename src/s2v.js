/**
 * @license
 * Copyright 2019 Google LLC. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 * =============================================================================
 */

const loadingOverlays = document.querySelectorAll(".loading-overlay");

const resDesc = await fetch('./desc-to-emojis.json');
const descToEmojis = await resDesc.json();
const resEmbeddings = await fetch('./embeddings.json');
const embeddingsArr = await resEmbeddings.json()


const descs = Object.keys(descToEmojis).sort();
const model = await use.load();
const embeddings = tf.tensor(embeddingsArr);
const normalizedEmbeddings = tf.div(embeddings, tf.norm(embeddings, 2, 1, true));

for (const overlay of loadingOverlays) {
    overlay.style.visibility = "hidden";
}

export const emojifyString = async (input, useEmbeddings) => {
    const origInputArr = input.split(/\s+/).filter(word => word);
    const inputArr = origInputArr.map(word => word.replace(/^[^\w\s]+|[^\w\s]+$/g, '').toLowerCase());
    let promises = inputArr.map((word, i) => getMostSimilar(word, useEmbeddings).then(emoji => emoji ? origInputArr[i] + " " + emoji : origInputArr[i]));
    const emojifiedArr = await Promise.all(promises);
    return emojifiedArr.join(" ")
}

export const getMostSimilar = async (target, useEmbeddings) => {
    if (target in descToEmojis) {
      const candidateEmojis = descToEmojis[target]
      return candidateEmojis[Math.floor(Math.random()*candidateEmojis.length)]
    }

    if (!useEmbeddings) {
      return;
    }

    const targetVector = await model.embed(target);
    // Normalize the vectors
    const normalizedTarget = tf.div(targetVector, tf.norm(targetVector));

    // Compute the cosine similarity
    const similarity = tf.matMul(normalizedEmbeddings, normalizedTarget.reshape([-1, 1]));

    // Find the index of the most similar vector
    const score = Math.max(...similarity.dataSync());
    const mostSimilarIndex = similarity.argMax().dataSync()[0];

    // Get the most similar vector
    const mostSimilarVector = embeddings.arraySync()[mostSimilarIndex];
    const mostSimilarWord = descs[mostSimilarIndex];

    //console.log('Most similar vector:', mostSimilarVector);
    console.log('Most similar word:', descs[mostSimilarIndex]);

    const candidateEmojis = descToEmojis[mostSimilarWord]
    return candidateEmojis[Math.floor(Math.random()*candidateEmojis.length)]
}