import {emojifyString}  from './s2v.js';

const rawTextInput = document.getElementById("raw-text-input");
const emojifiedTextInput = document.getElementById("emojified-text-input");
const submitButton = document.getElementById("submit-button");
const embeddingsCheckbox = document.getElementById("embeddings-checkbox");
let prevValue = "";

const handleEmojify = async () => {
    const rawText = rawTextInput.value;
    console.log("checked", embeddingsCheckbox.checked)
    const useEmbeddings = embeddingsCheckbox.checked;
    const emojifiedText = await emojifyString(rawText, useEmbeddings);
    emojifiedTextInput.value = emojifiedText;
}

submitButton.addEventListener("click", handleEmojify);